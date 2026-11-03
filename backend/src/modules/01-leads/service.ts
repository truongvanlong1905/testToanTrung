import {
  canAccessAllLeadRecords,
  canUserAccessLeadRecord,
  type UserSession,
} from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { AppError } from "@/src/core/http";
import { getTrackingDashboardSnapshot } from "@/src/modules/02-tracking/public";
import { getAdsDashboardSnapshot } from "@/src/modules/03-ads-keywords/public";
import { getReportsDashboardSnapshot } from "@/src/modules/04-reports-dashboard/public";
import {
  CreateActivitySchema,
  CreateLeadSchema,
  maskPhoneIfRestricted,
  normalizeVietnamPhone,
  OFFICIAL_DEMAND_TYPES,
  OFFICIAL_LEAD_STATUSES,
  UpdateLeadSchema,
  WON_STATUS,
} from "./contracts";
import { extractMaxCodeSuffix } from "./lead-scoring.service";
import {
  assertCanAccessLeadsModule,
  assertCanModifyLead,
  assertCanViewLead,
  canUserSearchLeads,
} from "./policy";
import {
  createLeadAttachmentRecord,
  findLeadFullDetailsById,
  logLeadAudit,
} from "./repository";

/**
 * Parse YYYY-MM-DD in Vietnam timezone (Asia/Ho_Chi_Minh, UTC+07:00)
 */
