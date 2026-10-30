"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Percent,
  Search,
  Download,
  Plus,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  PieChart,
  RefreshCw,
  Globe,
  Share2,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignItem {
  id: string;
  code: string;
  name: string;
  platform: string;
  status: string;
  budget: number;
  spent: number;
  startDate?: string;
}

interface KeywordItem {
  id: string;
  keyword: string;
  clicks: number;
  impressions: number;
  avgCpc: number;
  avgPosition: number;
  source: string;
}

const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  "Google Ads": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", bar: "#EF4444" },
  "Facebook Ads": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", bar: "#2563EB" },
  "TikTok Ads": { bg: "bg-slate-900 text-white", text: "text-slate-900", border: "border-slate-800", bar: "#0F172A" },
  "Zalo Ads": { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", bar: "#0284C7" },
  SEO: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", bar: "#10B981" },
};

export function AdsView() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal tạo chiến dịch mới dành riêng cho ADS
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formPlatform, setFormPlatform] = useState("Google Ads");
  const [formBudget, setFormBudget] = useState("20000000");
  const [formSpent, setFormSpent] = useState("0");
  const [formStatus, setFormStatus] = useState("Active");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAdsData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.warn("Analytics error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdsData();
  }, []);

  const campaigns: CampaignItem[] = data?.campaigns || [];
  const keywords: KeywordItem[] = data?.keywords || [];
  const canManageAds: boolean = Boolean(data?.canManageAds);
  const currentUserRole: string = data?.currentUserRole || "GUEST";

  const summary = data?.summary || {
    totalBudget: 80000000,
    totalSpent: 60950000,
    totalClicks: 5170,
    totalImpressions: 54200,
    avgCtr: "9.54%",
    avgCpc: "11.789 đ",
  };

  // Tính tổng chi phí theo từng nền tảng
  const platformStats = campaigns.reduce((acc: Record<string, { budget: number; spent: number; count: number }>, c) => {
    if (!acc[c.platform]) {
      acc[c.platform] = { budget: 0, spent: 0, count: 0 };
    }
    acc[c.platform].budget += c.budget;
    acc[c.platform].spent += c.spent;
    acc[c.platform].count += 1;
    return acc;
  }, {});

  const filteredCampaigns = campaigns.filter((c) => {
    const matchPlatform = platformFilter === "all" || c.platform === platformFilter;
    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchPlatform && matchSearch;
  });

  const filteredKeywords = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Xử lý tạo chiến dịch mới
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Vui lòng nhập tên chiến dịch");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          code: formCode.trim() || undefined,
          platform: formPlatform,
          budget: parseFloat(formBudget) || 0,
          spent: parseFloat(formSpent) || 0,
          status: formStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Lỗi tạo chiến dịch");
      }

      showToast(json.message || "Tạo chiến dịch quảng cáo thành công!");
      setIsCreateModalOpen(false);
      setFormName("");
      setFormCode("");
      fetchAdsData();
    } catch (err: any) {
      alert(err.message || "Lỗi tạo chiến dịch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-blue-600 font-semibold">Phân Tích Quảng Cáo</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Chiến Dịch &amp; Hiệu Suất Quảng Cáo Màn Hình LED
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Báo cáo đa kênh Google Ads, Facebook Ads, TikTok Ads và thứ hạng từ khóa hiển thị Toàn Trung
          </p>
        </div>

        {/* Nút Tạo Chiến Dịch - Chỉ ADS & ADMIN có quyền */}
        <div className="flex flex-wrap items-center gap-3">
          {canManageAds ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Chiến Dịch Mới (Dành Riêng ADS)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Chế độ xem (Chỉ bộ phận ADS &amp; Admin mới có quyền tạo chiến dịch)</span>
            </div>
          )}

          <button
            onClick={() => {
              const csv =
                "Từ khóa,Số lượt Click,Lượt hiển thị,CPC (đ),Vị trí TB,Nguồn\n" +
                keywords
                  .map(
                    (k: any) =>
                      `"${k.keyword}",${k.clicks},${k.impressions},${k.avgCpc},${k.avgPosition},"${k.source}"`
                  )
                  .join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `Toan_Trung_Ads_Report_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ Đo Lường KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Tổng Chi Phí Ads</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-heading">
            {summary.totalSpent?.toLocaleString("vi-VN")} đ
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ngân sách cấp:</span>
            <strong className="text-slate-700">{summary.totalBudget?.toLocaleString("vi-VN")} đ</strong>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Lượt Nhấp (Clicks)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-heading">
            {summary.totalClicks?.toLocaleString("vi-VN")}
          </div>
          <div className="text-xs text-emerald-700 font-medium">
            Lượt hiển thị: {summary.totalImpressions?.toLocaleString("vi-VN")}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Tỷ Lệ Nhấp (CTR)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-600 font-heading">{summary.avgCtr}</div>
          <div className="text-xs text-slate-400">Đạt chuẩn B2B màn hình LED (4-6%)</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
            <span>Chi Phí Mỗi Click (CPC)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 font-heading">{summary.avgCpc}</div>
          <div className="text-xs text-slate-400">Chi phí tối ưu trên mỗi click</div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BIỂU ĐỒ TRỰC QUAN (VISUAL CHARTS) DỄ PHÂN BIỆT
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ 1: Tỷ trọng ngân sách & chi tiêu theo Nền tảng (Google, FB, TikTok, SEO) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                Tỷ Trọng Nền Tảng Quảng Cáo
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Đa kênh</span>
          </div>

          <div className="space-y-4">
            {Object.entries(platformStats).map(([platform, stat]) => {
              const totalSpentAll = summary.totalSpent || 1;
              const percentOfTotal = Math.round((stat.spent / totalSpentAll) * 100);
              const colorInfo = PLATFORM_COLORS[platform] || { bar: "#3B82F6", bg: "bg-slate-100", text: "text-slate-800" };

              return (
                <div key={platform} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorInfo.bar }} />
                      {platform} ({stat.count})
                    </span>
                    <span className="font-bold text-slate-900">{stat.spent.toLocaleString("vi-VN")} đ ({percentOfTotal}%)</span>
                  </div>

                  {/* Thanh tiến độ trực quan */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(5, percentOfTotal)}%`,
                        backgroundColor: colorInfo.bar,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Tổng số chiến dịch: <strong>{campaigns.length}</strong></span>
            <span className="text-emerald-600 font-semibold">Tối ưu chi phí</span>
          </div>
        </div>

        {/* Biểu đồ 2: So sánh Ngân sách vs Chi phí thực tế (Budget vs Spent Bar Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 font-heading">
                Biểu Đồ So Sánh Ngân Sách vs Chi Tiêu Thực Tế
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Đã tiêu (Spent)
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                Ngân sách (Budget)
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {campaigns.slice(0, 5).map((c) => {
              const percent = c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;
              const isOverBudget = c.spent >= c.budget && c.budget > 0;

              return (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 line-clamp-1 max-w-[60%]">
                      {c.name}
                    </span>
                    <span className="text-slate-600">
                      <strong>{c.spent.toLocaleString("vi-VN")} đ</strong> / {c.budget.toLocaleString("vi-VN")} đ (
                      <span className={cn("font-bold", isOverBudget ? "text-rose-600" : "text-blue-600")}>
                        {percent}%
                      </span>
                      )
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden relative">
                    <div
                      className={cn(
                        "h-3 rounded-full transition-all duration-700",
                        isOverBudget ? "bg-rose-500" : percent > 80 ? "bg-amber-500" : "bg-blue-600"
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BẢNG CHIẾN DỊCH QUẢNG CÁO (DỄ PHÂN BIỆT, MÀU SẮC RÕ RÀNG)
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Danh Sách Chiến Dịch Đang Chạy
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Phân loại theo màu sắc nền tảng, trạng thái và tỷ lệ giải ngân ngân sách
            </p>
          </div>

          {/* Lọc nền tảng */}
          <div className="flex items-center gap-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">Tất cả nền tảng</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Facebook Ads">Facebook Ads</option>
              <option value="TikTok Ads">TikTok Ads</option>
              <option value="Zalo Ads">Zalo Ads</option>
              <option value="SEO">SEO</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Mã Chiến Dịch</th>
                <th className="py-3 px-4">Tên Chiến Dịch Quảng Cáo</th>
                <th className="py-3 px-4">Nền Tảng</th>
                <th className="py-3 px-4">Ngân Sách Cấp</th>
                <th className="py-3 px-4">Đã Giải Ngân</th>
                <th className="py-3 px-4">Tiến Độ Tiêu</th>
                <th className="py-3 px-4">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCampaigns.map((c) => {
                const percent = c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;
                const platformStyle = PLATFORM_COLORS[c.platform] || {
                  bg: "bg-slate-100",
                  text: "text-slate-700",
                  border: "border-slate-200",
                };

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">{c.code}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[11px] font-bold border",
                          platformStyle.bg,
                          platformStyle.text,
                          platformStyle.border
                        )}
                      >
                        {c.platform}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {c.budget.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {c.spent.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="py-3.5 px-4 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={cn(
                              "h-2 rounded-full",
                              percent >= 100 ? "bg-rose-500" : percent > 80 ? "bg-amber-500" : "bg-blue-600"
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700">{percent}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold",
                          c.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            c.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                          )}
                        />
                        {c.status === "Active" ? "Đang chạy" : c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL TẠO CHIẾN DỊCH MỚI (DÀNH RIÊNG CHO ROLE ADS & ADMIN)
         ───────────────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    Khởi Tạo Chiến Dịch Quảng Cáo Toàn Trung
                  </h3>
                  <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Đặc quyền bộ phận ADS &amp; Ban Giám Đốc
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tên Chiến Dịch <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Quảng cáo Màn hình LED P2.5 Trong Nhà Q4/2026"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nền Tảng Quảng Cáo
                  </label>
                  <select
                    value={formPlatform}
                    onChange={(e) => setFormPlatform(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="Google Ads">Google Ads (Tìm kiếm & GDN)</option>
                    <option value="Facebook Ads">Facebook &amp; Instagram Ads</option>
                    <option value="TikTok Ads">TikTok Ads (Video ngắn)</option>
                    <option value="Zalo Ads">Zalo Ads (Doanh nghiệp)</option>
                    <option value="SEO">SEO (Tìm kiếm tự nhiên)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trạng Thái
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="Active">Đang chạy (Active)</option>
                    <option value="Paused">Tạm dừng (Paused)</option>
                    <option value="Completed">Hoàn thành (Completed)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ngân Sách Cấp (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000000}
                    value={formBudget}
                    onChange={(e) => setFormBudget(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Đã Chi Tiêu (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500000}
                    value={formSpent}
                    onChange={(e) => setFormSpent(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu Chiến Dịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
