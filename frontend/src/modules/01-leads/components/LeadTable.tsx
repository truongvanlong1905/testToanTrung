"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  MapPin,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Users2,
  MessageSquareText,
} from "lucide-react";
import { Lead, LeadStatus } from "../types";
import { cn } from "@/src/core/utils/utils";
import { getLeadStatusTone, StatusBadge } from "@/src/core/ui/badge";
import { Button } from "@/src/core/ui/button";
import { EmptyState } from "@/src/core/ui/feedback-states";
import { SegmentedControl } from "@/src/core/ui/segmented-control";

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onEditLead?: (lead: Lead) => void;
  onCreateLead?: () => void;
  onQuickUpdateStatus?: (lead: Lead, newStatus: LeadStatus) => void;
  hasActiveFilters?: boolean;
  itemsPerPage?: number;
}

type SortField = "code" | "customerName" | "status" | "createdAt";
type SortOrder = "asc" | "desc";

const STATUS_SORT_RANK: Record<LeadStatus, number> = {
  "Vừa nhận thông tin": 1,
  "Đang soạn báo giá": 2,
  "Đã gửi báo giá": 3,
  "Chốt thành công": 4,
  "Thất bại": 5,
};

const KANBAN_COLUMNS: Array<{
  status: LeadStatus;
  dot: string;
  accent: string;
}> = [
  { status: "Vừa nhận thông tin", dot: "bg-slate-400", accent: "border-t-slate-400" },
  { status: "Đang soạn báo giá", dot: "bg-amber-500", accent: "border-t-amber-500" },
  { status: "Đã gửi báo giá", dot: "bg-blue-500", accent: "border-t-blue-500" },
  { status: "Chốt thành công", dot: "bg-emerald-500", accent: "border-t-emerald-500" },
  { status: "Thất bại", dot: "bg-rose-500", accent: "border-t-rose-500" },
];

