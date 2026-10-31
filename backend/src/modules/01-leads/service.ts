import { canAccessAllLeads, type UserSession } from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { AppError } from "@/src/core/http";
import { getTrackingDashboardSnapshot } from "@/src/modules/02-tracking/public";
import { getAdsDashboardSnapshot } from "@/src/modules/03-ads-keywords/public";
import { getReportsDashboardSnapshot } from "@/src/modules/04-reports-dashboard/public";
import {
  CreateActivitySchema,
  CreateLeadSchema,
  maskPhoneIfRestricted,
  UpdateLeadSchema,
  WON_STATUS,
} from "./contracts";
import {
  computeLeadScore,
  computeLeadSla,
  extractMaxCodeSuffix,
  parseVndString,
} from "./lead-scoring.service";
import {
  assertCanModifyLead,
  canUserSearchLeads,
  isLeadOwnerOrPrivileged,
} from "./policy";
import {
  createLeadAttachmentRecord,
  findLeadFullDetailsById,
  findLeadWithCountsById,
  logLeadAudit,
} from "./repository";

function parseDay(value: string | null | undefined, endOfDay: boolean): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dayKey(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export async function listLeads(
  user: UserSession,
  params: {
    search?: string | null;
    status?: string | null;
    source?: string | null;
    salesId?: string | null;
    page?: string | null;
    pageSize?: string | null;
  }
) {
  const search = params.search || "";
  const status = params.status || "all";
  const source = params.source || "all";
  const salesId = params.salesId || "all";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(params.pageSize || "8", 10) || 8)
  );

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

  const [statusGroups, salesGroups, totalFiltered, leads, salesUsers] =
    await Promise.all([
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
  const totalAll = statusGroups.reduce(
    (sum, group) => sum + group._count._all,
    0
  );
  const newCount = countStatuses("Vừa nhận thông tin");
  const quotingCount = countStatuses("Đang soạn báo giá", "Đã gửi báo giá");
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

  const hasFullLeadAccess = canAccessAllLeads(user);

  return {
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
          nextFollowUpAt: l.nextFollowUpAt
            ? l.nextFollowUpAt.toISOString()
            : null,
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
  };
}

export async function createLead(user: UserSession, body: unknown) {
  const validation = CreateLeadSchema.safeParse(body);
  if (!validation.success) {
    throw new AppError(
      400,
      validation.error.issues[0]?.message || "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const data = validation.data;

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

  let salesPersonId = data.salesPersonId;
  if (!salesPersonId) {
    const defaultSales = await prisma.user.findFirst({
      where: { role: "SALES", isActive: true },
    });
    salesPersonId = defaultSales?.id;
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
      failureReason:
        data.status === "Thất bại" ? data.failureReason?.trim() || null : null,
      salesPersonId,
      createdById: user.userId,
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
      changedById: user.userId || salesPersonId,
    },
  });

  if (salesPersonId) {
    await prisma.leadAssignment.create({
      data: {
        leadId: newLead.id,
        toSalesId: salesPersonId,
        reason: "Phân công xử lý khi tiếp nhận Lead mới",
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
      status: newLead.status,
    }),
  });

  return {
    message: "Tiếp nhận Lead mới thành công",
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
  };
}

export async function getLeadDetails(user: UserSession, id: string) {
  const lead = await findLeadFullDetailsById(id);

  if (!lead) {
    throw new AppError(404, "Không tìm thấy khách hàng", "NOT_FOUND");
  }

  const isOwner = isLeadOwnerOrPrivileged(user, lead);

  const safePhone =
    isOwner || !lead.phone
      ? lead.phone
      : lead.phone.length > 6
        ? `${lead.phone.slice(0, 4)}***${lead.phone.slice(-3)}`
        : "***";

  const scored = computeLeadScore({
    status: lead.status,
    estimatedValue: lead.estimatedValue,
    installationAddress: lead.installationAddress,
    email: lead.email,
    source: lead.source,
    ledWidth: lead.ledWidth,
    ledHeight: lead.ledHeight,
    activitiesCount: lead.activities.length,
    quotesCount: lead.quotes.length,
  });

  const sla = computeLeadSla({
    status: lead.status,
    createdAt: lead.createdAt,
    lastContactedAt: lead.lastContactedAt,
    nextFollowUpAt: lead.nextFollowUpAt,
  });

  return {
    lead: {
      id: lead.id,
      code: lead.code,
      customerName: lead.customerName,
      companyName: lead.companyName,
      phone: safePhone,
      email: isOwner ? lead.email || "" : lead.email ? "***@***" : "",
      product: lead.product,
      category: lead.category?.name || "LED trong nhà",
      categoryId: lead.categoryId,
      source: lead.source,
      status: lead.status,
      failureReason: lead.failureReason,
      estimatedValue: lead.estimatedValue || "Đang khảo sát",
      installationAddress: lead.installationAddress || "",
      location: lead.location,
      notes: lead.notes || "",
      createdAt: lead.createdAt.toLocaleDateString("vi-VN"),
      priorityScore: scored.score,
      priorityTier: scored.tier,
      slaStatus: sla.slaStatus,
      slaLabel: sla.slaLabel,
      nextFollowUpAt: lead.nextFollowUpAt
        ? lead.nextFollowUpAt.toISOString()
        : null,
      nextActionNote: lead.nextActionNote || null,
      ledWidth: lead.ledWidth,
      ledHeight: lead.ledHeight,
      ledModuleType: lead.ledModuleType,
      discountPercent: lead.discountPercent || 0,
      directorApprovalStatus: lead.directorApprovalStatus || "NONE",
      directorApprovedByName: lead.directorApprovedByName || null,
      directorApprovalNote: lead.directorApprovalNote || null,
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
        createdAt: h.createdAt.toLocaleString("vi-VN"),
      })),
      assignments: lead.assignments.map((a) => ({
        id: a.id,
        fromSales: a.fromSales?.name || null,
        toSales: a.toSales.name,
        reason: a.reason,
        assignedBy: a.assignedBy?.name || "Hệ thống",
        createdAt: a.createdAt.toLocaleString("vi-VN"),
      })),
      attachments: lead.attachments.map((att) => ({
        id: att.id,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileSize: att.fileSize ?? undefined,
        fileType: att.fileType,
        uploadedBy: att.uploadedBy?.name || "Người dùng",
        createdAt: att.createdAt.toLocaleString("vi-VN"),
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
        createdAt: act.createdAt.toLocaleString("vi-VN"),
      })),
      quotes: lead.quotes.map((q) => ({
        id: q.id,
        code: q.code,
        moduleSpec: q.moduleSpec,
        widthMeters: q.widthMeters,
        heightMeters: q.heightMeters,
        areaSqm: q.areaSqm,
        unitPriceVnd: q.unitPriceVnd,
        processorVnd: q.processorVnd,
        structureInstallVnd: q.structureInstallVnd,
        discountPercent: q.discountPercent,
        totalVnd: q.totalVnd,
        warrantyMonths: q.warrantyMonths,
        notes: q.notes,
        status: q.status,
        approvedByName: q.approvedByName,
        createdBy: q.createdBy?.name || "Hệ thống",
        createdAt: q.createdAt.toLocaleString("vi-VN"),
      })),
    },
  };
}

