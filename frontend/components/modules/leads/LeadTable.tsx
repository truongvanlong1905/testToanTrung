"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Phone,
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
  Flame,
  Clock,
  FileSignature,
  Maximize2,
  MessageSquareText,
} from "lucide-react";
import { Lead, LeadStatus } from "@/types/lead";
import { parseEstimatedVnd } from "@/lib/lead-value";
import { cn } from "@/lib/utils";
import { getLeadStatusTone, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback-states";
import { SegmentedControl } from "@/components/ui/segmented-control";

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onCreateLead?: () => void;
  onQuickUpdateStatus?: (lead: Lead, newStatus: LeadStatus) => void;
  hasActiveFilters?: boolean;
  itemsPerPage?: number;
}

type SortField =
  | "code"
  | "customerName"
  | "priorityScore"
  | "estimatedValue"
  | "status"
  | "createdAt";
type SortOrder = "asc" | "desc";
type TriageMode = "all" | "hot" | "sla" | "director";

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

function normalizeCompany(company: string): string {
  const cleaned = (company || "").trim().toLowerCase();
  if (!cleaned || cleaned.includes("cá nhân") || cleaned === "khách lẻ") return "";
  return cleaned;
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

function renderScoreBadge(lead: Lead) {
  const score = lead.priorityScore ?? 35;
  const tier = lead.priorityTier || (score >= 70 ? "HOT" : score >= 40 ? "WARM" : "COLD");

  if (tier === "HOT") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200/80 text-rose-700 text-[11px] font-semibold kpi-number">
        <Flame className="w-3 h-3 text-rose-600 shrink-0" />
        HOT · {score}đ
      </span>
    );
  }
  if (tier === "WARM") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-amber-700 text-[11px] font-semibold kpi-number">
        WARM · {score}đ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-slate-600 text-[11px] font-medium kpi-number">
      COLD · {score}đ
    </span>
  );
}

function renderSlaPill(lead: Lead) {
  const slaStatus = lead.slaStatus || "ON_TRACK";
  const label = lead.slaLabel || "Đúng tiến độ";

  if (slaStatus === "OVERDUE") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
        <Clock className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[140px]">{label}</span>
      </span>
    );
  }
  if (slaStatus === "DUE_SOON") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
        <Clock className="w-3 h-3 shrink-0" />
        <span className="truncate max-w-[140px]">{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
      <span className="truncate max-w-[140px]">{label}</span>
    </span>
  );
}

