"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileText,
  Send,
  Plus,
  Paperclip,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  Shield,
  Lock,
  Globe,
} from "lucide-react";
import { Lead } from "@/types/lead";
import { ReportItem } from "@/types/report";
import { exportExecutiveReportsWorkbook } from "@/lib/excel-export";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { SegmentedControl, UnderlineTabs } from "@/components/ui/segmented-control";
import { Toast } from "@/components/ui/toast";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import {
  BadgeTone,
  getLeadStatusTone,
  StatusBadge,
} from "@/components/ui/badge";
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
  SearchInput,
} from "@/components/ui/feedback-states";

interface ReportsViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  userRole?: string;
}

const DEPARTMENT_META: Record<
  string,
  { label: string; shortLabel: string; tone: BadgeTone }
> = {
  SALES: { label: "Phòng Kinh Doanh (Sales)", shortLabel: "Sales", tone: "info" },
  MARKETING: {
    label: "Phòng Marketing",
    shortLabel: "Marketing",
    tone: "success",
  },
  ADS: { label: "Bộ phận Quảng cáo (Ads)", shortLabel: "Ads", tone: "warning" },
  DESIGN: { label: "Phòng Thiết kế (Design)", shortLabel: "Design", tone: "neutral" },
  ADMIN: { label: "Ban Giám Đốc", shortLabel: "Ban Giám Đốc", tone: "error" },
};

const DEPARTMENT_FILTERS = [
  { id: "ALL", label: "Tất cả phòng ban" },
  { id: "SALES", label: "Sales" },
  { id: "MARKETING", label: "Marketing" },
  { id: "ADS", label: "Ads" },
  { id: "DESIGN", label: "Design" },
  { id: "ADMIN", label: "Ban Giám Đốc" },
] as const;

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

