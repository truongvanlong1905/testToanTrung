"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Globe,
  Share2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Link,
  Laptop,
  Smartphone,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";

export function TrackingView() {
  const [events, setEvents] = useState<any[]>([]);
  const [syncJobs, setSyncJobs] = useState<any[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // UTM Generator State
  const [utmUrl, setUtmUrl] = useState("https://toantrungtelecom.com/san-pham/led-hoi-truong");
  const [utmSource, setUtmSource] = useState("google");
  const [utmMedium, setUtmMedium] = useState("cpc");
  const [utmCampaign, setUtmCampaign] = useState("LED_P2.5_Indoor_2026");
  const [generatedLink, setGeneratedLink] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTracking = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/tracking");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setEvents(json.data.events || []);
          setSyncJobs(json.data.syncJobs || []);
          setTotalEvents(json.data.totalEvents || 0);
        }
      }
    } catch (err) {
      console.error("Fetch tracking error:", err);
      showToast("Không thể tải dữ liệu tracking");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, []);

  // Generate UTM link
  useEffect(() => {
    try {
      const url = new URL(utmUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Chỉ chấp nhận URL HTTP hoặc HTTPS");
      if (utmSource) url.searchParams.set("utm_source", utmSource);
      if (utmMedium) url.searchParams.set("utm_medium", utmMedium);
      if (utmCampaign) url.searchParams.set("utm_campaign", utmCampaign);
      setGeneratedLink(url.toString());
    } catch {
      setGeneratedLink("");
    }
  }, [utmUrl, utmSource, utmMedium, utmCampaign]);

  const syncStatus = (service: string) => {
    const job = syncJobs.find((item) => item.service === service);
    if (!job) return { label: "Chưa cấu hình", className: "bg-slate-100 text-slate-600 border-slate-200" };
    if (job.status === "COMPLETED") return { label: "Đồng bộ hoàn tất", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60" };
    if (job.status === "SYNCING") return { label: "Đang đồng bộ", className: "bg-blue-50 text-blue-700 border-blue-200/60" };
    if (job.status === "NOT_CONFIGURED") return { label: "Chưa cấu hình", className: "bg-amber-50 text-amber-700 border-amber-200/60" };
    if (job.status === "CONNECTED") return { label: "Chưa xác minh", className: "bg-slate-100 text-slate-600 border-slate-200" };
    return { label: "Chưa đồng bộ", className: "bg-rose-50 text-rose-700 border-rose-200/60" };
  };

  const lastSyncLabel = (service: string) => {
    const job = syncJobs.find((item) => item.service === service && item.status === "COMPLETED" && item.lastSyncTime);
    return job?.lastSyncTime
      ? `Lần đồng bộ gần nhất: ${new Date(job.lastSyncTime).toLocaleString("vi-VN")}`
      : "Chưa có lần đồng bộ thành công";
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
        throw new Error(json.message || json.error?.message || "Không thể đồng bộ dịch vụ");
      }
      if (json.success) {
        showToast(json.message);
        await fetchTracking();
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Lỗi đồng bộ");
      await fetchTracking();
    } finally {
      setIsSyncing(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-blue-600">Tracking Đa Kênh</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Theo Dõi & Đồng Bộ Đa Kênh
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ghi nhận luồng truy cập và nguồn khách từ các website công ty Toàn Trung
          </p>
        </div>

        <button
          onClick={fetchTracking}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 3 Channels Sync Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Google Ads */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Google Ads API</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${syncStatus("GOOGLE_ADS").className}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />{syncStatus("GOOGLE_ADS").label}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Tự động đồng bộ chi phí chiến dịch, lượt click và lượt hiển thị màn hình LED.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">{lastSyncLabel("GOOGLE_ADS")}</span>
            <button
              onClick={() => handleSyncService("GOOGLE_ADS")}
              disabled={isSyncing === "GOOGLE_ADS"}
              className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing === "GOOGLE_ADS" ? "animate-spin" : ""}`} />
              <span>Kiểm tra kết nối</span>
            </button>
          </div>
        </div>

        {/* Google Analytics 4 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Google Analytics 4 (GA4)</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${syncStatus("GA4").className}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />{syncStatus("GA4").label}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Theo dõi hành vi người dùng, trang đích xem sản phẩm và tỷ lệ chuyển đổi form.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">{lastSyncLabel("GA4")}</span>
            <button
              onClick={() => handleSyncService("GA4")}
              disabled={isSyncing === "GA4"}
              className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing === "GA4" ? "animate-spin" : ""}`} />
              <span>Kiểm tra kết nối</span>
            </button>
          </div>
        </div>

        {/* Google Search Console */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Google Search Console</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${syncStatus("SEARCH_CONSOLE").className}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />{syncStatus("SEARCH_CONSOLE").label}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Theo dõi thứ hạng tìm kiếm tự nhiên cho các từ khóa LED Toàn Trung.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">{lastSyncLabel("SEARCH_CONSOLE")}</span>
            <button
              onClick={() => handleSyncService("SEARCH_CONSOLE")}
              disabled={isSyncing === "SEARCH_CONSOLE"}
              className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing === "SEARCH_CONSOLE" ? "animate-spin" : ""}`} />
              <span>Kiểm tra kết nối</span>
            </button>
          </div>
        </div>
      </div>

      {/* UTM Generator Tool */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Công Cụ Tạo Link Chiến Dịch UTM (UTM Builder)
            </h2>
            <p className="text-xs text-slate-400">
              Tạo link gắn mã UTM để gắn vào bài viết Facebook, Zalo hoặc quảng cáo Google
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
          <div className="sm:col-span-2">
            <label className="block font-medium text-slate-700 mb-1">Website URL đích</label>
            <input
              type="text"
              value={utmUrl}
              onChange={(e) => setUtmUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Nguồn (utm_source)</label>
            <input
              type="text"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Phương thức (utm_medium)</label>
            <input
              type="text"
              value={utmMedium}
              onChange={(e) => setUtmMedium(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Chiến dịch (utm_campaign)</label>
            <input
              type="text"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
          <span className="font-mono text-blue-800 truncate select-all">{generatedLink || "Nhập URL HTTP/HTTPS hợp lệ để tạo link"}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(generatedLink)
                .then(() => showToast("Đã sao chép link UTM vào clipboard!"))
                .catch(() => showToast("Trình duyệt không cho phép sao chép link"));
            }}
            disabled={!generatedLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shrink-0 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Sao chép link</span>
          </button>
        </div>
      </div>

      {/* Live Tracking Events Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Nhật Ký Luồng Truy Cập Đa Kênh (Live Tracking Events)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Dữ liệu thu nhận tự động từ website và landing page Toàn Trung
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {totalEvents} Lượt ghi nhận (50 gần nhất hiển thị)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Website Nguồn</th>
                <th className="py-3 px-4">Kênh (Source / Medium)</th>
                <th className="py-3 px-4">Chiến dịch</th>
                <th className="py-3 px-4">Thiết bị</th>
                <th className="py-3 px-4">Khu vực / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">
                    {new Date(ev.createdAt).toLocaleTimeString("vi-VN")}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>{ev.websiteSource}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                      {ev.source} / {ev.medium}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{ev.campaign || "Mặc định"}</td>
                  <td className="py-3 px-4 text-slate-600">{ev.device || "Desktop"}</td>
                  <td className="py-3 px-4 text-slate-500">
                    {ev.location} ({ev.ipAddress || "127.0.0.1"})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