function normalizePhone(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

function parseDateValue(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const d = new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  const parsed = new Date(dateStr).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export const LeadTable = React.memo(function LeadTable({
  leads,
  onSelectLead,
  onEditLead,
  onCreateLead,
  onQuickUpdateStatus,
  hasActiveFilters = false,
  itemsPerPage = 10,
}: LeadTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(
    null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenuId]);

  // Automatic Duplicate Detection (from backend `isDuplicate` + local normalizedPhone check)
  const duplicateIds = useMemo(() => {
    const phoneCounts = new Map<string, number>();
    leads.forEach((l) => {
      const p = l.normalizedPhone || normalizePhone(l.phone);
      if (p.length >= 8) phoneCounts.set(p, (phoneCounts.get(p) || 0) + 1);
    });

    const dupSet = new Set<string>();
    leads.forEach((l) => {
      const p = l.normalizedPhone || normalizePhone(l.phone);
      if (l.isDuplicate || (p && (phoneCounts.get(p) || 0) > 1)) {
        dupSet.add(l.id);
      }
    });
    return dupSet;
  }, [leads]);

  const sortedLeads = useMemo(() => {
    if (!sortField) return leads;
    const cloned = [...leads];
    cloned.sort((a, b) => {
      let cmp = 0;
      if (sortField === "code") {
        cmp = a.code.localeCompare(b.code, "vi");
      } else if (sortField === "customerName") {
        cmp = a.customerName.localeCompare(b.customerName, "vi");
      } else if (sortField === "status") {
        cmp = (STATUS_SORT_RANK[a.status] || 99) - (STATUS_SORT_RANK[b.status] || 99);
      } else if (sortField === "createdAt") {
        cmp = parseDateValue(a.createdAt) - parseDateValue(b.createdAt);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return cloned;
  }, [leads, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600" />
    );
  };

  const handleCopyPhone = (lead: Lead) => {
    navigator.clipboard?.writeText(lead.phone).catch(() => {});
    setCopiedId(lead.id);
    window.setTimeout(() => setCopiedId(null), 1500);
    setOpenMenuId(null);
  };

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * itemsPerPage;
  const currentLeads = sortedLeads.slice(startIndex, startIndex + itemsPerPage);

  if (leads.length === 0) {
    return (
      <div className="crm-card">
        <EmptyState
          icon={Users2}
          title={
            hasActiveFilters
              ? "Không tìm thấy Lead phù hợp"
              : "Chưa có khách hàng tiềm năng nào"
          }
          description={
            hasActiveFilters
              ? "Không có hồ sơ nào khớp với điều kiện lọc hiện tại. Hãy thử thay đổi từ khóa hoặc đặt lại bộ lọc."
              : "Khởi tạo khách hàng tiềm năng đầu tiên để quản lý tiến độ tư vấn, báo giá và bàn giao nhân sự kinh doanh."
          }
          action={
            !hasActiveFilters && onCreateLead ? (
              <Button
                variant="primary"
                size="md"
                onClick={onCreateLead}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Thêm Lead đầu tiên
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const renderSortableTh = (field: SortField, label: string, className?: string) => (
    <th
      className={className}
      aria-sort={
        sortField === field ? (sortOrder === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-[0.05em] hover:text-slate-900 group cursor-pointer",
          sortField === field && "text-slate-900"
        )}
      >
        <span>{label}</span>
        {renderSortIcon(field)}
      </button>
    </th>
  );

  return (
    <div className="space-y-3">
      {/* Compact Header Bar: Count + Duplicate Alert (only when duplicates exist) + View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>
            Tổng cộng <strong className="font-semibold text-slate-900 kpi-number">{leads.length}</strong> hồ sơ Lead
          </span>
          {duplicateIds.size > 0 && (
            <StatusBadge tone="warning" dot={false}>
              <AlertTriangle className="w-3.5 h-3.5 mr-1 inline" />
              Cảnh báo {duplicateIds.size} hồ sơ trùng SĐT
            </StatusBadge>
          )}
        </div>

        <SegmentedControl
          size="sm"
          ariaLabel="Chế độ hiển thị"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { id: "table", label: "Bảng dữ liệu" },
            { id: "kanban", label: "Kanban" },
          ]}
        />
      </div>

      {viewMode === "table" ? (
        <div className="crm-card overflow-hidden animate-fade-in">
          {/* Mobile Card List (< 768px) */}
          <div className="md:hidden divide-y divide-slate-100">
            {currentLeads.map((lead) => {
              const isDup = duplicateIds.has(lead.id);

              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className={cn(
                    "p-3.5 space-y-2.5 cursor-pointer hover:bg-slate-50/70 transition-colors",
                    isDup && "bg-amber-50/35"
                  )}
                >
                  {/* Top row: Code + Duplicate + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs font-medium text-slate-500">
                        {lead.code}
                      </span>
                      {isDup && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-medium">
                          Trùng SĐT
                        </span>
                      )}
                    </div>
                    <StatusBadge tone={getLeadStatusTone(lead.status)} size="sm">
                      {lead.status}
                    </StatusBadge>
                  </div>

                  {/* Customer & Company */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-slate-900 break-words">
                        {lead.customerName}
                      </div>
                      {lead.companyName && (
                        <div className="text-xs text-slate-500 break-words mt-0.5">
                          {lead.companyName}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-semibold text-slate-800">
                        {lead.phone}
                      </div>
                      <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                        {lead.createdAt}
                      </div>
                    </div>
                  </div>

                  {/* Product & Demand */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <span className="font-medium break-words">
                      {lead.product}
                      {lead.productCustomText ? ` (${lead.productCustomText})` : ""}
                    </span>
                    {lead.demandType && lead.demandType !== "Chưa xác định" && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10.5px] font-medium">
                        {lead.demandType}
                      </span>
                    )}
                    {lead.location && (
                      <span className="text-slate-500 inline-flex items-center gap-0.5 ml-auto">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{lead.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom bar: Source + Sales + Quick Edit */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-medium">
                        {lead.source}
                      </span>
                      {lead.contactChannel && (
                        <span className="text-[11px] text-slate-500">· {lead.contactChannel}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-600 font-medium">
                        {lead.salesPerson.name}
                      </span>
                      {onEditLead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditLead(lead);
                          }}
                          className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[11px]"
                        >
                          Sửa
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (>= 768px) — compact layout without horizontal scroll */}
          <div className="hidden md:block">
            <table className="crm-table w-full table-fixed">
              <thead>
                <tr>
                  {renderSortableTh("code", "Mã Lead", "w-[108px]")}
                  {renderSortableTh("customerName", "Khách hàng & Đơn vị", "w-[18%]")}
                  <th className="w-[125px]">Số điện thoại</th>
                  <th className="w-[22%]">Sản phẩm &amp; Nhu cầu</th>
                  <th className="w-[115px]">Nguồn &amp; Kênh</th>
                  {renderSortableTh("status", "Trạng thái", "w-[150px]")}
                  <th className="w-[135px]">Sales phụ trách</th>
                  {renderSortableTh("createdAt", "Ngày tạo", "w-[92px]")}
                  <th className="w-[96px] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {currentLeads.map((lead) => {
                  const isDup = duplicateIds.has(lead.id);
                  const isMenuOpen = openMenuId === lead.id;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className={cn(
                        "cursor-pointer group",
                        isDup && "bg-amber-50/35 hover:bg-amber-50/70"
                      )}
                    >
                      {/* Code */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-mono text-xs font-medium text-slate-600">
                            {lead.code}
                          </span>
                          {isDup && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-medium"
                              title="Cảnh báo trùng số điện thoại trong hệ thống"
                            >
                              Trùng SĐT
                            </span>
                          )}
                          {(lead.activitiesCount ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-400">
                              <MessageSquareText className="w-3 h-3" />
                              {lead.activitiesCount} CSKH
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer & Company */}
                      <td className="py-2.5 px-3 align-top whitespace-normal break-words">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                          {lead.customerName}
                        </div>
                        {lead.companyName && (
                          <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                            {lead.companyName}
                          </div>
                        )}
                        {lead.location && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{lead.location}</span>
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs font-medium text-slate-800">
                            {lead.phone}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyPhone(lead);
                            }}
                            title="Sao chép số điện thoại"
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 cursor-pointer"
                          >
                            {copiedId === lead.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {lead.email && (
                          <div className="text-[11px] text-slate-400 break-all mt-0.5">
                            {lead.email}
                          </div>
                        )}
                      </td>

                      {/* Product & Demand */}
                      <td className="py-2.5 px-3 align-top whitespace-normal break-words">
                        <div className="font-medium text-slate-800 leading-snug">
                          {lead.product}
                        </div>
                        {lead.productCustomText && (
                          <div className="text-xs text-blue-700 mt-0.5">
                            Chi tiết: {lead.productCustomText}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[11px] text-slate-500">{lead.category}</span>
                          {lead.demandType && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10.5px] font-medium">
                              Nhu cầu: {lead.demandType}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Source & Contact Channel */}
                      <td className="py-2.5 px-3 align-top whitespace-normal break-words">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-medium">
                          {lead.source}
                        </span>
                        {lead.contactChannel && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            Kênh: {lead.contactChannel}
                          </div>
                        )}
                      </td>

                      {/* Status & Quote Response Tracking */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge tone={getLeadStatusTone(lead.status)}>
                            {lead.status}
                          </StatusBadge>
                          {lead.status === "Đã gửi báo giá" && (
                            <span
                              className={cn(
                                "text-[10.5px] px-1.5 py-0.5 rounded border font-medium",
                                lead.customerRespondedAt
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                  : "bg-amber-50 border-amber-200 text-amber-700"
                              )}
                            >
                              {lead.customerRespondedAt ? "Đã phản hồi" : "Chưa phản hồi"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sales */}
                      <td className="py-2.5 px-3 align-top whitespace-normal break-words">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold flex items-center justify-center shrink-0">
                            {lead.salesPerson.initials}
                          </span>
                          <span className="text-xs text-slate-700 font-medium leading-snug">
                            {lead.salesPerson.name}
                          </span>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-2.5 px-3 align-top text-xs text-slate-500 font-mono">
                        {lead.createdAt}
                      </td>

                      {/* Row Actions: View + Edit + More Menu */}
                      <td
                        className="py-2.5 px-2.5 text-right align-top whitespace-nowrap relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center justify-end gap-1">
                          {onEditLead && (
                            <button
                              type="button"
                              onClick={() => onEditLead(lead)}
                              title={`Chỉnh sửa ${lead.customerName}`}
                              aria-label={`Chỉnh sửa ${lead.customerName}`}
                              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              if (isMenuOpen) {
                                setOpenMenuId(null);
                                return;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              const upward = window.innerHeight - rect.bottom < 260;
                              setMenuPos({
                                right: Math.max(8, window.innerWidth - rect.right),
                                top: upward ? undefined : rect.bottom + 4,
                                bottom: upward ? window.innerHeight - rect.top + 4 : undefined,
                              });
                              setOpenMenuId(lead.id);
                            }}
                            aria-label={`Thao tác cho ${lead.customerName}`}
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            className={cn(
                              "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer",
                              isMenuOpen
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                            )}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>

                        {isMenuOpen && menuPos && (
                          <>
                            <button
                              type="button"
                              aria-label="Đóng menu thao tác"
                              className="fixed inset-0 z-40 cursor-default"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div
                              className="fixed z-50 w-52 rounded-xl border border-slate-200 bg-elevated shadow-floating p-1 text-left text-xs animate-dropdown-in"
                              style={{ top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right }}
                              role="menu"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onSelectLead(lead);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400" />
                                Xem chi tiết &amp; Lịch sử
                              </button>
                              {onEditLead && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    onEditLead(lead);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                  Chỉnh sửa thông tin
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(lead)}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                Sao chép SĐT ({lead.phone})
                              </button>

                              {onQuickUpdateStatus && (
                                <>
                                  <div className="my-1 border-t border-slate-100" />
                                  <div className="px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                                    Chuyển nhanh trạng thái
                                  </div>
                                  {(
                                    [
                                      "Đang soạn báo giá",
                                      "Đã gửi báo giá",
                                      "Chốt thành công",
                                    ] as LeadStatus[]
                                  )
                                    .filter((st) => st !== lead.status)
                                    .map((st) => (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          onQuickUpdateStatus(lead, st);
                                        }}
                                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                                      >
                                        → {st}
                                      </button>
                                    ))}
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Hiển thị{" "}
              <strong className="kpi-number font-semibold text-slate-900">
                {sortedLeads.length > 0 ? startIndex + 1 : 0}–
                {Math.min(startIndex + itemsPerPage, sortedLeads.length)}
              </strong>{" "}
              trong tổng số{" "}
              <strong className="kpi-number font-semibold text-slate-900">
                {sortedLeads.length}
              </strong>{" "}
              hồ sơ
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validPage === 1}
                className="h-7 w-7 inline-flex items-center justify-center border border-slate-200 bg-white rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600 cursor-pointer"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, validPage - 3), Math.min(totalPages, validPage + 2))
                .map((page) => (
                  <button
                    type="button"
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "h-7 min-w-[28px] px-1.5 rounded-md text-xs kpi-number font-medium transition-colors cursor-pointer",
                      validPage === page
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {page}
                  </button>
                ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validPage === totalPages}
                className="h-7 w-7 inline-flex items-center justify-center border border-slate-200 bg-white rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600 cursor-pointer"
                aria-label="Trang tiếp"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 5-Column Kanban Pipeline View */
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3.5 overflow-x-auto pb-2">
          {KANBAN_COLUMNS.map((col) => {
            const colLeads = sortedLeads.filter((l) => l.status === col.status);
            return (
              <div
                key={col.status}
                className={cn(
                  "crm-card flex flex-col min-h-[420px] overflow-hidden border-t-[3px]",
                  col.accent
                )}
              >
                <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", col.dot)} />
                    <h3 className="text-[12.5px] font-semibold text-slate-900 truncate">
                      {col.status}
                    </h3>
                  </div>
                  <span className="text-[11px] kpi-number font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-600 shrink-0">
                    {colLeads.length}
                  </span>
                </div>

                <div className="p-2.5 space-y-2 flex-1 overflow-y-auto max-h-[580px] bg-slate-50/30">
                  {colLeads.length > 0 ? (
                    colLeads.map((lead) => {
                      const isDup = duplicateIds.has(lead.id);
                      return (
                        <div
                          key={lead.id}
                          onClick={() => onSelectLead(lead)}
                          className={cn(
                            "p-3 rounded-lg bg-white border hover:border-blue-400 transition-colors cursor-pointer space-y-2 group",
                            isDup ? "border-amber-300" : "border-slate-200/90"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-medium text-slate-500">
                              {lead.code}
                            </span>
                            {isDup && (
                              <StatusBadge tone="warning" dot={false} size="sm">
                                Trùng SĐT
                              </StatusBadge>
                            )}
                          </div>

                          <div>
                            <div className="text-[13px] font-semibold text-slate-900 group-hover:text-blue-600 leading-snug">
                              {lead.customerName}
                            </div>
                            {lead.companyName && (
                              <div className="text-xs text-slate-500 break-words mt-0.5">
                                {lead.companyName}
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100">
                            <span>{lead.product}</span>
                            {lead.demandType && lead.demandType !== "Chưa xác định" && (
                              <span className="ml-1.5 font-semibold text-blue-700">
                                ({lead.demandType})
                              </span>
                            )}
                          </div>

                          <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-100">
                            <span className="font-mono text-[11.5px] text-slate-600">
                              {lead.phone}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {lead.location && (
                                <span className="text-[11px] text-slate-400 flex items-center gap-0.5 truncate max-w-[95px]">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{lead.location}</span>
                                </span>
                              )}
                              <span
                                className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[9.5px] font-semibold flex items-center justify-center shrink-0"
                                title={lead.salesPerson.name}
                              >
                                {lead.salesPerson.initials}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="m-1 py-8 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      Chưa có hồ sơ ở bước này
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