export const LeadTable = React.memo(function LeadTable({
  leads,
  onSelectLead,
  onCreateLead,
  onQuickUpdateStatus,
  hasActiveFilters = false,
  itemsPerPage = 10,
}: LeadTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [triageMode, setTriageMode] = useState<TriageMode>("all");
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

  // Automatic Duplicate Detection (Phone / Company)
  const duplicateIds = useMemo(() => {
    const phoneCounts = new Map<string, number>();
    const companyCounts = new Map<string, number>();

    leads.forEach((l) => {
      const p = normalizePhone(l.phone);
      if (p.length >= 8) phoneCounts.set(p, (phoneCounts.get(p) || 0) + 1);
      const c = normalizeCompany(l.companyName);
      if (c) companyCounts.set(c, (companyCounts.get(c) || 0) + 1);
    });

    const dupSet = new Set<string>();
    leads.forEach((l) => {
      const p = normalizePhone(l.phone);
      const c = normalizeCompany(l.companyName);
      if ((p && (phoneCounts.get(p) || 0) > 1) || (c && (companyCounts.get(c) || 0) > 1)) {
        dupSet.add(l.id);
      }
    });
    return dupSet;
  }, [leads]);

  // Enterprise Triage Counts
  const triageCounts = useMemo(() => {
    let hot = 0;
    let sla = 0;
    let director = 0;
    leads.forEach((l) => {
      if (l.priorityTier === "HOT" || (l.priorityScore ?? 0) >= 70) hot += 1;
      if (l.slaStatus === "OVERDUE" || l.slaStatus === "DUE_SOON") sla += 1;
      if (l.directorApprovalStatus === "PENDING") director += 1;
    });
    return { all: leads.length, hot, sla, director };
  }, [leads]);

  const triagedLeads = useMemo(() => {
    if (triageMode === "hot") {
      return leads.filter((l) => l.priorityTier === "HOT" || (l.priorityScore ?? 0) >= 70);
    }
    if (triageMode === "sla") {
      return leads.filter((l) => l.slaStatus === "OVERDUE" || l.slaStatus === "DUE_SOON");
    }
    if (triageMode === "director") {
      return leads.filter((l) => l.directorApprovalStatus === "PENDING");
    }
    return leads;
  }, [leads, triageMode]);

  const sortedLeads = useMemo(() => {
    if (!sortField) return triagedLeads;
    const cloned = [...triagedLeads];
    cloned.sort((a, b) => {
      let cmp = 0;
      if (sortField === "code") {
        cmp = a.code.localeCompare(b.code, "vi");
      } else if (sortField === "customerName") {
        cmp = a.customerName.localeCompare(b.customerName, "vi");
      } else if (sortField === "priorityScore") {
        cmp = (a.priorityScore ?? 0) - (b.priorityScore ?? 0);
      } else if (sortField === "estimatedValue") {
        cmp = parseEstimatedVnd(a.estimatedValue) - parseEstimatedVnd(b.estimatedValue);
      } else if (sortField === "status") {
        cmp = (STATUS_SORT_RANK[a.status] || 99) - (STATUS_SORT_RANK[b.status] || 99);
      } else if (sortField === "createdAt") {
        cmp = parseDateValue(a.createdAt) - parseDateValue(b.createdAt);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return cloned;
  }, [triagedLeads, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder(field === "priorityScore" || field === "estimatedValue" ? "desc" : "asc");
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
              : "Khởi tạo khách hàng tiềm năng đầu tiên để quản lý tiến độ khảo sát, báo giá LED m² và bàn giao Sales."
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
      {/* Enterprise Triage Bar + Duplicate Check + View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 sm:pb-0 sm:flex-wrap -mx-1 px-1">
          <button
            type="button"
            onClick={() => {
              setTriageMode("all");
              setCurrentPage(1);
            }}
            className={cn(
              "h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap",
              triageMode === "all"
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            <span>Tất cả hồ sơ</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10.5px] kpi-number",
                triageMode === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              )}
            >
              {triageCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTriageMode("hot");
              setCurrentPage(1);
            }}
            className={cn(
              "h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap",
              triageMode === "hot"
                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-rose-50/50"
            )}
          >
            <Flame
              className={cn("w-3.5 h-3.5", triageMode === "hot" ? "text-white" : "text-rose-500")}
            />
            <span>Lead Nóng (HOT)</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10.5px] kpi-number",
                triageMode === "hot" ? "bg-white/20 text-white" : "bg-rose-50 text-rose-700"
              )}
            >
              {triageCounts.hot}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTriageMode("sla");
              setCurrentPage(1);
            }}
            className={cn(
              "h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap",
              triageMode === "sla"
                ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50/50"
            )}
          >
            <Clock
              className={cn("w-3.5 h-3.5", triageMode === "sla" ? "text-white" : "text-amber-500")}
            />
            <span>Cần gọi SLA</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10.5px] kpi-number",
                triageMode === "sla" ? "bg-white/20 text-white" : "bg-amber-50 text-amber-700"
              )}
            >
              {triageCounts.sla}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTriageMode("director");
              setCurrentPage(1);
            }}
            className={cn(
              "h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap",
              triageMode === "director"
                ? "bg-blue-700 text-white border-blue-700 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:bg-blue-50/50"
            )}
          >
            <FileSignature
              className={cn(
                "w-3.5 h-3.5",
                triageMode === "director" ? "text-white" : "text-blue-600"
              )}
            />
            <span>Chờ GĐ duyệt giá</span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10.5px] kpi-number",
                triageMode === "director" ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"
              )}
            >
              {triageCounts.director}
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-2 text-xs">
            {duplicateIds.size > 0 ? (
              <StatusBadge tone="error" dot={false}>
                <AlertTriangle className="w-3.5 h-3.5 mr-1 inline" />
                Trùng {duplicateIds.size} SĐT/Đơn vị
              </StatusBadge>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Không trùng SĐT
              </span>
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
      </div>

      {triagedLeads.length === 0 ? (
        <div className="crm-card p-8 text-center space-y-2.5">
          <p className="text-sm font-semibold text-slate-900">
            Không có hồ sơ nào trong nhóm phân loại này
          </p>
          <p className="text-xs text-slate-500">
            Tất cả cơ hội hiện tại đã được xử lý đúng hạn SLA hoặc chưa có báo giá chờ Giám đốc ký duyệt.
          </p>
          <div className="pt-1">
            <Button variant="secondary" size="sm" onClick={() => setTriageMode("all")}>
              Xem lại toàn bộ ({leads.length} hồ sơ)
            </Button>
          </div>
        </div>
      ) : viewMode === "table" ? (
        <div className="crm-card overflow-hidden animate-fade-in">
          {/* Mobile Card List (< 768px) — zero horizontal overflow on phones */}
          <div className="md:hidden divide-y divide-slate-100">
            {currentLeads.map((lead) => {
              const isDup = duplicateIds.has(lead.id);
              const ledArea =
                lead.ledWidth && lead.ledHeight
                  ? Number((lead.ledWidth * lead.ledHeight).toFixed(1))
                  : null;

              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className={cn(
                    "p-3.5 space-y-2.5 cursor-pointer hover:bg-slate-50/70 transition-colors",
                    isDup && "bg-rose-50/35"
                  )}
                >
                  {/* Top row: Code + Score + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs font-medium text-slate-500">
                        {lead.code}
                      </span>
                      {isDup && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-medium">
                          Trùng
                        </span>
                      )}
                      {renderScoreBadge(lead)}
                    </div>
                    <StatusBadge tone={getLeadStatusTone(lead.status)} size="sm">
                      {lead.status}
                    </StatusBadge>
                  </div>

                  {/* Customer & Company */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-slate-900 truncate">
                        {lead.customerName}
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {lead.companyName}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="kpi-number text-[13px] font-semibold text-slate-900">
                        {lead.estimatedValue || "—"}
                      </div>
                      <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                        {lead.createdAt}
                      </div>
                    </div>
                  </div>

                  {/* Product & LED Area */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <span className="font-medium truncate max-w-[220px]">{lead.product}</span>
                    {ledArea && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/70 text-[10.5px] font-medium kpi-number">
                        <Maximize2 className="w-2.5 h-2.5" />
                        {ledArea} m²
                      </span>
                    )}
                    {lead.location && (
                      <span className="text-slate-500 inline-flex items-center gap-0.5 ml-auto">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[100px]">{lead.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom bar: Phone Call + Sales + Quick Open */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 font-mono text-[11.5px] font-medium shrink-0"
                      >
                        <Phone className="w-3 h-3 text-blue-600" />
                        {lead.phone}
                      </a>
                      {renderSlaPill(lead)}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold flex items-center justify-center">
                        {lead.salesPerson.initials}
                      </span>
                      <span className="text-xs text-slate-600 font-medium truncate max-w-[90px]">
                        {lead.salesPerson.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (>= 768px) */}
          <div className="hidden md:block overflow-x-auto max-h-[640px]">
            <table className="crm-table">
              <thead>
                <tr>
                  {renderSortableTh("code", "Mã Lead")}
                  {renderSortableTh("customerName", "Khách hàng & Đơn vị")}
                  {renderSortableTh("priorityScore", "Điểm & SLA")}
                  <th>Liên hệ</th>
                  <th>Dự án &amp; Quy cách LED</th>
                  {renderSortableTh("estimatedValue", "Giá trị & Duyệt giá", "num")}
                  <th>Nguồn</th>
                  {renderSortableTh("status", "Trạng thái")}
                  <th>Sales</th>
                  {renderSortableTh("createdAt", "Ngày tạo")}
                  <th className="w-14 text-right">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentLeads.map((lead) => {
                  const isDup = duplicateIds.has(lead.id);
                  const isMenuOpen = openMenuId === lead.id;
                  const ledArea =
                    lead.ledWidth && lead.ledHeight
                      ? Number((lead.ledWidth * lead.ledHeight).toFixed(1))
                      : null;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className={cn(
                        "cursor-pointer group",
                        isDup && "bg-rose-50/35 hover:bg-rose-50/70"
                      )}
                    >
                      {/* Code */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-medium text-slate-500">
                            {lead.code}
                          </span>
                          {isDup && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-medium"
                              title="Trùng số điện thoại hoặc tên công ty"
                            >
                              Trùng
                            </span>
                          )}
                        </div>
                        {(lead.activitiesCount ?? 0) > 0 && (
                          <div className="inline-flex items-center gap-1 text-[10.5px] text-slate-400 mt-1">
                            <MessageSquareText className="w-3 h-3" />
                            <span>{lead.activitiesCount} lượt CSKH</span>
                          </div>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 min-w-[195px]">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {lead.customerName}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[210px] mt-0.5">
                          {lead.companyName}
                        </div>
                      </td>

                      {/* Score & SLA */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          {renderScoreBadge(lead)}
                          {renderSlaPill(lead)}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-700">{lead.phone}</span>
                        {lead.email && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[145px] mt-0.5">
                            {lead.email}
                          </div>
                        )}
                      </td>

                      {/* Product & LED Dimensions */}
                      <td className="py-3 px-4 min-w-[215px]">
                        <div className="font-medium text-slate-800 line-clamp-1">
                          {lead.product}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span className="truncate max-w-[140px]">{lead.location}</span>
                          {ledArea && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/70 text-[10.5px] font-medium kpi-number">
                              <Maximize2 className="w-2.5 h-2.5" />
                              {ledArea} m²
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Value & Director Approval */}
                      <td className="num py-3 px-4 whitespace-nowrap">
                        <div>
                          {parseEstimatedVnd(lead.estimatedValue) > 0 ? (
                            <span className="kpi-number font-semibold text-slate-900">
                              {lead.estimatedValue}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">
                              {lead.estimatedValue || "—"}
                            </span>
                          )}
                        </div>
                        {lead.directorApprovalStatus === "PENDING" && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10.5px] font-semibold">
                              Chờ GĐ duyệt
                            </span>
                          </div>
                        )}
                        {lead.directorApprovalStatus === "APPROVED" && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10.5px] font-semibold">
                              ✓ GĐ đã duyệt
                            </span>
                          </div>
                        )}
                        {lead.directorApprovalStatus === "REJECTED" && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10.5px] font-semibold">
                              Cần sửa báo giá
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-medium">
                          {lead.source}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge tone={getLeadStatusTone(lead.status)}>
                          {lead.status}
                        </StatusBadge>
                      </td>

                      {/* Sales */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10.5px] font-semibold flex items-center justify-center shrink-0">
                            {lead.salesPerson.initials}
                          </span>
                          <span className="text-[12.5px] text-slate-700 font-medium">
                            {lead.salesPerson.name}
                          </span>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {lead.createdAt}
                      </td>

                      {/* Row Actions Menu "..." */}
                      <td
                        className="py-3 px-3 text-right whitespace-nowrap relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            if (isMenuOpen) {
                              setOpenMenuId(null);
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const upward = window.innerHeight - rect.bottom < 300;
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
                          {copiedId === lead.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <MoreHorizontal className="w-4 h-4" />
                          )}
                        </button>

                        {isMenuOpen && menuPos && (
                          <>
                            <button
                              type="button"
                              aria-label="Đóng menu thao tác"
                              className="fixed inset-0 z-40 cursor-default"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div
                              className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-elevated shadow-floating p-1 text-left text-xs animate-dropdown-in"
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
                                Hồ sơ · Dự toán LED &amp; Báo giá
                              </button>
                              <a
                                href={`tel:${lead.phone}`}
                                onClick={() => setOpenMenuId(null)}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                              >
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                Gọi {lead.phone}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(lead)}
                                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                Sao chép SĐT
                              </button>

                              {onQuickUpdateStatus && (
                                <>
                                  <div className="my-1 border-t border-slate-100" />
                                  <div className="px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                                    Chuyển nhanh
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
                      const ledArea =
                        lead.ledWidth && lead.ledHeight
                          ? Number((lead.ledWidth * lead.ledHeight).toFixed(1))
                          : null;
                      return (
                        <div
                          key={lead.id}
                          onClick={() => onSelectLead(lead)}
                          className={cn(
                            "p-3 rounded-lg bg-white border hover:border-blue-400 transition-colors cursor-pointer space-y-2 group",
                            isDup ? "border-rose-300" : "border-slate-200/90"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-medium text-slate-500">
                              {lead.code}
                            </span>
                            {isDup ? (
                              <StatusBadge tone="error" dot={false} size="sm">
                                Trùng
                              </StatusBadge>
                            ) : (
                              renderScoreBadge(lead)
                            )}
                          </div>

                          <div>
                            <div className="text-[13px] font-semibold text-slate-900 group-hover:text-blue-600 leading-snug">
                              {lead.customerName}
                            </div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              {lead.companyName}
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-md border border-slate-100">
                            <span>{lead.product}</span>
                            {ledArea && (
                              <span className="ml-1.5 font-semibold text-blue-700">
                                ({ledArea} m²)
                              </span>
                            )}
                          </div>

                          {lead.directorApprovalStatus === "PENDING" && (
                            <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                              📋 Chờ Giám đốc duyệt giá
                            </div>
                          )}

                          <div>{renderSlaPill(lead)}</div>

                          <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-100">
                            <span className="kpi-number font-semibold text-slate-900">
                              {lead.estimatedValue}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-400 flex items-center gap-0.5 truncate max-w-[95px]">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{lead.location}</span>
                              </span>
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
