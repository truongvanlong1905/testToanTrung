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
  User,
  DollarSign,
  Tag,
  CheckCircle2,
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
  const [activeTab, setActiveTab] = useState<"info" | "history" | "assign" | "files">("info");
  const [detailedLead, setDetailedLead] = useState<Lead | null>(lead);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Status Change State
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | "">(lead?.status || "");
  const [failureReason, setFailureReason] = useState("");
  const [showFailurePrompt, setShowFailurePrompt] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Reassignment State
  const [salesList, setSalesList] = useState<Array<{ id: string; name: string; initials: string }>>([]);
  const [newSalesId, setNewSalesId] = useState("");
  const [reassignReason, setReassignReason] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    setDetailedLead(lead);
    setSelectedStatus(lead?.status || "");
    setShowFailurePrompt(false);
    setFailureReason("");
    setStatusError(null);

    // Fetch full details with statusHistory and assignments
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

      // Fetch sales list
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
    } catch (err: any) {
      setStatusError(err.message || "Lỗi cập nhật trạng thái");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmFailure = async () => {
    if (!failureReason.trim()) {
      setStatusError("Bắt buộc phải nhập lý do khi chuyển trạng thái Thất bại!");
      return;
    }

    setIsUpdatingStatus(true);
    setStatusError(null);
    try {
      await onUpdateStatus(currentLead.id, "Thất bại", failureReason.trim());
      setShowFailurePrompt(false);
      setSelectedStatus("Thất bại");
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
      setActiveTab("info");
      // Refetch details
      const res = await fetch(`/api/leads/${currentLead.id}`);
      const json = await res.json();
      if (json.success) setDetailedLead(json.data.lead);
    } finally {
      setIsReassigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-md border border-blue-200/60">
              {currentLead.code}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Hồ sơ khách hàng tiềm năng
              </h2>
              <p className="text-xs text-slate-400">
                Toàn Trung Marketing Management • Lưu trữ Database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="px-6 border-b border-slate-100 flex items-center gap-6 text-xs font-medium text-slate-500 bg-white">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === "info"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent hover:text-slate-800"
            }`}
          >
            Thông tin chi tiết
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent hover:text-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Lịch sử trạng thái ({currentLead.statusHistory?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("assign")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "assign"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent hover:text-slate-800"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Chuyển Sales</span>
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "files"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent hover:text-slate-800"
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Tài liệu / Bản vẽ ({currentLead.attachments?.length || 0})</span>
          </button>
        </div>

        {/* Failure Reason Modal / Prompt Overlay */}
        {showFailurePrompt && (
          <div className="bg-rose-50 border-b border-rose-200 p-4 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-bold text-rose-900">
                  Bắt buộc nhập lý do Thất bại (Theo quy định HKDN Toàn Trung)
                </div>
                <p className="text-rose-700 mt-0.5">
                  Vui lòng nêu rõ nguyên nhân (giá cao, khách dời kế hoạch, đối thủ, thay đổi thiết kế...) để lưu vết lịch sử:
                </p>
                <textarea
                  rows={2}
                  placeholder="Nhập lý do thất bại cụ thể..."
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full mt-2 p-2 bg-white border border-rose-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
                {statusError && (
                  <p className="text-rose-600 font-semibold mt-1">{statusError}</p>
                )}
                <div className="mt-2.5 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowFailurePrompt(false);
                      setSelectedStatus(currentLead.status);
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleConfirmFailure}
                    disabled={isUpdatingStatus}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg shadow-sm"
                  >
                    {isUpdatingStatus ? "Đang lưu..." : "Xác nhận Thất bại"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "info" && (
            <>
              {/* Main Info Card */}
              <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {currentLead.customerName}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentLead.companyName}</span>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    Trạng thái:
                  </span>
                  <select
                    value={selectedStatus || currentLead.status}
                    onChange={(e) => handleStatusSelect(e.target.value as LeadStatus)}
                    disabled={isUpdatingStatus}
                    className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {STATUS_LIST.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Số điện thoại</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800 font-mono">
                    {currentLead.phone}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email liên hệ</span>
                  </div>
                  <div className="text-sm font-medium text-slate-800 truncate">
                    {currentLead.email || "Chưa có"}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Khu vực lắp đặt</span>
                  </div>
                  <div className="text-sm font-medium text-slate-800">
                    {currentLead.installationAddress || currentLead.location}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kênh tiếp cận (Nguồn)</span>
                  </div>
                  <div className="text-sm font-medium text-slate-800">
                    {currentLead.source}
                  </div>
                </div>
              </div>

              {/* Product & Budget */}
              <div className="p-4 rounded-xl border border-slate-200/70 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <Tv className="w-4 h-4 text-blue-600" />
                    <span>Nhu cầu sản phẩm LED / Bảng điện tử</span>
                  </div>
                  <span className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200/60">
                    {currentLead.category}
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-900">
                  {currentLead.product}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400">Giá trị dự kiến:</span>
                  <span className="text-emerald-600 font-bold text-sm">
                    {currentLead.estimatedValue}
                  </span>
                </div>
              </div>

              {/* Failure reason note if exists */}
              {currentLead.status === "Thất bại" && currentLead.failureReason && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-800 mb-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Lý do thất bại ghi nhận:</span>
                  </div>
                  <p className="text-xs text-rose-900 leading-relaxed">
                    {currentLead.failureReason}
                  </p>
                </div>
              )}

              {/* Assigned Sales & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nhân viên phụ trách hiện tại</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      {currentLead.salesPerson.initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {currentLead.salesPerson.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Phòng Kinh doanh Toàn Trung
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ngày tiếp nhận</span>
                  </div>
                  <div className="text-sm font-medium text-slate-800">
                    {currentLead.createdAt}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Hệ thống CRM Toàn Trung
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="p-3.5 rounded-xl border border-slate-200/70 bg-white">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ghi chú kỹ thuật & yêu cầu</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {currentLead.notes || "Chưa có ghi chú bổ sung."}
                </p>
              </div>
            </>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Lịch sử thay đổi trạng thái (Audit Trail)
              </h3>
              {(!currentLead.statusHistory || currentLead.statusHistory.length === 0) ? (
                <p className="text-xs text-slate-400 italic">Chưa có lịch sử thay đổi.</p>
              ) : (
                <div className="space-y-2.5">
                  {currentLead.statusHistory.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">
                          {h.fromStatus ? `${h.fromStatus} → ` : ""}
                          <span className="text-blue-600">{h.toStatus}</span>
                        </div>
                        {h.reason && (
                          <p className="text-slate-600 mt-1 italic">
                            Lý do: &ldquo;{h.reason}&rdquo;
                          </p>
                        )}
                        <span className="text-[11px] text-slate-400 block mt-1">
                          Bởi: <strong>{h.changedBy}</strong>
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                        {h.createdAt}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assign Tab (Phase 5 Requirement #11) */}
          {activeTab === "assign" && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <h3 className="font-bold text-slate-800 mb-1">
                  Chuyển giao khách hàng cho Sales khác
                </h3>
                <p className="text-slate-500 mb-3">
                  Người phụ trách hiện tại: <strong>{currentLead.salesPerson.name}</strong>
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Chọn Sales tiếp nhận mới:
                    </label>
                    <select
                      value={newSalesId}
                      onChange={(e) => setNewSalesId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                    >
                      {salesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.initials})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Lý do chuyển bàn giao:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="VD: Chuyển giao do nhân viên đi công tác dự án..."
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                    />
                  </div>

                  <button
                    onClick={handleReassign}
                    disabled={isReassigning}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isReassigning ? "Đang chuyển..." : "Xác nhận chuyển Sales"}</span>
                  </button>
                </div>
              </div>

              {/* Past assignments history */}
              {currentLead.assignments && currentLead.assignments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700">Lịch sử bàn giao:</h4>
                  {currentLead.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 flex justify-between"
                    >
                      <div>
                        <span>
                          {a.fromSales ? `${a.fromSales} → ` : ""}
                          <strong>{a.toSales}</strong>
                        </span>
                        {a.reason && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">
                            Lý do: {a.reason}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {a.createdAt}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {activeTab === "files" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Tài liệu & Bản vẽ đính kèm ({currentLead.attachments?.length || 0})
              </h3>
              {(!currentLead.attachments || currentLead.attachments.length === 0) ? (
                <p className="text-xs text-slate-400 italic">Chưa có tài liệu đính kèm nào.</p>
              ) : (
                <div className="space-y-2">
                  {currentLead.attachments.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-semibold text-slate-800">{file.fileName}</div>
                          <div className="text-[10px] text-slate-400">
                            Loại: {file.fileType} • Tải lên ngày {file.createdAt}
                          </div>
                        </div>
                      </div>
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Mở file</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Trạng thái hiện tại:{" "}
            <strong className="text-slate-700">{currentLead.status}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Đóng
            </button>
            <a
              href={`tel:${currentLead.phone}`}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Gọi điện</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
