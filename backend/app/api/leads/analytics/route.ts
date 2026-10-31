import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessAllLeads, unauthorizedResponse } from "@/lib/auth";
import { computeLeadScore, computeLeadSla, parseVndString } from "@/lib/lead-scoring";

export const dynamic = "force-dynamic";

const WON_STATUS = "Chốt thành công";

function parseDay(value: string | null, endOfDay: boolean): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function dayKey(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function maskPhoneIfRestricted(phone: string, allowFull: boolean): string {
  if (allowFull || !phone) return phone;
  const digits = phone.trim();
  if (digits.length <= 6) return "***";
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

/**
 * Read-only 100% real database aggregation for Dashboard.
 * Completely independent of any UI filter left active on the Lead Management tab.
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD (both optional).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const from = parseDay(searchParams.get("from"), false);
    const to = parseDay(searchParams.get("to"), true);

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
      trackingEventsCount,
      reportsCount,
      campaignsCount,
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
          status: { in: ["Vừa nhận thông tin", "Đang soạn báo giá", "Đã gửi báo giá"] },
        },
        include: leadInclude,
        orderBy: { createdAt: "asc" },
        take: 6,
      }),
      prisma.trackingEvent.count(where.createdAt ? { where: { createdAt: where.createdAt } } : undefined),
      prisma.departmentReport.count(where.createdAt ? { where: { createdAt: where.createdAt } } : undefined),
      prisma.marketingCampaign.count(),
    ]);

    const statusCounts: Record<string, number> = {};
    let total = 0;
    for (const group of statusGroups) {
      statusCounts[group.status] = group._count._all;
      total += group._count._all;
    }

    const bySource = sourceGroups
      .map((group) => ({ source: group.source || "Chưa phân loại", count: group._count._all }))
      .sort((a, b) => b.count - a.count);

    const salesIds = Array.from(
      new Set(salesGroups.map((g) => g.salesPersonId).filter((id): id is string => Boolean(id)))
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
      if (vnd > 0 && (row.status === "Đang soạn báo giá" || row.status === "Đã gửi báo giá")) {
        quotingValueVnd += vnd;
      }
      if (vnd > 0 && row.status === WON_STATUS) {
        wonRevenueVnd += vnd;
      }
    }

    const salesMap = new Map<
      string,
      { name: string; initials: string; count: number; won: number; pipelineVnd: number }
    >();
    for (const group of salesGroups) {
      const salesUser = group.salesPersonId ? userById.get(group.salesPersonId) : undefined;
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
    const bySales = Array.from(salesMap.values()).sort((a, b) => b.count - a.count);

    const byDay = Array.from(dayCounts.entries()).map(([date, count]) => ({ date, count }));

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
      (statusCounts["Đang soạn báo giá"] || 0) + (statusCounts["Đã gửi báo giá"] || 0);

    return NextResponse.json({
      success: true,
      data: {
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
        webTotals: {
          trackingEventsCount,
          reportsCount,
          campaignsCount,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/leads/analytics error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Không thể tổng hợp số liệu Lead" } },
      { status: 500 }
    );
  }
}
