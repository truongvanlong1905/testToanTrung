"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { AiLeadDraft } from "../components/AiQuickLeadBar";
import {
  assignLeadSalesApi,
  deleteLeadById,
  updateLeadStatusApi,
} from "../api";
import {
  type Lead,
  type LeadStatsSummary,
  type LeadStatus,
  type QuickLeadPreset,
  parseLeadCreatedAt,
} from "../types";

export interface UseLeadsWorkspaceOptions {
  currentUserName?: string;
  showToast: (msg: string) => void;
}

export function useLeadsWorkspace({
  currentUserName,
  showToast,
}: UseLeadsWorkspaceOptions) {
  // Leads state loaded from Database API
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedLeads, setHasLoadedLeads] = useState(false);
  const [leadLoadError, setLeadLoadError] = useState<string | null>(null);
  const [leadStats, setLeadStats] = useState<LeadStatsSummary>({
    total: 0,
    newLeads: 0,
    quotingLeads: 0,
    wonLeads: 0,
    lostLeads: 0,
    salesLeaderboard: [],
  });

  // Pagination & Quick Preset state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [quickPreset, setQuickPreset] = useState<QuickLeadPreset>("all");

  // Server-backed & Client-side CRM Filters
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // The input updates `searchQuery` instantly; the API only sees the value after a short pause (300ms).
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [salesFilter, setSalesFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  // Modals state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [aiLeadDraft, setAiLeadDraft] = useState<AiLeadDraft | null>(null);
  const [aiLeadWarning, setAiLeadWarning] = useState<string | null>(null);
  const [isImportLeadsOpen, setIsImportLeadsOpen] = useState(false);
  const [isExportingLeads, setIsExportingLeads] = useState(false);

  // Fetch Leads from Backend Database.
  // - search is debounced (one request after the user pauses typing, not one per keystroke)
  // - a newer request cancels the previous one, so a slow old response can never overwrite newer results
  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchLeads = useCallback(async () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (sourceFilter !== "all") params.append("source", sourceFilter);
      if (salesFilter !== "all") params.append("salesId", salesFilter);
      params.append("pageSize", String(pageSize));

      const res = await fetch(`/api/leads?${params.toString()}`, {
        signal: controller.signal,
      });
      const json = await res.json();

      if (
        !res.ok ||
        !json.success ||
        !Array.isArray(json.data?.leads) ||
        !json.data?.stats
      ) {
        throw new Error(
          json.error?.message || "Không thể tải dữ liệu Lead từ máy chủ."
        );
      }

      setLeads(json.data.leads);
      setLeadStats({
        total: json.data.stats.total,
        newLeads: json.data.stats.newLeads,
        quotingLeads: json.data.stats.quotingLeads,
        wonLeads: json.data.stats.wonLeads,
        lostLeads: json.data.stats.lostLeads || 0,
        salesLeaderboard: json.data.stats.salesLeaderboard || [],
      });
      setHasLoadedLeads(true);
      setLeadLoadError(null);
    } catch (error) {
      if (controller.signal.aborted) return; // superseded by a newer request — not an error
      setLeadLoadError(
        error instanceof Error
          ? error.message
          : "Không thể kết nối dữ liệu Lead. Vui lòng thử lại."
      );
    } finally {
      if (fetchAbortRef.current === controller) setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, sourceFilter, salesFilter, pageSize]);

  useEffect(() => {
    void fetchLeads();
    return () => fetchAbortRef.current?.abort();
  }, [fetchLeads]);

  // Apply additional Product, Date & Quick Preset filters client-side without touching Backend API contract
  const displayedLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (quickPreset === "hot" && lead.priorityTier !== "HOT") {
        return false;
      }
      if (quickPreset === "overdue_sla" && lead.slaStatus !== "OVERDUE") {
        return false;
      }
      if (
        quickPreset === "pending_approval" &&
        lead.directorApprovalStatus !== "PENDING"
      ) {
        return false;
      }

      if (productFilter !== "all") {
        const cat = (lead.category || "").toLowerCase();
        const prod = (lead.product || "").toLowerCase();
        const target = productFilter.toLowerCase();
        if (!cat.includes(target) && !prod.includes(target)) {
          return false;
        }
      }

      if (dateFilter !== "all") {
        const parsed = parseLeadCreatedAt(lead.createdAt);
        if (parsed) {
          if (dateFilter === "7d" || dateFilter === "30d") {
            const days = dateFilter === "7d" ? 7 : 30;
            const cutoff = new Date();
            cutoff.setHours(0, 0, 0, 0);
            cutoff.setDate(cutoff.getDate() - days);
            if (parsed < cutoff) return false;
          } else if (dateFilter === "custom") {
            const fromD = customDateFrom
              ? new Date(`${customDateFrom}T00:00:00`)
              : null;
            const toD = customDateTo
              ? new Date(`${customDateTo}T23:59:59`)
              : null;
            if (fromD && parsed < fromD) return false;
            if (toD && parsed > toD) return false;
          }
        }
      }

      return true;
    });
  }, [
    leads,
    quickPreset,
    productFilter,
    dateFilter,
    customDateFrom,
    customDateTo,
  ]);

  const activeFilterCount = [
    Boolean(searchQuery.trim()),
    statusFilter !== "all",
    sourceFilter !== "all",
    salesFilter !== "all",
    productFilter !== "all",
    dateFilter !== "all",
    quickPreset !== "all",
  ].filter(Boolean).length;

  // KPI cards act as stage navigation, so they keep showing global totals while only
  // the status drill-down is applied; any other filter switches them to filtered counts.
  const nonStatusFilterCount =
    activeFilterCount - (statusFilter !== "all" ? 1 : 0);

  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
    setSalesFilter("all");
    setProductFilter("all");
    setDateFilter("all");
    setCustomDateFrom("");
    setCustomDateTo("");
    setQuickPreset("all");
    showToast("Đã đặt lại bộ lọc tìm kiếm");
  }, [showToast]);

  const handleAddLead = useCallback(() => {
    showToast("Đã lưu Lead mới vào cơ sở dữ liệu");
    void fetchLeads();
  }, [showToast, fetchLeads]);

  const handleUpdateStatus = useCallback(
    async (id: string, newStatus: LeadStatus, reason?: string) => {
      try {
        const { ok, envelope } = await updateLeadStatusApi(id, newStatus, reason);
        if (!ok) {
          throw new Error(envelope.error?.message || "Lỗi cập nhật trạng thái");
        }

        setLeads((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: newStatus } : item
          )
        );
        setSelectedLead((prev) =>
          prev && prev.id === id ? { ...prev, status: newStatus } : prev
        );
        showToast(
          (envelope as { message?: string }).message ||
            `Đã cập nhật trạng thái thành "${newStatus}"`
        );
        void fetchLeads();
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Không thể cập nhật trạng thái";
        showToast(message);
        throw err;
      }
    },
    [showToast, fetchLeads]
  );

  const handleReassignSales = useCallback(
    async (leadId: string, newSalesId: string, reason: string) => {
      try {
        const { ok, envelope } = await assignLeadSalesApi(
          leadId,
          newSalesId,
          reason
        );
        if (!ok) {
          throw new Error(envelope.error?.message || "Lỗi chuyển bàn giao");
        }

        showToast(
          (envelope as { message?: string }).message ||
            "Đã bàn giao Lead thành công"
        );
        void fetchLeads();
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Lỗi chuyển bàn giao Sales";
        showToast(message);
        throw err;
      }
    },
    [showToast, fetchLeads]
  );

  const handleDeleteLead = useCallback(
    async (leadId: string) => {
      const { ok, envelope } = await deleteLeadById(leadId);
      if (!ok) {
        const msg = envelope.error?.message || "Không thể xóa Lead";
        showToast(msg);
        throw new Error(msg);
      }
      showToast("Đã xóa Lead");
      void fetchLeads();
    },
    [showToast, fetchLeads]
  );

  const handleSelectLead = useCallback((lead: Lead) => {
    setSelectedLead(lead);
  }, []);

  const handleOpenNewLead = useCallback(() => {
    setAiLeadDraft(null);
    setAiLeadWarning(null);
    setIsNewLeadOpen(true);
  }, []);

  const handleOpenPrefilledModal = useCallback(
    (draft: AiLeadDraft, warning?: string) => {
      setAiLeadDraft(draft);
      setAiLeadWarning(warning || null);
      setIsNewLeadOpen(true);
    },
    []
  );

  const handleQuickLeadCreated = useCallback(
    (_lead: Lead, msg: string) => {
      showToast(msg);
      void fetchLeads();
    },
    [showToast, fetchLeads]
  );

  const handleFilterStatus = useCallback((status: string) => {
    setStatusFilter(status);
    if (status !== "all") setShowFilters(true);
  }, []);

  const handleQuickUpdateStatus = useCallback(
    (lead: Lead, newStatus: LeadStatus) => {
      void handleUpdateStatus(lead.id, newStatus);
    },
    [handleUpdateStatus]
  );

  const handleExportLeads = useCallback(async () => {
    const activeParts: string[] = [];
    if (statusFilter !== "all") activeParts.push(`Trạng thái: ${statusFilter}`);
    if (sourceFilter !== "all") activeParts.push(`Nguồn: ${sourceFilter}`);
    if (salesFilter !== "all") activeParts.push(`Sales: ${salesFilter}`);
    if (productFilter !== "all") activeParts.push(`SP: ${productFilter}`);
    if (dateFilter !== "all") activeParts.push(`Kỳ: ${dateFilter}`);
    if (searchQuery.trim())
      activeParts.push(`Từ khóa: "${searchQuery.trim()}"`);
    const filterLabel =
      activeParts.length > 0 ? activeParts.join(" · ") : "Toàn bộ danh sách";

    try {
      setIsExportingLeads(true);
      const { exportLeadsWorkbook } = await import(
        "@/src/core/utils/excel-export"
      );
      await exportLeadsWorkbook({
        leads: displayedLeads,
        stats: activeParts.length === 0 ? leadStats : undefined,
        filterLabel,
        exportedBy: currentUserName || "Hệ thống Toàn Trung",
      });
      showToast("Đã xuất file Excel Quản lý Lead (.xlsx) thành công");
    } catch {
      showToast("Không thể xuất file Excel. Vui lòng thử lại.");
    } finally {
      setIsExportingLeads(false);
    }
  }, [
    statusFilter,
    sourceFilter,
    salesFilter,
    productFilter,
    dateFilter,
    searchQuery,
    displayedLeads,
    leadStats,
    currentUserName,
    showToast,
  ]);

  return {
    leads,
    displayedLeads,
    isLoading,
    hasLoadedLeads,
    leadLoadError,
    leadStats,
    page,
    setPage,
    pageSize,
    setPageSize,
    quickPreset,
    setQuickPreset,
    showFilters,
    setShowFilters,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    salesFilter,
    setSalesFilter,
    productFilter,
    setProductFilter,
    dateFilter,
    setDateFilter,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    activeFilterCount,
    nonStatusFilterCount,
    selectedLead,
    setSelectedLead,
    isNewLeadOpen,
    setIsNewLeadOpen,
    aiLeadDraft,
    setAiLeadDraft,
    aiLeadWarning,
    setAiLeadWarning,
    isImportLeadsOpen,
    setIsImportLeadsOpen,
    isExportingLeads,
    fetchLeads,
    handleResetFilters,
    handleAddLead,
    handleUpdateStatus,
    handleReassignSales,
    handleDeleteLead,
    handleSelectLead,
    handleOpenNewLead,
    handleOpenPrefilledModal,
    handleQuickLeadCreated,
    handleFilterStatus,
    handleQuickUpdateStatus,
    handleExportLeads,
  };
}
