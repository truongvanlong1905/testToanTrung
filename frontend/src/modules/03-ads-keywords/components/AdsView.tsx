"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Megaphone,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Percent,
  Plus,
  Lock,
  ShieldCheck,
  FileSpreadsheet,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/src/core/utils/utils";
import { CampaignItem, KeywordItem } from "../types";
import { exportAdsKeywordsWorkbook } from "@/src/core/utils/excel-export";
import { PageHeader, SectionHeader } from "@/src/core/ui/page-header";
import { CardHeader } from "@/src/core/ui/card";
import { Modal } from "@/src/core/ui/modal";
import { SegmentedControl } from "@/src/core/ui/segmented-control";
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

interface AdsApiResponse {
  campaigns: (CampaignItem & { createdAt?: string })[];
  keywords: KeywordItem[];
  canManageAds: boolean;
  currentUserRole?: string;
  summary?: {
    totalBudget: number;
    totalSpent: number;
    totalClicks: number;
    totalImpressions: number;
    avgCtr: string;
    avgCpc: string | number;
  };
}

function getPlatformBadgeTone(platform: string): BadgeTone {
  switch (platform) {
    case "Google Ads":
      return "info";
    case "Facebook Ads":
      return "info";
    case "Zalo Ads":
      return "info";
    case "SEO":
      return "success";
    case "TikTok Ads":
      return "neutral";
    default:
      return "neutral";
  }
}

function getCampaignStatusMeta(status: string): {
  label: string;
  tone: BadgeTone;
} {
  const normalized = (status || "").toUpperCase();
  if (normalized === "ACTIVE") {
    return { label: "Đang chạy", tone: "success" };
  }
  if (normalized === "PAUSED") {
    return { label: "Tạm dừng", tone: "warning" };
  }
  return { label: status || "Hoàn thành", tone: "neutral" };
}

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (message: string) => void;
}

/**
 * Isolated Campaign Form Modal: owns all input states locally so typing campaign name,
 * code, or budget never triggers re-renders of the AdsView KPI cards or data tables.
 */
const CreateCampaignModal = React.memo(function CreateCampaignModal({
  open,
  onClose,
  onCreated,
}: CreateCampaignModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formPlatform, setFormPlatform] = useState("Google Ads");
  const [formBudget, setFormBudget] = useState("20000000");
  const [formSpent, setFormSpent] = useState("0");
  const [formStatus, setFormStatus] = useState("Active");

  useEffect(() => {
    if (open) {
      setFormError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim() || formName.trim().length < 3) {
      setFormError("Vui lòng nhập tên chiến dịch tối thiểu 3 ký tự.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/campaigns", {
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

      setFormName("");
      setFormCode("");
      setFormBudget("20000000");
      setFormSpent("0");
      onCreated(json.message || "Tạo chiến dịch quảng cáo thành công");
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không thể lưu chiến dịch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      preventClose={isSubmitting}
      title="Tạo chiến dịch quảng cáo mới"
      icon={<Megaphone className="w-4 h-4" />}
      description={
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          Phân quyền bộ phận ADS &amp; Ban Giám Đốc
        </span>
      }
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            form="create-campaign-form"
            variant="primary"
            isLoading={isSubmitting}
          >
            Lưu chiến dịch
          </Button>
        </div>
      }
    >
      <form id="create-campaign-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {formError}
          </div>
        )}

        <div>
          <label className="crm-label">
            Tên chiến dịch <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            data-autofocus
            placeholder="VD: Chiến dịch Màn hình LED P2.5 Hội trường Q4"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="crm-input"
          />
        </div>

        <div>
          <label className="crm-label">Mã chiến dịch (Tùy chọn)</label>
          <input
            type="text"
            placeholder="Để trống hệ thống tự sinh mã TT-ADS-..."
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
            className="crm-input"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="crm-label">Nền tảng quảng cáo</label>
            <select
              value={formPlatform}
              onChange={(e) => setFormPlatform(e.target.value)}
              className="crm-select"
            >
              <option value="Google Ads">Google Ads</option>
              <option value="Facebook Ads">Facebook Ads</option>
              <option value="TikTok Ads">TikTok Ads</option>
              <option value="Zalo Ads">Zalo Ads</option>
              <option value="SEO">SEO</option>
            </select>
          </div>

          <div>
            <label className="crm-label">Trạng thái</label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value)}
              className="crm-select"
            >
              <option value="Active">Đang chạy (Active)</option>
              <option value="Paused">Tạm dừng (Paused)</option>
              <option value="Completed">Hoàn thành (Completed)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="crm-label">
              Ngân sách cấp (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              min={0}
              step={500000}
              value={formBudget}
              onChange={(e) => setFormBudget(e.target.value)}
              className="crm-input kpi-number"
            />
          </div>

          <div>
            <label className="crm-label">Đã giải ngân (VNĐ)</label>
            <input
              type="number"
              min={0}
              step={100000}
              value={formSpent}
              onChange={(e) => setFormSpent(e.target.value)}
              className="crm-input kpi-number"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
});