export function ReportsView({
  leads,
  onSelectLead,
  userRole,
}: ReportsViewProps) {
  const [activeMainTab, setActiveMainTab] = useState<
    "reports_feed" | "leads_analytics"
  >("reports_feed");

  // Reports State
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [hasLoadedReports, setHasLoadedReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>(
    userRole || "SALES"
  );
  const [searchReportText, setSearchReportText] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");
  const [selectedReportDetail, setSelectedReportDetail] =
    useState<ReportItem | null>(null);

  // Word-style Report Composer Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportContent, setReportContent] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write");
  const [editorError, setEditorError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  useEffect(() => {
    if (userRole) {
      setCurrentUserRole(userRole);
    }
  }, [userRole]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchReports = async () => {
    try {
      setIsLoadingReports(true);
      setReportsError(null);
      const res = await fetch("/api/reports");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error?.message || "Không thể tải danh sách báo cáo phòng ban"
        );
      }
      setReports(json.data.reports || []);
      if (json.data.currentUserRole) {
        setCurrentUserRole(json.data.currentUserRole);
      }
      setHasLoadedReports(true);
    } catch (err) {
      console.error("Lỗi tải báo cáo:", err);
      setReportsError(
        err instanceof Error
          ? err.message
          : "Không thể kết nối máy chủ báo cáo"
      );
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Rich formatting insertion helper
  const insertFormatting = (
    prefix: string,
    suffix: string = "",
    defaultPlaceholder: string = ""
  ) => {
    const textarea = document.getElementById(
      "word_editor_textarea"
    ) as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText =
      reportContent.substring(start, end) || defaultPlaceholder;

    const newContent =
      reportContent.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      reportContent.substring(end);

    setReportContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 50);
  };

  // Upload attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingFile(true);
      setEditorError(null);
      const formData = new FormData();
      formData.set("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tải tệp đính kèm thất bại");
      }

      setAttachmentName(file.name);
      setAttachmentUrl(json.data.fileUrl);
      showToast(`Đã đính kèm tệp "${file.name}"`);
    } catch (err) {
      setEditorError(
        err instanceof Error ? err.message : "Không thể tải tệp lên máy chủ"
      );
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Submit report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditorError(null);
    if (!reportTitle.trim()) {
      setEditorError("Vui lòng nhập tiêu đề báo cáo.");
      return;
    }
    if (!reportContent.trim()) {
      setEditorError("Vui lòng nhập nội dung chi tiết báo cáo.");
      return;
    }

    try {
      setIsSubmittingReport(true);
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reportTitle.trim(),
          content: reportContent.trim(),
          attachmentName,
          attachmentUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Lỗi gửi báo cáo");
      }

      showToast(json.message || "Đã gửi báo cáo thành công");
      setReportTitle("");
      setReportContent("");
      setAttachmentName(null);
      setAttachmentUrl(null);
      setIsEditorOpen(false);
      fetchReports();
    } catch (err) {
      setEditorError(
        err instanceof Error ? err.message : "Gửi báo cáo thất bại"
      );
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Filter reports by Date, Department, and Search
  const filteredReports = useMemo(() => {
    let cutoff: Date | null = null;
    if (timeRange === "7d" || timeRange === "30d") {
      cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - (timeRange === "7d" ? 7 : 30));
    }
    const q = searchReportText.trim().toLowerCase();

    return reports.filter((r) => {
      const matchDept =
        departmentFilter === "ALL" || r.department === departmentFilter;
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        r.createdBy.name.toLowerCase().includes(q);

      let matchDate = true;
      if (cutoff && r.createdAt) {
        const parsed = new Date(r.createdAt);
        if (!Number.isNaN(parsed.getTime())) {
          matchDate = parsed >= cutoff;
        }
      }

      return matchDept && matchSearch && matchDate;
    });
  }, [reports, departmentFilter, searchReportText, timeRange]);

  // Filter leads by same timeRange for Lead Follow-up Analytics tab
  const filteredLeads = useMemo(() => {
    if (timeRange === "all") return leads;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (timeRange === "7d" ? 7 : 30));
    return leads.filter((l) => {
      const d = parseLeadDate(l.createdAt);
      return d ? d >= cutoff : true;
    });
  }, [leads, timeRange]);

  const quotingLeads = useMemo(
    () =>
      filteredLeads.filter(
        (l) =>
          l.status === "Đang soạn báo giá" || l.status === "Đã gửi báo giá"
      ),
    [filteredLeads]
  );
  const pendingLeads = useMemo(
    () => filteredLeads.filter((l) => l.status === "Vừa nhận thông tin"),
    [filteredLeads]
  );
  const wonLeads = useMemo(
    () => filteredLeads.filter((l) => l.status === "Chốt thành công"),
    [filteredLeads]
  );

  // Department counts from backend-authorized reports
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: reports.length };
    reports.forEach((r) => {
      counts[r.department] = (counts[r.department] || 0) + 1;
    });
    return counts;
  }, [reports]);

  // Export Executive Workbook (.xlsx)
  const handleExportExcel = async () => {
    const timeLabels: Record<string, string> = {
      "7d": "7 ngày gần nhất",
      "30d": "30 ngày gần nhất",
      all: "Toàn bộ thời gian",
    };
    try {
      setIsExportingExcel(true);
      await exportExecutiveReportsWorkbook({
        leads: filteredLeads,
        reports: filteredReports,
        timeRangeLabel: timeLabels[timeRange] || "Toàn bộ thời gian",
        exportedBy:
          DEPARTMENT_META[currentUserRole]?.label ||
          "Trung tâm Báo cáo Toàn Trung",
      });
      showToast("Đã xuất Báo cáo Điều hành Excel (.xlsx — 4 Sheet)");
    } catch (err) {
      console.error("Lỗi xuất file Excel:", err);
      showToast("Không thể xuất file Excel. Vui lòng thử lại.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const isAdmin = currentUserRole === "ADMIN";

  // Visible department filter pills respecting RBAC clarity
  const visibleDepartments = useMemo(() => {
    if (isAdmin) return DEPARTMENT_FILTERS;
    return DEPARTMENT_FILTERS.filter(
      (d) =>
        d.id === "ALL" ||
        d.id === currentUserRole ||
        d.id === "ADMIN" ||
        (departmentCounts[d.id] || 0) > 0
    );
  }, [isAdmin, currentUserRole, departmentCounts]);

  const openReportComposer = () => {
    setEditorError(null);
    setReportTitle("");
    setReportContent("");
    setAttachmentName(null);
    setAttachmentUrl(null);
    setEditorMode("write");
    setIsEditorOpen(true);
  };

  // Guard against losing a half-written report from a stray Esc / backdrop click.
  const closeComposer = () => {
    const hasDraft = Boolean(reportTitle.trim() || reportContent.trim() || attachmentName);
    if (
      hasDraft &&
      !window.confirm("Đóng trình soạn thảo? Nội dung báo cáo chưa gửi sẽ bị mất.")
    ) {
      return;
    }
    setIsEditorOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* Page Header: Title, Date Selector, Export, Compose */}
      <PageHeader
        title="Báo cáo"
        description="Quản lý báo cáo công việc theo phòng ban, phân quyền truy cập bảo mật và đối soát tiến độ dự án."
        actions={
          <>
            <SegmentedControl
              ariaLabel="Khoảng thời gian"
              value={timeRange}
              onChange={setTimeRange}
              options={[
                { id: "7d", label: "7 ngày" },
                { id: "30d", label: "30 ngày" },
                { id: "all", label: "Tất cả" },
              ]}
            />

            <Button
              variant="secondary"
              size="md"
              isLoading={isExportingExcel}
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              onClick={() => void handleExportExcel()}
            >
              Export (.xlsx)
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={openReportComposer}
            >
              Soạn báo cáo
            </Button>
          </>
        }
      />

      {/* Primary View Switcher Tabs */}
      <UnderlineTabs
        value={activeMainTab}
        onChange={setActiveMainTab}
        options={[
          {
            id: "reports_feed",
            label: "Báo cáo các phòng ban",
            count: reports.length,
            icon: <FileText className="w-4 h-4" />,
          },
          {
            id: "leads_analytics",
            label: "Tiến độ báo giá & Lead cần bám sát",
            count: quotingLeads.length,
            icon: <TrendingUp className="w-4 h-4" />,
          },
        ]}
        trailing={
          isAdmin ? (
            <StatusBadge tone="info" size="sm" dot={false}>
              <Shield className="w-3 h-3" />
              <span>Ban Giám Đốc: Xem toàn bộ phòng ban</span>
            </StatusBadge>
          ) : (
            <StatusBadge tone="neutral" size="sm" dot={false}>
              <Lock className="w-3 h-3" />
              <span>
                Phân quyền:{" "}
                {DEPARTMENT_META[currentUserRole]?.shortLabel || currentUserRole} &amp; Thông
                báo BGD
              </span>
            </StatusBadge>
          )
        }
      />

      {/* TAB 1: DEPARTMENT REPORTS */}
      {activeMainTab === "reports_feed" && (
        <div className="space-y-4">
          {/* Department Selector & Search Bar */}
          <div className="crm-toolbar">
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleDepartments.map((dept) => {
                const active = departmentFilter === dept.id;
                const count = departmentCounts[dept.id] || 0;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDepartmentFilter(dept.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                      active
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    )}
                  >
                    <span>{dept.label}</span>
                    <span
                      className={cn(
                        "text-[11px] tabular-nums",
                        active ? "text-blue-100" : "text-slate-500"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <SearchInput
              value={searchReportText}
              onChange={setSearchReportText}
              placeholder="Tìm tiêu đề, nội dung, người gửi..."
              className="w-full lg:w-72"
            />
          </div>

          {/* Reports List / States */}
          {isLoadingReports && !hasLoadedReports ? (
            <PageSkeleton cards={0} rows={5} />
          ) : reportsError && !hasLoadedReports ? (
            <ErrorState message={reportsError} onRetry={fetchReports} />
          ) : filteredReports.length === 0 ? (
            <div className="crm-card">
              <EmptyState
                icon={FileText}
                title="Chưa có báo cáo trong danh mục này"
                description={
                  searchReportText ||
                    departmentFilter !== "ALL" ||
                    timeRange !== "all"
                    ? "Không có báo cáo nào khớp bộ lọc phòng ban hoặc thời gian đã chọn."
                    : "Bấm 'Soạn báo cáo' để gửi báo cáo công việc định kỳ hoặc đề xuất lên Ban Giám Đốc."
                }
                action={
                  searchReportText ||
                    departmentFilter !== "ALL" ||
                    timeRange !== "all" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSearchReportText("");
                        setDepartmentFilter("ALL");
                        setTimeRange("all");
                      }}
                    >
                      Đặt lại bộ lọc
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={openReportComposer}
                    >
                      Soạn báo cáo mới
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <div className="crm-card overflow-hidden">
              <div className="px-5 h-10 flex items-center justify-between border-b border-slate-200 bg-slate-50 text-overline">
                <span>
                  {filteredReports.length} báo cáo
                  {departmentFilter !== "ALL" &&
                    ` · ${DEPARTMENT_META[departmentFilter]?.shortLabel || departmentFilter}`}
                </span>
                <span className="hidden sm:inline">Mới nhất trước</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {filteredReports.map((report) => {
                  const isFromAdmin = report.createdBy.role === "ADMIN";
                  const deptMeta = DEPARTMENT_META[report.department] || {
                    label: report.department,
                    shortLabel: report.department,
                    tone: "neutral" as BadgeTone,
                  };
                  const created = new Date(report.createdAt);

                  return (
                    <li key={report.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedReportDetail(report)}
                        className="w-full text-left px-5 py-3.5 flex items-start gap-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <span className="mt-0.5 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px] flex items-center justify-center shrink-0">
                          {report.createdBy.initials || "TT"}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="text-[13.5px] font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {report.title}
                            </h3>
                            {report.attachmentName && (
                              <Paperclip
                                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                                aria-label="Có tệp đính kèm"
                              />
                            )}
                          </div>
                          <p className="text-[12.5px] text-slate-500 mt-0.5 line-clamp-1">
                            <span className="font-medium text-slate-700">
                              {report.createdBy.name}
                            </span>
                            {" — "}
                            {report.content.replace(/[#*`_>|]/g, "").replace(/\s+/g, " ")}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <StatusBadge tone={deptMeta.tone} size="sm">
                              {deptMeta.shortLabel}
                            </StatusBadge>
                            {isFromAdmin ? (
                              <StatusBadge tone="error" size="sm" dot={false}>
                                <Globe className="w-3 h-3" />
                                <span>Toàn hệ thống</span>
                              </StatusBadge>
                            ) : (
                              <StatusBadge tone="neutral" size="sm" dot={false}>
                                <Lock className="w-3 h-3" />
                                <span>Nội bộ BGD</span>
                              </StatusBadge>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs font-medium text-slate-700 tabular-nums">
                            {created.toLocaleDateString("vi-VN")}
                          </div>
                          <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                            {created.toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LEAD FOLLOW-UP & PIPELINE ANALYTICS */}
      {activeMainTab === "leads_analytics" && (
        <div className="space-y-5">
          {/* 3 KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Đang báo giá cần bám sát"
              value={
                filteredLeads.length > 0
                  ? `${quotingLeads.length} hồ sơ`
                  : null
              }
              isEmpty={filteredLeads.length === 0}
              icon={Clock}
              iconTone="amber"
              note="Gồm các dự án Đang soạn báo giá & Đã gửi báo giá"
            />
            <StatCard
              label="Lead mới chờ khảo sát"
              value={
                filteredLeads.length > 0
                  ? `${pendingLeads.length} khách hàng`
                  : null
              }
              isEmpty={filteredLeads.length === 0}
              icon={AlertTriangle}
              iconTone="blue"
              note="Đang ở trạng thái Vừa nhận thông tin"
            />
            <StatCard
              label="Dự án chốt thành công"
              value={
                filteredLeads.length > 0 ? `${wonLeads.length} hợp đồng` : null
              }
              isEmpty={filteredLeads.length === 0}
              icon={CheckCircle2}
              iconTone="emerald"
              note="Đã ký kết hợp đồng triển khai trong kỳ"
            />
          </div>

          {/* Quoting Leads Follow-up Table */}
          <div className="crm-card overflow-hidden">
            <CardHeader
              title="Khách hàng đang báo giá"
              description="Bấm vào hồ sơ để mở chi tiết tiến độ, ghi chú kỹ thuật và tài liệu đính kèm"
              count={quotingLeads.length}
            />

            {quotingLeads.length === 0 ? (
              <EmptyState
                compact
                title="Không có hồ sơ đang chờ phản hồi báo giá"
                description="Chưa có Lead nào ở trạng thái Đang soạn báo giá hoặc Đã gửi báo giá trong kỳ đã chọn."
              />
            ) : (
              <div className="overflow-x-auto max-h-[560px]">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Mã Lead</th>
                      <th>Khách hàng / Đơn vị</th>
                      <th>Sản phẩm &amp; Liên hệ</th>
                      <th>Sales phụ trách</th>
                      <th className="num">Dự toán</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotingLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => onSelectLead(lead)}
                        className="cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-mono text-xs font-medium text-blue-600 whitespace-nowrap">
                          {lead.code}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {lead.customerName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {lead.companyName}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800">{lead.product}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {lead.phone}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700">
                          {lead.salesPerson.name}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-900 kpi-number whitespace-nowrap">
                          {lead.estimatedValue || "Chưa cập nhật"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge
                            tone={getLeadStatusTone(lead.status)}
                            size="sm"
                          >
                            {lead.status}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WORD-STYLE REPORT COMPOSER MODAL */}
      <Modal
        open={isEditorOpen}
        onClose={closeComposer}
        preventClose={isSubmittingReport}
        size="xl"
        title="Soạn thảo báo cáo công việc"
        icon={<FileText className="w-4 h-4" />}
        description={
          isAdmin
            ? "Phát hành thông báo hoặc chỉ đạo điều hành tới toàn bộ phòng ban"
            : "Gửi báo cáo trực tiếp tới Ban Giám Đốc (Phân quyền bảo mật nội bộ)"
        }
        headerExtra={
          <SegmentedControl
            size="sm"
            ariaLabel="Chế độ soạn thảo"
            value={editorMode}
            onChange={setEditorMode}
            options={[
              { id: "write", label: "Soạn thảo" },
              { id: "preview", label: "Xem trước" },
            ]}
            className="hidden sm:inline-flex"
          />
        }
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                {isAdmin
                  ? "Thông báo sẽ hiển thị tới toàn bộ tài khoản phòng ban"
                  : "Báo cáo chỉ gửi tới Ban Giám Đốc và lưu trong hồ sơ cá nhân"}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmittingReport}
                onClick={closeComposer}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                form="report-composer-form"
                variant="primary"
                isLoading={isSubmittingReport}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Gửi báo cáo
              </Button>
            </div>
          </div>
        }
      >
            <form id="report-composer-form" onSubmit={handleSubmitReport}>
              <div className="space-y-4">
                <SegmentedControl
                  size="sm"
                  ariaLabel="Chế độ soạn thảo"
                  value={editorMode}
                  onChange={setEditorMode}
                  options={[
                    { id: "write", label: "Soạn thảo" },
                    { id: "preview", label: "Xem trước" },
                  ]}
                  className="sm:hidden"
                />
                {editorError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {editorError}
                  </div>
                )}

                <div>
                  <label className="crm-label">
                    Tiêu đề báo cáo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Báo cáo tiến độ triển khai dự án màn hình LED P3 Outdoor - Tuần 44"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="crm-input"
                  />
                </div>

                {editorMode === "write" ? (
                  <div className="space-y-2">
                    {/* Formatting Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-slate-700">
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting("**", "**", "Văn bản in đậm")
                        }
                        title="In đậm"
                        className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting("*", "*", "Văn bản in nghiêng")
                        }
                        title="In nghiêng"
                        className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting("<u>", "</u>", "Văn bản gạch chân")
                        }
                        title="Gạch chân"
                        className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
                      >
                        <Underline className="w-4 h-4" />
                      </button>

                      <span className="w-px h-4 bg-slate-200 mx-1" />

                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting("\n# ", "", "Tiêu đề mục chính")
                        }
                        title="Heading 1"
                        className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
                      >
                        <Heading1 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting("\n## ", "", "Tiêu đề mục phụ")
                        }
                        title="Heading 2"
                        className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
                      >
                        <Heading2 className="w-4 h-4" />
                      </button>

                      <span className="w-px h-4 bg-slate-200 mx-1" />

                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting("\n- ", "", "Nội dung báo cáo")
                        }
                        title="Danh sách"
                        className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting("\n1. ", "", "Hạng mục công việc")
                        }
                        title="Danh sách đánh số"
                        className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
                      >
                        <ListOrdered className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting("\n> ", "", "Đề xuất / Lưu ý...")
                        }
                        title="Trích dẫn"
                        className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
                      >
                        <Quote className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting(
                            "\n| Hạng mục | Tiến độ | Dự toán | Ghi chú |\n|---|---|---|---|\n| Khung kết cấu | 100% | 45.000.000 đ | Hoàn tất |\n| Module LED | 80% | 120.000.000 đ | Đang chạy thử |"
                          )
                        }
                        title="Chèn bảng số liệu"
                        className="px-2 py-1 hover:bg-white rounded-md transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>Chèn bảng</span>
                      </button>

                      <span className="w-px h-4 bg-slate-200 mx-1" />

                      <label className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-600 rounded-md border border-slate-200 cursor-pointer text-xs font-medium transition-colors">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>
                          {isUploadingFile
                            ? "Đang tải tệp..."
                            : "Đính kèm tệp / CAD"}
                        </span>
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.png,.jpg,.jpeg"
                        />
                      </label>
                    </div>

                    <div>
                      <textarea
                        id="word_editor_textarea"
                        required
                        rows={11}
                        placeholder={`# 1. KẾT QUẢ CÔNG VIỆC\n- Tiến độ dự án / chiến dịch:\n- Số liệu đạt được:\n\n# 2. VƯỚNG MẮC CẦN HỖ TRỢ\n> Đề xuất phương án xử lý...\n\n# 3. KẾ HOẠCH TIẾP THEO\n1. Hạng mục ưu tiên 1\n2. Hạng mục ưu tiên 2`}
                        value={reportContent}
                        onChange={(e) => setReportContent(e.target.value)}
                        className="crm-textarea leading-relaxed"
                      />
                      <div className="text-right text-[11px] text-slate-400 mt-1 kpi-number">
                        {reportContent.length} ký tự ·{" "}
                        {reportContent.split(/\s+/).filter(Boolean).length} từ
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 min-h-[280px] space-y-4">
                    <div className="border-b border-slate-200 pb-3">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        CÔNG TY CỔ PHẦN ĐIỆN TỬ VIỄN THÔNG TOÀN TRUNG
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">
                        {reportTitle || "Tiêu đề báo cáo"}
                      </h3>
                      <div className="text-xs text-slate-500 mt-1">
                        Ngày lập: {new Date().toLocaleDateString("vi-VN")} · Bộ
                        phận:{" "}
                        {DEPARTMENT_META[currentUserRole]?.label ||
                          currentUserRole}
                      </div>
                    </div>

                    <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {reportContent || "Chưa có nội dung soạn thảo."}
                    </div>
                  </div>
                )}

                {attachmentName && (
                  <div className="flex items-center justify-between p-3 bg-blue-50/70 rounded-lg border border-blue-200/80 text-xs text-blue-900">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">
                        Tệp đính kèm: <strong>{attachmentName}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentName(null);
                        setAttachmentUrl(null);
                      }}
                      className="text-rose-600 hover:text-rose-700 font-medium shrink-0 cursor-pointer"
                    >
                      Gỡ tệp
                    </button>
                  </div>
                )}
              </div>
            </form>
      </Modal>

      {/* REPORT DETAIL MODAL */}
      <Modal
        open={Boolean(selectedReportDetail)}
        onClose={() => setSelectedReportDetail(null)}
        size="lg"
        title={selectedReportDetail?.title || "Chi tiết báo cáo"}
        description={
          selectedReportDetail
            ? `${selectedReportDetail.createdBy.name} · ${
                DEPARTMENT_META[selectedReportDetail.department]?.label ||
                selectedReportDetail.department
              } · ${new Date(selectedReportDetail.createdAt).toLocaleString("vi-VN")}`
            : undefined
        }
        footer={
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setSelectedReportDetail(null)}>
              Đóng
            </Button>
          </div>
        }
      >
        {selectedReportDetail && (
          <div className="space-y-4">
            <div className="text-sm text-slate-800 leading-7 whitespace-pre-wrap">
              {selectedReportDetail.content}
            </div>

            {selectedReportDetail.attachmentUrl && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-800 font-medium min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <Paperclip className="w-4 h-4 text-slate-500" />
                  </span>
                  <span className="truncate">
                    {selectedReportDetail.attachmentName || "Tài liệu đính kèm"}
                  </span>
                </div>
                <a
                  href={selectedReportDetail.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải về</span>
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
