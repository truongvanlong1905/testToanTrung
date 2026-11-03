import type { UserSession } from "@/src/core/auth/auth";
import { AppError } from "@/src/core/http";
import { getTrackingDashboardSnapshot } from "@/src/modules/02-tracking/public";
import { getAdsDashboardSnapshot } from "@/src/modules/03-ads-keywords/public";
import { CreateReportSchema } from "./contracts";
import {
  assertCanAccessReportRecord,
  buildReportVisibilityFilter,
  isBoardOrAdminUser,
} from "./policy";
import {
  countDepartmentReports,
  createDepartmentReportRecord,
  findReportById,
  findUnreadReportIds,
  queryVisibleReports,
  upsertReportReadRecord,
} from "./repository";

export async function listReports(user: UserSession) {
  const reportFilter = buildReportVisibilityFilter(user);
  const reports = await queryVisibleReports(reportFilter, user.userId);

  const unreadCount = reports.reduce(
    (acc, item) => acc + (item.reads.length === 0 ? 1 : 0),
    0
  );

  return {
    reports: reports.map(({ reads, ...report }) => ({
      ...report,
      isRead: reads.length > 0,
    })),
    unreadCount,
    currentUserRole: user.role,
    currentUserId: user.userId,
  };
}

export async function getReportById(user: UserSession, reportId: string) {
  const report = await findReportById(reportId);
  if (!report) {
    throw new AppError(404, "Không tìm thấy báo cáo / thông báo", "NOT_FOUND");
  }
  assertCanAccessReportRecord(user, report);
  return { report };
}

export async function createReport(user: UserSession, body: unknown) {
  const validation = CreateReportSchema.safeParse(body);
  if (!validation.success) {
    throw new AppError(
      400,
      validation.error.issues[0]?.message || "Thông tin không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const report = await createDepartmentReportRecord({
    title: validation.data.title,
    content: validation.data.content,
    attachmentName: validation.data.attachmentName || null,
    attachmentUrl: validation.data.attachmentUrl || null,
    department: user.department || user.role,
    createdById: user.userId,
  });

  const isBroadcast = isBoardOrAdminUser(user);

  return {
    message: isBroadcast
      ? "Đã phát thông báo của Ban Giám Đốc / Quản trị tới toàn hệ thống!"
      : "Đã gửi thông báo & báo cáo lên Ban Giám Đốc thành công!",
    report,
  };
}

export async function markAllReportsRead(user: UserSession) {
  const reportFilter = buildReportVisibilityFilter(user);
  const unreadReports = await findUnreadReportIds(reportFilter, user.userId);

  for (const r of unreadReports) {
    await upsertReportReadRecord(r.id, user.userId);
  }

  return {
    message: "Đã đánh dấu đã đọc toàn bộ thông báo!",
    markedCount: unreadReports.length,
  };
}

export async function markReportRead(user: UserSession, reportId: string) {
  const existingReport = await findReportById(reportId);
  if (!existingReport) {
    throw new AppError(
      404,
      "Không tìm thấy báo cáo / thông báo",
      "NOT_FOUND"
    );
  }

  assertCanAccessReportRecord(user, existingReport);

  await upsertReportReadRecord(reportId, user.userId);
  return { reportId, read: true };
}

export async function createSystemReportNotification(input: {
  title: string;
  content: string;
  department: string;
  createdById: string;
}) {
  return createDepartmentReportRecord({
    title: input.title,
    content: input.content,
    department: input.department,
    createdById: input.createdById,
  });
}

export async function getReportsDashboardSnapshot(createdAtFilter?: {
  gte?: Date;
  lte?: Date;
}): Promise<{ reportsCount: number }> {
  const reportsCount = await countDepartmentReports(createdAtFilter);
  return { reportsCount };
}

export async function getMarketingAndReportsSnapshot(createdAtFilter?: {
  gte?: Date;
  lte?: Date;
}) {
  const [trackingSnapshot, adsSnapshot, reportsSnapshot] = await Promise.all([
    getTrackingDashboardSnapshot(createdAtFilter),
    getAdsDashboardSnapshot(),
    getReportsDashboardSnapshot(createdAtFilter),
  ]);

  return {
    trackingEventsCount: trackingSnapshot.trackingEventsCount,
    reportsCount: reportsSnapshot.reportsCount,
    campaignsCount: adsSnapshot.campaignsCount,
  };
}
