import {
  canAccessAllLeadRecords,
  canAccessLeadsModule,
  canUserAccessLeadRecord,
  type UserSession,
} from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { AppError } from "@/src/core/http";

export interface NotificationItemDto {
  id: string;
  notificationKey: string;
  category: "lead_assignment" | "report" | "promotion";
  title: string;
  content: string;
  senderName: string;
  departmentLabel: string;
  createdAt: string;
  isRead: boolean;
  reportId?: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  targetLeadId?: string | null;
  targetLeadCode?: string | null;
  canAccessTargetLead?: boolean;
}

const DEPT_DISPLAY: Record<string, string> = {
  ADMIN: "Quản trị hệ thống",
  ADMIN_SYS: "Quản trị hệ thống",
  DIRECTOR: "Ban Giám Đốc",
  BOARD: "Ban Giám Đốc",
  SALES: "Phòng Kinh Doanh",
  MARKETING: "Phòng Marketing",
  DESIGN: "Phòng Thiết Kế",
  ADS: "Bộ Phận Quảng Cáo",
};

export async function listUserNotifications(user: UserSession | null) {
  if (!user) {
    throw new AppError(401, "Vui lòng đăng nhập để xem thông báo", "UNAUTHORIZED");
  }

  const isPrivileged =
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR" ||
    user.role === "ADMIN" ||
    user.role === "DIRECTOR";

  const canSeeAllLeads = canAccessAllLeadRecords(user);
  const canSeeLeadsMod = canAccessLeadsModule(user);

  const [readRecords, reports, assignments, promotions] = await Promise.all([
    prisma.notificationRead.findMany({
      where: { userId: user.userId },
      select: { notificationKey: true },
    }),
    prisma.departmentReport.findMany({
      where: isPrivileged
        ? {}
        : {
            OR: [
              { department: user.department },
              { department: user.role },
              { department: "BOARD" },
              { department: "DIRECTOR" },
              { department: "ADMIN" },
              { department: "ADMIN_SYS" },
              { createdById: user.userId },
            ],
          },
      include: {
        createdBy: {
          select: { name: true, role: true, initials: true },
        },
        reads: {
          where: { userId: user.userId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    canSeeLeadsMod
      ? prisma.leadAssignment.findMany({
          where: canSeeAllLeads
            ? {}
            : {
                OR: [
                  { toSalesId: user.userId },
                  { fromSalesId: user.userId },
                  { assignedById: user.userId },
                ],
              },
          include: {
            lead: {
              select: {
                id: true,
                code: true,
                customerName: true,
                product: true,
                salesPersonId: true,
                createdById: true,
              },
            },
            fromSales: { select: { id: true, name: true } },
            toSales: { select: { id: true, name: true } },
            assignedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 40,
        })
      : Promise.resolve([]),
    prisma.promotionDecision.findMany({
      where: isPrivileged ? {} : { targetUserId: user.userId },
      include: {
        targetUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const readSet = new Set(readRecords.map((r) => r.notificationKey));
  const items: NotificationItemDto[] = [];

  for (const assign of assignments) {
    const key = `assign:${assign.id}`;
    const isRead = readSet.has(key);
    const lead = assign.lead;
    const canOpenLead = lead
      ? canUserAccessLeadRecord(user, {
          salesPersonId: lead.salesPersonId,
          createdById: lead.createdById,
        })
      : false;

    const fromLabel = assign.fromSales?.name
      ? `từ ${assign.fromSales.name} `
      : "";
    const toLabel = assign.toSales?.name || "Nhân viên kinh doanh";
    const actorLabel = assign.assignedBy?.name || "Hệ thống";
    const leadTitlePart = lead
      ? `${lead.code} — ${lead.customerName}`
      : "Hồ sơ khách hàng";

    items.push({
      id: assign.id,
      notificationKey: key,
      category: "lead_assignment",
      title: `Phân công / Chuyển Lead ${leadTitlePart} cho ${toLabel}`,
      content: [
        `• Mã Lead: ${lead?.code || "Chưa xác định"}`,
        `• Khách hàng: ${lead?.customerName || "Chưa có thông tin"}`,
        `• Sản phẩm quan tâm: ${lead?.product || "Chưa xác định"}`,
        `• Bàn giao ${fromLabel}sang: ${toLabel}`,
        `• Người thực hiện: ${actorLabel}`,
        `• Lý do bàn giao: ${assign.reason || "Phân bổ phụ trách kinh doanh"}`,
      ].join("\n"),
      senderName: actorLabel,
      departmentLabel: "Phòng Kinh Doanh",
      createdAt: assign.createdAt.toISOString(),
      isRead,
      targetLeadId: lead?.id || null,
      targetLeadCode: lead?.code || null,
      canAccessTargetLead: canOpenLead,
    });
  }

  for (const rep of reports) {
    // Bỏ qua các thông báo trình duyệt giá cũ có chứa thông tin tiền tệ
    if (
      rep.title.includes("[Trình Giám đốc duyệt giá]") ||
      rep.title.includes("[CẦN DUYỆT GIÁ]")
    ) {
      continue;
    }
    const key = `report:${rep.id}`;
    const isRead = readSet.has(key) || rep.reads.length > 0;
    items.push({
      id: rep.id,
      notificationKey: key,
      reportId: rep.id,
      category: "report",
      title: rep.title,
      content: rep.content,
      senderName: rep.createdBy?.name || "Hệ thống",
      departmentLabel: DEPT_DISPLAY[rep.department] || rep.department,
      createdAt: rep.createdAt.toISOString(),
      isRead,
      attachmentName: rep.attachmentName,
      attachmentUrl: rep.attachmentUrl,
    });
  }

  for (const dec of promotions) {
    const key = `promo:${dec.id}`;
    const isRead = readSet.has(key);
    items.push({
      id: dec.id,
      notificationKey: key,
      category: "promotion",
      title: `${dec.title} (${dec.code})`,
      content: [
        dec.content,
        "",
        `• Mã quyết định: ${dec.code}`,
        `• Nhân sự: ${dec.targetUser?.name || "Nhân sự"}`,
        `• Chức vụ bổ nhiệm: ${dec.newPosition} (${DEPT_DISPLAY[dec.targetDepartment] || dec.targetDepartment})`,
        `• Người ký: ${dec.signedByName}`,
      ].join("\n"),
      senderName: dec.signedByName,
      departmentLabel: "Ban Giám Đốc",
      createdAt: dec.createdAt.toISOString(),
      isRead,
    });
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const unreadCount = items.filter((i) => !i.isRead).length;

  return {
    notifications: items,
    unreadCount,
  };
}

export async function markNotificationsRead(
  user: UserSession | null,
  input: { notificationKey?: string; markAll?: boolean }
) {
  if (!user) {
    throw new AppError(401, "Vui lòng đăng nhập", "UNAUTHORIZED");
  }

  if (input.markAll) {
    const { notifications } = await listUserNotifications(user);
    const unread = notifications.filter((n) => !n.isRead);
    for (const item of unread) {
      await prisma.notificationRead.upsert({
        where: {
          notificationKey_userId: {
            notificationKey: item.notificationKey,
            userId: user.userId,
          },
        },
        update: { readAt: new Date() },
        create: {
          notificationKey: item.notificationKey,
          userId: user.userId,
        },
      });
      if (item.reportId) {
        await prisma.departmentReportRead.upsert({
          where: {
            reportId_userId: {
              reportId: item.reportId,
              userId: user.userId,
            },
          },
          update: { readAt: new Date() },
          create: {
            reportId: item.reportId,
            userId: user.userId,
          },
        });
      }
    }
    return { unreadCount: 0 };
  }

  if (!input.notificationKey) {
    throw new AppError(400, "Thiếu mã thông báo cần đánh dấu đã đọc", "VALIDATION_ERROR");
  }

  await prisma.notificationRead.upsert({
    where: {
      notificationKey_userId: {
        notificationKey: input.notificationKey,
        userId: user.userId,
      },
    },
    update: { readAt: new Date() },
    create: {
      notificationKey: input.notificationKey,
      userId: user.userId,
    },
  });

  if (input.notificationKey.startsWith("report:")) {
    const reportId = input.notificationKey.slice("report:".length);
    const existingReport = await prisma.departmentReport.findUnique({
      where: { id: reportId },
      select: { id: true },
    });
    if (existingReport) {
      await prisma.departmentReportRead.upsert({
        where: {
          reportId_userId: {
            reportId,
            userId: user.userId,
          },
        },
        update: { readAt: new Date() },
        create: {
          reportId,
          userId: user.userId,
        },
      });
    }
  }

  const { unreadCount } = await listUserNotifications(user);
  return { unreadCount };
}
