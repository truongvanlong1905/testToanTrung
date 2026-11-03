"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Globe,
  Share2,
  RefreshCw,
  Copy,
  Laptop,
  Smartphone,
  FileSpreadsheet,
  Radio,
  BarChart2,
  Search as SearchIcon,
  Megaphone,
  PlugZap,
} from "lucide-react";
import { TrackingEventItem, SyncJobItem } from "../types";
import { exportTrackingWorkbook } from "@/src/core/utils/excel-export";
import { PageHeader, SectionHeader } from "@/src/core/ui/page-header";
import { CardHeader } from "@/src/core/ui/card";
import { Toast } from "@/src/core/ui/toast";
import { StatCard } from "@/src/core/ui/stat-card";
import { Button } from "@/src/core/ui/button";
import { StatusBadge, BadgeTone } from "@/src/core/ui/badge";
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
  SearchInput,
} from "@/src/core/ui/feedback-states";

export function TrackingView() {
  const [events, setEvents] = useState<TrackingEventItem[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJobItem[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [eventSearch, setEventSearch] = useState("");

  // UTM Generator State
  const [utmUrl, setUtmUrl] = useState("");
  const [utmSource, setUtmSource] = useState("google");
  const [utmMedium, setUtmMedium] = useState("cpc");
  const [utmCampaign, setUtmCampaign] = useState("Man_Hinh_LED_2026");
  const [generatedLink, setGeneratedLink] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const fetchTracking = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await fetch("/api/tracking");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || "Không thể tải dữ liệu tracking từ máy chủ"
        );
      }
      setEvents(json.data.events || []);
      setSyncJobs(json.data.syncJobs || []);
      setTotalEvents(json.data.totalEvents || 0);
      setHasLoaded(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Không thể tải dữ liệu tracking";
      setLoadError(msg);
      showToast(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, []);

  // Generate UTM link
  useEffect(() => {
    if (!utmUrl.trim()) {
      setGeneratedLink("");
      return;
    }
    try {
      const url = new URL(utmUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Chỉ chấp nhận URL HTTP hoặc HTTPS");
      }
      if (utmSource) url.searchParams.set("utm_source", utmSource);
      if (utmMedium) url.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
      setGeneratedLink(url.toString());
    } catch {
      setGeneratedLink("");
    }
  }, [utmUrl, utmSource, utmMedium, utmCampaign]);

  const getConnectorMeta = (
    service: string
  ): { label: string; tone: BadgeTone; isConnected: boolean } => {
    const job = syncJobs.find((item) => item.service === service);
    if (!job || job.status === "NOT_CONFIGURED") {
      return {
        label: "Chưa cấu hình",
        tone: "neutral",
        isConnected: false,
      };
    }
    if (job.status === "COMPLETED") {
      return {
        label: "Đã đồng bộ",
        tone: "success",
        isConnected: true,
      };
    }
    if (job.status === "SYNCING") {
      return {
        label: "Đang đồng bộ",
        tone: "info",
        isConnected: false,
      };
    }
    if (job.status === "CONNECTED") {
      return {
        label: "Chưa xác minh",
        tone: "warning",
        isConnected: false,
      };
    }
    return {
      label: "Lỗi đồng bộ",
      tone: "error",
      isConnected: false,
    };
  };

  const lastSyncLabel = (service: string) => {
    const job = syncJobs.find(
      (item) =>
        item.service === service &&
        item.status === "COMPLETED" &&
        item.lastSyncTime
    );
    return job?.lastSyncTime
      ? `Đồng bộ gần nhất: ${new Date(job.lastSyncTime).toLocaleString("vi-VN")}`
      : "Chưa có lịch sử đồng bộ thành công";
  };

  const handleSyncService = async (service: string) => {
    try {
      setIsSyncing(service);
      const res = await fetch("/api/tracking/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.message || json.error?.message || "Không thể đồng bộ dịch vụ"
        );
      }
      showToast(json.message || "Đồng bộ hoàn tất");
      await fetchTracking();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Lỗi đồng bộ");
      await fetchTracking();
    } finally {
      setIsSyncing(null);
    }
  };

  const uniqueSourcesCount = useMemo(() => {
    const set = new Set<string>();
    events.forEach((ev) => {
      if (ev.source && ev.source !== "Chưa có thông tin") {
        set.add(ev.source.trim().toLowerCase());
      }
    });
    return set.size;
  }, [events]);

  const apiServices = ["GOOGLE_ADS", "GA4", "SEARCH_CONSOLE"] as const;
  const connectedApiCount = apiServices.filter(
    (svc) => getConnectorMeta(svc).isConnected
  ).length;
  const websiteTrackingActive = totalEvents > 0 || events.length > 0;
  const connectedTotalCount =
    connectedApiCount + (websiteTrackingActive ? 1 : 0);

  const overallSyncLabel = useMemo(() => {
    if (!hasLoaded) return null;
    if (connectedApiCount === 3) return "Đồng bộ đầy đủ";
    if (connectedApiCount > 0) return `${connectedApiCount}/3 kết nối hoạt động`;
    if (websiteTrackingActive) return "Ghi nhận từ Website";
    return "Chưa cấu hình";
  }, [hasLoaded, connectedApiCount, websiteTrackingActive]);

  const latestEventTime = useMemo(() => {
    if (events.length === 0) return "Chưa ghi nhận sự kiện từ website";
    return `Ghi nhận mới nhất: ${new Date(events[0].createdAt).toLocaleString(
      "vi-VN"
    )}`;
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (ev) =>
        ev.websiteSource?.toLowerCase().includes(q) ||
        ev.source?.toLowerCase().includes(q) ||
        ev.medium?.toLowerCase().includes(q) ||
        (ev.campaign || "").toLowerCase().includes(q) ||
        ev.landingPage?.toLowerCase().includes(q) ||
        (ev.location || "").toLowerCase().includes(q)
    );
  }, [events, eventSearch]);

  if (isLoading && !hasLoaded) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tracking"
          description="Theo dõi nguồn truy cập đa kênh, cấu hình kết nối dữ liệu và khởi tạo liên kết chiến dịch UTM."
        />
        <PageSkeleton cards={4} rows={6} />
      </div>
    );
  }

  if (loadError && !hasLoaded) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tracking"
          description="Theo dõi nguồn truy cập đa kênh, cấu hình kết nối dữ liệu và khởi tạo liên kết chiến dịch UTM."
        />
        <ErrorState message={loadError} onRetry={fetchTracking} />
      </div>
    );
  }

  const connectors = [
    {
      key: "GOOGLE_ADS",
      title: "Google Ads",
      description:
        "Đồng bộ chiến dịch tìm kiếm, lượt nhấp quảng cáo và tham số UTM.",
      icon: Megaphone,
      meta: getConnectorMeta("GOOGLE_ADS"),
      lastSync: lastSyncLabel("GOOGLE_ADS"),
      canTest: true,
    },
    {
      key: "GA4",
      title: "Google Analytics 4 (GA4)",
      description:
        "Đo lường phiên truy cập, hành vi xem trang đích và sự kiện gửi biểu mẫu.",
      icon: BarChart2,
      meta: getConnectorMeta("GA4"),
      lastSync: lastSyncLabel("GA4"),
      canTest: true,
    },
    {
      key: "SEARCH_CONSOLE",
      title: "Search Console",
      description:
        "Theo dõi truy vấn tìm kiếm tự nhiên, tỷ lệ nhấp (CTR) và thứ hạng từ khóa.",
      icon: SearchIcon,
      meta: getConnectorMeta("SEARCH_CONSOLE"),
      lastSync: lastSyncLabel("SEARCH_CONSOLE"),
      canTest: true,
    },
    {
      key: "WEBSITE_TRACKING",
      title: "Theo dõi Website",
      description:
        "Thu nhận trực tiếp nguồn truy cập, thiết bị và tham số UTM từ trang đích.",
      icon: Radio,
      meta: websiteTrackingActive
        ? { label: "Đang ghi nhận", tone: "success" as BadgeTone, isConnected: true }
        : { label: "Chờ sự kiện", tone: "neutral" as BadgeTone, isConnected: false },
      lastSync: latestEventTime,
      canTest: false,
    },
  ];

  return (
    <div className="space-y-6">
      <Toast message={toast} onDismiss={() => setToast(null)} />

      <PageHeader
        title="Tracking & Tích hợp nguồn dữ liệu"
        description="Theo dõi nguồn truy cập đa kênh, kiểm tra kết nối dữ liệu và khởi tạo liên kết chiến dịch UTM."
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              isLoading={isExportingExcel}
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              onClick={async () => {
                try {
                  setIsExportingExcel(true);
                  await exportTrackingWorkbook({
                    events,
                    syncJobs,
                    totalEvents,
                  });
                  showToast("Đã xuất dữ liệu Tracking (.xlsx) thành công");
                } catch {
                  showToast("Không thể xuất file Excel. Vui lòng thử lại.");
                } finally {
                  setIsExportingExcel(false);
                }
              }}
            >
              Xuất Excel
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={fetchTracking}
              leftIcon={
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`}
                />
              }
            >
              Làm mới
            </Button>
          </>
        }
      />

      {/* Top Summary (4 KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Tổng sự kiện"
          value={hasLoaded ? totalEvents.toLocaleString("vi-VN") : null}
          isEmpty={!hasLoaded}
          icon={Activity}
          iconTone="blue"
          note={
            events.length > 0
              ? `Hiển thị ${events.length} sự kiện gần nhất`
              : "Chưa phát sinh lượt truy cập mới"
          }
        />
        <StatCard
          label="Nguồn truy cập"
          value={hasLoaded ? `${uniqueSourcesCount} nguồn` : null}
          isEmpty={!hasLoaded}
          icon={Globe}
          iconTone="emerald"
          note="Số kênh utm_source phân biệt đã ghi nhận"
        />
        <StatCard
          label="Kết nối hoạt động"
          value={hasLoaded ? `${connectedTotalCount} / 4` : null}
          isEmpty={!hasLoaded}
          icon={PlugZap}
          iconTone="slate"
          badgeText={connectedApiCount === 0 ? "Chưa cấu hình API" : undefined}
          badgeTone="neutral"
          note="Google Ads, GA4, Search Console & Website"
        />
        <StatCard
          label="Trạng thái đồng bộ"
          value={overallSyncLabel}
          isEmpty={!hasLoaded}
          icon={RefreshCw}
          iconTone={connectedApiCount > 0 ? "emerald" : "amber"}
          note={
            connectedApiCount > 0
              ? "Kết nối đồng bộ tự động đang hoạt động"
              : "Cần cấu hình kết nối trên máy chủ để đồng bộ"
          }
        />
      </div>

      {/* 4 Connection Cards */}
      <div className="space-y-3">
        <SectionHeader
          title="Kết nối nguồn dữ liệu"
          description="Trạng thái xác thực thực tế của các trình kết nối tiếp thị & đo lường"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {connectors.map((conn) => {
            const Icon = conn.icon;
            return (
              <div
                key={conn.key}
                className="crm-card p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <StatusBadge tone={conn.meta.tone} size="sm">
                      {conn.meta.label}
                    </StatusBadge>
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-slate-900">
                      {conn.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {conn.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 truncate" title={conn.lastSync}>
                    {conn.lastSync}
                  </span>
                  {conn.canTest ? (
                    <Button
                      variant="ghost"
                      size="xs"
                      isLoading={isSyncing === conn.key}
                      onClick={() => handleSyncService(conn.key)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0"
                    >
                      Kiểm tra
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={fetchTracking}
                      className="text-slate-600 shrink-0"
                    >
                      Tải lại
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* UTM Campaign Link Builder */}
      <div className="crm-card p-5 space-y-4">
        <SectionHeader
          title="Công cụ tạo liên kết UTM"
          description="Chuẩn hóa tham số chiến dịch trước khi phân phối trên Google Ads, Facebook hoặc Zalo"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="sm:col-span-2">
            <label className="crm-label">Đường dẫn trang đích (URL)</label>
            <input
              type="url"
              value={utmUrl}
              onChange={(e) => setUtmUrl(e.target.value)}
              placeholder="Nhập đường dẫn trang đích (https://...)"
              className="crm-input"
            />
          </div>
          <div>
            <label className="crm-label">Nguồn (utm_source)</label>
            <input
              type="text"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              placeholder="google, facebook, zalo"
              className="crm-input"
            />
          </div>
          <div>
            <label className="crm-label">Phương thức (utm_medium)</label>
            <input
              type="text"
              value={utmMedium}
              onChange={(e) => setUtmMedium(e.target.value)}
              placeholder="cpc, social, banner"
              className="crm-input"
            />
          </div>
          <div>
            <label className="crm-label">Chiến dịch (utm_campaign)</label>
            <input
              type="text"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              placeholder="Man_Hinh_LED_2026"
              className="crm-input"
            />
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-mono text-xs text-slate-700 truncate select-all">
              {generatedLink || "Nhập đường dẫn trang đích (https://...) ở trên để tạo liên kết UTM"}
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={!generatedLink}
            leftIcon={<Copy className="w-3.5 h-3.5" />}
            onClick={() => {
              navigator.clipboard
                .writeText(generatedLink)
                .then(() => showToast("Đã sao chép liên kết UTM vào bộ nhớ tạm"))
                .catch(() => showToast("Trình duyệt không cho phép sao chép tự động"));
            }}
          >
            Sao chép liên kết
          </Button>
        </div>
      </div>

      {/* Live Tracking Events Table */}
      <div className="crm-card overflow-hidden">
        <CardHeader
          title="Nhật ký sự kiện truy cập"
          description="Nguồn truy cập, chiến dịch UTM, thiết bị và vị trí ghi nhận từ website"
          count={`${filteredEvents.length} / ${totalEvents}`}
          actions={
            <SearchInput
              value={eventSearch}
              onChange={setEventSearch}
              placeholder="Tìm website, nguồn, chiến dịch..."
              className="w-full sm:w-72"
            />
          }
        />

        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={
              eventSearch
                ? "Không tìm thấy sự kiện khớp bộ lọc"
                : "Chưa có dữ liệu sự kiện truy cập"
            }
            description={
              eventSearch
                ? "Thử xóa từ khóa tìm kiếm để xem toàn bộ nhật ký truy cập đã ghi nhận."
                : "Khi khách hàng truy cập trang đích có gắn mã theo dõi hoặc tham số UTM, sự kiện sẽ hiển thị trực tiếp tại đây."
            }
            action={
              eventSearch ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEventSearch("")}
                >
                  Xóa tìm kiếm
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto max-h-[520px]">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Website nguồn</th>
                  <th>Nguồn / Phương thức</th>
                  <th>Chiến dịch &amp; Trang đích</th>
                  <th>Thiết bị</th>
                  <th>Khu vực / Địa chỉ IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev) => {
                  const isMobile = (ev.device || "")
                    .toLowerCase()
                    .includes("mobile");
                  return (
                    <tr key={ev.id}>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500 font-mono kpi-number">
                        {new Date(ev.createdAt).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {ev.websiteSource || "Chưa có thông tin"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 font-mono text-xs">
                          {ev.source || "Chưa có thông tin"} / {ev.medium || "Chưa có thông tin"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 truncate max-w-[230px]">
                          {ev.campaign || "Chưa có thông tin"}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[230px]">
                          {ev.landingPage || "Chưa có thông tin"}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          {isMobile ? (
                            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {ev.device || "Chưa có thông tin"}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                        {ev.location || "Chưa có thông tin"}
                        {ev.ipAddress ? ` · ${ev.ipAddress}` : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
