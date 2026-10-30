"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Users2,
  FileSpreadsheet,
  CheckCircle2,
  UserPlus2,
  ArrowRight,
  Calendar,
  Megaphone,
  ClipboardList,
  Activity,
  Award,
  TrendingUp,
  Layers,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Lead, LeadStatus } from "@/types/lead";
import { CampaignItem } from "@/types/ads";
import { OverviewStats, ReportItem } from "@/types/report";
import { sharedGetJson } from "@/lib/shared-fetch";
import { cn } from "@/lib/utils";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { getLeadStatusTone, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback-states";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CardHeader } from "@/components/ui/card";

interface OverviewViewProps {
  leads: Lead[];
  stats?: OverviewStats;
  hasLoadedLeads?: boolean;
  /** Opens Lead Management, optionally pre-filtered by a pipeline status */
  onNavigateToLeads: (status?: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onSelectLead: (lead: Lead) => void;
}

function parseLeadDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const parsed = new Date(year, month, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const iso = new Date(dateStr);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function formatShortDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

interface LeadAnalytics {
  total: number;
  statusCounts: Record<string, number>;
  bySource: Array<{ source: string; count: number }>;
  bySales: Array<{ name: string; initials: string; count: number; won: number }>;
  byDay: Array<{ date: string; count: number }>;
}

interface TimePoint {
  key: string;
  label: string;
  count: number;
  showLabel: boolean;
}

function toDayString(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Translate the UI range selector into from/to (YYYY-MM-DD) for the analytics API. */
function getRangeParams(
  timeRange: "7d" | "30d" | "all" | "custom",
  customFrom: string,
  customTo: string
): { from?: string; to?: string } {
  if (timeRange === "7d" || timeRange === "30d") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (timeRange === "7d" ? 7 : 30));
    return { from: toDayString(start), to: toDayString(new Date()) };
  }
  if (timeRange === "custom") {
    return { from: customFrom || undefined, to: customTo || undefined };
  }
  return {};
}

/**
 * Turn per-day counts into a continuous series. Short ranges stay daily (zero-filled so
 * quiet days are visible); long ranges collapse to months so bars stay readable.
 */
function buildTimeSeries(
  byDay: Array<{ date: string; count: number }>,
  from?: string,
  to?: string
): TimePoint[] {
  if (byDay.length === 0) return [];
  const counts = new Map(byDay.map((d) => [d.date, d.count]));

  const start = new Date(`${from || byDay[0].date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = to ? new Date(`${to}T00:00:00`) : today;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  if (spanDays <= 31) {
    const points: TimePoint[] = [];
    const step = spanDays > 14 ? 5 : 1;
    for (let i = 0; i < spanDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toDayString(d);
      points.push({
        key,
        label: formatShortDate(d),
        count: counts.get(key) || 0,
        showLabel: i % step === 0 || i === spanDays - 1,
      });
    }
    return points;
  }

  const months = new Map<string, number>();
  byDay.forEach(({ date, count }) => {
    const key = date.slice(0, 7);
    months.set(key, (months.get(key) || 0) + count);
  });
  const points: TimePoint[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    const key = `${cursor.getFullYear()}-${mm}`;
    points.push({
      key,
      label: `${mm}/${cursor.getFullYear()}`,
      count: months.get(key) || 0,
      showLabel: true,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return points.slice(-12);
}

export function OverviewView({
  leads,
  stats,
  hasLoadedLeads = true,
  onNavigateToLeads,
  onNavigateToTab,
  onSelectLead,
}: OverviewViewProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all" | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Real Campaigns & Reports for Dashboard Analytics & Activity feed
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [recentReports, setRecentReports] = useState<ReportItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/campaigns")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json?.success && Array.isArray(json.data?.campaigns)) {
          setCampaigns(json.data.campaigns);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoadingCampaigns(false);
      });

    sharedGetJson("/api/reports")
      .then(({ ok, payload }) => {
        if (active && ok && payload?.success && Array.isArray(payload.data?.reports)) {
          setRecentReports(payload.data.reports);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoadingReports(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Aggregates computed by the database for the selected period (covers every Lead,
  // not just the first page returned by the list API).
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [analyticsFailed, setAnalyticsFailed] = useState(false);

  const range = useMemo(() => getRangeParams(timeRange, customFrom, customTo), [
    timeRange,
    customFrom,
    customTo,
  ]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);

    fetch(`/api/leads/analytics?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        if (json?.success && json.data) {
          setAnalytics(json.data as LeadAnalytics);
          setAnalyticsFailed(false);
        } else {
          setAnalyticsFailed(true);
        }
      })
      .catch(() => {
        if (active) setAnalyticsFailed(true);
      });

    return () => {
      active = false;
    };
  }, [range.from, range.to]);

  const filteredLeads = useMemo(() => {
    if (timeRange === "all") return leads;

    if (timeRange === "custom") {
      const fromDate = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
      const toDate = customTo ? new Date(`${customTo}T23:59:59`) : null;
      return leads.filter((lead) => {
        const parsed = parseLeadDate(lead.createdAt);
        if (!parsed) return true;
        if (fromDate && parsed < fromDate) return false;
        if (toDate && parsed > toDate) return false;
        return true;
      });
    }

    const days = timeRange === "7d" ? 7 : 30;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);

    return leads.filter((lead) => {
      const parsed = parseLeadDate(lead.createdAt);
      if (!parsed) return true;
      return parsed >= cutoff;
    });
  }, [leads, timeRange, customFrom, customTo]);

  // Prefer DB aggregates; fall back to the loaded page of Leads only if the API is unreachable.
  const dbStatus = analytics?.statusCounts;
  const useDb = Boolean(analytics);
  const countOf = (status: string) => dbStatus?.[status] ?? 0;
  const useServerAllStats = !useDb && timeRange === "all" && Boolean(stats);

  const totalLeads = useDb
    ? analytics!.total
    : useServerAllStats
      ? stats!.total
      : filteredLeads.length;
  const newLeads = useDb
    ? countOf("Vừa nhận thông tin")
    : useServerAllStats
      ? stats!.newLeads
      : filteredLeads.filter((l) => l.status === "Vừa nhận thông tin").length;
  const draftingLeads = useDb
    ? countOf("Đang soạn báo giá")
    : filteredLeads.filter((l) => l.status === "Đang soạn báo giá").length;
  const sentQuoteLeads = useDb
    ? countOf("Đã gửi báo giá")
    : filteredLeads.filter((l) => l.status === "Đã gửi báo giá").length;
  const quotingLeads = useDb
    ? draftingLeads + sentQuoteLeads
    : useServerAllStats
      ? stats!.quotingLeads
      : draftingLeads + sentQuoteLeads;
  const wonLeads = useDb
    ? countOf("Chốt thành công")
    : useServerAllStats
      ? stats!.wonLeads
      : filteredLeads.filter((l) => l.status === "Chốt thành công").length;
  const lostLeads = useDb
    ? countOf("Thất bại")
    : useServerAllStats
      ? stats!.lostLeads
      : filteredLeads.filter((l) => l.status === "Thất bại").length;

  const hasRealLeadData = (useDb || hasLoadedLeads) && totalLeads > 0;
  const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // 1. Lead theo thời gian
  const leadsByTime = useMemo<TimePoint[]>(() => {
    if (analytics) return buildTimeSeries(analytics.byDay, range.from, range.to);

    // Fallback (API unavailable): bucket the loaded Leads by day
    const map = new Map<string, { label: string; count: number; ts: number }>();
    filteredLeads.forEach((lead) => {
      const d = parseLeadDate(lead.createdAt);
      const label = d ? formatShortDate(d) : lead.createdAt || "Khác";
      const key = d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : label;
      const existing = map.get(key);
      if (existing) existing.count += 1;
      else map.set(key, { label, count: 1, ts: d ? d.getTime() : 0 });
    });
    return Array.from(map.entries())
      .sort((a, b) => a[1].ts - b[1].ts)
      .slice(-10)
      .map(([key, v]) => ({ key, label: v.label, count: v.count, showLabel: true }));
  }, [analytics, filteredLeads, range.from, range.to]);

  // 2. Lead theo nguồn
  const leadsBySource = useMemo(() => {
    if (analytics) {
      const base = Math.max(1, analytics.total);
      return analytics.bySource.map(({ source, count }) => ({
        source,
        count,
        pct: Math.round((count / base) * 100),
      }));
    }
    const counts = new Map<string, number>();
    filteredLeads.forEach((lead) => {
      const src = lead.source || "Chưa phân loại";
      counts.set(src, (counts.get(src) || 0) + 1);
    });
    const base = Math.max(1, filteredLeads.length);
    return Array.from(counts.entries())
      .map(([source, count]) => ({ source, count, pct: Math.round((count / base) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [analytics, filteredLeads]);

  // 3. Lead theo trạng thái (exact real counts — zero synthetic splitting)
  const leadsByStatus: Array<{
    status: LeadStatus;
    count: number;
    barClass: string;
  }> = useMemo(
    () => [
      { status: "Vừa nhận thông tin", count: newLeads, barClass: "bg-slate-500" },
      { status: "Đang soạn báo giá", count: draftingLeads, barClass: "bg-amber-500" },
      { status: "Đã gửi báo giá", count: sentQuoteLeads, barClass: "bg-blue-600" },
      { status: "Chốt thành công", count: wonLeads, barClass: "bg-emerald-500" },
      { status: "Thất bại", count: lostLeads, barClass: "bg-rose-500" },
    ],
    [newLeads, draftingLeads, sentQuoteLeads, wonLeads, lostLeads]
  );

  // 4. Sales performance (real lead & won counts)
  const salesPerformance = useMemo(() => {
    if (analytics) return analytics.bySales;

    const salesMap = new Map<
      string,
      { name: string; initials: string; count: number; won: number }
    >();

    filteredLeads.forEach((l) => {
      const name = l.salesPerson?.name || "Chưa phân công";
      const existing = salesMap.get(name) || {
        name,
        initials: l.salesPerson?.initials || "TT",
        count: 0,
        won: 0,
      };
      existing.count += 1;
      if (l.status === "Chốt thành công") existing.won += 1;
      salesMap.set(name, existing);
    });

    if (salesMap.size === 0 && useServerAllStats && stats!.salesLeaderboard.length > 0) {
      return stats!.salesLeaderboard
        .filter((s) => s.count > 0)
        .map((s) => ({
          name: s.name,
          initials: s.initials,
          count: s.count,
          won: 0,
        }));
    }

    return Array.from(salesMap.values()).sort((a, b) => b.count - a.count);
  }, [analytics, filteredLeads, stats, useServerAllStats]);

  // 5. Activity Area — honest feed: we only know each Lead's *current* status (no change log
  //    is exposed here), so lead rows describe the record rather than claiming a status event.
  const activityFeed = useMemo(() => {
    const items: Array<{
      id: string;
      category: "lead" | "report" | "design";
      title: string;
      subtitle: string;
      meta: string;
      leadRef?: Lead;
    }> = [];

    filteredLeads.slice(0, 4).forEach((l) => {
      items.push({
        id: `lead-${l.id}`,
        category: "lead",
        title: `${l.customerName} · ${l.companyName}`,
        subtitle: `${l.code} · ${l.product} · Phụ trách: ${l.salesPerson.name}`,
        meta: l.createdAt,
        leadRef: l,
      });
    });

    recentReports.slice(0, 4).forEach((r) => {
      const isDesign = r.department === "DESIGN";
      items.push({
        id: `rep-${r.id}`,
        category: isDesign ? "design" : "report",
        title: r.title,
        subtitle: `${r.createdBy.name} · Phòng ${r.department}`,
        meta: new Date(r.createdAt).toLocaleDateString("vi-VN"),
      });
    });

    return items.slice(0, 7);
  }, [filteredLeads, recentReports]);

  // 6. Action queue — real leads waiting on the team, oldest first (longest waiting at top)
  const actionQueue = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toItem = (l: Lead, reason: string) => {
      const d = parseLeadDate(l.createdAt);
      const days = d ? Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86_400_000)) : null;
      return { lead: l, reason, days, ts: d ? d.getTime() : Number.MAX_SAFE_INTEGER };
    };
    const contact = filteredLeads
      .filter((l) => l.status === "Vừa nhận thông tin")
      .map((l) => toItem(l, "Chờ liên hệ"));
    const followUp = filteredLeads
      .filter((l) => l.status === "Đã gửi báo giá")
      .map((l) => toItem(l, "Chờ phản hồi báo giá"));
    return {
      contactCount: contact.length,
      followUpCount: followUp.length,
      items: [...contact, ...followUp].sort((a, b) => a.ts - b.ts).slice(0, 6),
    };
  }, [filteredLeads]);

  const maxTimeCount = Math.max(1, ...leadsByTime.map((d) => d.count));

  const getRangeLabel = () => {
    if (timeRange === "7d") return "7 ngày gần nhất";
    if (timeRange === "30d") return "30 ngày gần nhất";
    if (timeRange === "custom") {
      return `${customFrom || "..."} đến ${customTo || "..."}`;
    }
    return "Toàn thời gian";
  };

  return (
    <div className="space-y-6">
      {/* Top Area */}
      <PageHeader
        title="Dashboard"
        description="Tổng quan hoạt động Marketing & Kinh doanh"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              ariaLabel="Khoảng thời gian"
              icon={<Calendar className="w-3.5 h-3.5" />}
              value={timeRange}
              onChange={setTimeRange}
              options={[
                { id: "7d", label: "7 ngày" },
                { id: "30d", label: "30 ngày" },
                { id: "all", label: "Tất cả" },
                { id: "custom", label: "Tùy chọn" },
              ]}
            />

            <Button
              variant="secondary"
              size="md"
              isLoading={isExportingExcel}
              disabled={filteredLeads.length === 0}
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              onClick={async () => {
                try {
                  setIsExportingExcel(true);
                  // Loaded on demand: the Excel engine is large and only needed when exporting
                  const { exportLeadsWorkbook } = await import("@/lib/excel-export");
                  await exportLeadsWorkbook({
                    leads: filteredLeads,
                    stats: useServerAllStats ? stats : undefined,
                    filterLabel: `Dashboard (${getRangeLabel()})`,
                    exportedBy: "Ban Điều Hành Toàn Trung",
                  });
                } finally {
                  setIsExportingExcel(false);
                }
              }}
            >
              Export
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigateToLeads()}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Quản lý Lead
            </Button>
          </div>
        }
      />

      {/* Custom Date Range Picker Row */}
      {timeRange === "custom" && (
        <div className="crm-card p-3.5 flex flex-wrap items-center gap-3 text-xs animate-dropdown-in">
          <span className="font-medium text-slate-600">Khoảng thời gian tùy chọn:</span>
          <div className="flex items-center gap-2">
            <label htmlFor="dash-from" className="text-slate-500">
              Từ ngày
            </label>
            <input
              id="dash-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="crm-input h-8 w-auto text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="dash-to" className="text-slate-500">
              Đến ngày
            </label>
            <input
              id="dash-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="crm-input h-8 w-auto text-xs"
            />
          </div>
          {(customFrom || customTo) && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setCustomFrom("");
                setCustomTo("");
              }}
            >
              Xóa ngày
            </Button>
          )}
        </div>
      )}

      {/* KPI Cards — each drills down into Lead Management with the matching stage filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Tổng Lead"
          value={hasRealLeadData ? totalLeads.toLocaleString("vi-VN") : null}
          isEmpty={!hasRealLeadData}
          icon={Users2}
          iconTone="blue"
          note={
            hasRealLeadData
              ? `Kỳ lọc: ${getRangeLabel()}`
              : "Chưa ghi nhận hồ sơ khách hàng tiềm năng"
          }
          onClick={hasRealLeadData ? () => onNavigateToLeads("all") : undefined}
          actionHint="Mở danh sách"
        />
        <StatCard
          label="Lead mới"
          value={hasRealLeadData ? newLeads.toLocaleString("vi-VN") : null}
          isEmpty={!hasRealLeadData}
          icon={UserPlus2}
          iconTone="violet"
          progress={totalLeads > 0 ? Math.round((newLeads / totalLeads) * 100) : undefined}
          note={
            hasRealLeadData
              ? "Đang ở bước Vừa nhận thông tin"
              : "Chưa phát sinh Lead mới trong kỳ"
          }
          onClick={hasRealLeadData ? () => onNavigateToLeads("Vừa nhận thông tin") : undefined}
          actionHint="Xem"
        />
        <StatCard
          label="Đang báo giá"
          value={hasRealLeadData ? quotingLeads.toLocaleString("vi-VN") : null}
          isEmpty={!hasRealLeadData}
          icon={Clock}
          iconTone="amber"
          progress={totalLeads > 0 ? Math.round((quotingLeads / totalLeads) * 100) : undefined}
          badgeText={hasRealLeadData && quotingLeads > 0 ? "Cần bám sát" : undefined}
          badgeTone="warning"
          note={
            hasRealLeadData
              ? `${draftingLeads} đang soạn · ${sentQuoteLeads} đã gửi`
              : "Chưa có hồ sơ đang báo giá"
          }
          onClick={hasRealLeadData ? () => onNavigateToLeads("Đã gửi báo giá") : undefined}
          actionHint="Xem đã gửi"
        />
        <StatCard
          label="Chốt thành công"
          value={hasRealLeadData ? wonLeads.toLocaleString("vi-VN") : null}
          isEmpty={!hasRealLeadData}
          icon={CheckCircle2}
          iconTone="emerald"
          progress={hasRealLeadData ? winRate : undefined}
          badgeText={hasRealLeadData ? `${winRate}% tỷ lệ chốt` : undefined}
          badgeTone="success"
          note={
            hasRealLeadData
              ? `${lostLeads} hồ sơ thất bại / tạm ngưng`
              : "Chưa có dữ liệu chuyển đổi hợp đồng"
          }
          onClick={hasRealLeadData ? () => onNavigateToLeads("Chốt thành công") : undefined}
          actionHint="Xem"
        />
      </div>

      {/* Analytics Area Row 1: Lead theo thời gian & Lead theo trạng thái */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Lead theo thời gian */}
        <div className="lg:col-span-7 crm-card p-5 flex flex-col justify-between">
          <SectionHeader
            title="Lead theo thời gian"
            description={
              leadsByTime.length > 31 || leadsByTime.some((p) => p.label.length > 5)
                ? "Số Lead tiếp nhận theo tháng (đọc trực tiếp từ cơ sở dữ liệu)"
                : "Số Lead tiếp nhận theo ngày (đọc trực tiếp từ cơ sở dữ liệu)"
            }
            count={hasRealLeadData ? `${totalLeads.toLocaleString("vi-VN")} Lead` : undefined}
          />

          {analyticsFailed && !analytics && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Không tải được số liệu tổng hợp từ máy chủ. Biểu đồ đang chỉ tính trên các Lead đã tải
              (tối đa 50 Lead gần nhất).
            </p>
          )}

          {leadsByTime.length > 0 ? (
            <div className="mt-6 pt-2">
              <div className="h-44 flex items-end gap-1 sm:gap-1.5 px-1 border-b border-slate-100 pb-2">
                {leadsByTime.map((point) => {
                  // Exact proportion: a day with 0 Lead renders no bar (no artificial minimum height)
                  const heightPct =
                    point.count === 0 ? 0 : Math.max(3, Math.round((point.count / maxTimeCount) * 100));
                  return (
                    <div
                      key={point.key}
                      className="flex-1 min-w-0 flex flex-col items-center justify-end h-full group"
                      title={`${point.label}: ${point.count} Lead`}
                    >
                      <span
                        className={cn(
                          "text-[11px] font-medium mb-1.5 kpi-number",
                          point.count === 0
                            ? "text-transparent group-hover:text-slate-400"
                            : "text-slate-500 group-hover:text-blue-600"
                        )}
                      >
                        {point.count}
                      </span>
                      <div className="w-full max-w-[36px] h-full flex items-end">
                        <div
                          className="w-full bg-blue-600 group-hover:bg-blue-700 rounded-t-md transition-all duration-200"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 px-1 pt-2">
                {leadsByTime.map((point) => (
                  <div
                    key={point.key}
                    className="flex-1 min-w-0 text-center text-[10.5px] text-slate-500 tabular-nums whitespace-nowrap overflow-visible"
                  >
                    {point.showLabel ? point.label : ""}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={TrendingUp}
                title="Chưa có dữ liệu Lead theo thời gian"
                description="Biểu đồ xu hướng sẽ tự động hiển thị ngay khi hệ thống ghi nhận khách hàng tiềm năng thật."
              />
            </div>
          )}
        </div>

        {/* Lead theo trạng thái */}
        <div className="lg:col-span-5 crm-card p-5 flex flex-col justify-between">
          <SectionHeader
            title="Lead theo trạng thái"
            description="Phân bổ tiến độ 5 giai đoạn xử lý hồ sơ dự án"
          />

          {hasRealLeadData ? (
            <div className="mt-4 space-y-1">
              {leadsByStatus.map((stage) => {
                const pct = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;
                return (
                  <button
                    type="button"
                    key={stage.status}
                    onClick={() => onNavigateToLeads(stage.status)}
                    title={`Mở danh sách Lead "${stage.status}"`}
                    className="w-full text-left space-y-1.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 group-hover:text-slate-900">
                        {stage.status}
                      </span>
                      <span className="text-slate-500 kpi-number inline-flex items-center gap-1">
                        <strong className="font-semibold text-slate-900">{stage.count}</strong>
                        <span className="w-9 text-right">{pct}%</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full origin-left animate-bar-grow", stage.barClass)}
                        style={{ width: `${stage.count > 0 ? Math.max(4, pct) : 0}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={Layers}
                title="Chưa có dữ liệu trạng thái"
                description="Tỷ trọng 5 bước tiến độ sẽ hiển thị khi có hồ sơ Lead trong cơ sở dữ liệu."
              />
            </div>
          )}
        </div>
      </div>

      {/* Analytics Area Row 2: Lead theo nguồn, Campaign Performance, Sales Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lead theo nguồn */}
        <div className="crm-card p-5">
          <SectionHeader
            title="Lead theo nguồn"
            description="Tỷ trọng các kênh mang về khách hàng"
            count={leadsBySource.length > 0 ? `${leadsBySource.length} kênh` : undefined}
          />

          {leadsBySource.length > 0 ? (
            <div className="mt-4 space-y-3">
              {leadsBySource.slice(0, 6).map((item) => (
                <div key={item.source} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate">{item.source}</span>
                    <span className="text-slate-500 kpi-number">
                      <strong className="font-semibold text-slate-900">{item.count}</strong> ·{" "}
                      {item.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${Math.max(5, item.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={Activity}
                title="Chưa có dữ liệu nguồn Lead"
                description="Chưa ghi nhận nguồn tiếp cận khách hàng trong khoảng thời gian đã chọn."
              />
            </div>
          )}
        </div>

        {/* Campaign Performance (Real /api/campaigns) */}
        <div className="crm-card p-5">
          <SectionHeader
            title="Campaign Performance"
            description="Hiệu suất ngân sách & CTR các chiến dịch thực tế"
            action={
              onNavigateToTab ? (
                <button
                  type="button"
                  onClick={() => onNavigateToTab("ads")}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Chi tiết
                </button>
              ) : undefined
            }
          />

          {isLoadingCampaigns ? (
            <div className="mt-4 space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : campaigns.length > 0 ? (
            <div className="mt-4 space-y-3">
              {campaigns.slice(0, 4).map((camp) => {
                const spendRatio =
                  camp.budget > 0 ? Math.min(100, Math.round((camp.spent / camp.budget) * 100)) : 0;
                const isActive = camp.status?.toUpperCase() === "ACTIVE";
                return (
                  <div
                    key={camp.id}
                    className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-slate-900 truncate">
                        {camp.name}
                      </span>
                      <StatusBadge
                        tone={isActive ? "success" : "neutral"}
                        size="sm"
                        dot={false}
                      >
                        {isActive ? "Active" : camp.status}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center justify-between text-[11.5px] text-slate-500 kpi-number">
                      <span>
                        Chi: {(camp.spent / 1_000_000).toFixed(1)}M /{" "}
                        {(camp.budget / 1_000_000).toFixed(1)}M
                      </span>
                      <span>
                        {camp.platform} · <strong className="text-slate-800">{spendRatio}%</strong>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${spendRatio === 0 ? 0 : Math.max(4, spendRatio)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={Megaphone}
                title="Chưa có dữ liệu chiến dịch"
                description="Chưa có chiến dịch quảng cáo nào được ghi nhận trên hệ thống."
              />
            </div>
          )}
        </div>

        {/* Sales Performance */}
        <div className="crm-card p-5">
          <SectionHeader
            title="Sales Performance"
            description="Phân bổ khối lượng hồ sơ theo nhân sự Kinh doanh"
            count={salesPerformance.length > 0 ? `${salesPerformance.length} Sales` : undefined}
          />

          {salesPerformance.length > 0 ? (
            <div className="mt-4 space-y-2.5">
              {salesPerformance.slice(0, 5).map((person) => (
                <div
                  key={person.name}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-200/70 bg-slate-50/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-slate-200/80 text-slate-700 text-[11px] font-semibold flex items-center justify-center shrink-0">
                      {person.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-slate-900 truncate">
                        {person.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {person.won > 0 ? `Đã chốt ${person.won} dự án` : "Đang chăm sóc cơ hội"}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-slate-800 kpi-number px-2 py-1 rounded-md bg-white border border-slate-200/80 shrink-0">
                    {person.count} Lead
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                compact
                icon={Award}
                title="Chưa có dữ liệu hiệu suất Sales"
                description="Thống kê bàn giao và chốt hợp đồng sẽ hiển thị khi có Lead được phân công."
              />
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Activity feed (what happened) + Action queue (what to do next) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 crm-card overflow-hidden flex flex-col">
          <CardHeader
            title="Hoạt động gần đây"
            description="Lead mới nhất và báo cáo vừa gửi từ các phòng ban"
            actions={
              <Button variant="ghost" size="sm" onClick={() => onNavigateToLeads()}>
                Xem tất cả
              </Button>
            }
          />

          {isLoadingReports && activityFeed.length === 0 ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-3/5" />
                    <div className="skeleton h-3 w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : activityFeed.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {activityFeed.map((act) => {
                const meta =
                  act.category === "lead"
                    ? { label: "Lead", Icon: UserPlus2, cls: "bg-blue-50 text-blue-600 border-blue-200/70" }
                    : act.category === "design"
                      ? { label: "Thiết kế", Icon: Layers, cls: "bg-slate-100 text-slate-600 border-slate-200" }
                      : { label: "Báo cáo", Icon: ClipboardList, cls: "bg-emerald-50 text-emerald-600 border-emerald-200/70" };
                const Icon = meta.Icon;

                return (
                  <li key={act.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (act.leadRef) {
                          onSelectLead(act.leadRef);
                        } else if (onNavigateToTab) {
                          onNavigateToTab("reports");
                        }
                      }}
                      className="w-full text-left px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            "w-8 h-8 rounded-full border flex items-center justify-center shrink-0",
                            meta.cls
                          )}
                          title={meta.label}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {act.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{act.subtitle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {act.leadRef && (
                          <StatusBadge
                            tone={getLeadStatusTone(act.leadRef.status)}
                            size="sm"
                            className="hidden sm:inline-flex"
                          >
                            {act.leadRef.status}
                          </StatusBadge>
                        )}
                        <span className="text-xs text-slate-400 tabular-nums">{act.meta}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={ClipboardList}
              title="Chưa có hoạt động nào gần đây"
              description="Khi có Lead mới hoặc báo cáo từ các phòng ban, nhật ký sẽ tự động xuất hiện tại đây."
              action={
                <Button variant="primary" size="sm" onClick={() => onNavigateToLeads()}>
                  Chuyển tới Quản lý Lead
                </Button>
              }
            />
          )}
        </div>

        {/* Action queue */}
        <div className="lg:col-span-5 crm-card overflow-hidden flex flex-col">
          <CardHeader
            title="Cần xử lý"
            description="Lead đang chờ đội ngũ phản hồi, chờ lâu nhất xếp trước"
            count={actionQueue.contactCount + actionQueue.followUpCount}
          />

          {actionQueue.items.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-px bg-slate-100 border-b border-slate-200/80">
                <button
                  type="button"
                  onClick={() => onNavigateToLeads("Vừa nhận thông tin")}
                  className="bg-white px-5 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <p className="text-overline">Chờ liên hệ</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
                    {actionQueue.contactCount}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToLeads("Đã gửi báo giá")}
                  className="bg-white px-5 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <p className="text-overline">Chờ phản hồi báo giá</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
                    {actionQueue.followUpCount}
                  </p>
                </button>
              </div>
              <ul className="divide-y divide-slate-100">
                {actionQueue.items.map(({ lead, reason, days }) => (
                  <li key={lead.id}>
                    <button
                      type="button"
                      onClick={() => onSelectLead(lead)}
                      className="w-full text-left px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {lead.customerName}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {reason} · {lead.salesPerson.name}
                        </p>
                      </div>
                      {days !== null && (
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium tabular-nums border",
                            days >= 7
                              ? "bg-rose-50 text-rose-700 border-rose-200/80"
                              : days >= 3
                                ? "bg-amber-50 text-amber-700 border-amber-200/80"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                          )}
                          title="Số ngày kể từ khi tạo Lead"
                        >
                          {days === 0 ? "Hôm nay" : `${days} ngày`}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              compact
              icon={CheckCircle2}
              title={hasRealLeadData ? "Không có Lead tồn đọng" : "Chưa có dữ liệu Lead"}
              description={
                hasRealLeadData
                  ? "Không có hồ sơ nào đang chờ liên hệ hoặc chờ phản hồi báo giá trong kỳ đã chọn."
                  : "Danh sách việc cần làm sẽ xuất hiện khi có Lead trong hệ thống."
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
