"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Building,
  Tv,
  Calendar,
  Tag,
  FileText,
  Clock,
  UserCheck,
  Paperclip,
  AlertTriangle,
  Send,
  Loader2,
  Download,
  Calculator,
  Printer,
  CheckCircle2,
  XCircle,
  MessageSquarePlus,
  Flame,
  ShieldCheck,
  History,
  Sparkles,
  Copy,
  Zap,
} from "lucide-react";
import { Lead, LeadQuoteItem, LeadStatus, LeadActivityType, STATUS_LIST } from "../types";
import { getLeadStatusTone, StatusBadge } from "@/src/core/ui/badge";
import { Button } from "@/src/core/ui/button";
import { UnderlineTabs } from "@/src/core/ui/segmented-control";
import { lockBodyScroll, unlockBodyScroll, recordModalOpenMetric } from "@/src/core/ui/modal";
import { sharedGetJson } from "@/src/core/http/shared-fetch";
import { cn } from "@/src/core/utils/utils";
import {
  ACTIVITY_TYPE_OPTIONS,
  LED_MODULE_PRESETS,
  formatVnd,
  toDatetimeLocalValue,
} from "./lead-detail-constants";
import { openPrintableQuoteWindow } from "./printable-quote";
import { LeadDetailAuditTab } from "./LeadDetailAuditTab";

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: LeadStatus, reason?: string) => Promise<boolean | void>;
  onReassignSales?: (leadId: string, newSalesId: string, reason: string) => Promise<boolean | void>;
  currentUserRole?: string;
  onLeadMutated?: () => void;
}

type DetailTab = "dossier" | "quote" | "care" | "audit";

