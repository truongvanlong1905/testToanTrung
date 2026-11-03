"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Paperclip,
  AlertTriangle,
  Send,
  Loader2,
  Download,
  CheckCircle2,
  MessageSquarePlus,
  History,
  Copy,
  Pencil,
  Upload,
} from "lucide-react";
import { Lead, LeadStatus, LeadActivityType, STATUS_LIST } from "../types";
import { getLeadStatusTone, StatusBadge } from "@/src/core/ui/badge";
import { Button } from "@/src/core/ui/button";
import { UnderlineTabs } from "@/src/core/ui/segmented-control";
import { lockBodyScroll, unlockBodyScroll, recordModalOpenMetric } from "@/src/core/ui/modal";
import { peekSharedJson, sharedGetJson } from "@/src/core/http/shared-fetch";
import { cn } from "@/src/core/utils/utils";
import {
  ACTIVITY_TYPE_OPTIONS,
  toDatetimeLocalValue,
} from "./lead-detail-constants";
import { LeadDetailAuditTab } from "./LeadDetailAuditTab";

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onEditLead?: (lead: Lead) => void;
  onUpdateStatus: (id: string, newStatus: LeadStatus, reason?: string) => Promise<boolean | void>;
  onReassignSales?: (leadId: string, newSalesId: string, reason: string) => Promise<boolean | void>;
  currentUserRole?: string;
  onLeadMutated?: () => void;
}

type DetailTab = "dossier" | "care" | "audit";

function getInitialSalesList(): Array<{ id: string; name: string; initials: string }> {
  const cached = peekSharedJson("/api/users?role=SALES", 60_000);
  if (cached?.success && Array.isArray(cached.data?.users) && cached.data.users.length > 0) {
    return cached.data.users;
  }
  return [];
}

