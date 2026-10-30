import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

/**
 * Read-only aggregation straight from the database, so dashboard charts reflect
 * every Lead in the selected period instead of only the first page of the list API.
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD (both optional).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = parseDay(searchParams.get("from"), false);
    const to = parseDay(searchParams.get("to"), true);

    const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [statusGroups, sourceGroups, salesGroups, dates] = await Promise.all([
      prisma.lead.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.lead.groupBy({ by: ["source"], where, _count: { _all: true } }),
      prisma.lead.groupBy({
        by: ["salesPersonId", "status"],
        where,
        _count: { _all: true },
      }),
      prisma.lead.findMany({
        where,
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
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

    const salesMap = new Map<string, { name: string; initials: string; count: number; won: number }>();
    for (const group of salesGroups) {
      const user = group.salesPersonId ? userById.get(group.salesPersonId) : undefined;
      const key = group.salesPersonId || "unassigned";
      const entry = salesMap.get(key) || {
        name: user?.name || "Chưa phân công",
        initials: user?.initials || "TT",
        count: 0,
        won: 0,
      };
      entry.count += group._count._all;
      if (group.status === WON_STATUS) entry.won += group._count._all;
      salesMap.set(key, entry);
    }
    const bySales = Array.from(salesMap.values()).sort((a, b) => b.count - a.count);

    const dayCounts = new Map<string, number>();
    for (const row of dates) {
      const key = dayKey(row.createdAt);
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    }
    const byDay = Array.from(dayCounts.entries()).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      success: true,
      data: { total, statusCounts, bySource, bySales, byDay },
    });
  } catch (error) {
    console.error("GET /api/leads/analytics error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Không thể tổng hợp số liệu Lead" } },
      { status: 500 }
    );
  }
}

