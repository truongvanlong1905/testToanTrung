import type { UserSession } from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { AppError } from "@/src/core/http";
import { BulkImportSchema, normalizeVietnamPhone } from "./contracts";
import { extractMaxCodeSuffix } from "./lead-scoring.service";
import { assertCanAssignLead, assertCanImportLeads } from "./policy";
import { logLeadAudit } from "./repository";

export async function assignLeadSalesPerson(
  user: UserSession,
  leadId: string,
  body: {
    newSalesPersonId?: string;
    reason?: string;
    expectedFromSalesId?: string | null;
  }
) {
  const { newSalesPersonId, reason, expectedFromSalesId } = body || {};

  if (!newSalesPersonId || !newSalesPersonId.trim()) {
    throw new AppError(
      400,
      "Vui lòng chọn nhân viên kinh doanh nhận bàn giao",
      "VALIDATION_ERROR"
    );
  }

  if (!reason || !reason.trim()) {
    throw new AppError(
      400,
      "Bắt buộc nhập lý do chuyển kinh doanh khác",
      "REASON_REQUIRED"
    );
  }

  const [existingLead, targetSales] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId } }),
    prisma.user.findUnique({ where: { id: newSalesPersonId } }),
  ]);

  if (!existingLead) {
    throw new AppError(404, "Không tìm thấy hồ sơ Lead", "NOT_FOUND");
  }

  assertCanAssignLead(
    user,
    existingLead,
    "Chỉ người đang phụ trách hoặc cấp quản lý (Trưởng phòng / Marketing / Giám đốc / Admin) mới được chuyển giao Lead"
  );

  if (
    expectedFromSalesId !== undefined &&
    existingLead.salesPersonId !== expectedFromSalesId
  ) {
    throw new AppError(
      409,
      "Hồ sơ Lead này vừa được chuyển giao bởi người dùng khác. Vui lòng tải lại dữ liệu.",
      "CONCURRENT_MODIFICATION"
    );
  }

  if (!targetSales || !targetSales.isActive) {
    throw new AppError(
      404,
      "Nhân viên nhận bàn giao không tồn tại hoặc đã bị vô hiệu hóa",
      "SALES_NOT_FOUND"
    );
  }

  const isTargetSalesRole =
    targetSales.role === "SALES" ||
    targetSales.department === "SALES" ||
    targetSales.role === "ADMIN" ||
    targetSales.role === "DIRECTOR";

  if (!isTargetSalesRole) {
    throw new AppError(
      400,
      "Nhân sự nhận bàn giao phải thuộc bộ phận Kinh doanh (SALES)",
      "INVALID_TARGET_SALES"
    );
  }

  const fromSalesId = existingLead.salesPersonId;
  const cleanReason = reason.trim();

  const { updatedLead, assignment } = await prisma.$transaction(async (tx) => {
    const updateRes = await tx.lead.updateMany({
      where: {
        id: leadId,
        salesPersonId: fromSalesId,
      },
      data: {
        salesPersonId: newSalesPersonId,
        updatedAt: new Date(),
      },
    });

    if (updateRes.count === 0) {
      throw new AppError(
        409,
        "Hồ sơ Lead vừa được chuyển giao bởi người dùng khác. Vui lòng tải lại dữ liệu.",
        "CONCURRENT_MODIFICATION"
      );
    }

    const createdAssignment = await tx.leadAssignment.create({
      data: {
        leadId,
        fromSalesId,
        toSalesId: newSalesPersonId,
        reason: cleanReason,
        assignedById: user.userId,
      },
    });

    await tx.leadActivity.create({
      data: {
        leadId,
        type: "NOTE",
        summary: `Chuyển phụ trách kinh doanh sang ${targetSales.name}`,
        outcome: `Lý do: ${cleanReason}`,
        createdById: user.userId,
      },
    });

    const refreshedLead = await tx.lead.findUnique({
      where: { id: leadId },
      include: {
        salesPerson: {
          select: { id: true, name: true, initials: true, email: true },
        },
      },
    });

    return {
      updatedLead: refreshedLead!,
      assignment: createdAssignment,
    };
  });

  await logLeadAudit({
    userId: user.userId,
    leadId,
    action: "ASSIGN_SALES",
    details: JSON.stringify({
      fromSalesId,
      toSalesId: newSalesPersonId,
      reason: cleanReason,
    }),
  });

  return {
    message: `Đã chuyển giao Lead cho nhân viên ${targetSales.name} thành công`,
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
    select: { phone: true, normalizedPhone: true, code: true },
  });
  const existingPhoneSet = new Set(
    existingLeads
      .map((l) => l.normalizedPhone || normalizeVietnamPhone(l.phone))
      .filter((d) => d.length >= 8)
  );

  const activeSales = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ department: "SALES" }, { role: "SALES" }],
    },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const defaultCategory = await prisma.productCategory.findFirst({
    orderBy: { sortOrder: "asc" },
  });
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

  for (const item of items) {
    const normalizedPhone = normalizeVietnamPhone(item.phone);
    if (normalizedPhone.length < 8 || existingPhoneSet.has(normalizedPhone)) {
      skippedDuplicates += 1;
      continue;
    }
    existingPhoneSet.add(normalizedPhone);

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

    const created = await prisma.lead.create({
      data: {
        code,
        customerName: item.customerName.trim(),
        companyName: item.companyName?.trim() || "",
        phone: item.phone.trim(),
        normalizedPhone,
        email: item.email || null,
        location: item.location?.trim() || "",
        product: item.product?.trim() || "Chưa chọn sản phẩm",
        categoryId,
        source: item.source || "Website",
        contactChannel: item.contactChannel || item.source || "Điền form",
        status: "Vừa nhận thông tin",
        notes: item.notes || "",
        salesPersonId: assignedSalesId,
        createdById: user.userId,
      },
    });

    await prisma.leadStatusHistory.create({
      data: {
        leadId: created.id,
        fromStatus: null,
        toStatus: "Vừa nhận thông tin",
        reason: `Import hàng loạt từ nguồn ${item.source || "Website"}`,
        changedById: user.userId,
      },
    });

    if (assignedSalesId) {
      await prisma.leadAssignment.create({
        data: {
          leadId: created.id,
          toSalesId: assignedSalesId,
          reason: `Phân công tự động khi import nguồn ${item.source || "Website"}`,
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