export function parseVietnamDay(
  value: string | null | undefined,
  endOfDay: boolean
): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const isoWithOffset = `${value}T${
    endOfDay ? "23:59:59.999" : "00:00:00.000"
  }+07:00`;
  const date = new Date(isoWithOffset);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function formatVietnamDayKey(date: Date): string {
  const vnTime = new Date(date.getTime() + 7 * 3600_000);
  const yyyy = vnTime.getUTCFullYear();
  const mm = String(vnTime.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(vnTime.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatVietnamDateTime(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildLeadScopeWhere(user: UserSession): Record<string, unknown> {
  if (canAccessAllLeadRecords(user)) {
    return {};
  }
  return {
    OR: [
      { salesPersonId: user.userId },
      { AND: [{ salesPersonId: null }, { createdById: user.userId }] },
    ],
  };
}

function sanitizeLeadProductText(rawProduct: string | null | undefined, fallback: string): string {
  const cleaned = (rawProduct || "")
    .replace(/\s*\([^)]*m²[^)]*\)/gi, "")
    .trim();
  return cleaned || fallback;
}

function sanitizeLeadNotesText(rawNotes: string | null | undefined): string {
  return (rawNotes || "")
    .replace(/\[AI Bóc tách nhanh\]\s*(Nội dung gốc:\s*)?/gi, "")
    .trim();
}

export async function listLeads(
  user: UserSession,
  params: {
    search?: string | null;
    status?: string | null;
    source?: string | null;
    salesId?: string | null;
    categoryId?: string | null;
    demandType?: string | null;
    from?: string | null;
    to?: string | null;
    page?: string | null;
    pageSize?: string | null;
  }
) {
  assertCanAccessLeadsModule(user);

  const search = params.search || "";
  const status = params.status || "all";
  const source = params.source || "all";
  const salesId = params.salesId || "all";
  const categoryId = params.categoryId || "all";
  const demandType = params.demandType || "all";
  const fromDate = parseVietnamDay(params.from, false);
  const toDate = parseVietnamDay(params.to, true);

  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, parseInt(params.pageSize || "12", 10) || 12)
  );

  const hasFullLeadAccess = canAccessAllLeadRecords(user);
  const scopeWhere = buildLeadScopeWhere(user);

  const andConditions: Record<string, unknown>[] = [];
  if (Object.keys(scopeWhere).length > 0) {
    andConditions.push(scopeWhere);
  }

  if (search.trim()) {
    const q = search.trim();
    const normQ = normalizeVietnamPhone(q);
    const searchOr: Record<string, unknown>[] = [
      { customerName: { contains: q } },
      { companyName: { contains: q } },
      { phone: { contains: q } },
      { code: { contains: q } },
      { product: { contains: q } },
      { productCustomText: { contains: q } },
    ];
    if (normQ.length >= 6) {
      searchOr.push({ normalizedPhone: { contains: normQ } });
    }
    andConditions.push({ OR: searchOr });
  }

  if (status !== "all") {
    andConditions.push({ status });
  }

  if (source !== "all") {
    andConditions.push({
      OR: [{ source }, { contactChannel: source }],
    });
  }

  if (salesId !== "all" && hasFullLeadAccess) {
    if (salesId === "unassigned") {
      andConditions.push({ salesPersonId: null });
    } else {
      andConditions.push({ salesPersonId: salesId });
    }
  }

  if (categoryId !== "all") {
    andConditions.push({ categoryId });
  }

  if (demandType !== "all") {
    andConditions.push({ demandType });
  }

  if (fromDate || toDate) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (fromDate) createdAt.gte = fromDate;
    if (toDate) createdAt.lte = toDate;
    andConditions.push({ createdAt });
  }

  const where: Record<string, unknown> =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // Find duplicate normalizedPhones across the entire database to mark true duplicate warnings
  const [
    statusGroups,
    salesGroups,
    totalFiltered,
    leads,
    salesUsers,
    dupPhoneGroups,
  ] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      where: scopeWhere,
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["salesPersonId"],
      where: scopeWhere,
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
        _count: { select: { activities: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, initials: true },
    }),
    prisma.lead.groupBy({
      by: ["normalizedPhone"],
      where: {
        normalizedPhone: { not: null },
      },
      _count: { _all: true },
    }),
  ]);

  const duplicatePhonesSet = new Set(
    dupPhoneGroups
      .filter((g) => g.normalizedPhone && g._count._all > 1)
      .map((g) => g.normalizedPhone!)
  );

  const countStatuses = (...names: string[]) =>
    statusGroups
      .filter((group) => names.includes(group.status))
      .reduce((sum, group) => sum + group._count._all, 0);
  const totalAll = statusGroups.reduce(
    (sum, group) => sum + group._count._all,
    0
  );
  const newCount = countStatuses("Vừa nhận thông tin");
  const draftingQuoteCount = countStatuses("Đang soạn báo giá");
  const sentQuoteCount = countStatuses("Đã gửi báo giá");
  const quotingCount = draftingQuoteCount + sentQuoteCount;
  const wonCount = countStatuses("Chốt thành công");
  const lostCount = countStatuses("Thất bại");

  const salesById = new Map(salesUsers.map((u) => [u.id, u]));
  const salesLeaderboard = salesGroups
    .map((group) => {
      const u = group.salesPersonId
        ? salesById.get(group.salesPersonId)
        : undefined;
      return u
        ? { name: u.name, initials: u.initials, count: group._count._all }
        : null;
    })
    .filter(
      (entry): entry is { name: string; initials: string; count: number } =>
        entry !== null
    )
    .sort((a, b) => b.count - a.count);

  return {
    data: {
      leads: leads.map((l) => {
        const isOwner = canUserAccessLeadRecord(user, l);
        const normPhone = l.normalizedPhone || normalizeVietnamPhone(l.phone);
        const isDuplicatePhone =
          Boolean(normPhone) && duplicatePhonesSet.has(normPhone);

        return {
          id: l.id,
          code: l.code,
          customerName: l.customerName,
          companyName: l.companyName || "",
          phone: maskPhoneIfRestricted(l.phone, isOwner),
          email: isOwner ? l.email || "" : l.email ? "***@***" : "",
          product: sanitizeLeadProductText(
            l.product,
            l.category?.name || "Chưa chọn sản phẩm"
          ),
          productCustomText: l.productCustomText || "",
          demandType: l.demandType || "",
          category: l.category?.name || "Màn hình LED Indoor",
          categoryId: l.categoryId,
          categoryGroup: l.category?.group || "LED_SCREEN",
          source: l.source || "Hotline",
          contactChannel: l.contactChannel || l.source || "Hotline",
          status: l.status,
          failureReason: l.failureReason || null,
          quoteSentAt: l.quoteSentAt ? l.quoteSentAt.toISOString() : null,
          quoteSentAtDisplay: formatVietnamDateTime(l.quoteSentAt),
          customerResponded: Boolean(l.customerRespondedAt),
          customerRespondedAt: l.customerRespondedAt
            ? l.customerRespondedAt.toISOString()
            : null,
          customerResponseNote: l.customerResponseNote || "",
          installationAddress: l.installationAddress || "",
          location: l.location || "",
          notes: sanitizeLeadNotesText(l.notes),
          createdAt: l.createdAt.toLocaleDateString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
          }),
          createdAtTime: formatVietnamDateTime(l.createdAt),
          createdAtISO: l.createdAt.toISOString(),
          isDuplicatePhone,
          activitiesCount: l._count.activities,
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
        draftingQuoteLeads: draftingQuoteCount,
        sentQuoteLeads: sentQuoteCount,
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
  };
}

export async function createLead(user: UserSession, body: unknown) {
  assertCanAccessLeadsModule(user);

  const validation = CreateLeadSchema.safeParse(body);
  if (!validation.success) {
    throw new AppError(
      400,
      validation.error.issues[0]?.message || "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const data = validation.data;
  const normalizedPhone = normalizeVietnamPhone(data.phone);

  let category = null;
  if (data.categoryId) {
    category = await prisma.productCategory.findUnique({
      where: { id: data.categoryId },
    });
  }
  if (!category && data.categoryName) {
    category = await prisma.productCategory.findFirst({
      where: { name: data.categoryName },
    });
  }
  if (!category && data.product) {
    category = await prisma.productCategory.findFirst({
      where: { name: data.product },
    });
  }
  if (!category) {
    category = await prisma.productCategory.findFirst({
      orderBy: { sortOrder: "asc" },
    });
  }

  const categoryId = category?.id || "cat_led_indoor";
  const resolvedProduct =
    data.product && data.product.trim().length > 0
      ? data.product.trim()
      : category?.name || "Chưa chọn sản phẩm";

  if (
    (category?.allowCustomText || resolvedProduct.includes("Khác")) &&
    data.productCustomText !== undefined &&
    data.productCustomText !== null &&
    data.productCustomText.trim().length === 0 &&
    resolvedProduct.includes("Khác")
  ) {
    throw new AppError(
      400,
      "Vui lòng nhập nội dung chi tiết khi chọn mục sản phẩm 'Khác'",
      "CUSTOM_PRODUCT_REQUIRED"
    );
  }

  let salesPersonId: string | null | undefined = data.salesPersonId || null;
  if (data.transferToOtherSales) {
    if (!salesPersonId) {
      throw new AppError(
        400,
        "Vui lòng chọn nhân viên kinh doanh nhận bàn giao",
        "SALES_REQUIRED"
      );
    }
    const targetSales = await prisma.user.findUnique({
      where: { id: salesPersonId },
    });
    if (!targetSales || !targetSales.isActive) {
      throw new AppError(
        404,
        "Nhân viên nhận bàn giao không tồn tại hoặc đã bị khóa",
        "SALES_NOT_FOUND"
      );
    }
  } else if (!salesPersonId) {
    if (user.role === "SALES" || user.department === "SALES") {
      salesPersonId = user.userId;
    } else {
      const defaultSales = await prisma.user.findFirst({
        where: {
          isActive: true,
          OR: [{ role: "SALES" }, { department: "SALES" }],
        },
        orderBy: { createdAt: "asc" },
      });
      salesPersonId = defaultSales?.id || null;
    }
  }

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

  const quoteSentAt =
    data.status === "Đã gửi báo giá" || data.status === "Chốt thành công"
      ? now
      : null;
  const customerRespondedAt =
    data.customerResponded ||
    data.status === "Chốt thành công" ||
    (data.status === "Thất bại" && quoteSentAt)
      ? now
      : null;

  const newLead = await prisma.lead.create({
    data: {
      code,
      customerName: data.customerName.trim(),
      companyName: data.companyName?.trim() || "",
      phone: data.phone.trim(),
      normalizedPhone,
      email: data.email || null,
      installationAddress: data.installationAddress || null,
      location: data.location?.trim() || "",
      product: resolvedProduct,
      productCustomText: data.productCustomText?.trim() || null,
      demandType: data.demandType?.trim() || null,
      categoryId,
      source: data.source || "Hotline",
      contactChannel: data.contactChannel || data.source || "Hotline",
      status: data.status,
      failureReason:
        data.status === "Thất bại" ? data.failureReason?.trim() || null : null,
      quoteSentAt,
      customerRespondedAt,
      customerResponseNote: data.customerResponseNote?.trim() || null,
      salesPersonId,
      createdById: user.userId,
      notes: data.notes || "",
      attachments:
        data.attachments && data.attachments.length > 0
          ? {
              create: data.attachments.map((att) => ({
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileSize: att.fileSize,
                fileType: att.fileType,
                uploadedById: user.userId,
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

  await prisma.leadStatusHistory.create({
    data: {
      leadId: newLead.id,
      fromStatus: null,
      toStatus: newLead.status,
      reason:
        newLead.status === "Thất bại" && newLead.failureReason
          ? newLead.failureReason
          : "Tiếp nhận Lead mới vào hệ thống",
      changedById: user.userId || salesPersonId || undefined,
    },
  });

  if (salesPersonId) {
    await prisma.leadAssignment.create({
      data: {
        leadId: newLead.id,
        fromSalesId:
          data.transferToOtherSales && salesPersonId !== user.userId
            ? user.userId
            : null,
        toSalesId: salesPersonId,
        reason: data.transferToOtherSales
          ? data.transferReason?.trim() || "Chuyển kinh doanh khác khi tạo Lead"
          : "Phân công phụ trách khi tiếp nhận Lead mới",
        assignedById: user.userId,
      },
    });
  }

  await logLeadAudit({
    userId: user.userId,
    leadId: newLead.id,
    action: "CREATE_LEAD",
    details: JSON.stringify({
      code: newLead.code,
      customerName: newLead.customerName,
      product: newLead.product,
      demandType: newLead.demandType,
      status: newLead.status,
      salesPersonId,
    }),
  });

  return {
    message: "Tiếp nhận Lead mới thành công",
    lead: {
      id: newLead.id,
      code: newLead.code,
      customerName: newLead.customerName,
      companyName: newLead.companyName || "",
      phone: newLead.phone,
      email: newLead.email || "",
      product: newLead.product,
      productCustomText: newLead.productCustomText || "",
      demandType: newLead.demandType || "",
      category: newLead.category?.name || "Màn hình LED Indoor",
      categoryId: newLead.categoryId,
      source: newLead.source,
      contactChannel: newLead.contactChannel || newLead.source,
      status: newLead.status,
      failureReason: newLead.failureReason,
      quoteSentAt: newLead.quoteSentAt ? newLead.quoteSentAt.toISOString() : null,
      customerResponded: Boolean(newLead.customerRespondedAt),
      customerRespondedAt: newLead.customerRespondedAt
        ? newLead.customerRespondedAt.toISOString()
        : null,
      customerResponseNote: newLead.customerResponseNote || "",
      installationAddress: newLead.installationAddress || "",
      location: newLead.location || "",
      notes: newLead.notes || "",
      createdAt: newLead.createdAt.toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      createdAtTime: formatVietnamDateTime(newLead.createdAt),
      createdAtISO: newLead.createdAt.toISOString(),
      salesPerson: {
        id: newLead.salesPerson?.id,
        name: newLead.salesPerson?.name || "Chưa phân công",
        initials: newLead.salesPerson?.initials || "TT",
      },
      attachments: newLead.attachments,
    },
  };
}

export async function getLeadDetails(user: UserSession, id: string) {
  assertCanAccessLeadsModule(user);

  const lead = await findLeadFullDetailsById(id);

  if (!lead) {
    throw new AppError(404, "Không tìm thấy hồ sơ Lead", "NOT_FOUND");
  }

  assertCanViewLead(user, lead);

  return {
    lead: {
      id: lead.id,
      code: lead.code,
      customerName: lead.customerName,
      companyName: lead.companyName || "",
      phone: lead.phone,
      email: lead.email || "",
      product: sanitizeLeadProductText(
        lead.product,
        lead.category?.name || "Chưa chọn sản phẩm"
      ),
      productCustomText: lead.productCustomText || "",
      demandType: lead.demandType || "",
      category: lead.category?.name || "Màn hình LED Indoor",
      categoryId: lead.categoryId,
      categoryGroup: lead.category?.group || "LED_SCREEN",
      source: lead.source,
      contactChannel: lead.contactChannel || lead.source || "Hotline",
      status: lead.status,
      failureReason: lead.failureReason,
      quoteSentAt: lead.quoteSentAt ? lead.quoteSentAt.toISOString() : null,
      quoteSentAtDisplay: formatVietnamDateTime(lead.quoteSentAt),
      customerResponded: Boolean(lead.customerRespondedAt),
      customerRespondedAt: lead.customerRespondedAt
        ? lead.customerRespondedAt.toISOString()
        : null,
      customerRespondedAtDisplay: formatVietnamDateTime(lead.customerRespondedAt),
      customerResponseNote: lead.customerResponseNote || "",
      installationAddress: lead.installationAddress || "",
      location: lead.location || "",
      notes: sanitizeLeadNotesText(lead.notes),
      createdAt: lead.createdAt.toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      createdAtTime: formatVietnamDateTime(lead.createdAt),
      createdAtISO: lead.createdAt.toISOString(),
      salesPerson: {
        id: lead.salesPerson?.id,
        name: lead.salesPerson?.name || "Chưa phân công",
        initials: lead.salesPerson?.initials || "TT",
      },
      statusHistory: lead.statusHistory.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        reason: h.reason,
        changedBy: h.changedBy?.name || "Hệ thống",
        createdAt: formatVietnamDateTime(h.createdAt),
      })),
      assignments: lead.assignments.map((a) => ({
        id: a.id,
        fromSales: a.fromSales?.name || null,
        toSales: a.toSales.name,
        reason: a.reason,
        assignedBy: a.assignedBy?.name || "Hệ thống",
        createdAt: formatVietnamDateTime(a.createdAt),
      })),
      attachments: lead.attachments.map((att) => ({
        id: att.id,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize ?? undefined,
        fileType: att.fileType,
        uploadedBy: att.uploadedBy?.name || "Người dùng",
        createdAt: formatVietnamDateTime(att.createdAt),
      })),
      activities: lead.activities.map((act) => ({
        id: act.id,
        type: act.type,
        summary: act.summary,
        outcome: act.outcome,
        nextFollowUpAt: act.nextFollowUpAt
          ? act.nextFollowUpAt.toISOString()
          : null,
        createdBy: act.createdBy?.name || "Hệ thống",
        createdByInitials: act.createdBy?.initials || "TT",
        createdAt: formatVietnamDateTime(act.createdAt),
      })),
    },
  };
}

export async function updateLead(
  user: UserSession,
  id: string,
  body: unknown
) {
  assertCanAccessLeadsModule(user);

  const parsedBody = UpdateLeadSchema.safeParse(body);
  if (!parsedBody.success) {
    throw new AppError(
      400,
      parsedBody.error.issues[0]?.message || "Thông tin cập nhật không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const existing = await prisma.lead.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!existing) {
    throw new AppError(404, "Không tìm thấy hồ sơ Lead", "NOT_FOUND");
  }

  assertCanModifyLead(
    user,
    existing,
    "Chỉ nhân sự phụ trách Lead này hoặc cấp quản lý mới được chỉnh sửa"
  );

  const data = parsedBody.data;
  const now = new Date();

  let nextCategoryId = existing.categoryId;
  if (data.categoryId) {
    nextCategoryId = data.categoryId;
  } else if (data.categoryName) {
    const cat = await prisma.productCategory.findFirst({
      where: { name: data.categoryName },
    });
    if (cat) nextCategoryId = cat.id;
  }

  const nextPhone = data.phone !== undefined ? data.phone.trim() : existing.phone;
  const nextNormalizedPhone =
    data.phone !== undefined
      ? normalizeVietnamPhone(data.phone)
      : existing.normalizedPhone || normalizeVietnamPhone(existing.phone);

  const nextStatus = data.status ?? existing.status;
  if (
    !OFFICIAL_LEAD_STATUSES.includes(
      nextStatus as (typeof OFFICIAL_LEAD_STATUSES)[number]
    )
  ) {
    throw new AppError(400, "Trạng thái tiến độ không hợp lệ", "INVALID_STATUS");
  }

  let nextQuoteSentAt = existing.quoteSentAt;
  if (
    (nextStatus === "Đã gửi báo giá" || nextStatus === "Chốt thành công") &&
    !nextQuoteSentAt
  ) {
    nextQuoteSentAt = now;
  }

  let nextCustomerRespondedAt = existing.customerRespondedAt;
  let nextCustomerResponseNote =
    data.customerResponseNote !== undefined
      ? data.customerResponseNote?.trim() || null
      : existing.customerResponseNote;

  if (data.customerResponded === true) {
    nextCustomerRespondedAt = nextCustomerRespondedAt || now;
  } else if (data.customerResponded === false) {
    nextCustomerRespondedAt = null;
    nextCustomerResponseNote = null;
  } else if (
    (nextStatus === "Chốt thành công" || nextStatus === "Thất bại") &&
    nextQuoteSentAt &&
    !nextCustomerRespondedAt
  ) {
    nextCustomerRespondedAt = now;
  }

  let nextSalesPersonId = existing.salesPersonId;
  let targetSalesName: string | null = null;

  if (data.transferToOtherSales && data.newSalesPersonId) {
    const targetSales = await prisma.user.findUnique({
      where: { id: data.newSalesPersonId },
    });
    if (!targetSales || !targetSales.isActive) {
      throw new AppError(
        404,
        "Nhân viên nhận bàn giao không tồn tại hoặc đã bị vô hiệu hóa",
        "SALES_NOT_FOUND"
      );
    }
    nextSalesPersonId = targetSales.id;
    targetSalesName = targetSales.name;
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (
      data.transferToOtherSales &&
      data.newSalesPersonId &&
      data.newSalesPersonId !== existing.salesPersonId
    ) {
      const checkUpdate = await tx.lead.updateMany({
        where: {
          id,
          salesPersonId: existing.salesPersonId,
        },
        data: {
          salesPersonId: nextSalesPersonId,
        },
      });
      if (checkUpdate.count === 0) {
        throw new AppError(
          409,
          "Hồ sơ Lead vừa được chuyển giao bởi người dùng khác. Vui lòng tải lại dữ liệu.",
          "CONCURRENT_MODIFICATION"
        );
      }

      await tx.leadAssignment.create({
        data: {
          leadId: id,
          fromSalesId: existing.salesPersonId,
          toSalesId: nextSalesPersonId!,
          reason:
            data.transferReason?.trim() ||
            "Chuyển kinh doanh khác khi cập nhật hồ sơ Lead",
          assignedById: user.userId,
        },
      });
    }

    if (nextStatus !== existing.status) {
      await tx.leadStatusHistory.create({
        data: {
          leadId: id,
          fromStatus: existing.status,
          toStatus: nextStatus,
          reason:
            nextStatus === "Thất bại"
              ? data.failureReason?.trim() || "Khách hàng dừng triển khai"
              : `Cập nhật trạng thái từ "${existing.status}" sang "${nextStatus}"`,
          changedById: user.userId,
        },
      });
    }

    return tx.lead.update({
      where: { id },
      data: {
        customerName: data.customerName ?? existing.customerName,
        companyName:
          data.companyName !== undefined
            ? data.companyName?.trim() || ""
            : existing.companyName,
        phone: nextPhone,
        normalizedPhone: nextNormalizedPhone,
        email: data.email !== undefined ? data.email || null : existing.email,
        installationAddress:
          data.installationAddress !== undefined
            ? data.installationAddress || null
            : existing.installationAddress,
        location:
          data.location !== undefined
            ? data.location?.trim() || ""
            : existing.location,
        product:
          data.product !== undefined
            ? data.product?.trim() || existing.product
            : existing.product,
        productCustomText:
          data.productCustomText !== undefined
            ? data.productCustomText?.trim() || null
            : existing.productCustomText,
        demandType:
          data.demandType !== undefined
            ? data.demandType?.trim() || null
            : existing.demandType,
        categoryId: nextCategoryId,
        source: data.source ?? existing.source,
        contactChannel:
          data.contactChannel !== undefined
            ? data.contactChannel?.trim() || existing.source
            : existing.contactChannel,
        status: nextStatus,
        failureReason:
          nextStatus === "Thất bại"
            ? data.failureReason?.trim() || existing.failureReason
            : null,
        quoteSentAt: nextQuoteSentAt,
        customerRespondedAt: nextCustomerRespondedAt,
        customerResponseNote: nextCustomerResponseNote,
        notes: data.notes !== undefined ? data.notes || "" : existing.notes,
        salesPersonId: nextSalesPersonId,
      },
      include: {
        category: true,
        salesPerson: {
          select: { id: true, name: true, initials: true },
        },
      },
    });
  });

  await logLeadAudit({
    userId: user.userId,
    leadId: id,
    action: "UPDATE_LEAD",
    details: JSON.stringify({
      customerName: updated.customerName,
      status: updated.status,
      product: updated.product,
      demandType: updated.demandType,
      salesPersonId: updated.salesPersonId,
      transferredTo: targetSalesName,
    }),
  });

  return {
    message: targetSalesName
      ? `Đã cập nhật hồ sơ và chuyển giao cho ${targetSalesName} thành công`
      : "Cập nhật thông tin hồ sơ Lead thành công",
    lead: updated,
  };
}

export async function listLeadActivities(leadId: string) {
  const activities = await prisma.leadActivity.findMany({
    where: { leadId },
    include: {
      createdBy: {
        select: { id: true, name: true, initials: true, position: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    activities: activities.map((a) => ({
      id: a.id,
      type: a.type,
      summary: a.summary,
      outcome: a.outcome,
      nextFollowUpAt: a.nextFollowUpAt ? a.nextFollowUpAt.toISOString() : null,
      createdBy: a.createdBy?.name || "Hệ thống",
      createdByInitials: a.createdBy?.initials || "TT",
      createdAt: formatVietnamDateTime(a.createdAt),
    })),
  };
}

export async function createLeadActivity(
  user: UserSession,
  leadId: string,
  body: unknown
) {
  assertCanAccessLeadsModule(user);

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new AppError(404, "Không tìm thấy hồ sơ Lead", "NOT_FOUND");
  }

  assertCanModifyLead(
    user,
    lead,
    "Chỉ nhân sự phụ trách Lead này hoặc cấp quản lý mới được ghi nhật ký chăm sóc"
  );

  const parsed = CreateActivitySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message || "Thông tin nhật ký không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const now = new Date();
  const activity = await prisma.leadActivity.create({
    data: {
      leadId,
      type: parsed.data.type,
      summary: parsed.data.summary,
      outcome: parsed.data.outcome || null,
      createdById: user.userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, initials: true } },
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      lastContactedAt: now,
      ...(parsed.data.customerResponded
        ? {
            customerRespondedAt: lead.customerRespondedAt || now,
            customerResponseNote:
              parsed.data.outcome || parsed.data.summary || "Khách hàng đã phản hồi",
          }
        : {}),
    },
  });

  await logLeadAudit({
    userId: user.userId,
    leadId,
    action: "LOG_ACTIVITY",
    details: JSON.stringify({
      type: activity.type,
      summary: activity.summary,
    }),
  });

  return {
    message: "Đã lưu nhật ký trao đổi khách hàng!",
    data: {
      activity: {
        id: activity.id,
        type: activity.type,
        summary: activity.summary,
        outcome: activity.outcome,
        createdBy: activity.createdBy?.name || user.name,
        createdByInitials: activity.createdBy?.initials || user.initials,
        createdAt: formatVietnamDateTime(activity.createdAt),
      },
    },
  };
}

export async function checkLeadDuplicate(
  user: UserSession,
  body: {
    phone?: unknown;
    email?: unknown;
    customerName?: unknown;
    companyName?: unknown;
    currentLeadId?: string;
  }
) {
  assertCanAccessLeadsModule(user);

  const { phone, email, customerName, companyName, currentLeadId } = body || {};

  const normPhone =
    typeof phone === "string" ? normalizeVietnamPhone(phone) : "";
  const rawPhoneDigits =
    typeof phone === "string" ? phone.replace(/\D/g, "").trim() : "";
  const cleanEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanCustName =
    typeof customerName === "string" ? customerName.trim() : "";
  const cleanCompName =
    typeof companyName === "string" ? companyName.trim() : "";

  const orQueries: Record<string, unknown>[] = [];
  if (normPhone.length >= 8) {
    orQueries.push({ normalizedPhone: normPhone });
    orQueries.push({ phone: { contains: rawPhoneDigits.slice(-8) } });
  }
  if (cleanEmail.length > 4) {
    orQueries.push({ email: cleanEmail });
  }
  if (cleanCompName.length >= 4) {
    orQueries.push({ companyName: { contains: cleanCompName } });
  }
  if (cleanCustName.length >= 3 && normPhone.length >= 8) {
    orQueries.push({ customerName: { contains: cleanCustName } });
  }

  if (orQueries.length === 0) {
    return { isDuplicate: false, matchedLeads: [] };
  }

  const candidates = await prisma.lead.findMany({
    where: {
      ...(currentLeadId ? { id: { not: currentLeadId } } : {}),
      OR: orQueries,
    },
    select: {
      id: true,
      code: true,
      customerName: true,
      companyName: true,
      phone: true,
      normalizedPhone: true,
      email: true,
      status: true,
      salesPersonId: true,
      createdById: true,
      salesPerson: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const matched = candidates
    .map((l) => {
      const lNormPhone = l.normalizedPhone || normalizeVietnamPhone(l.phone);
      const isPhoneMatch =
        normPhone.length >= 8 &&
        lNormPhone.length >= 8 &&
        lNormPhone === normPhone;
      const isNameMatch =
        cleanCustName.length >= 3 &&
        l.customerName.toLowerCase() === cleanCustName.toLowerCase();
      const isCompanyMatch =
        cleanCompName.length >= 4 &&
        Boolean(l.companyName) &&
        l.companyName.toLowerCase().includes(cleanCompName.toLowerCase());

      let matchType: "NAME_AND_PHONE" | "PHONE_EXACT" | "COMPANY_NAME" | null =
        null;
      let matchLabel = "";

      if (isPhoneMatch && isNameMatch) {
        matchType = "NAME_AND_PHONE";
        matchLabel = "Trùng Tên khách & Số điện thoại";
      } else if (isPhoneMatch) {
        matchType = "PHONE_EXACT";
        matchLabel = "Trùng Số điện thoại";
      } else if (isCompanyMatch) {
        matchType = "COMPANY_NAME";
        matchLabel = "Cùng Công ty / Đơn vị";
      }

      if (!matchType) return null;

      const canRead = canUserAccessLeadRecord(user, l);

      return {
        id: l.id,
        code: l.code,
        matchType,
        matchLabel,
        isRestricted: !canRead,
        customerName: canRead
          ? l.customerName
          : "Khách hàng thuộc Sales khác phụ trách",
        companyName: canRead ? l.companyName || "" : "",
        phone: maskPhoneIfRestricted(l.phone, canRead),
        email: canRead ? l.email : null,
        status: l.status,
        salesPersonName: l.salesPerson?.name || "Chưa phân công",
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    isDuplicate: matched.length > 0,
    matchedLeads: matched.slice(0, 8),
  };
}

export async function getLeadsDashboardSnapshot(
  user: UserSession,
  params?: { from?: string | null; to?: string | null }
) {
  const from = parseVietnamDay(params?.from, false);
  const to = parseVietnamDay(params?.to, true);

  const scopeWhere = canAccessAllLeadRecords(user)
    ? {}
    : user.role === "SALES" || user.department === "SALES"
      ? {
          OR: [
            { salesPersonId: user.userId },
            { AND: [{ salesPersonId: null }, { createdById: user.userId }] },
          ],
        }
      : {};

  const createdAtFilter: { gte?: Date; lte?: Date } | undefined =
    from || to
      ? {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        }
      : undefined;

  const where: Record<string, unknown> = {
    ...scopeWhere,
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
  };

  const [
    allLeadsInRange,
    allCategories,
    activeSalesUsers,
  ] = await Promise.all([
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
        statusHistory: {
          where: { toStatus: "Đã gửi báo giá" },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
        attachments: true,
        _count: { select: { activities: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        OR: [{ role: "SALES" }, { department: "SALES" }],
      },
      select: {
        id: true,
        name: true,
        initials: true,
        position: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const statusCounts: Record<string, number> = {
    "Vừa nhận thông tin": 0,
    "Đang soạn báo giá": 0,
    "Đã gửi báo giá": 0,
    "Chốt thành công": 0,
    "Thất bại": 0,
  };

  const sourceCountMap = new Map<string, number>();
  const channelCountMap = new Map<string, number>();
  const dayCounts = new Map<string, number>();
  const productCountMap = new Map<string, number>();
  const demandTypeCountMap = new Map<string, number>();

  for (const cat of allCategories) {
    productCountMap.set(cat.name, 0);
  }
  for (const dt of OFFICIAL_DEMAND_TYPES) {
    demandTypeCountMap.set(dt, 0);
  }

  for (const lead of allLeadsInRange) {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;

    const src = lead.source || "Chưa có thông tin";
    sourceCountMap.set(src, (sourceCountMap.get(src) || 0) + 1);

    const ch = lead.contactChannel || lead.source || "Chưa có thông tin";
    channelCountMap.set(ch, (channelCountMap.get(ch) || 0) + 1);

    const dayKey = formatVietnamDayKey(lead.createdAt);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);

    const catName = lead.category?.name || lead.product || "Khác";
    productCountMap.set(catName, (productCountMap.get(catName) || 0) + 1);

    if (lead.demandType && lead.demandType.trim()) {
      const dt = lead.demandType.trim();
      demandTypeCountMap.set(dt, (demandTypeCountMap.get(dt) || 0) + 1);
    }
  }

  const total = allLeadsInRange.length;

  const bySource = Array.from(sourceCountMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const byChannel = Array.from(channelCountMap.entries())
    .map(([channel, count]) => ({ channel, count }))
    .sort((a, b) => b.count - a.count);

  const byDay = Array.from(dayCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Product Interest Breakdown (AC-21)
  const byProduct = allCategories.map((cat) => ({
    categoryId: cat.id,
    code: cat.code,
    name: cat.name,
    group: cat.group,
    count: productCountMap.get(cat.name) || 0,
  }));

  const maxProductCount = byProduct.reduce(
    (max, item) => (item.count > max ? item.count : max),
    0
  );
  const topProducts =
    maxProductCount > 0
      ? byProduct.filter((item) => item.count === maxProductCount)
      : [];
  const minProductCount =
    byProduct.length > 0
      ? byProduct.reduce(
          (min, item) => (item.count < min ? item.count : min),
          byProduct[0].count
        )
      : 0;
  const leastProducts = byProduct.filter(
    (item) => item.count === minProductCount
  );

  const byDemandType = Array.from(demandTypeCountMap.entries()).map(
    ([demandType, count]) => ({
      demandType,
      count,
    })
  );

  // Report #2: Sales Summary Table + Detail Rows (AC-20, AC-22)
  const salesMap = new Map<
    string,
    {
      salesPersonId: string;
      name: string;
      initials: string;
      totalLeads: number;
      newLeads: number;
      draftingQuote: number;
      sentQuote: number;
      unrespondedQuote: number;
      won: number;
      lost: number;
      winRatePercent: number;
      count: number;
    }
  >();

  const scopedSalesUsers = canAccessAllLeadRecords(user)
    ? activeSalesUsers
    : activeSalesUsers.filter((u) => u.id === user.userId);

  for (const u of scopedSalesUsers) {
    salesMap.set(u.id, {
      salesPersonId: u.id,
      name: u.name,
      initials: u.initials,
      totalLeads: 0,
      newLeads: 0,
      draftingQuote: 0,
      sentQuote: 0,
      unrespondedQuote: 0,
      won: 0,
      lost: 0,
      winRatePercent: 0,
      count: 0,
    });
  }

  const failureReasonMap = new Map<string, number>();

  for (const lead of allLeadsInRange) {
    const key = lead.salesPersonId || "unassigned";
    let entry = salesMap.get(key);
    if (!entry) {
      entry = {
        salesPersonId: key,
        name: lead.salesPerson?.name || "Chưa phân công",
        initials: lead.salesPerson?.initials || "TT",
        totalLeads: 0,
        newLeads: 0,
        draftingQuote: 0,
        sentQuote: 0,
        unrespondedQuote: 0,
        won: 0,
        lost: 0,
        winRatePercent: 0,
        count: 0,
      };
      salesMap.set(key, entry);
    }

    const hasResponded =
      Boolean(lead.customerRespondedAt) ||
      lead.status === "Chốt thành công" ||
      lead.status === "Thất bại";

    entry.totalLeads += 1;
    entry.count += 1;
    if (lead.status === "Vừa nhận thông tin") entry.newLeads += 1;
    else if (lead.status === "Đang soạn báo giá") entry.draftingQuote += 1;
    else if (lead.status === "Đã gửi báo giá") {
      entry.sentQuote += 1;
      if (!hasResponded) entry.unrespondedQuote += 1;
    } else if (lead.status === WON_STATUS) entry.won += 1;
    else if (lead.status === "Thất bại") {
      entry.lost += 1;
      const reason = lead.failureReason?.trim() || "Chưa ghi nhận lý do";
      failureReasonMap.set(reason, (failureReasonMap.get(reason) || 0) + 1);
    }
  }

  const byFailureReason = Array.from(failureReasonMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const bySales = Array.from(salesMap.values())
    .map((entry) => ({
      ...entry,
      winRatePercent:
        entry.totalLeads > 0
          ? Math.round((entry.won / entry.totalLeads) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => {
      if (a.salesPersonId === "unassigned") return 1;
      if (b.salesPersonId === "unassigned") return -1;
      return b.totalLeads - a.totalLeads;
    });

  // Report #5: Quote Sent & Unresponded Customers (AC-23)
  const now = new Date();
  const allSentQuoteLeads = allLeadsInRange
    .filter(
      (l) =>
        Boolean(l.quoteSentAt) ||
        l.status === "Đã gửi báo giá" ||
        l.status === "Chốt thành công" ||
        l.statusHistory.length > 0
    )
    .map((l) => {
      const isOwner = canUserAccessLeadRecord(user, l);
      const sentTime =
        l.quoteSentAt || l.statusHistory[0]?.createdAt || l.createdAt;
      const daysSinceQuoteSent = Math.max(
        0,
        Math.floor((now.getTime() - sentTime.getTime()) / 86_400_000)
      );
      const hasResponded =
        Boolean(l.customerRespondedAt) ||
        l.status === "Chốt thành công" ||
        l.status === "Thất bại";

      return {
        id: l.id,
        code: l.code,
        customerName: l.customerName,
        companyName: l.companyName || "",
        phone: maskPhoneIfRestricted(l.phone, isOwner),
        product: l.product || l.category?.name || "Chưa chọn sản phẩm",
        categoryName: l.category?.name || "Màn hình LED Indoor",
        salesPersonName: l.salesPerson?.name || "Chưa phân công",
        status: l.status,
        quoteSentAtISO: sentTime.toISOString(),
        quoteSentAtDisplay: formatVietnamDateTime(sentTime),
        daysSinceQuoteSent,
        hasResponded,
        customerRespondedAtDisplay: formatVietnamDateTime(
          l.customerRespondedAt
        ),
        customerResponseNote: l.customerResponseNote || "",
        notes: l.notes || "",
      };
    });

  const unrespondedLeads = allSentQuoteLeads.filter(
    (item) => item.status === "Đã gửi báo giá" && !item.hasResponded
  );

  const mapLeadRecord = (l: (typeof allLeadsInRange)[number]) => {
    const isOwner = canUserAccessLeadRecord(user, l);
    return {
      id: l.id,
      code: l.code,
      customerName: l.customerName,
      companyName: l.companyName || "",
      phone: maskPhoneIfRestricted(l.phone, isOwner),
      email: isOwner ? l.email || "" : l.email ? "***@***" : "",
      product: l.product || l.category?.name || "Chưa chọn sản phẩm",
      productCustomText: l.productCustomText || "",
      demandType: l.demandType || "",
      category: l.category?.name || "Màn hình LED Indoor",
      categoryId: l.categoryId,
      source: l.source || "Hotline",
      contactChannel: l.contactChannel || l.source || "Hotline",
      status: l.status,
      failureReason: l.failureReason,
      quoteSentAt: l.quoteSentAt ? l.quoteSentAt.toISOString() : null,
      quoteSentAtDisplay: formatVietnamDateTime(l.quoteSentAt),
      customerResponded: Boolean(l.customerRespondedAt),
      customerRespondedAt: l.customerRespondedAt
        ? l.customerRespondedAt.toISOString()
        : null,
      customerResponseNote: l.customerResponseNote || "",
      installationAddress: l.installationAddress || "",
      location: l.location || "",
      notes: l.notes || "",
      createdAt: l.createdAt.toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      createdAtTime: formatVietnamDateTime(l.createdAt),
      createdAtISO: l.createdAt.toISOString(),
      activitiesCount: l._count.activities,
      salesPerson: {
        id: l.salesPerson?.id,
        name: l.salesPerson?.name || "Chưa phân công",
        initials: l.salesPerson?.initials || "TT",
      },
      attachmentsCount: l.attachments.length,
    };
  };

  const recentLeads = allLeadsInRange.slice(0, 8).map(mapLeadRecord);
  const salesDetailRows = allLeadsInRange.map(mapLeadRecord);

  const actionQueueRows = allLeadsInRange
    .filter((row) =>
      ["Vừa nhận thông tin", "Đang soạn báo giá", "Đã gửi báo giá"].includes(
        row.status
      )
    )
    .slice(0, 6);

  const actionQueueItems = actionQueueRows.map((row) => {
    const daysWaiting = Math.max(
      0,
      Math.floor((now.getTime() - row.createdAt.getTime()) / 86_400_000)
    );
    const reason =
      row.status === "Vừa nhận thông tin"
        ? "Chờ liên hệ tư vấn"
        : row.status === "Đang soạn báo giá"
          ? "Đang soạn báo giá"
          : "Đã gửi báo giá — chờ phản hồi";
    return {
      lead: mapLeadRecord(row),
      reason,
      daysWaiting,
    };
  });

  const contactCount = statusCounts["Vừa nhận thông tin"] || 0;
  const quotingFollowUpCount =
    (statusCounts["Đang soạn báo giá"] || 0) +
    (statusCounts["Đã gửi báo giá"] || 0);

  return {
    createdAtFilter,
    total,
    statusCounts,
    bySource,
    byChannel,
    byFailureReason,
    bySales,
    salesDetailRows,
    byDay,
    productInterest: {
      byProduct,
      topProducts,
      leastProducts,
      byDemandType,
    },
    quoteReport: {
      currentlyWaitingQuoteCount: statusCounts["Đã gửi báo giá"] || 0,
      totalEverSentQuoteCount: allSentQuoteLeads.length,
      respondedCount: allSentQuoteLeads.length - unrespondedLeads.length,
      unrespondedCount: unrespondedLeads.length,
      unrespondedLeads,
      allSentQuoteLeads,
    },
    recentLeads,
    actionQueue: {
      contactCount,
      quotingFollowUpCount,
      items: actionQueueItems,
    },
  };
}

export async function getLeadAnalytics(
  user: UserSession,
  params?: { from?: string | null; to?: string | null }
) {
  const leadsSnapshot = await getLeadsDashboardSnapshot(user, params);
  const [trackingSnapshot, reportsSnapshot, adsSnapshot] = await Promise.all([
    getTrackingDashboardSnapshot(leadsSnapshot.createdAtFilter),
    getReportsDashboardSnapshot(leadsSnapshot.createdAtFilter),
    getAdsDashboardSnapshot(),
  ]);

  return {
    total: leadsSnapshot.total,
    statusCounts: leadsSnapshot.statusCounts,
    bySource: leadsSnapshot.bySource,
    byChannel: leadsSnapshot.byChannel,
    byFailureReason: leadsSnapshot.byFailureReason,
    bySales: leadsSnapshot.bySales,
    salesDetailRows: leadsSnapshot.salesDetailRows,
    byDay: leadsSnapshot.byDay,
    productInterest: leadsSnapshot.productInterest,
    quoteReport: leadsSnapshot.quoteReport,
    recentLeads: leadsSnapshot.recentLeads,
    actionQueue: leadsSnapshot.actionQueue,
    webTotals: {
      trackingEventsCount: trackingSnapshot.trackingEventsCount,
      reportsCount: reportsSnapshot.reportsCount,
      campaignsCount: adsSnapshot.campaignsCount,
    },
  };
}

export async function attachUploadedFileToLead(input: {
  leadId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedById: string;
}) {
  return createLeadAttachmentRecord(input);
}

export async function searchLeadsPublic(user: UserSession, query: string) {
  if (!canUserSearchLeads(user)) {
    return [];
  }

  const leadOwnerFilter = buildLeadScopeWhere(user);

  const leads = await prisma.lead.findMany({
    where: {
      AND: [
        leadOwnerFilter,
        {
          OR: [
            { code: { contains: query } },
            { customerName: { contains: query } },
            { companyName: { contains: query } },
            { phone: { contains: query } },
            { product: { contains: query } },
          ],
        },
      ],
    },
    select: {
      id: true,
      code: true,
      customerName: true,
      companyName: true,
      status: true,
    },
    take: 5,
  });

  return leads.map((lead) => ({
    id: lead.id,
    type: "lead" as const,
    title: lead.customerName,
    subtitle: `${lead.code}${lead.companyName ? ` · ${lead.companyName}` : ""} · ${lead.status}`,
    tab: "leads" as const,
  }));
}