export async function updateLead(
  user: UserSession,
  id: string,
  body: unknown
) {
  const parsedBody = UpdateLeadSchema.safeParse(body);
  if (!parsedBody.success) {
    throw new AppError(
      400,
      parsedBody.error.issues[0]?.message || "Thông tin cập nhật không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const existing = await findLeadWithCountsById(id);
  if (!existing) {
    throw new AppError(404, "Không tìm thấy khách hàng", "NOT_FOUND");
  }

  assertCanModifyLead(
    user,
    existing,
    "Chỉ nhân sự phụ trách Lead này hoặc cấp Trưởng phòng / Trưởng ban / Giám đốc / Admin mới được chỉnh sửa"
  );

  const data = parsedBody.data;
  const parsedNextFollowUp =
    data.nextFollowUpAt === null
      ? null
      : data.nextFollowUpAt &&
          !Number.isNaN(new Date(data.nextFollowUpAt).getTime())
        ? new Date(data.nextFollowUpAt)
        : existing.nextFollowUpAt;

  const nextEstimatedValue = data.estimatedValue ?? existing.estimatedValue;
  const nextInstallationAddress =
    data.installationAddress !== undefined
      ? data.installationAddress
      : existing.installationAddress;
  const nextEmail =
    data.email !== undefined ? data.email || null : existing.email;

  const rescored = computeLeadScore({
    status: existing.status,
    estimatedValue: nextEstimatedValue,
    installationAddress: nextInstallationAddress,
    email: nextEmail,
    source: existing.source,
    ledWidth: existing.ledWidth,
    ledHeight: existing.ledHeight,
    activitiesCount: existing._count.activities,
    quotesCount: existing._count.quotes,
  });

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      customerName: data.customerName ?? existing.customerName,
      companyName: data.companyName ?? existing.companyName,
      phone: data.phone ?? existing.phone,
      email: nextEmail,
      installationAddress: nextInstallationAddress,
      location: data.location ?? existing.location,
      product: data.product ?? existing.product,
      estimatedValue: nextEstimatedValue,
      notes: data.notes !== undefined ? data.notes || "" : existing.notes,
      nextFollowUpAt: parsedNextFollowUp,
      nextActionNote:
        data.nextActionNote !== undefined
          ? data.nextActionNote
          : existing.nextActionNote,
      priorityScore: rescored.score,
      priorityTier: rescored.tier,
    },
  });

  await logLeadAudit({
    userId: user.userId,
    leadId: id,
    action: "UPDATE_LEAD",
    details: JSON.stringify(data),
  });

  return {
    message: "Cập nhật thông tin hồ sơ Lead thành công",
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
      createdAt: a.createdAt.toLocaleString("vi-VN"),
    })),
  };
}

