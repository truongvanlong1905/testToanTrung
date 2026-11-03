"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Sparkles,
  LayoutList,
  AlignLeft,
  Eye,
  X,
  ArrowLeft,
  Users2,
  PackageSearch,
  BarChart3,
  MessageSquareWarning,
  Calendar,
} from "lucide-react";
import { Lead } from "@/src/modules/01-leads";
import { ReportItem } from "../types";
import { exportExecutiveReportsWorkbook } from "@/src/core/utils/excel-export";
import { cn } from "@/src/core/utils/utils";
import { PageHeader, SectionHeader } from "@/src/core/ui/page-header";
import { CardHeader } from "@/src/core/ui/card";
import { Modal } from "@/src/core/ui/modal";
import { SegmentedControl, UnderlineTabs } from "@/src/core/ui/segmented-control";
import { Toast } from "@/src/core/ui/toast";
import { StatCard } from "@/src/core/ui/stat-card";
import { Button } from "@/src/core/ui/button";
import {
  BadgeTone,
  getLeadStatusTone,
  StatusBadge,
} from "@/src/core/ui/badge";
import {
  EmptyState,
  ErrorState,
  PageSkeleton,
  SearchInput,
} from "@/src/core/ui/feedback-states";
import {
  DEPARTMENT_FILTERS,
  DEPARTMENT_META,
  FormattedReportBody,
} from "./FormattedReportBody";
import { canRoleAccessTab } from "@/src/core/auth/permissions";

interface ReportsViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  userRole?: string;
}

interface ReportComposerModalProps {
  open: boolean;
  onClose: () => void;
  leads: Lead[];
  currentUserRole: string;
  isAdminOrDirector: boolean;
  onShowToast: (msg: string) => void;
  onSubmitted: () => void;
}

const REPORT_TYPES = [
  { id: "periodic", label: "Báo cáo kết quả công việc" },
  { id: "project", label: "Tiến độ khảo sát & thi công LED" },
  { id: "proposal", label: "Tờ trình / Đề xuất phê duyệt" },
  { id: "directive", label: "Thông báo điều hành" },
] as const;