export const LeadDetailModal = React.memo(function LeadDetailModal({
  lead,
  onClose,
  onUpdateStatus,
  onReassignSales,
  currentUserRole,
  onLeadMutated,
}: LeadDetailModalProps) {
  const [detailedLead, setDetailedLead] = useState<Lead | null>(lead);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("dossier");
  const [feedbackMsg, setFeedbackMsg] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  // Status Change State
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | "">(lead?.status || "");
  const [failureReason, setFailureReason] = useState("");
  const [showFailurePrompt, setShowFailurePrompt] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // SLA Scheduler State
  const [slaDateInput, setSlaDateInput] = useState("");
  const [slaNoteInput, setSlaNoteInput] = useState("");
  const [isSavingSla, setIsSavingSla] = useState(false);

  // Reassignment State
  const [showReassignForm, setShowReassignForm] = useState(false);
  const [salesList, setSalesList] = useState<Array<{ id: string; name: string; initials: string }>>(
    []
  );
  const [newSalesId, setNewSalesId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);

  // Quotation Builder State
  const [moduleSpec, setModuleSpec] = useState(LED_MODULE_PRESETS[2].label);
  const [widthMeters, setWidthMeters] = useState<number>(4);
  const [heightMeters, setHeightMeters] = useState<number>(2.5);
  const [unitPriceVnd, setUnitPriceVnd] = useState<number>(LED_MODULE_PRESETS[2].unitPrice);
  const [processorVnd, setProcessorVnd] = useState<number>(LED_MODULE_PRESETS[2].defaultProcessor);
  const [structureInstallVnd, setStructureInstallVnd] = useState<number>(15_000_000);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(24);
  const [quoteNotes, setQuoteNotes] = useState("");
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [approvingQuoteId, setApprovingQuoteId] = useState<string | null>(null);

  // Care Log State
  const [activityType, setActivityType] = useState<LeadActivityType>("CALL");
  const [activitySummary, setActivitySummary] = useState("");
  const [activityOutcome, setActivityOutcome] = useState("");
  const [activityFollowUp, setActivityFollowUp] = useState("");
  const [isLoggingActivity, setIsLoggingActivity] = useState(false);

  // AI Sales Co-Pilot State
  const [isRunningCopilot, setIsRunningCopilot] = useState(false);
  const [aiCopilot, setAiCopilot] = useState<{
    aiEngine: string;
    recommendedConfig: {
      moduleSpec: string;
      widthMeters: number;
      heightMeters: number;
      areaSqm: number;
      unitPriceVnd: number;
      processorVnd: number;
      structureInstallVnd: number;
      estimatedTotalVnd: number;
      rationale: string;
    };
    outreachMessage: string;
    nextBestActions: string[];
  } | null>(null);

  const showFeedback = (tone: "success" | "error", text: string) => {
    setFeedbackMsg({ tone, text });
    window.setTimeout(() => {
      setFeedbackMsg((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const refreshLeadDetail = useCallback(
    async (targetId: string) => {
      try {
        const res = await fetch(`/api/leads/${targetId}`);
        const json = await res.json();
        if (json.success && json.data?.lead) {
          const fresh: Lead = json.data.lead;
          setDetailedLead(fresh);
          setSlaDateInput(toDatetimeLocalValue(fresh.nextFollowUpAt));
          setSlaNoteInput(fresh.nextActionNote || "");
          if (fresh.ledWidth && fresh.ledWidth > 0) setWidthMeters(fresh.ledWidth);
          if (fresh.ledHeight && fresh.ledHeight > 0) setHeightMeters(fresh.ledHeight);
          if (fresh.ledModuleType) setModuleSpec(fresh.ledModuleType);
        }
      } catch (err) {
        console.warn("Error refreshing lead detail:", err);
      }
    },
    []
  );

  useEffect(() => {
    if (!lead) return;
    const openStartMs = typeof performance !== "undefined" ? performance.now() : 0;
    lockBodyScroll();
    recordModalOpenMetric(`Chi tiết Lead ${lead.code}`, openStartMs);

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
      unlockBodyScroll();
    };
  }, [lead, onClose]);

  useEffect(() => {
    setDetailedLead(lead);
    setSelectedStatus(lead?.status || "");
    setShowFailurePrompt(false);
    setShowReassignForm(false);
    setFailureReason("");
    setStatusError(null);
    setFeedbackMsg(null);
    setAiCopilot(null);
    setActiveTab("dossier");
    setSlaDateInput(toDatetimeLocalValue(lead?.nextFollowUpAt));
    setSlaNoteInput(lead?.nextActionNote || "");

    if (lead?.id) {
      setIsLoadingDetail(true);
      refreshLeadDetail(lead.id).finally(() => setIsLoadingDetail(false));

      sharedGetJson("/api/users?role=SALES", 60_000)
        .then(({ ok, payload }) => {
          if (ok && payload?.success && Array.isArray(payload.data?.users)) {
            setSalesList(payload.data.users);
            if (payload.data.users.length > 0) {
              setNewSalesId(payload.data.users[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [lead, refreshLeadDetail]);

  if (!lead || typeof document === "undefined") return null;

  const currentLead = detailedLead || lead;
  const isDirectorOrAdmin = currentUserRole === "DIRECTOR" || currentUserRole === "ADMIN";

  const handleRunAiCopilot = async () => {
    setIsRunningCopilot(true);
    try {
      const res = await fetch("/api/leads/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SALES_COPILOT",
          leadId: currentLead.id,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message || "Không thể chạy phân tích AI Co-Pilot");
      }
      setAiCopilot(json.data);
    } catch (err: any) {
      showFeedback("error", err.message || "Lỗi kết nối AI Co-Pilot");
    } finally {
      setIsRunningCopilot(false);
    }
  };

  const handleApplyAiToQuoteBuilder = () => {
    if (!aiCopilot) return;
    const cfg = aiCopilot.recommendedConfig;
    setModuleSpec(cfg.moduleSpec);
    setWidthMeters(cfg.widthMeters);
    setHeightMeters(cfg.heightMeters);
    setUnitPriceVnd(cfg.unitPriceVnd);
    setProcessorVnd(cfg.processorVnd);
    setStructureInstallVnd(cfg.structureInstallVnd);
    setQuoteNotes(cfg.rationale);
    setActiveTab("quote");
    showFeedback(
      "success",
      `Đã áp dụng cấu hình AI (${cfg.widthMeters}m × ${cfg.heightMeters}m = ${cfg.areaSqm}m²) sang Dự toán Báo giá!`
    );
  };

  const handleCopyOutreach = async () => {
    if (!aiCopilot?.outreachMessage) return;
    try {
      await navigator.clipboard.writeText(aiCopilot.outreachMessage);
      showFeedback("success", "Đã sao chép kịch bản tin nhắn Zalo / Email để gửi khách hàng!");
    } catch {
      showFeedback("error", "Không thể truy cập bộ nhớ tạm trình duyệt");
    }
  };

  // Live LED Quotation math
  const safeWidth = Math.max(0.2, Number(widthMeters) || 0.2);
  const safeHeight = Math.max(0.2, Number(heightMeters) || 0.2);
  const computedAreaSqm = Number((safeWidth * safeHeight).toFixed(2));
  const ledCost = Math.round(computedAreaSqm * (Number(unitPriceVnd) || 0));
  const subtotalVnd =
    ledCost + (Number(processorVnd) || 0) + (Number(structureInstallVnd) || 0);
  const safeDiscount = Math.min(50, Math.max(0, Number(discountPercent) || 0));
  const discountVnd = Math.round(subtotalVnd * (safeDiscount / 100));
  const finalQuoteTotalVnd = Math.max(0, subtotalVnd - discountVnd);
  const requiresDirectorSignoff = safeDiscount > 8 || finalQuoteTotalVnd >= 200_000_000;

  const handleStatusSelect = async (newStatus: LeadStatus) => {
    setStatusError(null);
    if (newStatus === "Thất bại") {
      setSelectedStatus("Thất bại");
      setShowFailurePrompt(true);
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(currentLead.id, newStatus);
      setSelectedStatus(newStatus);
      setShowFailurePrompt(false);
      await refreshLeadDetail(currentLead.id);
    } catch (err: any) {
      setStatusError(err.message || "Lỗi cập nhật trạng thái");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmFailure = async () => {
    if (!failureReason.trim()) {
      setStatusError("Bắt buộc phải nhập lý do khi chuyển trạng thái Thất bại.");
      return;
    }

    setIsUpdatingStatus(true);
    setStatusError(null);
    try {
      await onUpdateStatus(currentLead.id, "Thất bại", failureReason.trim());
      setShowFailurePrompt(false);
      setSelectedStatus("Thất bại");
      await refreshLeadDetail(currentLead.id);
    } catch (err: any) {
      setStatusError(err.message || "Lỗi cập nhật trạng thái");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const applyQuickSlaOffset = (hoursFromNow: number, defaultNote: string) => {
    const target = new Date(Date.now() + hoursFromNow * 3_600_000);
    setSlaDateInput(toDatetimeLocalValue(target.toISOString()));
    if (!slaNoteInput.trim()) setSlaNoteInput(defaultNote);
  };

  const handleSaveSla = async () => {
    setIsSavingSla(true);
    try {
      const payload = {
        nextFollowUpAt: slaDateInput ? new Date(slaDateInput).toISOString() : null,
        nextActionNote: slaNoteInput.trim() || null,
      };
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể lưu lịch hẹn SLA");
      }
      showFeedback("success", "Đã cập nhật lịch hẹn SLA & nhắc việc chăm sóc!");
      await refreshLeadDetail(currentLead.id);
      onLeadMutated?.();
    } catch (err: any) {
      showFeedback("error", err.message || "Lỗi lưu lịch hẹn SLA");
    } finally {
      setIsSavingSla(false);
    }
  };

  const handleReassign = async () => {
    if (!newSalesId || !onReassignSales) return;
    setIsReassigning(true);
    try {
      await onReassignSales(currentLead.id, newSalesId, reassignReason);
      setReassignReason("");
      setShowReassignForm(false);
      await refreshLeadDetail(currentLead.id);
    } finally {
      setIsReassigning(false);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingQuote(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleSpec,
          widthMeters: safeWidth,
          heightMeters: safeHeight,
          unitPriceVnd: Number(unitPriceVnd) || 0,
          processorVnd: Number(processorVnd) || 0,
          structureInstallVnd: Number(structureInstallVnd) || 0,
          discountPercent: safeDiscount,
          warrantyMonths: Number(warrantyMonths) || 24,
          notes: quoteNotes.trim() || null,
          requestDirectorApproval: requiresDirectorSignoff,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Lỗi lập báo giá LED");
      }
      setQuoteNotes("");
      showFeedback("success", json.message || "Đã lập báo giá LED thành công!");
      await refreshLeadDetail(currentLead.id);
      onLeadMutated?.();
    } catch (err: any) {
      showFeedback("error", err.message || "Không thể tạo báo giá LED");
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const handleDirectorDecision = async (
    quoteId: string,
    decision: "APPROVED" | "REJECTED"
  ) => {
    setApprovingQuoteId(quoteId);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/quotes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId,
          decision,
          note:
            decision === "APPROVED"
              ? "Ban Giám Đốc đồng ý khung giá & chiết khấu dự án"
              : "Đề nghị cân đối lại tỷ lệ chiết khấu theo khung chuẩn",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Lỗi phê duyệt báo giá");
      }
      showFeedback("success", json.message || "Đã cập nhật quyết định phê duyệt!");
      await refreshLeadDetail(currentLead.id);
      onLeadMutated?.();
    } catch (err: any) {
      showFeedback("error", err.message || "Không thể phê duyệt báo giá");
    } finally {
      setApprovingQuoteId(null);
    }
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activitySummary.trim()) return;
    setIsLoggingActivity(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activityType,
          summary: activitySummary.trim(),
          outcome: activityOutcome.trim() || null,
          nextFollowUpAt: activityFollowUp ? new Date(activityFollowUp).toISOString() : null,
          nextActionNote: activityFollowUp
            ? `Theo dõi tiếp sau: ${activitySummary.trim().slice(0, 80)}`
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Lỗi lưu nhật ký chăm sóc");
      }
      setActivitySummary("");
      setActivityOutcome("");
      setActivityFollowUp("");
      showFeedback("success", json.message || "Đã lưu nhật ký chăm sóc khách hàng!");
      await refreshLeadDetail(currentLead.id);
      onLeadMutated?.();
    } catch (err: any) {
      showFeedback("error", err.message || "Không thể lưu nhật ký");
    } finally {
      setIsLoggingActivity(false);
    }
  };

  const statusTimeline = currentLead.statusHistory || [];
  const assignmentTimeline = currentLead.assignments || [];
  const attachments = currentLead.attachments || [];
  const activities = currentLead.activities || [];
  const quotes = currentLead.quotes || [];
  const score = currentLead.priorityScore ?? 35;
  const tier = currentLead.priorityTier || (score >= 70 ? "HOT" : score >= 40 ? "WARM" : "COLD");

  return createPortal(
    <div
      className="fixed inset-0 z-[85] flex justify-end bg-slate-950/60 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết Lead ${currentLead.code}`}
    >
      {/* Right Enterprise Slide-Over Sheet */}
      <div
        className="sheet-panel w-full max-w-3xl h-full bg-elevated border-l border-slate-200 shadow-floating flex flex-col overflow-hidden animate-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet Header */}
        <div className="px-6 pt-4 pb-0 border-b border-slate-200/80 bg-white shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                  {currentLead.code}
                </span>
                <StatusBadge tone={getLeadStatusTone(currentLead.status)}>
                  {currentLead.status}
                </StatusBadge>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold kpi-number",
                    tier === "HOT"
                      ? "bg-rose-50 border-rose-200 text-rose-700"
                      : tier === "WARM"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-slate-100 border-slate-200 text-slate-600"
                  )}
                >
                  {tier === "HOT" && <Flame className="w-3 h-3 text-rose-600" />}
                  Điểm ưu tiên: {score}/100 ({tier})
                </span>
                {currentLead.slaLabel && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium",
                      currentLead.slaStatus === "OVERDUE"
                        ? "bg-rose-50 border-rose-200 text-rose-700"
                        : currentLead.slaStatus === "DUE_SOON"
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    {currentLead.slaLabel}
                  </span>
                )}
                {isLoadingDetail && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
              </div>

              <h2 className="text-[18px] font-semibold text-slate-900 tracking-[-0.015em] truncate">
                {currentLead.customerName}
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{currentLead.companyName}</span>
                <span className="text-slate-300">·</span>
                <span className="font-semibold text-blue-600 kpi-number">
                  {currentLead.estimatedValue}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bảng chi tiết Lead"
              className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {currentLead.directorApprovalStatus === "PENDING" && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-800">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Hồ sơ có báo giá vượt khung chiết khấu / giá trị lớn đang{" "}
                  <strong>chờ Tác nhân Giám Đốc phê duyệt</strong>.
                </span>
              </div>
              {activeTab !== "quote" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("quote")}
                  className="text-amber-900 font-semibold underline shrink-0 cursor-pointer"
                >
                  Xem &amp; Duyệt ngay →
                </button>
              )}
            </div>
          )}

          <UnderlineTabs
            value={activeTab}
            onChange={setActiveTab}
            className="border-b-0"
            options={[
              { id: "dossier", label: "Hồ sơ & SLA", icon: <FileText className="w-3.5 h-3.5" /> },
              {
                id: "quote",
                label: "Dự toán m² & Báo giá",
                count: quotes.length,
                icon: <Calculator className="w-3.5 h-3.5" />,
              },
              {
                id: "care",
                label: "Nhật ký CSKH",
                count: activities.length,
                icon: <MessageSquarePlus className="w-3.5 h-3.5" />,
              },
              {
                id: "audit",
                label: "Kiểm toán",
                count: statusTimeline.length + assignmentTimeline.length,
                icon: <History className="w-3.5 h-3.5" />,
              },
            ]}
          />
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {feedbackMsg && (
            <div
              className={cn(
                "p-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 animate-fade-in",
                feedbackMsg.tone === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              )}
            >
              <span>{feedbackMsg.text}</span>
              <button
                type="button"
                onClick={() => setFeedbackMsg(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ================= TAB 1: HỒ SƠ & SLA ================= */}
          {activeTab === "dossier" && (
            <>
              {/* 0. AI SALES CO-PILOT */}
              <section className="rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/75 to-violet-50/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-slate-900">
                        AI Co-Pilot Đề xuất Cấu hình LED &amp; Kịch bản Chốt Sale
                      </h3>
                      <p className="text-[11.5px] text-slate-500">
                        Tự động tính kích thước m² chuẩn 16:9, chọn dòng Module &amp; soạn tin nhắn Zalo gửi {currentLead.customerName}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    isLoading={isRunningCopilot}
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    onClick={() => void handleRunAiCopilot()}
                  >
                    {aiCopilot ? "Phân tích lại bằng AI" : "AI Phân tích & Soạn kịch bản"}
                  </Button>
                </div>

                {aiCopilot && (
                  <div className="space-y-3 pt-2 border-t border-blue-100 animate-fade-in">
                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-blue-700">
                          {aiCopilot.recommendedConfig.moduleSpec}
                        </span>
                        <span className="text-xs font-bold text-slate-900 kpi-number">
                          {aiCopilot.recommendedConfig.widthMeters}m ×{" "}
                          {aiCopilot.recommendedConfig.heightMeters}m (
                          {aiCopilot.recommendedConfig.areaSqm} m²) · ~
                          {formatVnd(aiCopilot.recommendedConfig.estimatedTotalVnd)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {aiCopilot.recommendedConfig.rationale}
                      </p>
                      <div className="pt-1 flex justify-end">
                        <Button
                          type="button"
                          variant="subtle"
                          size="sm"
                          leftIcon={<Zap className="w-3.5 h-3.5" />}
                          onClick={handleApplyAiToQuoteBuilder}
                        >
                          Đẩy cấu hình này sang Báo giá m² →
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">
                          Kịch bản tin nhắn Zalo / Email gửi khách
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          leftIcon={<Copy className="w-3.5 h-3.5 text-blue-600" />}
                          onClick={() => void handleCopyOutreach()}
                        >
                          Sao chép gửi Zalo
                        </Button>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                        {aiCopilot.outreachMessage}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        3 bước hành động ưu tiên tiếp theo ({aiCopilot.aiEngine})
                      </span>
                      <ul className="space-y-1">
                        {aiCopilot.nextBestActions.map((step, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </section>

              {/* 1. TRẠNG THÁI */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                  1. Trạng thái xử lý
                </h3>
                <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-medium text-slate-900">
                        Cập nhật tiến độ cơ hội
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mọi thay đổi đều tự động lưu vào Timeline kiểm toán.
                      </p>
                    </div>

                    <select
                      value={selectedStatus || currentLead.status}
                      onChange={(e) => handleStatusSelect(e.target.value as LeadStatus)}
                      disabled={isUpdatingStatus}
                      aria-label="Cập nhật trạng thái Lead"
                      className="crm-select min-w-[195px] cursor-pointer font-medium"
                    >
                      {STATUS_LIST.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showFailurePrompt && (
                    <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 space-y-2.5">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-semibold text-rose-900">
                            Bắt buộc nhập lý do Thất bại
                          </p>
                          <p className="text-rose-700 mt-0.5">
                            Nêu rõ nguyên nhân (ngân sách, khách hoãn dự án, đối thủ, thay đổi quy cách...) để lưu lịch sử.
                          </p>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Nhập nguyên nhân thất bại cụ thể..."
                        value={failureReason}
                        onChange={(e) => setFailureReason(e.target.value)}
                        className="crm-textarea text-xs border-rose-300 focus:border-rose-500"
                      />
                      {statusError && (
                        <p className="text-xs font-medium text-rose-600">{statusError}</p>
                      )}
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowFailurePrompt(false);
                            setSelectedStatus(currentLead.status);
                            setStatusError(null);
                          }}
                        >
                          Hủy
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          isLoading={isUpdatingStatus}
                          onClick={handleConfirmFailure}
                        >
                          Xác nhận Thất bại
                        </Button>
                      </div>
                    </div>
                  )}

                  {!showFailurePrompt && statusError && (
                    <p className="text-xs font-medium text-rose-600">{statusError}</p>
                  )}

                  {currentLead.status === "Thất bại" && currentLead.failureReason && (
                    <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/70 text-xs">
                      <span className="font-semibold text-rose-900">
                        Lý do thất bại đã ghi nhận:{" "}
                      </span>
                      <span className="text-rose-800">{currentLead.failureReason}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. CAM KẾT SLA & LỊCH HẸN FOLLOW-UP */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                    2. Cam kết SLA &amp; Lịch hẹn chăm sóc tiếp theo
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        applyQuickSlaOffset(2, "Gọi lại xác nhận mặt bằng & kích thước LED")
                      }
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                    >
                      +2 Giờ
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyQuickSlaOffset(24, "Gửi bản dự toán báo giá LED & hẹn khảo sát")
                      }
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                    >
                      +1 Ngày
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyQuickSlaOffset(72, "Theo dõi phản hồi trình duyệt ngân sách của khách")
                      }
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                    >
                      +3 Ngày
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="sla-datetime" className="crm-label text-xs">
                        Thời hạn liên hệ tiếp theo (SLA)
                      </label>
                      <input
                        id="sla-datetime"
                        type="datetime-local"
                        value={slaDateInput}
                        onChange={(e) => setSlaDateInput(e.target.value)}
                        className="crm-input text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="sla-note" className="crm-label text-xs">
                        Hành động cần thực hiện
                      </label>
                      <input
                        id="sla-note"
                        type="text"
                        placeholder="VD: Khảo sát thực tế hội trường tầng 3..."
                        value={slaNoteInput}
                        onChange={(e) => setSlaNoteInput(e.target.value)}
                        className="crm-input text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11.5px] text-slate-500">
                      Hồ sơ quá giờ hẹn sẽ tự động nổi cảnh báo đỏ tại mục{" "}
                      <strong>Cần gọi SLA</strong>.
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isSavingSla}
                      onClick={handleSaveSla}
                    >
                      Lưu lịch hẹn SLA
                    </Button>
                  </div>
                </div>
              </section>

              {/* 3. THÔNG TIN KHÁCH HÀNG */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                  3. Thông tin khách hàng &amp; Dự án LED
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Số điện thoại
                    </span>
                    <p className="text-[13.5px] font-semibold text-slate-900 font-mono">
                      {currentLead.phone}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Email liên hệ
                    </span>
                    <p className="text-[13.5px] font-medium text-slate-900 truncate">
                      {currentLead.email || "Chưa cung cấp"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400" /> Nguồn tiếp cận
                    </span>
                    <p className="text-[13.5px] font-medium text-slate-900">{currentLead.source}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Ngày tiếp nhận
                    </span>
                    <p className="text-[13.5px] font-medium text-slate-900 font-mono">
                      {currentLead.createdAt}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Tv className="w-3.5 h-3.5 text-blue-600" />
                        <span>Hạng mục sản phẩm / Giải pháp</span>
                      </div>
                      <p className="text-[14px] font-semibold text-slate-900">
                        {currentLead.product}
                      </p>
                      {currentLead.ledModuleType && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">
                          Cấu hình báo giá: {currentLead.ledModuleType}
                          {currentLead.ledWidth && currentLead.ledHeight
                            ? ` (${currentLead.ledWidth}m × ${currentLead.ledHeight}m = ${Number(
                                (currentLead.ledWidth * currentLead.ledHeight).toFixed(2)
                              )} m²)`
                            : ""}
                        </p>
                      )}
                    </div>
                    <StatusBadge tone="info" dot={false} size="sm">
                      {currentLead.category}
                    </StatusBadge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Giá trị dự toán hiện tại</span>
                      <span className="text-[14px] font-semibold text-slate-900 kpi-number">
                        {currentLead.estimatedValue}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 flex items-center gap-1 mb-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" /> Địa điểm lắp đặt
                      </span>
                      <span className="text-[13px] font-medium text-slate-800">
                        {currentLead.installationAddress || currentLead.location}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" /> Ghi chú kỹ thuật &amp; Yêu cầu
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {currentLead.notes || "Chưa có ghi chú bổ sung."}
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. SALES PHỤ TRÁCH */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                    4. Sales phụ trách
                  </h3>
                  {onReassignSales && (
                    <button
                      type="button"
                      onClick={() => setShowReassignForm((prev) => !prev)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      {showReassignForm ? "Đóng bàn giao" : "Chuyển bàn giao Sales"}
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-[#1E3A8A] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                        {currentLead.salesPerson.initials}
                      </span>
                      <div>
                        <p className="text-[13.5px] font-semibold text-slate-900">
                          {currentLead.salesPerson.name}
                        </p>
                        <p className="text-xs text-slate-500">Phòng Kinh Doanh Toàn Trung</p>
                      </div>
                    </div>
                    <StatusBadge tone="success" size="sm">
                      Đang phụ trách
                    </StatusBadge>
                  </div>

                  {showReassignForm && onReassignSales && (
                    <div className="pt-3.5 border-t border-slate-100 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="reassign-sales-select" className="crm-label text-xs">
                            Sales tiếp nhận mới
                          </label>
                          <select
                            id="reassign-sales-select"
                            value={newSalesId}
                            onChange={(e) => setNewSalesId(e.target.value)}
                            className="crm-select w-full"
                          >
                            {salesList.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.initials})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="reassign-reason" className="crm-label text-xs">
                            Lý do bàn giao
                          </label>
                          <input
                            id="reassign-reason"
                            type="text"
                            placeholder="VD: Phân tuyến dự án khu vực..."
                            value={reassignReason}
                            onChange={(e) => setReassignReason(e.target.value)}
                            className="crm-input"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowReassignForm(false)}
                        >
                          Hủy
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isReassigning}
                          leftIcon={<Send className="w-3.5 h-3.5" />}
                          onClick={handleReassign}
                        >
                          Xác nhận bàn giao
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 5. TÀI LIỆU */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                  5. Tài liệu &amp; Bản vẽ ({attachments.length})
                </h3>
                <div className="p-4 rounded-xl border border-slate-200/90 bg-white">
                  {attachments.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Chưa có tài liệu hoặc bản vẽ kỹ thuật đính kèm.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((file) => (
                        <div
                          key={file.id}
                          className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/40 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate">{file.fileName}</p>
                              <p className="text-[11px] text-slate-400">
                                {file.fileType} · {file.createdAt}
                              </p>
                            </div>
                          </div>
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors shrink-0"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Mở file</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ================= TAB 2: DỰ TOÁN LED m² & BÁO GIÁ PDF ================= */}
          {activeTab === "quote" && (
            <div className="space-y-6">
              <form
                onSubmit={handleCreateQuote}
                className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-[14px] font-semibold text-slate-900">
                      Công cụ bóc tách Dự toán Màn hình LED (m²)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tự động tính diện tích m², bộ xử lý Novastar, khung kết cấu và kiểm soát khung chiết khấu Ban Giám Đốc.
                    </p>
                  </div>
                  <StatusBadge tone="info" dot={false} size="sm">
                    Diện tích: {computedAreaSqm} m²
                  </StatusBadge>
                </div>

                <div>
                  <label htmlFor="led-preset" className="crm-label text-xs">
                    Chọn cấu hình Module LED chuẩn Toàn Trung
                  </label>
                  <select
                    id="led-preset"
                    value={
                      LED_MODULE_PRESETS.some((p) => p.label === moduleSpec)
                        ? moduleSpec
                        : "__custom__"
                    }
                    onChange={(e) => {
                      const found = LED_MODULE_PRESETS.find((p) => p.label === e.target.value);
                      if (found) {
                        setModuleSpec(found.label);
                        setUnitPriceVnd(found.unitPrice);
                        setProcessorVnd(found.defaultProcessor);
                      }
                    }}
                    className="crm-select w-full font-medium"
                  >
                    {LED_MODULE_PRESETS.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label} — {formatVnd(p.unitPrice)}/m²
                      </option>
                    ))}
                    {!LED_MODULE_PRESETS.some((p) => p.label === moduleSpec) && (
                      <option value="__custom__">{moduleSpec}</option>
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label htmlFor="quote-width" className="crm-label text-xs">
                      Chiều ngang (m)
                    </label>
                    <input
                      id="quote-width"
                      type="number"
                      step="0.1"
                      min="0.2"
                      max="200"
                      value={widthMeters}
                      onChange={(e) => setWidthMeters(parseFloat(e.target.value) || 0)}
                      className="crm-input kpi-number font-semibold"
                    />
                  </div>
                  <div>
                    <label htmlFor="quote-height" className="crm-label text-xs">
                      Chiều cao (m)
                    </label>
                    <input
                      id="quote-height"
                      type="number"
                      step="0.1"
                      min="0.2"
                      max="200"
                      value={heightMeters}
                      onChange={(e) => setHeightMeters(parseFloat(e.target.value) || 0)}
                      className="crm-input kpi-number font-semibold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="quote-unit-price" className="crm-label text-xs">
                      Đơn giá Module LED (VNĐ / m²)
                    </label>
                    <input
                      id="quote-unit-price"
                      type="number"
                      step="100000"
                      min="100000"
                      value={unitPriceVnd}
                      onChange={(e) => setUnitPriceVnd(parseInt(e.target.value, 10) || 0)}
                      className="crm-input kpi-number font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="quote-processor" className="crm-label text-xs">
                      Bộ xử lý Novastar (VNĐ)
                    </label>
                    <input
                      id="quote-processor"
                      type="number"
                      step="500000"
                      min="0"
                      value={processorVnd}
                      onChange={(e) => setProcessorVnd(parseInt(e.target.value, 10) || 0)}
                      className="crm-input kpi-number"
                    />
                  </div>
                  <div>
                    <label htmlFor="quote-install" className="crm-label text-xs">
                      Khung thép &amp; Thi công (VNĐ)
                    </label>
                    <input
                      id="quote-install"
                      type="number"
                      step="500000"
                      min="0"
                      value={structureInstallVnd}
                      onChange={(e) => setStructureInstallVnd(parseInt(e.target.value, 10) || 0)}
                      className="crm-input kpi-number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="quote-discount" className="crm-label text-xs">
                        Chiết khấu (%)
                      </label>
                      <input
                        id="quote-discount"
                        type="number"
                        step="0.5"
                        min="0"
                        max="50"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                        className="crm-input kpi-number font-semibold"
                      />
                    </div>
                    <div>
                      <label htmlFor="quote-warranty" className="crm-label text-xs">
                        Bảo hành
                      </label>
                      <select
                        id="quote-warranty"
                        value={warrantyMonths}
                        onChange={(e) => setWarrantyMonths(parseInt(e.target.value, 10))}
                        className="crm-select w-full"
                      >
                        <option value={12}>12 tháng</option>
                        <option value={24}>24 tháng</option>
                        <option value={36}>36 tháng</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="quote-notes" className="crm-label text-xs">
                    Ghi chú tiến độ / điều khoản dự án (hiển thị trên file PDF)
                  </label>
                  <input
                    id="quote-notes"
                    type="text"
                    placeholder="VD: Đã bao gồm cáp quang âm tường 50m & khung viền Alu đen..."
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    className="crm-input text-xs"
                  />
                </div>

                {/* Live Cost Summary Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      Màn hình LED ({safeWidth}m × {safeHeight}m = {computedAreaSqm} m²):
                    </span>
                    <span className="kpi-number font-medium text-slate-900">
                      {formatVnd(ledCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Bộ xử lý tín hiệu &amp; Hệ khung kết cấu thi công:</span>
                    <span className="kpi-number font-medium text-slate-900">
                      {formatVnd((Number(processorVnd) || 0) + (Number(structureInstallVnd) || 0))}
                    </span>
                  </div>
                  {safeDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Chiết khấu thương mại ({safeDiscount}%):</span>
                      <span className="kpi-number font-medium">- {formatVnd(discountVnd)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-[13px]">
                      Tổng dự toán báo giá:
                    </span>
                    <span className="text-[16px] font-bold text-blue-600 kpi-number">
                      {formatVnd(finalQuoteTotalVnd)}
                    </span>
                  </div>
                </div>

                {requiresDirectorSignoff && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Kiểm soát nội bộ 3 Tác nhân:</strong> Báo giá có chiết khấu{" "}
                      <strong>&gt; 8%</strong> hoặc quy mô dự án{" "}
                      <strong>&ge; 200.000.000 đ</strong> sẽ tự động gửi thông báo trình{" "}
                      <strong>Tác nhân Giám Đốc</strong> ký duyệt trước khi chốt hợp đồng.
                    </span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isCreatingQuote}
                    leftIcon={<Calculator className="w-4 h-4" />}
                  >
                    {requiresDirectorSignoff
                      ? "Lưu Báo giá & Trình Giám đốc duyệt"
                      : "Lưu Báo giá & Cập nhật giá trị Lead"}
                  </Button>
                </div>
              </form>

              {/* Saved Quotations List */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Danh sách Phiên bản Báo giá ({quotes.length})
                </h3>

                {quotes.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    Chưa có phiên bản báo giá nào được lưu cho khách hàng này.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quotes.map((q) => (
                      <div
                        key={q.id}
                        className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
                                {q.code}
                              </span>
                              {q.status === "PENDING_DIRECTOR" && (
                                <StatusBadge tone="warning" size="sm">
                                  Chờ Giám đốc duyệt
                                </StatusBadge>
                              )}
                              {q.status === "DIRECTOR_APPROVED" && (
                                <StatusBadge tone="success" size="sm">
                                  Giám đốc đã duyệt ({q.approvedByName})
                                </StatusBadge>
                              )}
                              {q.status === "SENT" && (
                                <StatusBadge tone="info" size="sm">
                                  Báo giá chuẩn
                                </StatusBadge>
                              )}
                              {q.status === "DRAFT" && (
                                <StatusBadge tone="error" size="sm">
                                  Yêu cầu điều chỉnh lại
                                </StatusBadge>
                              )}
                            </div>
                            <p className="text-[13.5px] font-semibold text-slate-900 mt-1.5">
                              {q.moduleSpec}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Kích thước: {q.widthMeters}m × {q.heightMeters}m ={" "}
                              <strong>{q.areaSqm} m²</strong> · Chiết khấu: {q.discountPercent}% ·
                              Bảo hành: {q.warrantyMonths} tháng
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="text-[15px] font-bold text-slate-900 kpi-number">
                              {formatVnd(q.totalVnd)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Lập bởi {q.createdBy} · {q.createdAt}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Printer className="w-3.5 h-3.5" />}
                            onClick={() => openPrintableQuoteWindow(currentLead, q)}
                          >
                            In / Xuất Báo giá PDF (A4)
                          </Button>

                          {q.status === "PENDING_DIRECTOR" && isDirectorOrAdmin && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="danger"
                                size="sm"
                                isLoading={approvingQuoteId === q.id}
                                leftIcon={<XCircle className="w-3.5 h-3.5" />}
                                onClick={() => handleDirectorDecision(q.id, "REJECTED")}
                              >
                                Yêu cầu sửa giá
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={approvingQuoteId === q.id}
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                onClick={() => handleDirectorDecision(q.id, "APPROVED")}
                              >
                                Giám đốc Ký duyệt giá
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ================= TAB 3: NHẬT KÝ CHĂM SÓC & KHẢO SÁT ================= */}
          {activeTab === "care" && (
            <div className="space-y-6">
              <form
                onSubmit={handleLogActivity}
                className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3.5"
              >
                <h3 className="text-[14px] font-semibold text-slate-900">
                  Ghi nhận tương tác chăm sóc &amp; khảo sát thực tế
                </h3>

                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setActivityType(opt.id)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer",
                        activityType === opt.id
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label htmlFor="care-summary" className="crm-label text-xs">
                    Nội dung trao đổi / Kết quả đo đạc mặt bằng *
                  </label>
                  <textarea
                    id="care-summary"
                    rows={2}
                    required
                    placeholder="VD: Đã gọi xác nhận kích thước hội trường lọt lòng 4.8m x 2.7m, nguồn điện 3 pha cách vị trí màn hình 12m..."
                    value={activitySummary}
                    onChange={(e) => setActivitySummary(e.target.value)}
                    className="crm-textarea text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="care-outcome" className="crm-label text-xs">
                      Phản hồi của khách hàng
                    </label>
                    <input
                      id="care-outcome"
                      type="text"
                      placeholder="VD: Khách đề nghị gửi kèm phương án P2.0 và P2.5"
                      value={activityOutcome}
                      onChange={(e) => setActivityOutcome(e.target.value)}
                      className="crm-input text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="care-followup" className="crm-label text-xs">
                      Đặt lịch gọi lại tiếp theo (Tùy chọn)
                    </label>
                    <input
                      id="care-followup"
                      type="datetime-local"
                      value={activityFollowUp}
                      onChange={(e) => setActivityFollowUp(e.target.value)}
                      className="crm-input text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isLoggingActivity}
                    leftIcon={<MessageSquarePlus className="w-3.5 h-3.5" />}
                  >
                    Lưu nhật ký CSKH
                  </Button>
                </div>
              </form>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                  Lịch sử tương tác ({activities.length})
                </h3>

                {activities.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    Chưa có nhật ký cuộc gọi, tin nhắn Zalo hoặc biên bản khảo sát nào.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200/70 text-blue-700 font-semibold text-[10.5px]">
                              {act.type}
                            </span>
                            <span className="font-semibold text-slate-900">{act.createdBy}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {act.createdAt}
                          </span>
                        </div>
                        <p className="text-slate-800 leading-relaxed">{act.summary}</p>
                        {act.outcome && (
                          <p className="text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                            <strong>Kết quả:</strong> {act.outcome}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}


          {/* ================= TAB 4: LỊCH SỬ KIỂM TOÁN ================= */}
          {activeTab === "audit" && (
            <LeadDetailAuditTab
              statusTimeline={statusTimeline}
              assignmentTimeline={assignmentTimeline}
            />
          )}
        </div>

        {/* Sheet Sticky Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
          <Button variant="secondary" size="md" onClick={onClose}>
            Đóng
          </Button>
          <div className="flex items-center gap-2">
            {activeTab !== "quote" && (
              <Button
                variant="subtle"
                size="md"
                leftIcon={<Calculator className="w-3.5 h-3.5" />}
                onClick={() => setActiveTab("quote")}
              >
                Lập báo giá LED
              </Button>
            )}
            <a
              href={`tel:${currentLead.phone}`}
              className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium inline-flex items-center gap-2 transition-colors shadow-[0_1px_2px_rgba(37,99,235,0.18)]"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Gọi ({currentLead.phone})</span>
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});
