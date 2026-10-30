import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessAllLeads, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { computeLeadScore } from "@/lib/lead-scoring";

const ImportItemSchema = z.object({
  customerName: z.string().trim().min(2),
  companyName: z.string().trim().optional().default("Khách hàng doanh nghiệp"),
  phone: z.string().trim().min(8),
  email: z.string().trim().optional().nullable(),
  product: z.string().trim().min(2).default("Tư vấn màn hình LED Toàn Trung"),
  source: z.string().trim().optional().default("Website"),
  location: z.string().trim().optional().default("TP. Hồ Chí Minh"),
  estimatedValue: z.string().trim().optional().default("Đang khảo sát"),
  notes: z.string().trim().optional().default(""),
});

const BulkImportSchema = z.object({
  items: z.array(ImportItemSchema).min(1, "Danh sách import trống").max(200, "Tối đa 200 dòng mỗi lần import"),
  autoAssignRoundRobin: z.boolean().default(true),
});

function cleanDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  if (!canAccessAllLeads(user) && user.role !== "SALES" && user.role !== "MARKETING") {
    return forbiddenResponse("Chỉ nhân sự Kinh doanh, Marketing, Trưởng phòng, Giám đốc hoặc Admin mới được import dữ liệu Lead");
  }

  try {
    const body = await req.json();
    const parsed = BulkImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Dữ liệu import không đúng định dạng",
          },
        },
        { status: 400 }
      );
    }

    const { items, autoAssignRoundRobin } = parsed.data;

    // 1. Tải danh sách SĐT đang có để chống trùng tự động
    const existingLeads = await prisma.lead.findMany({
      select: { phone: true },
    });
    const existingPhoneSet = new Set(
      existingLeads.map((l) => cleanDigits(l.phone)).filter((d) => d.length >= 8)
    );

    // 2. Lấy danh sách Sales đang active để chia đều Round-Robin
    const activeSales = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [{ department: "SALES" }, { role: "SALES" }],
      },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    const defaultCategory = await prisma.productCategory.findFirst();
    const categoryId = defaultCategory?.id || "cat_led_indoor";

    const now = new Date();
    const ym = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    let runningCount = await prisma.lead.count();
    let rrIndex = 0;

    let importedCount = 0;
    let skippedDuplicates = 0;
    const assignmentSummary: Record<string, number> = {};

    // SLA mặc định: Phải gọi tiếp nhận trong vòng 2 giờ kể từ lúc import
    const slaDeadline = new Date(now.getTime() + 2 * 3_600_000);

    for (const item of items) {
      const digits = cleanDigits(item.phone);
      if (digits.length < 8 || existingPhoneSet.has(digits)) {
        skippedDuplicates += 1;
        continue;
      }
      existingPhoneSet.add(digits);

      runningCount += 1;
      const code = `TT-LED-${ym}-${String(runningCount).padStart(4, "0")}`;

      let assignedSalesId: string | undefined = user.userId;
      let assignedSalesName = user.name;

      if (autoAssignRoundRobin && activeSales.length > 0) {
        const chosen = activeSales[rrIndex % activeSales.length];
        assignedSalesId = chosen.id;
        assignedSalesName = chosen.name;
        rrIndex += 1;
      }

      const scored = computeLeadScore({
        status: "Vừa nhận thông tin",
        estimatedValue: item.estimatedValue,
        installationAddress: item.location,
        email: item.email,
        source: item.source,
      });

      const created = await prisma.lead.create({
        data: {
          code,
          customerName: item.customerName,
          companyName: item.companyName || "Khách hàng doanh nghiệp",
          phone: item.phone,
          email: item.email || null,
          location: item.location || "TP. Hồ Chí Minh",
          product: item.product,
          categoryId,
          source: item.source || "Website",
          status: "Vừa nhận thông tin",
          estimatedValue: item.estimatedValue || "Đang khảo sát",
          notes: item.notes || "",
          salesPersonId: assignedSalesId,
          createdById: user.userId,
          priorityScore: scored.score,
          priorityTier: scored.tier,
          nextFollowUpAt: slaDeadline,
          nextActionNote: "Gọi tiếp nhận & xác nhận kích thước mặt bằng LED (SLA 2h)",
        },
      });

      await prisma.leadStatusHistory.create({
        data: {
          leadId: created.id,
          fromStatus: null,
          toStatus: "Vừa nhận thông tin",
          reason: `Import hàng loạt từ nguồn ${item.source || "Website"} (Auto Round-Robin)`,
          changedById: user.userId,
        },
      });

      assignmentSummary[assignedSalesName] = (assignmentSummary[assignedSalesName] || 0) + 1;
      importedCount += 1;
    }

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "BULK_IMPORT_LEADS",
        entity: "LEAD",
        details: JSON.stringify({
          totalSubmitted: items.length,
          importedCount,
          skippedDuplicates,
          autoAssignRoundRobin,
          assignmentSummary,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã import thành công ${importedCount} Lead mới${skippedDuplicates > 0 ? ` (Đã tự động lọc bỏ ${skippedDuplicates} SĐT bị trùng)` : ""}!`,
      data: {
        importedCount,
        skippedDuplicates,
        assignmentSummary,
      },
    });
  } catch (error) {
    console.error("POST /api/leads/import error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi xử lý import danh sách Lead" } },
      { status: 500 }
    );
  }
}