const ReportComposerModal = React.memo(function ReportComposerModal({
  open,
  onClose,
  leads,
  currentUserRole,
  isAdminOrDirector,
  onShowToast,
  onSubmitted,
}: ReportComposerModalProps) {
  const [reportType, setReportType] = useState<string>("periodic");
  const [reportTitle, setReportTitle] = useState("");
  const [reportContent, setReportContent] = useState("");
  const [secResults, setSecResults] = useState("");
  const [secIssues, setSecIssues] = useState("");
  const [secNextPlan, setSecNextPlan] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [editorMode, setEditorMode] = useState<"structured" | "write" | "preview">("structured");
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEditorError(null);
      setReportType("periodic");
      setReportTitle("");
      setReportContent("");
      setSecResults("");
      setSecIssues("");
      setSecNextPlan("");
      setAttachmentName(null);
      setAttachmentUrl(null);
      setEditorMode("structured");
    }
  }, [open]);

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

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    });
  };

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
      onShowToast(`Đã đính kèm tệp "${file.name}"`);
    } catch (err) {
      setEditorError(
        err instanceof Error ? err.message : "Không thể tải tệp lên máy chủ"
      );
    } finally {
      setIsUploadingFile(false);
    }
  };

  const compileEffectiveReportBody = useCallback(() => {
    if (editorMode === "write") {
      return reportContent.trim();
    }
    if (secResults.trim() || secIssues.trim() || secNextPlan.trim()) {
      const parts: string[] = [];
      const typeObj = REPORT_TYPES.find((t) => t.id === reportType);
      if (typeObj) {
        parts.push(`> Phân loại văn bản: **${typeObj.label}**`);
      }
      if (secResults.trim()) {
        parts.push(`# I. KẾT QUẢ THỰC HIỆN & SỐ LIỆU ĐẠT ĐƯỢC\n${secResults.trim()}`);
      }
      if (secIssues.trim()) {
        parts.push(`# II. VƯỚNG MẮC & ĐỀ XUẤT HƯỚNG XỬ LÝ\n${secIssues.trim()}`);
      }
      if (secNextPlan.trim()) {
        parts.push(`# III. KẾ HOẠCH TRỌNG TÂM TIẾP THEO\n${secNextPlan.trim()}`);
      }
      return parts.join("\n\n");
    }
    return reportContent.trim();
  }, [editorMode, reportContent, secResults, secIssues, secNextPlan, reportType]);

  const handleAutoFillFromRealWebData = () => {
    const todayStr = new Date().toLocaleDateString("vi-VN");
    const totalCount = leads.length;
    const newCount = leads.filter((l) => l.status === "Vừa nhận thông tin").length;
    const draftingCount = leads.filter((l) => l.status === "Đang soạn báo giá").length;
    const sentQuoteCount = leads.filter((l) => l.status === "Đã gửi báo giá").length;
    const unrespondedCount = leads.filter(
      (l) => l.status === "Đã gửi báo giá" && !l.customerResponded
    ).length;
    const wonCount = leads.filter((l) => l.status === "Chốt thành công").length;
    const lostCount = leads.filter((l) => l.status === "Thất bại").length;

    const deptLabel = DEPARTMENT_META[currentUserRole]?.shortLabel || currentUserRole;
    setReportTitle(`Báo cáo tổng hợp số liệu thực tế ${deptLabel} — Ngày ${todayStr}`);

    const topLeadsSummary = leads
      .slice(0, 4)
      .map(
        (l) =>
          `- **${l.code}** (${l.customerName}${l.companyName ? ` — ${l.companyName}` : ""}): ${l.product} · Trạng thái: **${l.status}**`
      )
      .join("\n");

    const resultsBlock = [
      `- Tổng số hồ sơ Lead thực tế trên hệ thống: **${totalCount} hồ sơ**.`,
      `- Phân bổ tiến độ thực tế: **${newCount}** Lead mới tiếp nhận · **${draftingCount}** đang soạn báo giá · **${sentQuoteCount}** đã gửi báo giá (${unrespondedCount} chưa ghi nhận phản hồi) · **${wonCount}** chốt thành công · **${lostCount}** thất bại.`,
      topLeadsSummary ? `\nCác hồ sơ trọng tâm gần nhất trên hệ thống:\n${topLeadsSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const issuesBlock =
      unrespondedCount > 0
        ? `- Có **${unrespondedCount} khách hàng đã gửi báo giá nhưng chưa ghi nhận phản hồi** cần liên hệ bám sát để cập nhật kết quả.`
        : newCount > 0
          ? `- Có **${newCount} Lead mới vừa nhận thông tin** cần liên hệ tư vấn và khảo sát mặt bằng.`
          : `- Hiện chưa phát sinh tồn đọng quá hạn trên hệ thống.`;

    const planBlock = [
      `1. Liên hệ tư vấn kỹ thuật và gửi báo giá cho toàn bộ hồ sơ khách hàng mới tiếp nhận.`,
      `2. Chăm sóc và cập nhật phản hồi của các khách hàng đã nhận báo giá trên hệ thống.`,
    ].join("\n");

    setSecResults(resultsBlock);
    setSecIssues(issuesBlock);
    setSecNextPlan(planBlock);
    setReportContent(
      `# I. KẾT QUẢ THỰC HIỆN & SỐ LIỆU ĐẠT ĐƯỢC\n${resultsBlock}\n\n# II. VƯỚNG MẮC & ĐỀ XUẤT HƯỚNG XỬ LÝ\n${issuesBlock}\n\n# III. KẾ HOẠCH TRỌM TÂM TIẾP THEO\n${planBlock}`
    );
    setEditorError(null);
    onShowToast("Đã tự động tổng hợp số liệu thực tế trên hệ thống vào báo cáo!");
  };

  const handleCloseWithDraftGuard = () => {
    const hasDraft = Boolean(
      reportTitle.trim() ||
        reportContent.trim() ||
        secResults.trim() ||
        secIssues.trim() ||
        secNextPlan.trim() ||
        attachmentName
    );
    if (
      hasDraft &&
      !window.confirm("Đóng trình soạn thảo? Nội dung báo cáo chưa gửi sẽ bị mất.")
    ) {
      return;
    }
    onClose();
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditorError(null);
    const finalContent = compileEffectiveReportBody();
    if (!reportTitle.trim()) {
      setEditorError("Vui lòng nhập tiêu đề báo cáo.");
      return;
    }
    if (!finalContent) {
      setEditorError("Vui lòng nhập kết quả thực hiện hoặc nội dung báo cáo.");
      return;
    }

    try {
      setIsSubmittingReport(true);
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reportTitle.trim(),
          content: finalContent,
          attachmentName,
          attachmentUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Lỗi gửi báo cáo");
      }

      onShowToast(json.message || "Đã gửi báo cáo thành công");
      onClose();
      onSubmitted();
    } catch (err) {
      setEditorError(
        err instanceof Error ? err.message : "Gửi báo cáo thất bại"
      );
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const compiledPreviewBody = useMemo(() => {
    if (editorMode !== "preview") return "";
    return compileEffectiveReportBody();
  }, [editorMode, compileEffectiveReportBody]);

  return (
    <Modal
      open={open}
      onClose={handleCloseWithDraftGuard}
      preventClose={isSubmittingReport}
      size="xl"
      title="Soạn báo cáo & Tờ trình điều hành"
      icon={<FileText className="w-4 h-4" />}
      description={
        isAdminOrDirector
          ? "Phát hành thông báo chỉ đạo hoặc tổng hợp báo cáo điều hành tới các phòng ban"
          : `Đơn vị gửi: ${DEPARTMENT_META[currentUserRole]?.label || currentUserRole} → Trình Ban Giám Đốc`
      }
      headerExtra={
        <div className="hidden sm:inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
          <button
            type="button"
            onClick={() => setEditorMode("structured")}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
              editorMode === "structured"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <LayoutList className="w-3.5 h-3.5 text-blue-600" />
            <span>Biểu mẫu chuẩn</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!reportContent.trim()) {
                setReportContent(compileEffectiveReportBody());
              }
              setEditorMode("write");
            }}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
              editorMode === "write"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Soạn tự do</span>
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("preview")}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
              editorMode === "preview"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xem bản A4</span>
          </button>
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              {isAdminOrDirector
                ? "Thông báo sẽ đồng bộ trực tiếp tới Trung tâm Thông báo toàn hệ thống"
                : "Văn bản được phân quyền bảo mật nội bộ trình Ban Giám Đốc Toàn Trung"}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmittingReport}
              onClick={handleCloseWithDraftGuard}
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
              Phát hành báo cáo
            </Button>
          </div>
        </div>
      }
    >
      <form id="report-composer-form" onSubmit={handleSubmitReport} className="space-y-4">
        {editorError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {editorError}
          </div>
        )}

        <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-violet-50/60 border border-blue-200/70 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {REPORT_TYPES.map((rt) => {
              const active = reportType === rt.id;
              return (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setReportType(rt.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                    active
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700"
                  )}
                >
                  {rt.label}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
            onClick={handleAutoFillFromRealWebData}
            className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            Tự điền số liệu thật trên hệ thống
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-8">
            <label className="crm-label">
              Tiêu đề văn bản / báo cáo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Báo cáo tổng hợp kết quả Kinh doanh & Tiến độ khảo sát LED tuần này"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="crm-input font-medium"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="crm-label">Tệp đính kèm (PDF / Excel / CAD)</label>
            <label className="h-9 px-3 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 flex items-center justify-center gap-2 cursor-pointer text-xs font-medium transition-colors">
              <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">
                {isUploadingFile
                  ? "Đang tải tệp..."
                  : attachmentName
                    ? attachmentName
                    : "Chọn tệp đính kèm"}
              </span>
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.png,.jpg,.jpeg"
              />
            </label>
          </div>
        </div>

        {attachmentName && (
          <div className="flex items-center justify-between px-3 py-2 bg-blue-50/70 rounded-lg border border-blue-200/80 text-xs text-blue-900">
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">
                Đã đính kèm: <strong>{attachmentName}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAttachmentName(null);
                setAttachmentUrl(null);
              }}
              className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Gỡ</span>
            </button>
          </div>
        )}

        {editorMode === "structured" && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  I. Kết quả công việc &amp; Số liệu thực tế đạt được{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Mục chính</span>
              </div>
              <textarea
                rows={4}
                value={secResults}
                onChange={(e) => setSecResults(e.target.value)}
                placeholder="Nêu các đầu việc đã hoàn thành, số lượng khách hàng đã tư vấn/gửi báo giá, tiến độ khảo sát thực tế..."
                className="crm-textarea bg-white text-[13px] leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  II. Vướng mắc phát sinh &amp; Kiến nghị hỗ trợ
                </label>
                <textarea
                  rows={3}
                  value={secIssues}
                  onChange={(e) => setSecIssues(e.target.value)}
                  placeholder="Khó khăn về mặt bằng, tiến độ phản hồi khách hàng, đề xuất hỗ trợ kỹ thuật..."
                  className="crm-textarea bg-white text-[13px] leading-relaxed"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  III. Kế hoạch trọng tâm tiếp theo
                </label>
                <textarea
                  rows={3}
                  value={secNextPlan}
                  onChange={(e) => setSecNextPlan(e.target.value)}
                  placeholder="Các hạng mục ưu tiên xử lý trong ca/tuần kế tiếp..."
                  className="crm-textarea bg-white text-[13px] leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {editorMode === "write" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200 text-slate-700">
              <button
                type="button"
                onClick={() => insertFormatting("**", "**", "Nội dung nhấn mạnh")}
                title="In đậm"
                className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("*", "*", "Ghi chú nghiêng")}
                title="In nghiêng"
                className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("<u>", "</u>", "Nội dung gạch chân")}
                title="Gạch chân"
                className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
              >
                <Underline className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={() => insertFormatting("\n# ", "", "MỤC BÁO CÁO CHÍNH")}
                title="Tiêu đề lớn"
                className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n## ", "", "Tiêu đề phụ")}
                title="Tiêu đề phụ"
                className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={() => insertFormatting("\n- ", "", "Hạng mục công việc")}
                title="Danh sách chấm đầu dòng"
                className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n1. ", "", "Bước thực hiện")}
                title="Danh sách đánh số"
                className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n> ", "", "Kiến nghị Ban Giám Đốc...")}
                title="Khung kiến nghị nổi bật"
                className="p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  insertFormatting(
                    "\n| Hạng mục dự án | Tiến độ | Sản phẩm | Ghi chú |\n|---|---|---|---|\n| Khảo sát mặt bằng | Hoàn tất | Màn hình LED Indoor | Đủ điều kiện lắp đặt |\n"
                  )
                }
                title="Chèn bảng số liệu"
                className="px-2 py-1 hover:bg-white rounded-md transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Chèn bảng</span>
              </button>
            </div>

            <textarea
              id="word_editor_textarea"
              rows={8}
              placeholder="Nhập nội dung báo cáo hoặc thông báo điều hành chi tiết..."
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              className="crm-textarea leading-relaxed text-[13.5px]"
            />
          </div>
        )}

        {editorMode === "preview" && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-blue-900 pb-3.5">
              <div>
                <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                  CÔNG TY TNHH ĐIỆN TỬ VIỄN THÔNG TOÀN TRUNG
                </div>
                <h3 className="text-[17px] font-bold text-slate-900 mt-1">
                  {reportTitle || "Chưa nhập tiêu đề báo cáo"}
                </h3>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Ngày lập: {new Date().toLocaleDateString("vi-VN")}</div>
                <div className="font-medium text-slate-700 mt-0.5">
                  {DEPARTMENT_META[currentUserRole]?.label || currentUserRole}
                </div>
              </div>
            </div>

            {compiledPreviewBody ? (
              <FormattedReportBody content={compiledPreviewBody} />
            ) : (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Chưa có nội dung báo cáo để hiển thị bản xem trước.
              </p>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
});

interface AnalyticsSnapshot {
  total: number;
  statusCounts: Record<string, number>;
  bySource: Array<{ source: string; count: number }>;
  byChannel?: Array<{ channel: string; count: number }>;
  byFailureReason?: Array<{ reason: string; count: number }>;
  bySales: Array<{
    salesPersonId: string;
    name: string;
    initials: string;
    totalLeads: number;
    newLeads: number;
    draftingQuote: number;
    sentQuote: number;
    unrespondedQuote?: number;
    won: number;
    lost: number;
    winRatePercent: number;
    count: number;
  }>;
  salesDetailRows: Lead[];
  byDay: Array<{ date: string; count: number }>;
  productInterest: {
    byProduct: Array<{
      categoryId: string;
      code?: string | null;
      name: string;
      group: string;
      count: number;
    }>;
    topProducts: Array<{
      categoryId: string;
      code?: string | null;
      name: string;
      group: string;
      count: number;
    }>;
    leastProducts: Array<{
      categoryId: string;
      code?: string | null;
      name: string;
      group: string;
      count: number;
    }>;
    byDemandType: Array<{ demandType: string; count: number }>;
  };
  quoteReport: {
    currentlyWaitingQuoteCount: number;
    totalEverSentQuoteCount: number;
    respondedCount: number;
    unrespondedCount: number;
    unrespondedLeads: Array<{
      id: string;
      code: string;
      customerName: string;
      companyName: string;
      phone: string;
      product: string;
      categoryName: string;
      salesPersonName: string;
      status: string;
      quoteSentAtDisplay: string;
      daysSinceQuoteSent: number;
      hasResponded: boolean;
      customerRespondedAtDisplay: string;
      customerResponseNote: string;
      notes: string;
    }>;
    allSentQuoteLeads: Array<{
      id: string;
      code: string;
      customerName: string;
      companyName: string;
      phone: string;
      product: string;
      categoryName: string;
      salesPersonName: string;
      status: string;
      quoteSentAtDisplay: string;
      daysSinceQuoteSent: number;
      hasResponded: boolean;
      customerRespondedAtDisplay: string;
      customerResponseNote: string;
      notes: string;
    }>;
  };
}

function toDayString(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function ReportsView({
  leads,
  onSelectLead,
  userRole,
}: ReportsViewProps) {
  const [activeMainTab, setActiveMainTab] = useState<
    "crm_analytics" | "reports_feed"
  >("crm_analytics");

  // Sub-tab for the 5 Mandatory CRM Reports (Section 5.7.2, AC-19..AC-24)
  const [activeReportSection, setActiveReportSection] = useState<
    "all" | "rep1_time" | "rep2_sales" | "rep3_products" | "rep4_status" | "rep5_quotes"
  >("all");
  const [selectedSalesFilter, setSelectedSalesFilter] = useState<string>("all");

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
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all" | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Clean Full-Page Report Detail state (Section 5.7.2 & AC-29)
  const [selectedReportDetail, setSelectedReportDetail] =
    useState<ReportItem | null>(null);

  // Analytics data from /api/leads/analytics
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  useEffect(() => {
    if (userRole) {
      setCurrentUserRole(userRole);
    }
  }, [userRole]);

  const canAccessLeads = canRoleAccessTab(currentUserRole, "leads");
  const isAdminOrDirector =
    currentUserRole === "ADMIN" || currentUserRole === "DIRECTOR";

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const rangeParams = useMemo(() => {
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
  }, [timeRange, customFrom, customTo]);

  const fetchReportsAndAnalytics = useCallback(async () => {
    try {
      setIsLoadingReports(true);
      setIsLoadingAnalytics(true);
      setReportsError(null);

      const q = new URLSearchParams();
      if (rangeParams.from) q.set("from", rangeParams.from);
      if (rangeParams.to) q.set("to", rangeParams.to);

      const [reportsRes, analyticsRes] = await Promise.all([
        fetch("/api/reports", { cache: "no-store" }),
        fetch(`/api/leads/analytics?${q.toString()}`, { cache: "no-store" }),
      ]);

      const reportsJson = await reportsRes.json();
      if (!reportsRes.ok || !reportsJson.success) {
        throw new Error(
          reportsJson.error?.message || "Không thể tải danh sách báo cáo phòng ban"
        );
      }
      setReports(reportsJson.data.reports || []);
      if (reportsJson.data.currentUserRole) {
        setCurrentUserRole(reportsJson.data.currentUserRole);
      }
      setHasLoadedReports(true);

      if (analyticsRes.ok) {
        const analyticsJson = await analyticsRes.json();
        if (analyticsJson?.success && analyticsJson.data) {
          setAnalytics(analyticsJson.data as AnalyticsSnapshot);
        }
      }
    } catch (err) {
      setReportsError(
        err instanceof Error
          ? err.message
          : "Không thể kết nối máy chủ báo cáo"
      );
    } finally {
      setIsLoadingReports(false);
      setIsLoadingAnalytics(false);
    }
  }, [rangeParams.from, rangeParams.to]);

  useEffect(() => {
    void fetchReportsAndAnalytics();
  }, [fetchReportsAndAnalytics, leads.length]);

  const handleOpenReportDetail = async (report: ReportItem) => {
    setSelectedReportDetail(report);
    if (!report.isRead && isAdminOrDirector) {
      try {
        await fetch(`/api/reports/${report.id}/read`, { method: "PATCH" });
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? { ...r, isRead: true } : r))
        );
      } catch {
        // ignore read mark error
      }
    }
  };

  // Filter reports by Date, Department, and Search
  const filteredReports = useMemo(() => {
    const fromDate = rangeParams.from ? new Date(`${rangeParams.from}T00:00:00`) : null;
    const toDate = rangeParams.to ? new Date(`${rangeParams.to}T23:59:59`) : null;
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
      if ((fromDate || toDate) && r.createdAt) {
        const parsed = new Date(r.createdAt);
        if (!Number.isNaN(parsed.getTime())) {
          if (fromDate && parsed < fromDate) matchDate = false;
          if (toDate && parsed > toDate) matchDate = false;
        }
      }

      return matchDept && matchSearch && matchDate;
    });
  }, [reports, departmentFilter, searchReportText, rangeParams.from, rangeParams.to]);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: reports.length };
    reports.forEach((r) => {
      counts[r.department] = (counts[r.department] || 0) + 1;
    });
    return counts;
  }, [reports]);

  const visibleDepartments = useMemo(() => {
    if (isAdminOrDirector) return DEPARTMENT_FILTERS;
    return DEPARTMENT_FILTERS.filter(
      (d) =>
        d.id === "ALL" ||
        d.id === currentUserRole ||
        d.id === "ADMIN" ||
        d.id === "DIRECTOR" ||
        (departmentCounts[d.id] || 0) > 0
    );
  }, [isAdminOrDirector, currentUserRole, departmentCounts]);

  const getTimeRangeLabel = () => {
    if (timeRange === "7d") return "7 ngày gần nhất";
    if (timeRange === "30d") return "30 ngày gần nhất";
    if (timeRange === "custom") {
      return `${customFrom || "..."} đến ${customTo || "..."}`;
    }
    return "Toàn bộ thời gian";
  };

  // Export Executive Workbook (.xlsx)
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const exportLeads = analytics?.salesDetailRows || leads;
      await exportExecutiveReportsWorkbook({
        leads: exportLeads,
        reports: filteredReports,
        timeRangeLabel: getTimeRangeLabel(),
        exportedBy:
          DEPARTMENT_META[currentUserRole]?.label ||
          "Trung tâm Báo cáo Toàn Trung",
      });
      showToast("Đã xuất Báo cáo Điều hành Excel (.xlsx) thành công!");
    } catch {
      showToast("Không thể xuất file Excel. Vui lòng thử lại.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Weekly & Monthly aggregation from analytics.byDay for Report #1
  const { byMonthList, byWeekList } = useMemo(() => {
    const days = analytics?.byDay || [];
    const monthMap = new Map<string, number>();
    const weekMap = new Map<string, number>();

    days.forEach(({ date, count }) => {
      const mKey = date.slice(0, 7);
      monthMap.set(mKey, (monthMap.get(mKey) || 0) + count);

      const d = new Date(`${date}T00:00:00`);
      if (!Number.isNaN(d.getTime())) {
        const dayOfWeek = d.getDay() || 7;
        const monday = new Date(d);
        monday.setDate(d.getDate() - dayOfWeek + 1);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const wLabel = `Tuần ${String(monday.getDate()).padStart(2, "0")}/${String(
          monday.getMonth() + 1
        ).padStart(2, "0")} - ${String(sunday.getDate()).padStart(2, "0")}/${String(
          sunday.getMonth() + 1
        ).padStart(2, "0")}/${sunday.getFullYear()}`;
        weekMap.set(wLabel, (weekMap.get(wLabel) || 0) + count);
      }
    });

    const mList = Array.from(monthMap.entries())
      .map(([month, count]) => {
        const [y, m] = month.split("-");
        return { key: month, label: `Tháng ${m}/${y}`, count };
      })
      .reverse();

    const wList = Array.from(weekMap.entries())
      .map(([label, count]) => ({ label, count }))
      .reverse();

    return { byMonthList: mList, byWeekList: wList };
  }, [analytics?.byDay]);

  const filteredSalesDetailRows = useMemo(() => {
    const rows = analytics?.salesDetailRows || leads;
    if (selectedSalesFilter === "all") return rows;
    return rows.filter(
      (r) =>
        r.salesPerson?.id === selectedSalesFilter ||
        r.salesPerson?.name === selectedSalesFilter
    );
  }, [analytics?.salesDetailRows, leads, selectedSalesFilter]);

  // ── FULL-PAGE REPORT DETAIL VIEW (Section 5.7.2 & AC-29) ──
  if (selectedReportDetail) {
    const deptMeta = DEPARTMENT_META[selectedReportDetail.department] || {
      label: selectedReportDetail.department,
      shortLabel: selectedReportDetail.department,
      tone: "neutral" as BadgeTone,
    };
    const isFromAdmin =
      selectedReportDetail.createdBy.role === "ADMIN" ||
      selectedReportDetail.createdBy.role === "DIRECTOR";

    return (
      <div className="space-y-5">
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => setSelectedReportDetail(null)}
          >
            Quay lại danh sách báo cáo
          </Button>

          <div className="flex items-center gap-2">
            <StatusBadge tone={deptMeta.tone} size="sm">
              {deptMeta.label}
            </StatusBadge>
            {isFromAdmin ? (
              <StatusBadge tone="error" size="sm" dot={false}>
                <Globe className="w-3 h-3" />
                <span>Thông báo toàn hệ thống</span>
              </StatusBadge>
            ) : (
              <StatusBadge tone="neutral" size="sm" dot={false}>
                <Lock className="w-3 h-3" />
                <span>Báo cáo nội bộ trình Ban Giám Đốc</span>
              </StatusBadge>
            )}
          </div>
        </div>

        <div className="crm-card p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-blue-900 pb-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                CÔNG TY TNHH ĐIỆN TỬ VIỄN THÔNG TOÀN TRUNG
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {selectedReportDetail.title}
              </h2>
            </div>

            <div className="text-right text-xs text-slate-500 space-y-0.5">
              <div>
                Người lập:{" "}
                <strong className="text-slate-800">
                  {selectedReportDetail.createdBy.name}
                </strong>
              </div>
              <div>
                Đơn vị: <span className="font-medium text-slate-700">{deptMeta.label}</span>
              </div>
              <div>
                Thời gian gửi:{" "}
                <span className="tabular-nums">
                  {new Date(selectedReportDetail.createdAt).toLocaleString("vi-VN")}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-xl bg-slate-50/60 border border-slate-200/90">
            <FormattedReportBody content={selectedReportDetail.content} />
          </div>

          {selectedReportDetail.attachmentUrl && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-slate-800 font-medium min-w-0">
                <span className="w-9 h-9 rounded-lg bg-white border border-blue-200 flex items-center justify-center shrink-0">
                  <Paperclip className="w-4 h-4 text-blue-600" />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {selectedReportDetail.attachmentName || "Tài liệu đính kèm"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Tệp đính kèm theo báo cáo phòng ban
                  </div>
                </div>
              </div>
              <a
                href={selectedReportDetail.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shrink-0 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải tệp đính kèm</span>
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalLeadsCount = analytics?.total ?? leads.length;
  const newCount = analytics?.statusCounts?.["Vừa nhận thông tin"] ?? 0;
  const draftingCount = analytics?.statusCounts?.["Đang soạn báo giá"] ?? 0;
  const sentQuoteCount = analytics?.statusCounts?.["Đã gửi báo giá"] ?? 0;
  const wonCount = analytics?.statusCounts?.["Chốt thành công"] ?? 0;
  const lostCount = analytics?.statusCounts?.["Thất bại"] ?? 0;
  const unrespondedCount = analytics?.quoteReport?.unrespondedCount ?? 0;
  const totalEverSentQuoteCount = analytics?.quoteReport?.totalEverSentQuoteCount ?? sentQuoteCount;

  return (
    <div className="space-y-6">
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* Page Header */}
      <PageHeader
        title="Báo cáo & Thống kê"
        description="5 báo cáo nghiệp vụ CRM chuẩn Brief và quản lý báo cáo công việc nội bộ theo phòng ban."
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
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              onClick={() => void handleExportExcel()}
            >
              Xuất Excel (.xlsx)
            </Button>

            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsEditorOpen(true)}
            >
              Soạn báo cáo
            </Button>
          </div>
        }
      />

      {timeRange === "custom" && (
        <div className="crm-card p-3.5 flex flex-wrap items-center gap-3 text-xs animate-dropdown-in">
          <span className="font-medium text-slate-600">Khoảng thời gian báo cáo:</span>
          <div className="flex items-center gap-2">
            <label htmlFor="rep-from" className="text-slate-500">
              Từ ngày
            </label>
            <input
              id="rep-from"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="crm-input h-8 w-auto text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="rep-to" className="text-slate-500">
              Đến ngày
            </label>
            <input
              id="rep-to"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="crm-input h-8 w-auto text-xs"
            />
          </div>
        </div>
      )}

      {/* Primary View Switcher Tabs */}
      <UnderlineTabs
        value={activeMainTab}
        onChange={setActiveMainTab}
        options={[
          {
            id: "crm_analytics",
            label: "5 Báo cáo Thống kê CRM (Chuẩn Brief)",
            count: 5,
            icon: <BarChart3 className="w-4 h-4" />,
          },
          {
            id: "reports_feed",
            label: "Văn bản Báo cáo các Phòng ban",
            count: reports.length,
            icon: <FileText className="w-4 h-4" />,
          },
        ]}
        trailing={
          isAdminOrDirector ? (
            <StatusBadge tone="info" size="sm" dot={false}>
              <Shield className="w-3 h-3" />
              <span>Ban Giám Đốc: Xem toàn bộ hệ thống</span>
            </StatusBadge>
          ) : (
            <StatusBadge tone="neutral" size="sm" dot={false}>
              <Lock className="w-3 h-3" />
              <span>
                Phạm vi:{" "}
                {DEPARTMENT_META[currentUserRole]?.shortLabel || currentUserRole}
              </span>
            </StatusBadge>
          )
        }
      />

      {/* TAB 1: 5 MANDATORY CRM REPORTS (AC-19, AC-20, AC-21, AC-22, AC-23) */}
      {activeMainTab === "crm_analytics" && (
        <div className="space-y-6">
          {/* Quick Filter Pills for the 5 Reports */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "Tất cả 5 báo cáo" },
              { id: "rep1_time", label: "1. Tổng Lead theo tuần / tháng" },
              { id: "rep2_sales", label: "2. Phân bổ Lead theo Kinh doanh" },
              { id: "rep3_products", label: "3. Sản phẩm & Nhu cầu (Mua/Thuê)" },
              { id: "rep4_status", label: "4. Trạng thái bán hàng" },
              { id: "rep5_quotes", label: "5. Báo giá & Chưa phản hồi" },
            ].map((tab) => {
              const active = activeReportSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveReportSection(tab.id as typeof activeReportSection)
                  }
                  className={cn(
                    "h-8 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                    active
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {isLoadingAnalytics && !analytics ? (
            <PageSkeleton cards={4} rows={6} />
          ) : (
            <>
              {/* ── BÁO CÁO 1: TỔNG SỐ LEAD THEO TUẦN / THÁNG / KHOẢNG LỌC & NGUỒN ── */}
              {(activeReportSection === "all" || activeReportSection === "rep1_time") && (
                <div className="crm-card p-5 space-y-4">
                  <SectionHeader
                    title="Báo cáo 1 — Tổng số Lead theo tuần / tháng & kênh tiếp nhận"
                    description={`Thống kê số lượng Lead phát sinh theo thời gian và nguồn tiếp cận (${getTimeRangeLabel()})`}
                    count={`${totalLeadsCount} Lead`}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Theo tháng */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-800">
                        Tổng hợp theo tháng
                      </div>
                      {byMonthList.length > 0 ? (
                        <table className="crm-table text-xs">
                          <thead>
                            <tr>
                              <th>Tháng</th>
                              <th className="num">Số lượng Lead</th>
                            </tr>
                          </thead>
                          <tbody>
                            {byMonthList.map((m) => (
                              <tr key={m.key}>
                                <td className="py-2 px-4 font-medium text-slate-800">
                                  {m.label}
                                </td>
                                <td className="py-2 px-4 text-right font-semibold text-blue-700 tabular-nums">
                                  {m.count}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-xs text-slate-500">
                          Chưa có dữ liệu trong kỳ lọc.
                        </div>
                      )}
                    </div>

                    {/* Theo tuần */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-800">
                        Tổng hợp theo tuần
                      </div>
                      {byWeekList.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto">
                          <table className="crm-table text-xs">
                            <thead>
                              <tr>
                                <th>Tuần</th>
                                <th className="num">Số Lead</th>
                              </tr>
                            </thead>
                            <tbody>
                              {byWeekList.slice(0, 8).map((w) => (
                                <tr key={w.label}>
                                  <td className="py-2 px-4 font-medium text-slate-800">
                                    {w.label}
                                  </td>
                                  <td className="py-2 px-4 text-right font-semibold text-blue-700 tabular-nums">
                                    {w.count}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 text-xs text-slate-500">
                          Chưa có dữ liệu theo tuần.
                        </div>
                      )}
                    </div>

                    {/* Theo nguồn tiếp nhận */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-800">
                        Phân bổ theo nguồn Lead
                      </div>
                      {(analytics?.bySource?.length ?? 0) > 0 ? (
                        <table className="crm-table text-xs">
                          <thead>
                            <tr>
                              <th>Nguồn khách hàng</th>
                              <th className="num">Số Lead</th>
                              <th className="num">Tỷ trọng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics!.bySource.map((s) => {
                              const pct =
                                totalLeadsCount > 0
                                  ? Math.round((s.count / totalLeadsCount) * 100)
                                  : 0;
                              return (
                                <tr key={s.source}>
                                  <td className="py-2 px-4 font-medium text-slate-800">
                                    {s.source}
                                  </td>
                                  <td className="py-2 px-4 text-right font-semibold text-slate-900 tabular-nums">
                                    {s.count}
                                  </td>
                                  <td className="py-2 px-4 text-right text-slate-500 tabular-nums">
                                    {pct}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-xs text-slate-500">
                          Chưa có dữ liệu nguồn Lead.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── BÁO CÁO 2: PHÂN BỔ LEAD THEO NHÂN VIÊN KINH DOANH (AC-20, AC-22) ── */}
              {(activeReportSection === "all" || activeReportSection === "rep2_sales") && (
                <div className="crm-card p-5 space-y-5">
                  <SectionHeader
                    title="Báo cáo 2 — Phân bổ Lead theo nhân viên kinh doanh"
                    description="Gồm bảng tổng hợp hiệu suất theo từng Sales và bảng chi tiết hồ sơ khách hàng chuẩn mẫu Brief"
                    count={`${analytics?.bySales?.length ?? 0} nhân sự`}
                  />

                  {/* 2A. Bảng tổng hợp theo từng nhân viên kinh doanh */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      2.1. Bảng tổng hợp số lượng Lead theo từng nhân viên kinh doanh
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="crm-table text-xs">
                        <thead>
                          <tr>
                            <th>Nhân viên kinh doanh</th>
                            <th className="num">Tổng Lead được giao</th>
                            <th className="num">Vừa nhận TT</th>
                            <th className="num">Đang soạn BG</th>
                            <th className="num">Đã gửi BG</th>
                            <th className="num">Chưa phản hồi</th>
                            <th className="num">Chốt thành công</th>
                            <th className="num">Thất bại</th>
                            <th className="num">Tỷ lệ chốt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(analytics?.bySales || []).map((s) => (
                            <tr key={s.salesPersonId || s.name}>
                              <td className="py-2.5 px-4 font-semibold text-slate-900">
                                {s.name}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-blue-700 tabular-nums">
                                {s.totalLeads}
                              </td>
                              <td className="py-2.5 px-4 text-right tabular-nums">
                                {s.newLeads}
                              </td>
                              <td className="py-2.5 px-4 text-right tabular-nums">
                                {s.draftingQuote}
                              </td>
                              <td className="py-2.5 px-4 text-right tabular-nums">
                                {s.sentQuote}
                              </td>
                              <td className="py-2.5 px-4 text-right font-semibold text-amber-700 tabular-nums">
                                {s.unrespondedQuote ?? 0}
                              </td>
                              <td className="py-2.5 px-4 text-right font-semibold text-emerald-700 tabular-nums">
                                {s.won}
                              </td>
                              <td className="py-2.5 px-4 text-right text-rose-700 tabular-nums">
                                {s.lost}
                              </td>
                              <td className="py-2.5 px-4 text-right font-semibold tabular-nums">
                                {s.winRatePercent}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 2B. Bảng chi tiết theo mẫu Brief (AC-20, AC-22) */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        2.2. Bảng chi tiết phân bổ Lead theo mẫu Brief ({filteredSalesDetailRows.length} hồ sơ)
                      </h4>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Lọc theo Sales:</span>
                        <select
                          aria-label="Lọc theo nhân viên kinh doanh"
                          value={selectedSalesFilter}
                          onChange={(e) => setSelectedSalesFilter(e.target.value)}
                          className="crm-select h-8 text-xs w-48"
                        >
                          <option value="all">Tất cả nhân viên kinh doanh</option>
                          {(analytics?.bySales || []).map((s) => (
                            <option
                              key={s.salesPersonId || s.name}
                              value={s.name}
                            >
                              {s.name} ({s.totalLeads} Lead)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[480px] rounded-xl border border-slate-200">
                      <table className="crm-table text-xs">
                        <thead>
                          <tr>
                            <th>Tên nhân viên kinh doanh</th>
                            <th>Ngày nhận Lead</th>
                            <th>Tên khách hàng</th>
                            <th>Số điện thoại</th>
                            <th>Nhu cầu / Sản phẩm</th>
                            <th>Tình trạng Lead</th>
                            <th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSalesDetailRows.map((row) => (
                            <tr
                              key={row.id}
                              onClick={() => canAccessLeads && onSelectLead(row)}
                              className={cn(canAccessLeads && "cursor-pointer")}
                            >
                              <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                                {row.salesPerson?.name || "Chưa phân công"}
                              </td>
                              <td className="py-2.5 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                                {row.createdAtTime || row.createdAt}
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="font-semibold text-slate-900">
                                  {row.customerName}
                                </div>
                                {row.companyName && (
                                  <div className="text-[11px] text-slate-500">
                                    {row.companyName}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-slate-800 whitespace-nowrap">
                                {row.phone}
                              </td>
                              <td className="py-2.5 px-4 text-slate-800">
                                <div>{row.product}</div>
                                {row.demandType && (
                                  <span className="text-[11px] text-blue-700 font-medium">
                                    Loại nhu cầu: {row.demandType}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 whitespace-nowrap">
                                <StatusBadge
                                  tone={getLeadStatusTone(row.status)}
                                  size="sm"
                                >
                                  {row.status}
                                </StatusBadge>
                              </td>
                              <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                                {row.status === "Thất bại" && row.failureReason
                                  ? `[Lý do: ${row.failureReason}] ${row.notes || ""}`
                                  : row.notes || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── BÁO CÁO 3: DANH MỤC SẢN PHẨM & LOẠI NHU CẦU (MUA / THUÊ) (AC-21) ── */}
              {(activeReportSection === "all" || activeReportSection === "rep3_products") && (
                <div className="crm-card p-5 space-y-4">
                  <SectionHeader
                    title="Báo cáo 3 — Thống kê theo danh mục sản phẩm & loại nhu cầu (Mua / Thuê)"
                    description="Xếp hạng mức độ quan tâm trên toàn bộ 21 danh mục sản phẩm chuẩn (bao gồm sản phẩm 0 lượt hỏi)"
                    count={`${analytics?.productInterest?.byProduct?.length ?? 0} danh mục`}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Loại nhu cầu Mua / Thuê */}
                    <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Phân loại nhu cầu Mua / Thuê
                      </h4>
                      <div className="space-y-2">
                        {(analytics?.productInterest?.byDemandType || []).map((dt) => {
                          const pct =
                            totalLeadsCount > 0
                              ? Math.round((dt.count / totalLeadsCount) * 100)
                              : 0;
                          return (
                            <div
                              key={dt.demandType}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                            >
                              <span className="font-semibold text-slate-800">
                                {dt.demandType}
                              </span>
                              <span className="tabular-nums text-slate-600">
                                <strong className="text-blue-700">{dt.count}</strong> Lead ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
                        <div className="font-semibold text-emerald-800">
                          Hỏi nhiều nhất ({analytics?.productInterest?.topProducts?.[0]?.count ?? 0} lượt):
                        </div>
                        <p className="text-slate-700">
                          {(analytics?.productInterest?.topProducts || [])
                            .map((p) => p.name)
                            .join(", ") || "Chưa có dữ liệu"}
                        </p>
                        <div className="font-semibold text-amber-800 pt-1">
                          Ít hỏi nhất ({analytics?.productInterest?.leastProducts?.[0]?.count ?? 0} lượt):
                        </div>
                        <p className="text-slate-600">
                          {(analytics?.productInterest?.leastProducts || [])
                            .map((p) => p.name)
                            .join(", ") || "Chưa có dữ liệu"}
                        </p>
                      </div>
                    </div>

                    {/* Bảng chi tiết 21 sản phẩm */}
                    <div className="md:col-span-2 rounded-xl border border-slate-200 overflow-hidden">
                      <div className="max-h-80 overflow-y-auto">
                        <table className="crm-table text-xs">
                          <thead>
                            <tr>
                              <th>STT</th>
                              <th>Tên danh mục sản phẩm</th>
                              <th>Nhóm sản phẩm</th>
                              <th className="num">Số lượt hỏi (Lead)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...(analytics?.productInterest?.byProduct || [])]
                              .sort((a, b) => b.count - a.count)
                              .map((prod, idx) => (
                                <tr key={prod.categoryId}>
                                  <td className="py-2 px-3 text-slate-500 tabular-nums">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2 px-3 font-medium text-slate-900">
                                    {prod.name}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600">
                                    {prod.group === "ELECTRONIC_BOARD"
                                      ? "Bảng điện tử"
                                      : "Màn hình LED"}
                                  </td>
                                  <td className="py-2 px-3 text-right font-semibold tabular-nums">
                                    <span
                                      className={cn(
                                        prod.count > 0
                                          ? "text-blue-700"
                                          : "text-slate-400"
                                      )}
                                    >
                                      {prod.count}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── BÁO CÁO 4: BÁO CÁO THEO TRẠNG THÁI BÁN HÀNG ── */}
              {(activeReportSection === "all" || activeReportSection === "rep4_status") && (
                <div className="crm-card p-5 space-y-4">
                  <SectionHeader
                    title="Báo cáo 4 — Báo cáo theo trạng thái bán hàng (5 trạng thái chuẩn)"
                    description="Đối soát tỷ trọng từng giai đoạn xử lý hồ sơ và nguyên nhân thất bại"
                    count={`${totalLeadsCount} hồ sơ`}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 rounded-xl border border-slate-200 overflow-hidden">
                      <table className="crm-table text-xs">
                        <thead>
                          <tr>
                            <th>Trạng thái bán hàng</th>
                            <th className="num">Số lượng Lead</th>
                            <th className="num">Tỷ trọng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { status: "Vừa nhận thông tin", count: newCount },
                            { status: "Đang soạn báo giá", count: draftingCount },
                            { status: "Đã gửi báo giá", count: sentQuoteCount },
                            { status: "Chốt thành công", count: wonCount },
                            { status: "Thất bại", count: lostCount },
                          ].map((st) => {
                            const pct =
                              totalLeadsCount > 0
                                ? Math.round((st.count / totalLeadsCount) * 100)
                                : 0;
                            return (
                              <tr key={st.status}>
                                <td className="py-2.5 px-4">
                                  <StatusBadge
                                    tone={getLeadStatusTone(st.status)}
                                    size="sm"
                                  >
                                    {st.status}
                                  </StatusBadge>
                                </td>
                                <td className="py-2.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                                  {st.count}
                                </td>
                                <td className="py-2.5 px-4 text-right text-slate-600 tabular-nums">
                                  {pct}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="lg:col-span-5 rounded-xl border border-slate-200 p-4 space-y-2.5">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Thống kê lý do thất bại ({lostCount} hồ sơ)
                      </h4>
                      {(analytics?.byFailureReason?.length ?? 0) > 0 ? (
                        <div className="space-y-2">
                          {analytics!.byFailureReason!.map((item) => (
                            <div
                              key={item.reason}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/50 border border-rose-200/70 text-xs"
                            >
                              <span className="font-medium text-slate-800">
                                {item.reason}
                              </span>
                              <span className="font-semibold text-rose-700 tabular-nums">
                                {item.count} Lead
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Chưa có hồ sơ ở trạng thái Thất bại trong kỳ báo cáo.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── BÁO CÁO 5: BÁO GIÁ & KHÁCH HÀNG CHƯA PHẢN HỒI (AC-23) ── */}
              {(activeReportSection === "all" || activeReportSection === "rep5_quotes") && (
                <div className="crm-card p-5 space-y-4">
                  <SectionHeader
                    title="Báo cáo 5 — Báo giá & Danh sách khách đã gửi báo giá nhưng chưa phản hồi"
                    description="Theo dõi thời điểm gửi báo giá và danh sách khách hàng chưa ghi nhận phản hồi để Sales bám sát"
                    count={`${unrespondedCount} chưa phản hồi`}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      label="Tổng khách đã được gửi báo giá"
                      value={`${totalEverSentQuoteCount} khách hàng`}
                      icon={Send}
                      iconTone="blue"
                      note="Tính các Lead đã đi qua bước Đã gửi báo giá"
                    />
                    <StatCard
                      label="Đã ghi nhận phản hồi / kết quả"
                      value={`${analytics?.quoteReport?.respondedCount ?? 0} khách hàng`}
                      icon={CheckCircle2}
                      iconTone="emerald"
                      note="Khách đã phản hồi hoặc đã chốt / đóng hồ sơ"
                    />
                    <StatCard
                      label="Đã gửi báo giá — Chưa phản hồi"
                      value={`${unrespondedCount} khách hàng`}
                      icon={MessageSquareWarning}
                      iconTone="amber"
                      badgeText={unrespondedCount > 0 ? "Cần gọi chăm sóc" : undefined}
                      badgeTone="warning"
                      note="Đang ở bước Đã gửi báo giá và chưa có phản hồi"
                    />
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="crm-table text-xs">
                      <thead>
                        <tr>
                          <th>Mã Lead</th>
                          <th>Tên khách hàng</th>
                          <th>Số điện thoại</th>
                          <th>Sản phẩm báo giá</th>
                          <th>Sales phụ trách</th>
                          <th>Thời điểm gửi báo giá</th>
                          <th className="num">Số ngày chờ</th>
                          <th>Trạng thái phản hồi</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analytics?.quoteReport?.unrespondedLeads || []).length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-6 text-center text-xs text-slate-500">
                              Hiện không có khách hàng nào đã gửi báo giá mà chưa ghi nhận phản hồi.
                            </td>
                          </tr>
                        ) : (
                          analytics!.quoteReport.unrespondedLeads.map((item) => (
                            <tr
                              key={item.id}
                              onClick={() => {
                                if (!canAccessLeads) return;
                                const match = leads.find((l) => l.id === item.id);
                                if (match) onSelectLead(match);
                              }}
                              className={cn(canAccessLeads && "cursor-pointer")}
                            >
                              <td className="py-2.5 px-3 font-mono font-medium text-blue-600 whitespace-nowrap">
                                {item.code}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">
                                  {item.customerName}
                                </div>
                                {item.companyName && (
                                  <div className="text-[11px] text-slate-500">
                                    {item.companyName}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-800 whitespace-nowrap">
                                {item.phone}
                              </td>
                              <td className="py-2.5 px-3 text-slate-800">
                                {item.product}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                                {item.salesPersonName}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 tabular-nums whitespace-nowrap">
                                {item.quoteSentAtDisplay || "Đã gửi báo giá"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-amber-700 tabular-nums whitespace-nowrap">
                                {item.daysSinceQuoteSent === 0
                                  ? "Hôm nay"
                                  : `${item.daysSinceQuoteSent} ngày`}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <StatusBadge tone="warning" size="sm">
                                  Chưa phản hồi
                                </StatusBadge>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                                {item.notes || "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: DEPARTMENT REPORTS FEED */}
      {activeMainTab === "reports_feed" && (
        <div className="space-y-4">
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

          {isLoadingReports && !hasLoadedReports ? (
            <PageSkeleton cards={0} rows={5} />
          ) : reportsError && !hasLoadedReports ? (
            <ErrorState message={reportsError} onRetry={fetchReportsAndAnalytics} />
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
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsEditorOpen(true)}
                  >
                    Soạn báo cáo mới
                  </Button>
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
                <span className="hidden sm:inline">Bấm vào báo cáo để mở trang đọc chi tiết</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {filteredReports.map((report) => {
                  const isFromAdmin =
                    report.createdBy.role === "ADMIN" ||
                    report.createdBy.role === "DIRECTOR";
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
                        onClick={() => void handleOpenReportDetail(report)}
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

      {/* EXECUTIVE REPORT COMPOSER MODAL */}
      <ReportComposerModal
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        leads={leads}
        currentUserRole={currentUserRole}
        isAdminOrDirector={isAdminOrDirector}
        onShowToast={showToast}
        onSubmitted={fetchReportsAndAnalytics}
      />
    </div>
  );
}
