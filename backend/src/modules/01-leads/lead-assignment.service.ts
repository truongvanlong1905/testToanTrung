import type { UserSession } from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { AppError } from "@/src/core/http";
import { BulkImportSchema } from "./contracts";
import { computeLeadScore, extractMaxCodeSuffix } from "./lead-scoring.service";
import { assertCanAssignLead, assertCanImportLeads } from "./policy";
import { logLeadAudit } from "./repository";

function cleanDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function assignLeadSalesPerson(
  user: UserSession,
  leadId: string,
  body: { newSalesPersonId?: string; reason?: string }
) {
  const { newSalesPersonId, reason } = body || {};

  if (!newSalesPersonId) {
    throw new AppError(
      400,
      "Vui lòng chọn nhân viên Sales mới",
      "VALIDATION_ERROR"
    );
  }

  const [existingLead, targetSales] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId } }),
    prisma.user.findUnique({ where: { id: newSalesPersonId } }),
  ]);

  if (!existingLead) {
    throw new AppError(404, "Không tìm thấy khách hàng", "NOT_FOUND");
  }

  assertCanAssignLead(
    user,
    existingLead,
    "Chỉ người đang phụ trách hoặc cấp Trưởng phòng / Trưởng ban / Giám đốc / Admin mới được bàn giao Lead"
  );

  if (!targetSales || !targetSales.isActive) {
    throw new AppError(
      404,
      "Nhân viên Sales không tồn tại hoặc đã vô hiệu hóa",
      "SALES_NOT_FOUND"
    );
  }

  const fromSalesId = existingLead.salesPersonId;

  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: { salesPersonId: newSalesPersonId },
    include: {
      salesPerson: {
        select: { id: true, name: true, initials: true, email: true },
      },
    },
  });

  const assignment = await prisma.leadAssignment.create({
    data: {
      leadId,
      fromSalesId,
      toSalesId: newSalesPersonId,
      reason: reason || "Bàn giao phụ trách khách hàng",
      assignedById: user.userId,
    },
  });

  await logLeadAudit({
    userId: user.userId,
    leadId,
    action: "ASSIGN_SALES",
    details: JSON.stringify({
      fromSalesId,
      toSalesId: newSalesPersonId,
      reason,
    }),
  });

  return {
    message: `Đã bàn giao Lead cho nhân viên ${targetSales.name} thành công`,
    lead: updatedLead,
    assignment,
  };
}

export async function bulkImportLeadsWithRoundRobin(
  user: UserSession,
  body: unknown
) {
  assertCanImportLeads(user);

  const parsed = BulkImportSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message || "Dữ liệu import không đúng định dạng",
      "VALIDATION_ERROR"
    );
  }

  const { items, autoAssignRoundRobin } = parsed.data;

  const existingLeads = await prisma.lead.findMany({
    select: { phone: true, code: true },
  });
  const existingPhoneSet = new Set(
    existingLeads.map((l) => cleanDigits(l.phone)).filter((d) => d.length >= 8)
  );

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
  const ym = `${String(now.getFullYear()).slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  let runningCount = extractMaxCodeSuffix(existingLeads, existingLeads.length);
  let rrIndex = 0;

  let importedCount = 0;
  let skippedDuplicates = 0;
  const assignmentSummary: Record<string, number> = {};

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

    if (assignedSalesId) {
      await prisma.leadAssignment.create({
        data: {
          leadId: created.id,
          toSalesId: assignedSalesId,
          reason: `Phân công tự động Round-Robin khi import nguồn ${item.source || "Website"}`,
          assignedById: user.userId,
        },
      });
    }

    assignmentSummary[assignedSalesName] =
      (assignmentSummary[assignedSalesName] || 0) + 1;
    importedCount += 1;
  }

  await logLeadAudit({
    userId: user.userId,
    action: "BULK_IMPORT_LEADS",
    details: JSON.stringify({
      totalSubmitted: items.length,
      importedCount,
      skippedDuplicates,
      autoAssignRoundRobin,
      assignmentSummary,
    }),
  });

  return {
    message: `Đã import thành công ${importedCount} Lead mới${
      skippedDuplicates > 0
        ? ` (Đã tự động lọc bỏ ${skippedDuplicates} SĐT bị trùng)`
        : ""
    }!`,
    importedCount,
    skippedDuplicates,
    assignmentSummary,
  };
}