export function AdsView() {
  const [data, setData] = useState<AdsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Analytics Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<"all" | "7d" | "30d">("all");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Modal tạo chiến dịch mới dành riêng cho ADS & ADMIN (state form được tách riêng trong CreateCampaignModal)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const fetchAdsData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await fetch("/api/campaigns");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || "Không thể tải số liệu chiến dịch quảng cáo"
        );
      }
      setData(json.data);
      setHasLoaded(true);
    } catch (err) {
      console.warn("Analytics error:", err);
      setLoadError(
        err instanceof Error
          ? err.message
          : "Không thể kết nối dữ liệu Quảng cáo & Từ khóa"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdsData();
  }, []);

  const campaigns = useMemo(() => data?.campaigns || [], [data?.campaigns]);
  const keywords = useMemo(() => data?.keywords || [], [data?.keywords]);
  const canManageAds = Boolean(data?.canManageAds);
  const summary = data?.summary;
  const hasRealData = Boolean(
    hasLoaded && summary && (campaigns.length > 0 || keywords.length > 0)
  );

  // Filter campaigns by date, platform, specific campaign, status, and search
  const filteredCampaigns = useMemo(() => {
    // Calendar-day cutoff (new Date() is allowed by react-hooks/purity, Date.now() is not)
    let cutoff: Date | null = null;
    if (dateRange === "7d" || dateRange === "30d") {
      cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - (dateRange === "7d" ? 7 : 30));
    }

    return campaigns.filter((c) => {
      const matchPlatform =
        platformFilter === "all" || c.platform === platformFilter;
      const matchCampaign = campaignFilter === "all" || c.id === campaignFilter;
      const matchStatus =
        statusFilter === "all" ||
        c.status.toUpperCase() === statusFilter.toUpperCase();
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.platform.toLowerCase().includes(q);

      let matchDate = true;
      const rawDate = c.startDate || c.createdAt;
      if (cutoff && rawDate) {
        const parsed = new Date(rawDate);
        if (!Number.isNaN(parsed.getTime())) {
          matchDate = parsed >= cutoff;
        }
      }

      return (
        matchPlatform &&
        matchCampaign &&
        matchStatus &&
        matchSearch &&
        matchDate
      );
    });
  }, [
    campaigns,
    platformFilter,
    campaignFilter,
    statusFilter,
    searchTerm,
    dateRange,
  ]);

  const filteredKeywords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return keywords.filter((k) => {
      const matchSearch =
        !q ||
        k.keyword.toLowerCase().includes(q) ||
        k.source.toLowerCase().includes(q);
      const matchPlatform =
        platformFilter === "all" ||
        (platformFilter === "Google Ads" &&
          k.source.toLowerCase().includes("ads")) ||
        (platformFilter === "SEO" &&
          k.source.toLowerCase().includes("console")) ||
        (platformFilter !== "Google Ads" && platformFilter !== "SEO");
      return matchSearch && matchPlatform;
    });
  }, [keywords, searchTerm, platformFilter]);

  // Platform spend aggregation from filtered campaigns
  const platformStats = useMemo(() => {
    const map: Record<string, { budget: number; spent: number; count: number }> =
      {};
    filteredCampaigns.forEach((c) => {
      if (!map[c.platform]) {
        map[c.platform] = { budget: 0, spent: 0, count: 0 };
      }
      map[c.platform].budget += c.budget;
      map[c.platform].spent += c.spent;
      map[c.platform].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].spent - a[1].spent);
  }, [filteredCampaigns]);

  const filteredTotalSpent = useMemo(
    () => filteredCampaigns.reduce((sum, c) => sum + c.spent, 0),
    [filteredCampaigns]
  );

  const hasActiveFilters =
    searchTerm !== "" ||
    platformFilter !== "all" ||
    campaignFilter !== "all" ||
    statusFilter !== "all" ||
    dateRange !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setPlatformFilter("all");
    setCampaignFilter("all");
    setStatusFilter("all");
    setDateRange("all");
  };

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const handleCampaignCreated = useCallback(
    (message: string) => {
      showToast(message);
      void fetchAdsData();
    },
    [showToast]
  );

  if (isLoading && !hasLoaded) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Quảng cáo & Từ khóa"
          description="Theo dõi chi tiêu đa kênh, tỷ lệ giải ngân ngân sách và hiệu quả chuyển đổi từ khóa tìm kiếm."
        />
        <PageSkeleton cards={4} rows={6} />
      </div>
    );
  }

  if (loadError && !hasLoaded) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Quảng cáo & Từ khóa"
          description="Theo dõi chi tiêu đa kênh, tỷ lệ giải ngân ngân sách và hiệu quả chuyển đổi từ khóa tìm kiếm."
        />
        <ErrorState message={loadError} onRetry={fetchAdsData} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* Header */}
      <PageHeader
        title="Quảng cáo & Từ khóa"
        description="Theo dõi chi tiêu đa kênh, tỷ lệ giải ngân ngân sách và hiệu quả chuyển đổi từ khóa tìm kiếm."
        actions={
          <>
            {!canManageAds && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Chế độ xem (Quyền tạo dành cho ADS &amp; BGD)</span>
              </span>
            )}

            <Button
              variant="secondary"
              size="md"
              isLoading={isExportingExcel}
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              onClick={async () => {
                try {
                  setIsExportingExcel(true);
                  await exportAdsKeywordsWorkbook({
                    campaigns: filteredCampaigns,
                    keywords: filteredKeywords,
                    summary: {
                      totalBudget: summary?.totalBudget || 0,
                      totalSpent: summary?.totalSpent || 0,
                      totalClicks: summary?.totalClicks || 0,
                      totalImpressions: summary?.totalImpressions || 0,
                    },
                  });
                  showToast(
                    "Đã xuất Báo cáo Quảng cáo & Từ khóa (.xlsx — 3 Sheet)"
                  );
                } catch (err) {
                  console.error("Lỗi xuất Excel Ads:", err);
                  showToast("Không thể xuất file Excel. Vui lòng thử lại.");
                } finally {
                  setIsExportingExcel(false);
                }
              }}
            >
              Export (.xlsx)
            </Button>

            {canManageAds && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setIsCreateModalOpen(true);
                }}
              >
                Tạo chiến dịch
              </Button>
            )}
          </>
        }
      />

      {/* Analytics Filter Bar (Date, Platform, Campaign, Status, Search) */}
      <div className="crm-card p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm chiến dịch, mã hoặc từ khóa..."
            className="w-full sm:w-64"
          />

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="crm-select w-auto min-w-[150px]"
            aria-label="Lọc nền tảng"
          >
            <option value="all">Tất cả nền tảng</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Facebook Ads">Facebook Ads</option>
            <option value="TikTok Ads">TikTok Ads</option>
            <option value="Zalo Ads">Zalo Ads</option>
            <option value="SEO">SEO</option>
          </select>

          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="crm-select w-auto min-w-[175px] max-w-[230px]"
            aria-label="Lọc chiến dịch"
          >
            <option value="all">Tất cả chiến dịch ({campaigns.length})</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="crm-select w-auto min-w-[140px]"
            aria-label="Lọc trạng thái"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="Active">Đang chạy</option>
            <option value="Paused">Tạm dừng</option>
            <option value="Completed">Hoàn thành</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <SegmentedControl
            ariaLabel="Khoảng thời gian"
            value={dateRange}
            onChange={setDateRange}
            options={[
              { id: "7d", label: "7 ngày" },
              { id: "30d", label: "30 ngày" },
              { id: "all", label: "Tất cả" },
            ]}
          />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Đặt lại
            </Button>
          )}
        </div>
      </div>

      {/* 4 KPI Cards (No fake fallback numbers!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Spend (Chi tiêu)"
          value={
            hasRealData && summary
              ? `${summary.totalSpent.toLocaleString("vi-VN")} đ`
              : null
          }
          isEmpty={!hasRealData}
          icon={DollarSign}
          iconTone="blue"
          note={
            hasRealData && summary
              ? `Ngân sách cấp: ${summary.totalBudget.toLocaleString("vi-VN")} đ`
              : "Chưa có dữ liệu giải ngân"
          }
        />

        <StatCard
          label="Clicks & Hiển thị"
          value={
            hasRealData && summary
              ? summary.totalClicks.toLocaleString("vi-VN")
              : null
          }
          isEmpty={!hasRealData}
          icon={MousePointerClick}
          iconTone="emerald"
          note={
            hasRealData && summary
              ? `${summary.totalImpressions.toLocaleString("vi-VN")} lượt hiển thị · ${campaigns.length} chiến dịch`
              : "Chưa ghi nhận lượt nhấp"
          }
        />

        <StatCard
          label="CTR trung bình"
          value={hasRealData && summary ? summary.avgCtr : null}
          isEmpty={!hasRealData}
          icon={Percent}
          iconTone="slate"
          note="Tỷ lệ nhấp / hiển thị từ từ khóa theo dõi"
        />

        <StatCard
          label="CPC trung bình"
          value={hasRealData && summary ? String(summary.avgCpc) : null}
          isEmpty={!hasRealData}
          icon={TrendingUp}
          iconTone="amber"
          note="Chi phí trung bình trên mỗi lượt click"
        />
      </div>

      {/* Simple Restrained Visual Section */}
      {filteredCampaigns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Platform Spend Share */}
          <div className="lg:col-span-5 crm-card p-5 space-y-4">
            <SectionHeader
              title="Phân bổ chi tiêu theo nền tảng"
              description="Tỷ trọng ngân sách đã giải ngân trên từng kênh"
            />
            <div className="space-y-3.5">
              {platformStats.map(([platform, stat]) => {
                const pct =
                  filteredTotalSpent > 0
                    ? Math.round((stat.spent / filteredTotalSpent) * 100)
                    : 0;
                return (
                  <div key={platform} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">
                        {platform}{" "}
                        <span className="text-slate-400 font-normal">
                          ({stat.count})
                        </span>
                      </span>
                      <span className="font-semibold text-slate-900 kpi-number">
                        {stat.spent.toLocaleString("vi-VN")} đ · {pct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${pct === 0 ? 0 : Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Budget vs Actual Spend */}
          <div className="lg:col-span-7 crm-card p-5 space-y-4">
            <SectionHeader
              title="Tiến độ giải ngân chiến dịch"
              description="Đối chiếu chi phí thực tế so với hạn mức ngân sách được cấp"
            />
            <div className="space-y-3.5">
              {filteredCampaigns.slice(0, 5).map((c) => {
                const percent =
                  c.budget > 0
                    ? Math.min(100, Math.round((c.spent / c.budget) * 100))
                    : 0;
                const isOver = c.budget > 0 && c.spent >= c.budget;
                return (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-slate-800 truncate">
                        {c.name}
                      </span>
                      <span className="text-slate-500 shrink-0 kpi-number">
                        <strong className="text-slate-900">
                          {c.spent.toLocaleString("vi-VN")} đ
                        </strong>{" "}
                        / {c.budget.toLocaleString("vi-VN")} đ ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isOver
                            ? "bg-rose-500"
                            : percent > 85
                              ? "bg-amber-500"
                              : "bg-blue-600"
                        )}
                        style={{ width: `${percent === 0 ? 0 : Math.max(3, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Campaign Performance Table */}
      <div className="crm-card overflow-hidden">
        <CardHeader
          title="Campaign Performance"
          description="Nền tảng chạy, hạn mức ngân sách, tiến độ giải ngân và trạng thái vận hành"
          count={filteredCampaigns.length}
        />

        {filteredCampaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Không có chiến dịch phù hợp"
            description={
              hasActiveFilters
                ? "Không tìm thấy chiến dịch khớp với điều kiện lọc hiện tại."
                : "Chưa có chiến dịch quảng cáo nào được khởi tạo trong hệ thống."
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Xóa bộ lọc
                </Button>
              ) : canManageAds ? (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Tạo chiến dịch đầu tiên
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto max-h-[560px]">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Mã CD</th>
                  <th>Tên chiến dịch</th>
                  <th>Nền tảng</th>
                  <th className="num">Ngân sách</th>
                  <th className="num">Đã chi tiêu</th>
                  <th>Tỷ lệ tiêu</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c) => {
                  const percent =
                    c.budget > 0
                      ? Math.min(100, Math.round((c.spent / c.budget) * 100))
                      : 0;
                  const statusMeta = getCampaignStatusMeta(c.status);
                  return (
                    <tr key={c.id}>
                      <td className="py-3.5 px-4 font-mono text-xs font-medium text-blue-600 whitespace-nowrap">
                        {c.code}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge
                          tone={getPlatformBadgeTone(c.platform)}
                          size="sm"
                          dot={false}
                        >
                          {c.platform}
                        </StatusBadge>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600 kpi-number whitespace-nowrap">
                        {c.budget.toLocaleString("vi-VN")} đ
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 kpi-number whitespace-nowrap">
                        {c.spent.toLocaleString("vi-VN")} đ
                      </td>
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                percent >= 100
                                  ? "bg-rose-500"
                                  : percent > 85
                                    ? "bg-amber-500"
                                    : "bg-blue-600"
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600 kpi-number w-9 text-right">
                            {percent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge tone={statusMeta.tone} size="sm">
                          {statusMeta.label}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Keyword Performance Table */}
      <div className="crm-card overflow-hidden">
        <CardHeader
          title="Keyword Performance"
          description="Hiệu suất từ khóa Google Ads & Search Console, vị trí trung bình và cảnh báo CPC cao"
          count={filteredKeywords.length}
        />

        {filteredKeywords.length === 0 ? (
          <EmptyState
            compact
            title="Không tìm thấy từ khóa phù hợp"
            description="Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc nền tảng."
          />
        ) : (
          <div className="overflow-x-auto max-h-[560px]">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Từ khóa</th>
                  <th>Nguồn</th>
                  <th className="num">Hiển thị</th>
                  <th className="num">Clicks</th>
                  <th className="num">CTR</th>
                  <th className="num">CPC TB</th>
                  <th className="text-center">Vị trí TB</th>
                  <th>Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeywords.map((kw) => {
                  const ctr =
                    kw.impressions > 0
                      ? ((kw.clicks / kw.impressions) * 100).toFixed(2)
                      : "0.00";
                  const highCpc = kw.avgCpc > 18000;
                  return (
                    <tr key={kw.id}>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {kw.keyword}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge tone="neutral" size="sm" dot={false}>
                          {kw.source}
                        </StatusBadge>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600 kpi-number">
                        {kw.impressions.toLocaleString("vi-VN")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900 kpi-number">
                        {kw.clicks.toLocaleString("vi-VN")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-blue-600 kpi-number">
                        {ctr}%
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-800 kpi-number whitespace-nowrap">
                        {kw.avgCpc > 0
                          ? `${kw.avgCpc.toLocaleString("vi-VN")} đ`
                          : "Tự nhiên (0 đ)"}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 font-mono text-xs font-medium text-slate-700">
                          #{kw.avgPosition}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {highCpc ? (
                          <StatusBadge tone="warning" size="sm">
                            Cần tối ưu giá thầu
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="success" size="sm">
                            Hiệu quả tốt
                          </StatusBadge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Campaign Modal (isolated state — typing never re-renders AdsView) */}
      <CreateCampaignModal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onCreated={handleCampaignCreated}
      />
    </div>
  );
}