export const LeadDetailModal = React.memo(function LeadDetailModal({
  lead,
  onClose,
  onEditLead,
  onUpdateStatus,
  onReassignSales,
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

  // Quote Response Tracking State (QD-01 & AC-23)
  const [hasResponded, setHasResponded] = useState<boolean>(
    Boolean(lead?.customerRespondedAt)
  );
  const [responseNote, setResponseNote] = useState<string>(
    lead?.customerResponseNote || ""
  );
  const [isSavingQuoteResponse, setIsSavingQuoteResponse] = useState(false);

  // Follow-up Schedule State
  const [slaDateInput, setSlaDateInput] = useState(() =>
    toDatetimeLocalValue(lead?.nextFollowUpAt)
  );
  const [slaNoteInput, setSlaNoteInput] = useState(() => lead?.nextActionNote || "");
  const [isSavingSla, setIsSavingSla] = useState(false);

  // Reassignment State ("Chuyển kinh doanh khác", AC-12)
  const [showReassignForm, setShowReassignForm] = useState(false);
  const [salesList, setSalesList] = useState<Array<{ id: string; name: string; initials: string }>>(
    getInitialSalesList
  );
  const [newSalesId, setNewSalesId] = useState(() => getInitialSalesList()[0]?.id || "");
  const [reassignReason, setReassignReason] = useState("");
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [isReassigning, setIsReassigning] = useState(false);

  // Care Log State
  const [activityType, setActivityType] = useState<LeadActivityType>("CALL");
  const [activitySummary, setActivitySummary] = useState("");
  const [activityOutcome, setActivityOutcome] = useState("");
  const [activityFollowUp, setActivityFollowUp] = useState("");
  const [isLoggingActivity, setIsLoggingActivity] = useState(false);

  // Attachment Upload State
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const showFeedback = (tone: "success" | "error", text: string) => {
    setFeedbackMsg({ tone, text });
    window.setTimeout(() => {
      setFeedbackMsg((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const refreshLeadDetail = useCallback(async (targetId: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/leads/${targetId}`, { signal });
      const json = await res.json();
      if (!signal?.aborted && json.success && json.data?.lead) {
        const fresh: Lead = json.data.lead;
        setDetailedLead(fresh);
        setSelectedStatus(fresh.status);
        setHasResponded(Boolean(fresh.customerRespondedAt));
        setResponseNote(fresh.customerResponseNote || "");
        setSlaDateInput(toDatetimeLocalValue(fresh.nextFollowUpAt));
        setSlaNoteInput(fresh.nextActionNote || "");
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.warn("Error refreshing lead detail:", err);
      }
    }
  }, []);

  const isLeadOpen = Boolean(lead);
  const leadCode = lead?.code;
  useEffect(() => {
    if (!isLeadOpen) return;
    const openStartMs = typeof performance !== "undefined" ? performance.now() : 0;
    lockBodyScroll();
    recordModalOpenMetric(`Chi tiết Lead ${leadCode || ""}`, openStartMs);

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
      unlockBodyScroll();
    };
  }, [isLeadOpen, leadCode]);

  const prevLeadIdRef = useRef<string | undefined>(lead?.id);
  useEffect(() => {
    if (!lead?.id) return;

    if (prevLeadIdRef.current !== lead.id) {
      prevLeadIdRef.current = lead.id;
      setDetailedLead(lead);
      setSelectedStatus(lead.status || "");
      setHasResponded(Boolean(lead.customerRespondedAt));
      setResponseNote(lead.customerResponseNote || "");
      setShowFailurePrompt(false);
      setShowReassignForm(false);
      setFailureReason("");
      setStatusError(null);
      setReassignError(null);
      setFeedbackMsg(null);
      setActiveTab("dossier");
      setSlaDateInput(toDatetimeLocalValue(lead.nextFollowUpAt));
      setSlaNoteInput(lead.nextActionNote || "");
    }

    // Defer detail fetch until after the 150ms GPU entrance animation completes
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void refreshLeadDetail(lead.id, controller.signal);

      if (salesList.length === 0) {
        sharedGetJson("/api/users?role=SALES", 60_000)
          .then(({ ok, payload }) => {
            if (
              !controller.signal.aborted &&
              ok &&
              payload?.success &&
              Array.isArray(payload.data?.users) &&
              payload.data.users.length > 0
            ) {
              setSalesList(payload.data.users);
              setNewSalesId((prev) => prev || payload.data.users[0].id);
            }
          })
          .catch(() => {});
      }
    }, 170);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lead, refreshLeadDetail, salesList.length]);

  if (!lead || typeof document === "undefined") return null;

  const currentLead = detailedLead || lead;

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
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : "Lỗi cập nhật trạng thái");
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
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : "Lỗi cập nhật trạng thái");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveQuoteResponse = async () => {
    setIsSavingQuoteResponse(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasCustomerResponded: hasResponded,
          customerResponseNote: responseNote.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể lưu trạng thái phản hồi báo giá");
      }
      showFeedback(
        "success",
        hasResponded
          ? "Đã ghi nhận khách hàng đã phản hồi sau báo giá!"
          : "Đã cập nhật trạng thái chờ khách hàng phản hồi báo giá."
      );
      await refreshLeadDetail(currentLead.id);
      onLeadMutated?.();
    } catch (err: unknown) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Lỗi cập nhật phản hồi báo giá"
      );
    } finally {
      setIsSavingQuoteResponse(false);
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
        throw new Error(json.error?.message || "Không thể lưu lịch hẹn");
      }
      showFeedback("success", "Đã cập nhật lịch hẹn chăm sóc tiếp theo!");
      await refreshLeadDetail(currentLead.id);
      onLeadMutated?.();
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Lỗi lưu lịch hẹn");
    } finally {
      setIsSavingSla(false);
    }
  };

  const handleReassign = async () => {
    setReassignError(null);
    if (!newSalesId) {
      setReassignError("Vui lòng chọn nhân viên kinh doanh nhận Lead.");
      return;
    }
    if (!reassignReason.trim()) {
      setReassignError("Bắt buộc nhập lý do chuyển kinh doanh khác.");
      return;
    }
    if (!onReassignSales) return;
    setIsReassigning(true);
    try {
      await onReassignSales(currentLead.id, newSalesId, reassignReason.trim());
      setReassignReason("");
      setShowReassignForm(false);
      await refreshLeadDetail(currentLead.id);
    } catch (err: unknown) {
      setReassignError(
        err instanceof Error ? err.message : "Không thể chuyển kinh doanh phụ trách"
      );
    } finally {
      setIsReassigning(false);
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingFile(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const data = new FormData();
        data.append("file", files[i]);
        data.append("leadId", currentLead.id);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: data,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Không thể tải tệp đính kèm");
        }
      }
      showFeedback("success", "Đã tải lên tài liệu đính kèm thành công!");
      await refreshLeadDetail(currentLead.id);
      onLeadMutated?.();
    } catch (err: unknown) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Lỗi tải tài liệu đính kèm"
      );
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
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
    } catch (err: unknown) {
      showFeedback("error", err instanceof Error ? err.message : "Không thể lưu nhật ký");
    } finally {
      setIsLoggingActivity(false);
    }
  };

  const statusTimeline = currentLead.statusHistory || [];
  const assignmentTimeline = currentLead.assignments || [];
  const attachments = currentLead.attachments || [];
  const activities = currentLead.activities || [];

  return createPortal(
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết Lead ${currentLead.code}`}
    >
      {/* Centered Enterprise Modal Dialog (GPU-composited .modal-panel + .animate-scale-in) */}
      <div
        className="modal-panel w-full max-w-3xl max-h-[88vh] my-auto bg-elevated border border-slate-200 rounded-2xl shadow-floating flex flex-col overflow-hidden animate-scale-in"
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
                {currentLead.isDuplicate && (
                  <StatusBadge tone="warning" size="sm" dot={false}>
                    Cảnh báo trùng SĐT
                  </StatusBadge>
                )}
                {isLoadingDetail && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
              </div>

              <h2 className="text-[18px] font-semibold text-slate-900 tracking-[-0.015em] break-words">
                {currentLead.customerName}
              </h2>
              {currentLead.companyName && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 break-words">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{currentLead.companyName}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onEditLead && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Pencil className="w-3.5 h-3.5" />}
                  onClick={() => onEditLead(currentLead)}
                >
                  Chỉnh sửa
                </Button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng bảng chi tiết Lead"
                className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <UnderlineTabs
            value={activeTab}
            onChange={setActiveTab}
            className="border-b-0"
            options={[
              { id: "dossier", label: "Hồ sơ & Tiến độ", icon: <FileText className="w-3.5 h-3.5" /> },
              {
                id: "care",
                label: "Nhật ký CSKH",
                count: activities.length,
                icon: <MessageSquarePlus className="w-3.5 h-3.5" />,
              },
              {
                id: "audit",
                label: "Lịch sử & Bàn giao",
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

          {/* ================= TAB 1: HỒ SƠ & TIẾN ĐỘ ================= */}
          {activeTab === "dossier" && (
            <>
              {/* 1. TRẠNG THÁI BÁN HÀNG & PHẢN HỒI BÁO GIÁ */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                  1. Trạng thái bán hàng &amp; Phản hồi báo giá
                </h3>
                <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-medium text-slate-900">
                        Cập nhật trạng thái xử lý Lead
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mọi thay đổi đều tự động lưu vào lịch sử kiểm toán.
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
                            Nêu rõ nguyên nhân khách hàng không chốt để phục vụ thống kê báo cáo.
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

                  {/* Quote Sent & Customer Response Tracking (QD-01, AC-23) */}
                  {(currentLead.status === "Đã gửi báo giá" || currentLead.quoteSentAt) && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-800">
                          Theo dõi phản hồi của khách hàng sau khi gửi báo giá:
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded border text-[11px] font-semibold",
                            hasResponded
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-amber-50 border-amber-200 text-amber-800"
                          )}
                        >
                          {hasResponded
                            ? "Khách hàng đã phản hồi"
                            : "Đã gửi báo giá — Chưa ghi nhận phản hồi"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <select
                          value={hasResponded ? "responded" : "waiting"}
                          onChange={(e) => setHasResponded(e.target.value === "responded")}
                          aria-label="Trạng thái phản hồi sau báo giá"
                          className="crm-select w-full bg-white text-xs"
                        >
                          <option value="waiting">Chưa ghi nhận phản hồi từ khách</option>
                          <option value="responded">Khách hàng đã phản hồi báo giá</option>
                        </select>

                        <input
                          type="text"
                          value={responseNote}
                          onChange={(e) => setResponseNote(e.target.value)}
                          placeholder="Ghi chú nội dung phản hồi của khách hàng..."
                          className="crm-input bg-white text-xs"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={isSavingQuoteResponse}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          onClick={handleSaveQuoteResponse}
                        >
                          Lưu trạng thái phản hồi báo giá
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. LỊCH HẸN CHĂM SÓC TIẾP THEO */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                    2. Lịch hẹn chăm sóc tiếp theo
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        applyQuickSlaOffset(2, "Gọi lại trao đổi nhu cầu chi tiết")
                      }
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                    >
                      +2 Giờ
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyQuickSlaOffset(24, "Theo dõi tiến độ gửi báo giá cho khách")
                      }
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                    >
                      +1 Ngày
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyQuickSlaOffset(72, "Theo dõi phản hồi sau báo giá của khách")
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
                        Thời điểm liên hệ tiếp theo
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
                        Nội dung công việc cần thực hiện
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
                  <div className="flex justify-end pt-1">
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isSavingSla}
                      onClick={handleSaveSla}
                    >
                      Lưu lịch hẹn
                    </Button>
                  </div>
                </div>
              </section>

              {/* 3. THÔNG TIN KHÁCH HÀNG & NHU CẦU SẢN PHẨM */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                  3. Thông tin khách hàng &amp; Nhu cầu sản phẩm
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between gap-2">
                    <div>
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> Số điện thoại
                      </span>
                      <p className="text-[13.5px] font-semibold text-slate-900 font-mono">
                        {currentLead.phone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(currentLead.phone).catch(() => {});
                        showFeedback("success", `Đã sao chép số điện thoại ${currentLead.phone}`);
                      }}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                      title="Sao chép số điện thoại"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Email liên hệ
                    </span>
                    <p className="text-[13.5px] font-medium text-slate-900 break-all">
                      {currentLead.email || "Chưa có thông tin"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Tag className="w-3.5 h-3.5 text-slate-400" /> Nguồn &amp; Kênh liên hệ
                    </span>
                    <p className="text-[13.5px] font-medium text-slate-900">
                      {currentLead.source}
                      {currentLead.contactChannel ? ` · Kênh: ${currentLead.contactChannel}` : ""}
                    </p>
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
                        <span>Danh mục sản phẩm quan tâm</span>
                      </div>
                      <p className="text-[14px] font-semibold text-slate-900">
                        {(currentLead.product || "")
                          .replace(/\s*\([^)]*m²[^)]*\)/gi, "")
                          .trim() || "Chưa chọn sản phẩm"}
                      </p>
                      {currentLead.productCustomText && (
                        <p className="text-xs text-blue-700 font-medium mt-0.5">
                          Mô tả sản phẩm khác: {currentLead.productCustomText}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone="info" dot={false} size="sm">
                        {currentLead.category}
                      </StatusBadge>
                      {currentLead.demandType && (
                        <StatusBadge tone="neutral" dot={false} size="sm">
                          Nhu cầu: {currentLead.demandType}
                        </StatusBadge>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" /> Khu vực &amp; Địa điểm lắp đặt
                    </span>
                    <span className="text-[13px] font-medium text-slate-800">
                      {currentLead.installationAddress ||
                        currentLead.location ||
                        "Chưa có thông tin địa điểm"}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" /> Ghi chú nhu cầu khách hàng
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {(currentLead.notes || "")
                        .replace(/\[AI Bóc tách nhanh\]\s*(Nội dung gốc:\s*)?/gi, "")
                        .trim() || "Chưa có ghi chú bổ sung."}
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. SALES PHỤ TRÁCH & CHUYỂN KINH DOANH KHÁC (AC-12) */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                    4. Nhân sự Kinh doanh phụ trách
                  </h3>
                  {onReassignSales && (
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showReassignForm}
                        onChange={(e) => {
                          setShowReassignForm(e.target.checked);
                          setReassignError(null);
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Chuyển kinh doanh khác</span>
                    </label>
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
                            Nhân viên kinh doanh nhận Lead <span className="text-rose-500">*</span>
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
                            Lý do chuyển kinh doanh <span className="text-rose-500">*</span>
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
                      {reassignError && (
                        <p className="text-xs font-medium text-rose-600">{reassignError}</p>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowReassignForm(false);
                            setReassignError(null);
                          }}
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
                          Xác nhận chuyển kinh doanh
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 5. TÀI LIỆU ĐÍNH KÈM */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
                    5. Tài liệu &amp; Tệp đính kèm ({attachments.length})
                  </h3>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-blue-600 cursor-pointer">
                    {isUploadingFile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{isUploadingFile ? "Đang tải lên..." : "Thêm tệp đính kèm"}</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleUploadAttachment}
                      disabled={isUploadingFile}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="p-4 rounded-xl border border-slate-200/90 bg-white">
                  {attachments.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Chưa có tài liệu hoặc bản vẽ đính kèm.</span>
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

          {/* ================= TAB 2: NHẬT KÝ CHĂM SÓC ================= */}
          {activeTab === "care" && (
            <div className="space-y-6">
              <form
                onSubmit={handleLogActivity}
                className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3.5"
              >
                <h3 className="text-[14px] font-semibold text-slate-900">
                  Ghi nhận tương tác chăm sóc khách hàng
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
                    Nội dung trao đổi với khách hàng *
                  </label>
                  <textarea
                    id="care-summary"
                    rows={2}
                    required
                    placeholder="VD: Đã trao đổi nhu cầu màn hình LED hội trường, khách hẹn gửi mặt bằng..."
                    value={activitySummary}
                    onChange={(e) => setActivitySummary(e.target.value)}
                    className="crm-textarea text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="care-outcome" className="crm-label text-xs">
                      Kết quả / Phản hồi của khách hàng
                    </label>
                    <input
                      id="care-outcome"
                      type="text"
                      placeholder="VD: Khách đề nghị gửi catalogue và phương án kỹ thuật"
                      value={activityOutcome}
                      onChange={(e) => setActivityOutcome(e.target.value)}
                      className="crm-input text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="care-followup" className="crm-label text-xs">
                      Đặt lịch liên hệ lại tiếp theo (Tùy chọn)
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

          {/* ================= TAB 3: LỊCH SỬ & BÀN GIAO ================= */}
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
          {onEditLead && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => onEditLead(currentLead)}
            >
              Chỉnh sửa hồ sơ
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
});
