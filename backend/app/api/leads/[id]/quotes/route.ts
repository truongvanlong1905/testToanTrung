import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessAllLeads, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { computeLeadScore, formatVndNumber } from "@/lib/lead-scoring";

const CreateQuoteSchema = z.object({
  moduleSpec: z.string().trim().min(3, "Vui lòng chọn dòng module màn hình LED"),
  widthMeters: z.number().min(0.2, "Chiều ngang tối thiểu 0.2m").max(200),
  heightMeters: z.number().min(0.2, "Chiều cao tối thiểu 0.2m").max(200),
  unitPriceVnd: z.number().min(100_000, "Đơn giá / m² không hợp lệ"),
  processorVnd: z.number().min(0).default(0),
  structureInstallVnd: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(50).default(0),
  warrantyMonths: z.number().min(6).max(60).default(24),
  notes: z.string().trim().max(2000).optional().nullable(),
  requestDirectorApproval: z.boolean().optional().default(false),
});

const DirectorApproveQuoteSchema = z.object({
  quoteId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(1000).optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const quotes = await prisma.leadQuote.findMany({
      where: { leadId: id },
      include: {
        createdBy: { select: { name: true, initials: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        quotes: quotes.map((q) => ({
          ...q,
          createdBy: q.createdBy?.name || "Hệ thống",
          createdAt: q.createdAt.toLocaleString("vi-VN"),
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/leads/[id]/quotes error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi tải danh sách báo giá LED" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { _count: { select: { activities: true, quotes: true } } },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy hồ sơ Lead" } },
        { status: 404 }
      );
    }

    const canModify =
      canAccessAllLeads(user) ||
      !lead.salesPersonId ||
      lead.salesPersonId === user.userId ||
      lead.createdById === user.userId;

    if (!canModify) {
      return forbiddenResponse("Chỉ nhân sự phụ trách Lead hoặc cấp quản lý mới được lập báo giá");
    }

    const body = await req.json();
    const parsed = CreateQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Thông số báo giá không hợp lệ",
          },
        },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const areaSqm = Number((d.widthMeters * d.heightMeters).toFixed(2));
    const subtotal = areaSqm * d.unitPriceVnd + d.processorVnd + d.structureInstallVnd;
    const discountAmount = subtotal * (d.discountPercent / 100);
    const totalVnd = Math.round(subtotal - discountAmount);

    // Chính sách Tập đoàn: Chiết khấu > 8% hoặc dự án >= 200 triệu hoặc bấm Trình duyệt -> Chờ Giám đốc phê duyệt
    const needsDirector =
      d.requestDirectorApproval || d.discountPercent > 8 || totalVnd >= 200_000_000;

    const now = new Date();
    const ym = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const qCount = await prisma.leadQuote.count();
    const quoteCode = `BG-TT-${ym}-${String(qCount + 1).padStart(3, "0")}`;

    const quoteStatus = needsDirector ? "PENDING_DIRECTOR" : "SENT";

    const quote = await prisma.leadQuote.create({
      data: {
        code: quoteCode,
        leadId: id,
        moduleSpec: d.moduleSpec,
        widthMeters: d.widthMeters,
        heightMeters: d.heightMeters,
        areaSqm,
        unitPriceVnd: d.unitPriceVnd,
        processorVnd: d.processorVnd,
        structureInstallVnd: d.structureInstallVnd,
        discountPercent: d.discountPercent,
        totalVnd,
        warrantyMonths: d.warrantyMonths,
        notes: d.notes || null,
        status: quoteStatus,
        createdById: user.userId,
      },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    const formattedTotal = formatVndNumber(totalVnd);
    const nextLeadStatus =
      lead.status === "Vừa nhận thông tin"
        ? needsDirector
          ? "Đang soạn báo giá"
          : "Đã gửi báo giá"
        : lead.status;

    const scored = computeLeadScore({
      status: nextLeadStatus,
      estimatedValue: formattedTotal,
      installationAddress: lead.installationAddress,
      email: lead.email,
      source: lead.source,
      ledWidth: d.widthMeters,
      ledHeight: d.heightMeters,
      activitiesCount: lead._count.activities + 1,
      quotesCount: lead._count.quotes + 1,
    });

    await prisma.lead.update({
      where: { id },
      data: {
        estimatedValue: formattedTotal,
        ledWidth: d.widthMeters,
        ledHeight: d.heightMeters,
        ledModuleType: d.moduleSpec,
        discountPercent: d.discountPercent,
        directorApprovalStatus: needsDirector ? "PENDING" : lead.directorApprovalStatus,
        status: nextLeadStatus,
        lastContactedAt: now,
        priorityScore: scored.score,
        priorityTier: scored.tier,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: id,
        type: "QUOTATION",
        summary: `Lập báo giá [${quoteCode}] — ${d.moduleSpec} (${d.widthMeters}m × ${d.heightMeters}m = ${areaSqm}m²) · Tổng: ${formattedTotal}${d.discountPercent > 0 ? ` (CK ${d.discountPercent}%)` : ""}`,
        outcome: needsDirector ? "Đang trình Giám đốc phê duyệt giá/chiết khấu" : "Đã hoàn tất báo giá chuẩn",
        createdById: user.userId,
      },
    });

    if (needsDirector) {
      await prisma.departmentReport.create({
        data: {
          title: `📋 [Trình Giám đốc duyệt giá] ${quoteCode} — KH: ${lead.customerName}`,
          content: `Nhân sự ${user.name} trình Ban Giám Đốc phê duyệt báo giá dự án ${d.moduleSpec} (${areaSqm}m²), tổng giá trị ${formattedTotal} (Chiết khấu: ${d.discountPercent}%) cho khách hàng ${lead.customerName} (${lead.companyName} - Mã Lead: ${lead.code}).`,
          department: "PHÒNG KINH DOANH",
          createdById: user.userId,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: needsDirector
          ? `Đã lập báo giá [${quoteCode}] (${formattedTotal}) và gửi trình Giám đốc phê duyệt chiết khấu/dự án lớn!`
          : `Đã lập báo giá [${quoteCode}] (${formattedTotal}) và đồng bộ vào hồ sơ Lead!`,
        data: {
          quote: {
            ...quote,
            createdBy: quote.createdBy?.name || user.name,
            createdAt: quote.createdAt.toLocaleString("vi-VN"),
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/leads/[id]/quotes error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi khởi tạo báo giá LED" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  if (
    user.actorType !== "DIRECTOR" &&
    user.actorType !== "ADMIN" &&
    user.role !== "DIRECTOR" &&
    user.role !== "ADMIN"
  ) {
    return forbiddenResponse("Chỉ Tác nhân GIÁM ĐỐC (hoặc Admin) mới có thẩm quyền phê duyệt báo giá & chiết khấu vượt khung");
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = DirectorApproveQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Dữ liệu phê duyệt không hợp lệ" } },
        { status: 400 }
      );
    }

    const { quoteId, decision, note } = parsed.data;
    const quote = await prisma.leadQuote.findFirst({
      where: { id: quoteId, leadId: id },
    });

    if (!quote) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy bản báo giá" } },
        { status: 404 }
      );
    }

    const updatedQuote = await prisma.leadQuote.update({
      where: { id: quoteId },
      data: {
        status: decision === "APPROVED" ? "DIRECTOR_APPROVED" : "DRAFT",
        approvedByName: user.name,
      },
    });

    await prisma.lead.update({
      where: { id },
      data: {
        directorApprovalStatus: decision,
        directorApprovedByName: user.name,
        directorApprovalNote: note || null,
        ...(decision === "APPROVED" ? { status: "Đã gửi báo giá" } : {}),
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: id,
        type: "QUOTATION",
        summary:
          decision === "APPROVED"
            ? `Giám đốc (${user.name}) ĐÃ PHÊ DUYỆT báo giá [${quote.code}] — Cho phép gửi khách hàng`
            : `Giám đốc (${user.name}) YÊU CẦU ĐIỀU CHỈNH LẠI báo giá [${quote.code}]`,
        outcome: note || null,
        createdById: user.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        decision === "APPROVED"
          ? `Giám đốc đã ký duyệt báo giá [${quote.code}]! Trạng thái Lead đã chuyển sang "Đã gửi báo giá".`
          : `Đã từ chối / yêu cầu điều chỉnh lại báo giá [${quote.code}].`,
      data: { quote: updatedQuote },
    });
  } catch (error) {
    console.error("PATCH /api/leads/[id]/quotes error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi phê duyệt báo giá" } },
      { status: 500 }
    );
  }
}

