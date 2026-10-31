import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessAllLeads, unauthorizedResponse } from "@/lib/auth";
import { computeLeadScore, computeLeadSla, extractMaxCodeSuffix } from "@/lib/lead-scoring";

function maskPhoneIfRestricted(phone: string, allowFull: boolean): string {
  if (allowFull || !phone) return phone;
  const digits = phone.trim();
  if (digits.length <= 6) return "***";
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

const CreateLeadSchema = z
  .object({
    customerName: z.string().trim().min(2, "Tên khách hàng phải có ít nhất 2 ký tự"),
    companyName: z.string().trim().optional().default("Khách hàng cá nhân"),
    phone: z.string().trim().min(8, "Số điện thoại không hợp lệ"),
    email: z.string().trim().email("Email không hợp lệ").optional().or(z.literal("")),
    installationAddress: z.string().trim().optional(),
    location: z.string().trim().optional().default("TP. Hồ Chí Minh"),
    product: z.string().trim().min(2, "Vui lòng nhập sản phẩm / nhu cầu hiển thị LED"),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    source: z.string().default("Hotline"),
    status: z.string().default("Vừa nhận thông tin"),
    failureReason: z.string().trim().optional().nullable(),
    salesPersonId: z.string().optional(),
    estimatedValue: z.string().optional().default("Đang khảo sát"),
    notes: z.string().optional().default(""),
    ledWidth: z.number().positive().max(200).optional().nullable(),
    ledHeight: z.number().positive().max(200).optional().nullable(),
    ledModuleType: z.string().max(200).optional().nullable(),
    attachments: z
      .array(
        z.object({
          fileName: z.string(),
          fileUrl: z.string(),
          fileSize: z.number().optional(),
          fileType: z.string().default("IMAGE"),
        })
      )
      .optional(),
  })
  .refine(
    (val) =>
      val.status !== "Thất bại" ||
      (typeof val.failureReason === "string" && val.failureReason.trim().length > 0),
    {
      message: "Bắt buộc phải nhập lý do thất bại khi chọn trạng thái Thất bại",
      path: ["failureReason"],
    }
  );

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const source = searchParams.get("source") || "all";
    const salesId = searchParams.get("salesId") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "8")));

    // Build filter
    const where: Record<string, unknown> = {};

    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { customerName: { contains: q } },
        { companyName: { contains: q } },
        { phone: { contains: q } },
        { code: { contains: q } },
        { product: { contains: q } },
      ];
    }

    if (status !== "all") {
      where.status = status;
    }

    if (source !== "all") {
      where.source = source;
    }

    if (salesId !== "all") {
      where.salesPersonId = salesId;
    }

    const [statusGroups, salesGroups, totalFiltered, leads, salesUsers] = await Promise.all([
      prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.lead.groupBy({
        by: ["salesPersonId"],
        _count: { _all: true },
        orderBy: { _count: { salesPersonId: "desc" } },
      }),
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: {
          category: true,
          salesPerson: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              initials: true,
            },
          },
          attachments: true,
          _count: { select: { activities: true, quotes: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, initials: true },
      }),
    ]);

    const countStatuses = (...names: string[]) =>
      statusGroups
        .filter((group) => names.includes(group.status))
        .reduce((sum, group) => sum + group._count._all, 0);
    const totalAll = statusGroups.reduce((sum, group) => sum + group._count._all, 0);
    const newCount = countStatuses("Vừa nhận thông tin");
    const quotingCount = countStatuses("Đang soạn báo giá", "Đã gửi báo giá");
    const wonCount = countStatuses("Chốt thành công");
    const lostCount = countStatuses("Thất bại");

    const salesById = new Map(salesUsers.map((u) => [u.id, u]));
    const salesLeaderboard = salesGroups
      .map((group) => {
        const u = group.salesPersonId ? salesById.get(group.salesPersonId) : undefined;
        return u ? { name: u.name, initials: u.initials, count: group._count._all } : null;
      })
      .filter((entry): entry is { name: string; initials: string; count: number } => entry !== null)
      .sort((a, b) => b.count - a.count);

    const hasFullLeadAccess = canAccessAllLeads(user);

    return NextResponse.json({
      success: true,
      data: {
        leads: leads.map((l) => {
          const isOwner =
            hasFullLeadAccess ||
            !l.salesPersonId ||
            l.salesPersonId === user.userId ||
            l.createdById === user.userId;
          const scored = computeLeadScore({
            status: l.status,
            estimatedValue: l.estimatedValue,
            installationAddress: l.installationAddress,
            email: l.email,
            source: l.source,
            ledWidth: l.ledWidth,
            ledHeight: l.ledHeight,
            activitiesCount: l._count.activities,
            quotesCount: l._count.quotes,
          });
          const sla = computeLeadSla({
            status: l.status,
            createdAt: l.createdAt,
            lastContactedAt: l.lastContactedAt,
            nextFollowUpAt: l.nextFollowUpAt,
          });
          return {
            id: l.id,
            code: l.code,
            customerName: l.customerName,
            companyName: l.companyName,
            phone: maskPhoneIfRestricted(l.phone, isOwner),
            email: isOwner ? l.email || "" : l.email ? "***@***" : "",
            product: l.product,
            category: l.category?.name || "LED trong nhà",
            categoryId: l.categoryId,
            source: l.source,
            status: l.status,
            failureReason: l.failureReason,
            estimatedValue: l.estimatedValue || "Đang khảo sát",
            installationAddress: l.installationAddress || "",
            location: l.location,
            notes: l.notes || "",
            createdAt: l.createdAt.toLocaleDateString("vi-VN"),
            priorityScore: scored.score,
            priorityTier: scored.tier,
            slaStatus: sla.slaStatus,
            slaLabel: sla.slaLabel,
            nextFollowUpAt: l.nextFollowUpAt ? l.nextFollowUpAt.toISOString() : null,
            nextActionNote: l.nextActionNote || null,
            ledWidth: l.ledWidth,
            ledHeight: l.ledHeight,
            ledModuleType: l.ledModuleType,
            discountPercent: l.discountPercent || 0,
            directorApprovalStatus: l.directorApprovalStatus || "NONE",
            directorApprovedByName: l.directorApprovedByName || null,
            activitiesCount: l._count.activities,
            quotesCount: l._count.quotes,
            salesPerson: {
              id: l.salesPerson?.id,
              name: l.salesPerson?.name || "Chưa phân công",
              initials: l.salesPerson?.initials || "TT",
            },
            attachmentsCount: l.attachments.length,
          };
        }),
        stats: {
          total: totalAll,
          newLeads: newCount,
          quotingLeads: quotingCount,
          wonLeads: wonCount,
          lostLeads: lostCount,
          salesLeaderboard,
        },
      },
      meta: {
        total: totalFiltered,
        page,
        pageSize,
        totalPages: Math.ceil(totalFiltered / pageSize) || 1,
      },
    });
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi tải danh sách Lead" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    const body = await req.json();

    const validation = CreateLeadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.issues[0]?.message || "Dữ liệu không hợp lệ",
          },
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Resolve Category ID
    let categoryId = data.categoryId;
    if (!categoryId && data.categoryName) {
      const cat = await prisma.productCategory.findFirst({
        where: { name: data.categoryName },
      });
      categoryId = cat?.id;
    }

    if (!categoryId) {
      const defaultCat = await prisma.productCategory.findFirst();
      categoryId = defaultCat?.id || "cat_led_indoor";
    }

    // Resolve Sales ID
    let salesPersonId = data.salesPersonId;
    if (!salesPersonId) {
      const defaultSales = await prisma.user.findFirst({
        where: { role: "SALES", isActive: true },
      });
      salesPersonId = defaultSales?.id;
    }

    // Tự sinh mã Lead chống trùng lặp tuyệt đối: TT-LED-YYMM-XXXX
    const now = new Date();
    const yearMonth = `${String(now.getFullYear()).slice(-2)}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    const existingCodes = await prisma.lead.findMany({
      select: { code: true },
    });
    const maxSeq = extractMaxCodeSuffix(existingCodes, existingCodes.length);
    const sequence = String(maxSeq + 1).padStart(4, "0");
    const code = `TT-LED-${yearMonth}-${sequence}`;

    const scoredNew = computeLeadScore({
      status: data.status,
      estimatedValue: data.estimatedValue,
      installationAddress: data.installationAddress,
      email: data.email,
      source: data.source,
      ledWidth: data.ledWidth,
      ledHeight: data.ledHeight,
    });
    const slaDeadline = new Date(now.getTime() + 2 * 3_600_000);

    // Tạo Lead trong Database
    const newLead = await prisma.lead.create({
      data: {
        code,
        customerName: data.customerName,
        companyName: data.companyName || "Khách hàng cá nhân",
        phone: data.phone,
        email: data.email || null,
        installationAddress: data.installationAddress || null,
        location: data.location || "TP. Hồ Chí Minh",
        product: data.product,
        categoryId,
        source: data.source,
        status: data.status,
        failureReason: data.status === "Thất bại" ? data.failureReason?.trim() || null : null,
        salesPersonId,
        createdById: user?.userId,
        estimatedValue: data.estimatedValue || "Đang khảo sát",
        notes: data.notes || "",
        ledWidth: data.ledWidth ?? null,
        ledHeight: data.ledHeight ?? null,
        ledModuleType: data.ledModuleType ?? null,
        priorityScore: scoredNew.score,
        priorityTier: scoredNew.tier,
        nextFollowUpAt: slaDeadline,
        nextActionNote: "Gọi tiếp nhận & xác nhận quy cách màn hình LED (SLA 2h)",
        attachments:
          data.attachments && data.attachments.length > 0
            ? {
                create: data.attachments.map((att) => ({
                  fileName: att.fileName,
                  fileUrl: att.fileUrl,
                  fileSize: att.fileSize,
                  fileType: att.fileType,
                  uploadedById: user?.userId,
                })),
              }
            : undefined,
      },
      include: {
        category: true,
        salesPerson: true,
        attachments: true,
      },
    });

    // 1. Tạo bản ghi LeadStatusHistory ban đầu
    await prisma.leadStatusHistory.create({
      data: {
        leadId: newLead.id,
        fromStatus: null,
        toStatus: newLead.status,
        reason:
          newLead.status === "Thất bại" && newLead.failureReason
            ? newLead.failureReason
            : "Tiếp nhận Lead mới vào hệ thống",
        changedById: user?.userId || salesPersonId,
      },
    });

    // 2. Tạo bản ghi LeadAssignment ban đầu
    if (salesPersonId) {
      await prisma.leadAssignment.create({
        data: {
          leadId: newLead.id,
          toSalesId: salesPersonId,
          reason: "Phân công xử lý khi tiếp nhận Lead mới",
          assignedById: user?.userId,
        },
      });
    }

    // 3. Ghi AuditLog
    await prisma.auditLog.create({
      data: {
        userId: user?.userId,
        leadId: newLead.id,
        action: "CREATE_LEAD",
        entity: "LEAD",
        entityId: newLead.id,
        details: JSON.stringify({
          code: newLead.code,
          customerName: newLead.customerName,
          product: newLead.product,
          status: newLead.status,
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tiếp nhận Lead mới thành công",
        data: {
          lead: {
            id: newLead.id,
            code: newLead.code,
            customerName: newLead.customerName,
            companyName: newLead.companyName,
            phone: newLead.phone,
            email: newLead.email || "",
            product: newLead.product,
            category: newLead.category?.name || "LED trong nhà",
            categoryId: newLead.categoryId,
            source: newLead.source,
            status: newLead.status,
            failureReason: newLead.failureReason,
            estimatedValue: newLead.estimatedValue || "Đang khảo sát",
            installationAddress: newLead.installationAddress || "",
            location: newLead.location,
            notes: newLead.notes || "",
            createdAt: newLead.createdAt.toLocaleDateString("vi-VN"),
            salesPerson: {
              id: newLead.salesPerson?.id,
              name: newLead.salesPerson?.name || "Chưa phân công",
              initials: newLead.salesPerson?.initials || "TT",
            },
            attachments: newLead.attachments,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/leads error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi tạo Lead mới" },
      },
      { status: 500 }
    );
  }
}
