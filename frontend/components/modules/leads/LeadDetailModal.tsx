"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { Lead, LeadStatus } from "@/types/lead";
import { STATUS_LIST } from "@/data/mockLeads";
import { getLeadStatusTone, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: LeadStatus, reason?: string) => Promise<boolean | void>;
  onReassignSales?: (leadId: string, newSalesId: string, reason: string) => Promise<boolean | void>;
}

export function LeadDetailModal({
  lead,
  onClose,
  onUpdateStatus,
  onReassignSales,
}: LeadDetailModalProps) {
  const [detailedLead, setDetailedLead] = useState<Lead | null>(lead);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Status Change State
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | "">(lead?.status || "");
  const [failureReason, setFailureReason] = useState("");
  const [showFailurePrompt, setShowFailurePrompt] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Reassignment State
  const [showReassignForm, setShowReassignForm] = useState(false);
  const [salesList, setSalesList] = useState<Array<{ id: string; name: string; initials: string }>>([]);
  const [newSalesId, setNewSalesId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (lead) {
      window.addEventListener("keydown", handleEsc);
      // Keep the page behind the sheet from scrolling while it is open
      document.body.classList.add("overflow-locked");
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.classList.remove("overflow-locked");
    };
  }, [lead, onClose]);

  useEffect(() => {
    setDetailedLead(lead);
    setSelectedStatus(lead?.status || "");
    setShowFailurePrompt(false);
    setShowReassignForm(false);
    setFailureReason("");
    setStatusError(null);

    if (lead?.id) {
      setIsLoadingDetail(true);
      fetch(`/api/leads/${lead.id}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.lead) {
            setDetailedLead(json.data.lead);
          }
        })
        .catch((err) => console.warn("Error fetching lead details:", err))
        .finally(() => setIsLoadingDetail(false));

      fetch("/api/users?role=SALES")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.users) {
            setSalesList(json.data.users);
            if (json.data.users.length > 0) {
              setNewSalesId(json.data.users[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [lead]);

  if (!lead) return null;

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
      const res = await fetch(`/api/leads/${currentLead.id}`);
      const json = await res.json();
      if (json.success) setDetailedLead(json.data.lead);
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
      const res = await fetch(`/api/leads/${currentLead.id}`);
      const json = await res.json();
      if (json.success) setDetailedLead(json.data.lead);
    } catch (err: any) {
      setStatusError(err.message || "Lỗi cập nhật trạng thái");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReassign = async () => {
    if (!newSalesId || !onReassignSales) return;
    setIsReassigning(true);
    try {
      await onReassignSales(currentLead.id, newSalesId, reassignReason);
      setReassignReason("");
      setShowReassignForm(false);
      const res = await fetch(`/api/leads/${currentLead.id}`);
      const json = await res.json();
      if (json.success) setDetailedLead(json.data.lead);
    } finally {
      setIsReassigning(false);
    }
  };

  const statusTimeline = currentLead.statusHistory || [];
  const assignmentTimeline = currentLead.assignments || [];
  const attachments = currentLead.attachments || [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết Lead ${currentLead.code}`}
    >
      {/* Right Slide-Over Sheet */}
      <div
        className="w-full max-w-2xl h-full bg-elevated border-l border-slate-200 shadow-floating flex flex-col overflow-hidden animate-sheet-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-start justify-between gap-4 bg-white shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                {currentLead.code}
              </span>
              <StatusBadge tone={getLeadStatusTone(currentLead.status)}>
                {currentLead.status}
              </StatusBadge>
              {isLoadingDetail && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
            </div>
            <h2 className="text-[18px] font-semibold text-slate-900 tracking-[-0.015em] truncate">
              {currentLead.customerName}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{currentLead.companyName}</span>
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

        {/* Scrollable Structured 6-Section Dossier */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* SECTION 1: TRẠNG THÁI */}
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

              {/* Mandatory Failure Reason Prompt */}
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
                  <span className="font-semibold text-rose-900">Lý do thất bại đã ghi nhận: </span>
                  <span className="text-rose-800">{currentLead.failureReason}</span>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 2: THÔNG TIN KHÁCH HÀNG */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
              2. Thông tin khách hàng
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
          </section>

          {/* SECTION 3: THÔNG TIN DỰ ÁN */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
              3. Thông tin dự án
            </h3>
            <div className="p-4 rounded-xl border border-slate-200/90 bg-white space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Tv className="w-3.5 h-3.5 text-blue-600" />
                    <span>Hạng mục sản phẩm / Giải pháp</span>
                  </div>
                  <p className="text-[14px] font-semibold text-slate-900">{currentLead.product}</p>
                </div>
                <StatusBadge tone="info" dot={false} size="sm">
                  {currentLead.category}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Giá trị dự toán</span>
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

          {/* SECTION 4: SALES PHỤ TRÁCH */}
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

          {/* SECTION 5: TIMELINE (LỊCH SỬ TRẠNG THÁI & BÀN GIAO) */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
              5. Timeline ({statusTimeline.length + assignmentTimeline.length})
            </h3>
            <div className="p-4 rounded-xl border border-slate-200/90 bg-white">
              {statusTimeline.length === 0 && assignmentTimeline.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  Chưa phát sinh lịch sử thay đổi trạng thái hoặc bàn giao nhân sự.
                </p>
              ) : (
                <div className="space-y-3">
                  {statusTimeline.map((h) => (
                    <div
                      key={`st-${h.id}`}
                      className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-slate-800">
                            {h.fromStatus ? `${h.fromStatus} → ` : "Khởi tạo → "}
                            <span className="font-semibold text-blue-600">{h.toStatus}</span>
                          </p>
                          {h.reason && (
                            <p className="text-slate-600 mt-0.5">Lý do: &ldquo;{h.reason}&rdquo;</p>
                          )}
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Thực hiện bởi: {h.changedBy}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {h.createdAt}
                      </span>
                    </div>
                  ))}

                  {assignmentTimeline.map((a) => (
                    <div
                      key={`as-${a.id}`}
                      className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-slate-800">
                            Bàn giao: {a.fromSales ? `${a.fromSales} → ` : ""}
                            <span className="font-semibold text-slate-900">{a.toSales}</span>
                          </p>
                          {a.reason && (
                            <p className="text-slate-600 mt-0.5">Ghi chú: {a.reason}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {a.createdAt}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* SECTION 6: TÀI LIỆU */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
              6. Tài liệu &amp; Bản vẽ ({attachments.length})
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
        </div>

        {/* Sheet Sticky Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
          <Button variant="secondary" size="md" onClick={onClose}>
            Đóng
          </Button>
          <a
            href={`tel:${currentLead.phone}`}
            className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium inline-flex items-center gap-2 transition-colors shadow-[0_1px_2px_rgba(37,99,235,0.18)]"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Gọi khách hàng ({currentLead.phone})</span>
          </a>
        </div>
      </div>
    </div>
  );
}