export async function createLeadActivity(
  user: UserSession,
  leadId: string,
  body: unknown
) {
  const lead = await findLeadWithCountsById(leadId);
  if (!lead) {
    throw new AppError(404, "Không tìm thấy khách hàng", "NOT_FOUND");
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

  const followUpDate =
    parsed.data.nextFollowUpAt &&
    !Number.isNaN(new Date(parsed.data.nextFollowUpAt).getTime())
      ? new Date(parsed.data.nextFollowUpAt)
      : undefined;

  const activity = await prisma.leadActivity.create({
    data: {
      leadId,
      type: parsed.data.type,
      summary: parsed.data.summary,
      outcome: parsed.data.outcome || null,
      nextFollowUpAt: followUpDate || null,
      createdById: user.userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, initials: true } },
    },
  });

  const scored = computeLeadScore({
    status: lead.status,
    estimatedValue: lead.estimatedValue,
    installationAddress: lead.installationAddress,
    email: lead.email,
    source: lead.source,
    ledWidth: lead.ledWidth,
    ledHeight: lead.ledHeight,
    activitiesCount: lead._count.activities + 1,
    quotesCount: lead._count.quotes,
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      lastContactedAt: new Date(),
      priorityScore: scored.score,
      priorityTier: scored.tier,
      ...(followUpDate !== undefined ? { nextFollowUpAt: followUpDate } : {}),
      ...(parsed.data.nextActionNote !== undefined
        ? { nextActionNote: parsed.data.nextActionNote || null }
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
      nextFollowUpAt: followUpDate?.toISOString() || null,
    }),
  });

  return {
    message: "Đã lưu nhật ký chăm sóc & cập nhật lịch hẹn SLA!",
    data: {
      activity: {
        id: activity.id,
        type: activity.type,
        summary: activity.summary,
        outcome: activity.outcome,
        nextFollowUpAt: activity.nextFollowUpAt
          ? activity.nextFollowUpAt.toISOString()
          : null,
        createdBy: activity.createdBy?.name || user.name,
        createdByInitials: activity.createdBy?.initials || user.initials,
        createdAt: activity.createdAt.toLocaleString("vi-VN"),
      },
      priorityScore: scored.score,
      priorityTier: scored.tier,
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
  const { phone, email, customerName, companyName, currentLeadId } = body || {};

  const cleanInputPhone = phone
    ? String(phone).replace(/[\s.-]/g, "").trim()
    : "";
  const cleanEmail = email ? String(email).trim().toLowerCase() : "";
  const cleanCustName = customerName
    ? String(customerName).trim().toLowerCase()
    : "";
  const cleanCompName = companyName
    ? String(companyName).trim().toLowerCase()
    : "";

  if (!cleanInputPhone && !cleanEmail && !cleanCustName && !cleanCompName) {
    return { isDuplicate: false, matchedLeads: [] };
  }

  const allLeads = await prisma.lead.findMany({
    where: currentLeadId ? { id: { not: currentLeadId } } : undefined,
    select: {
      id: true,
      code: true,
      customerName: true,
      companyName: true,
      phone: true,
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
    take: 100,
  });

  const matched = allLeads.filter((l) => {
    if (cleanInputPhone.length >= 8) {
      const leadPhoneDigits = l.phone.replace(/[\s.-]/g, "");
      if (
        leadPhoneDigits.includes(cleanInputPhone) ||
        cleanInputPhone.includes(leadPhoneDigits)
      ) {
        return true;
      }
    }

    if (
      cleanEmail.length > 4 &&
      l.email &&
      l.email.toLowerCase() === cleanEmail
    ) {
      return true;
    }

    if (
      cleanCustName.length >= 3 &&
      l.customerName.toLowerCase().includes(cleanCustName)
    ) {
      return true;
    }

    if (
      cleanCompName.length >= 4 &&
      l.companyName.toLowerCase().includes(cleanCompName)
    ) {
      return true;
    }

    return false;
  });

  const hasFullLeadAccess = canAccessAllLeads(user);

  return {
    isDuplicate: matched.length > 0,
    matchedLeads: matched.slice(0, 5).map((m) => {
      const isOwner =
        hasFullLeadAccess ||
        !m.salesPersonId ||
        m.salesPersonId === user.userId ||
        m.createdById === user.userId;
      return {
        id: m.id,
        code: m.code,
        customerName: m.customerName,
        companyName: m.companyName,
        phone: maskPhoneIfRestricted(m.phone, isOwner),
        email: isOwner ? m.email : m.email ? "***@***" : null,
        status: m.status,
        salesPersonName: m.salesPerson?.name || "Chưa phân công",
      };
    }),
  };
}

export async function getLeadsDashboardSnapshot(
  user: UserSession,
  params?: { from?: string | null; to?: string | null }
) {
  const from = parseDay(params?.from, false);
  const to = parseDay(params?.to, true);

  const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const leadInclude = {
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
  } as const;

  const [
    statusGroups,
    sourceGroups,
    salesGroups,
    leadFinancialRows,
    recentLeadRows,
    actionLeadRows,
  ] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["source"], where, _count: { _all: true } }),
    prisma.lead.groupBy({
      by: ["salesPersonId", "status"],
      where,
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      where,
      select: {
        createdAt: true,
        status: true,
        estimatedValue: true,
        salesPersonId: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.lead.findMany({
      where,
      include: leadInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.lead.findMany({
      where: {
        ...where,
        status: {
          in: ["Vừa nhận thông tin", "Đang soạn báo giá", "Đã gửi báo giá"],
        },
      },
      include: leadInclude,
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  let total = 0;
  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all;
    total += group._count._all;
  }

  const bySource = sourceGroups
    .map((group) => ({
      source: group.source || "Chưa phân loại",
      count: group._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const salesIds = Array.from(
    new Set(
      salesGroups
        .map((g) => g.salesPersonId)
        .filter((id): id is string => Boolean(id))
    )
  );
  const users = await prisma.user.findMany({
    where: { id: { in: salesIds } },
    select: { id: true, name: true, initials: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const salesPipelineVnd = new Map<string, number>();
  let totalPipelineVnd = 0;
  let quotingValueVnd = 0;
  let wonRevenueVnd = 0;
  const dayCounts = new Map<string, number>();

  for (const row of leadFinancialRows) {
    const key = dayKey(row.createdAt);
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);

    const vnd = parseVndString(row.estimatedValue);
    if (vnd > 0 && row.status !== "Thất bại") {
      totalPipelineVnd += vnd;
      const sKey = row.salesPersonId || "unassigned";
      salesPipelineVnd.set(sKey, (salesPipelineVnd.get(sKey) || 0) + vnd);
    }
    if (
      vnd > 0 &&
      (row.status === "Đang soạn báo giá" || row.status === "Đã gửi báo giá")
    ) {
      quotingValueVnd += vnd;
    }
    if (vnd > 0 && row.status === WON_STATUS) {
      wonRevenueVnd += vnd;
    }
  }

  const salesMap = new Map<
    string,
    {
      name: string;
      initials: string;
      count: number;
      won: number;
      pipelineVnd: number;
    }
  >();
  for (const group of salesGroups) {
    const salesUser = group.salesPersonId
      ? userById.get(group.salesPersonId)
      : undefined;
    const key = group.salesPersonId || "unassigned";
    const entry = salesMap.get(key) || {
      name: salesUser?.name || "Chưa phân công",
      initials: salesUser?.initials || "TT",
      count: 0,
      won: 0,
      pipelineVnd: salesPipelineVnd.get(key) || 0,
    };
    entry.count += group._count._all;
    if (group.status === WON_STATUS) entry.won += group._count._all;
    salesMap.set(key, entry);
  }
  const bySales = Array.from(salesMap.values()).sort(
    (a, b) => b.count - a.count
  );

  const byDay = Array.from(dayCounts.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const hasFullLeadAccess = canAccessAllLeads(user);
  const mapLeadRecord = (l: (typeof recentLeadRows)[number]) => {
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
      createdAtISO: l.createdAt.toISOString(),
      priorityScore: scored.score,
      priorityTier: scored.tier,
      slaStatus: sla.slaStatus,
      slaLabel: sla.slaLabel,
      nextFollowUpAt: l.nextFollowUpAt
        ? l.nextFollowUpAt.toISOString()
        : null,
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
  };

  const recentLeads = recentLeadRows.map(mapLeadRecord);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const actionQueueItems = actionLeadRows.map((row) => {
    const createdDay = new Date(row.createdAt);
    createdDay.setHours(0, 0, 0, 0);
    const daysWaiting = Math.max(
      0,
      Math.floor((todayStart.getTime() - createdDay.getTime()) / 86_400_000)
    );
    const reason =
      row.status === "Vừa nhận thông tin"
        ? "Chờ liên hệ"
        : row.status === "Đang soạn báo giá"
          ? "Đang soạn báo giá"
          : "Chờ phản hồi báo giá";
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
    createdAtFilter: where.createdAt,
    total,
    statusCounts,
    bySource,
    bySales,
    byDay,
    financials: {
      totalPipelineVnd,
      quotingValueVnd,
      wonRevenueVnd,
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
    bySales: leadsSnapshot.bySales,
    byDay: leadsSnapshot.byDay,
    financials: leadsSnapshot.financials,
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

  const leadOwnerFilter = canAccessAllLeads(user)
    ? {}
    : {
        OR: [
          { salesPersonId: user.userId },
          { createdById: user.userId },
          { salesPersonId: null },
        ],
      };

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
    subtitle: `${lead.code} · ${lead.companyName} · ${lead.status}`,
    tab: "leads" as const,
  }));
}
