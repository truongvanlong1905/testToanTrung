"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle2, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatsCards } from "@/components/leads/StatsCards";
import { LeadFilters } from "@/components/leads/LeadFilters";
import { LeadTable } from "@/components/leads/LeadTable";
import { LeadDetailModal } from "@/components/leads/LeadDetailModal";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { OverviewView } from "@/components/views/OverviewView";
import { TrackingView } from "@/components/views/TrackingView";
import { AdsView } from "@/components/views/AdsView";
import { ReportsView } from "@/components/views/ReportsView";
import { AiDesignView } from "@/components/views/AiDesignView";
import { AdminBrandView } from "@/components/views/AdminBrandView";
import { AdminUsersView } from "@/components/views/AdminUsersView";
import { AdminSettingsView } from "@/components/views/AdminSettingsView";
import { Lead, LeadStatus } from "@/types/lead";

export default function LeadsDashboardPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("leads");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Leads state loaded from Database API
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedLeads, setHasLoadedLeads] = useState(false);
  const [leadLoadError, setLeadLoadError] = useState<string | null>(null);
  const [leadStats, setLeadStats] = useState({
    total: 0,
    newLeads: 0,
    quotingLeads: 0,
    wonLeads: 0,
    lostLeads: 0,
    salesLeaderboard: [] as { name: string; initials: string; count: number }[],
  });

  // User state
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: string;
    initials: string;
  } | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [salesFilter, setSalesFilter] = useState("all");

  // Modals state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch Current User on mount with Auth Guard
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success && json.data?.user) {
          setCurrentUser(json.data.user);
        } else if (json !== null) {
          router.push("/login");
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  // Fetch Leads from Backend Database
  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (sourceFilter !== "all") params.append("source", sourceFilter);
      if (salesFilter !== "all") params.append("salesId", salesFilter);
      params.append("pageSize", "50");

      const res = await fetch(`/api/leads?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success || !Array.isArray(json.data?.leads) || !json.data?.stats) {
        throw new Error(json.error?.message || "Không thể tải dữ liệu Lead từ máy chủ.");
      }

      setLeads(json.data.leads);
      setLeadStats(json.data.stats);
      setHasLoadedLeads(true);
      setLeadLoadError(null);
    } catch (err: unknown) {
      console.error("Fetch leads error:", err);
      setLeadLoadError(
        err instanceof Error
          ? err.message
          : "Không thể kết nối máy chủ. Hãy thử lại sau."
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, sourceFilter, salesFilter]);

  // Debounce search and trigger fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  // Handlers
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
    setSalesFilter("all");
  };

  const handleAddLead = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
    showToast(`Đã lưu khách hàng "${newLead.customerName}" vào Database thành công`);
    fetchLeads();
  };

  const handleUpdateStatus = async (id: string, newStatus: LeadStatus, reason?: string) => {
    try {
      const res = await fetch(`/api/leads/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Lỗi cập nhật trạng thái");
      }

      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: newStatus, failureReason: reason || null } : l))
      );

      if (selectedLead && selectedLead.id === id) {
        setSelectedLead((prev) =>
          prev ? { ...prev, status: newStatus, failureReason: reason || null } : null
        );
      }

      showToast(`Đã cập nhật trạng thái sang "${newStatus}" và ghi nhận lịch sử`);
      return true;
    } catch (err: any) {
      showToast(err.message || "Lỗi cập nhật trạng thái");
      throw err;
    }
  };

  const handleReassignSales = async (leadId: string, newSalesId: string, reason: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newSalesPersonId: newSalesId, reason }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Lỗi chuyển bàn giao");
      }

      showToast(json.message || "Đã bàn giao Lead thành công");
      fetchLeads();
      return true;
    } catch (err: any) {
      showToast(err.message || "Lỗi chuyển bàn giao Sales");
      throw err;
    }
  };

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case "overview":
        return "Tổng quan";
      case "leads":
        return "Quản lý Lead";
      case "tracking":
        return "Tracking Đa Kênh";
      case "ads":
        return "Quảng cáo & Từ khóa";
      case "reports":
        return "Báo cáo & Phân tích";
      case "ai-design":
        return "AI Design Studio";
      case "brand":
        return "Quản lý Thương hiệu";
      case "users":
        return "Quản lý Người dùng";
      case "settings":
        return "Cài đặt Hệ thống";
      default:
        return "Toàn Trung Dashboard";
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab !== "leads") setSearchQuery("");
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userRole={currentUser?.role}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
          pageTitle={getPageTitle(currentTab)}
          currentUser={currentUser || undefined}
          onNavigateToTab={(tab, searchText) => {
            setCurrentTab(tab);
            setSearchQuery(tab === "leads" ? searchText || "" : "");
          }}
        />

        {/* Dynamic Content Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* TAB: OVERVIEW */}
          {currentTab === "overview" && (
            <OverviewView
              leads={leads}
              stats={leadStats}
              onNavigateToLeads={() => setCurrentTab("leads")}
              onSelectLead={(lead) => setSelectedLead(lead)}
            />
          )}

          {/* TAB: LEADS MANAGEMENT (CORE MODULE 1) */}
          {currentTab === "leads" && (
            <>
              {/* Page Title & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
                    <span>Workspace</span>
                    <span>/</span>
                    <span className="text-blue-600">Quản lý Lead</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Quản lý khách hàng tiềm năng
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Theo dõi khách hàng tiềm năng, lịch sử chăm sóc và tiến độ báo giá.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => fetchLeads()}
                    className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors shadow-sm cursor-pointer"
                    title="Làm mới dữ liệu từ Database"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
                  </button>

                  <button
                    onClick={() => setIsNewLeadOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Lead</span>
                  </button>
                </div>
              </div>

              {leadLoadError && (
                <div
                  role="alert"
                  className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                    hasLoadedLeads
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">
                        {hasLoadedLeads
                          ? "Không thể làm mới dữ liệu"
                          : "Chưa tải được dữ liệu Lead"}
                      </p>
                      <p className="mt-1 text-sm opacity-90">
                        {hasLoadedLeads
                          ? "Đang hiển thị dữ liệu đã tải trước đó. "
                          : ""}
                        {leadLoadError}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchLeads()}
                    disabled={isLoading}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-current/20 bg-white/70 px-3 py-2 text-sm font-medium transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    Thử lại
                  </button>
                </div>
              )}

              {hasLoadedLeads ? (
                <>
                  <StatsCards leads={leads} stats={leadStats} />
                  <LeadFilters
                    search={searchQuery}
                    onSearchChange={setSearchQuery}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    sourceFilter={sourceFilter}
                    onSourceFilterChange={setSourceFilter}
                    salesFilter={salesFilter}
                    onSalesFilterChange={setSalesFilter}
                    onResetFilters={handleResetFilters}
                    totalFiltered={leads.length}
                  />
                  <div className="relative">
                    {isLoading && leads.length > 0 && (
                      <div className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                        Đang cập nhật
                      </div>
                    )}
                    <LeadTable
                      leads={leads}
                      onSelectLead={(lead) => setSelectedLead(lead)}
                      onCreateLead={() => setIsNewLeadOpen(true)}
                      hasActiveFilters={
                        Boolean(searchQuery.trim()) ||
                        statusFilter !== "all" ||
                        sourceFilter !== "all" ||
                        salesFilter !== "all"
                      }
                      itemsPerPage={8}
                    />
                  </div>
                </>
              ) : !leadLoadError ? (
                <div
                  role="status"
                  className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-center shadow-card"
                >
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-slate-700">
                    Đang tải dữ liệu Lead...
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Các chỉ số sẽ xuất hiện sau khi kết nối dữ liệu thành công.
                  </p>
                </div>
              ) : null}
            </>
          )}

          {/* TAB: TRACKING */}
          {currentTab === "tracking" && <TrackingView />}

          {/* TAB: ADS & KEYWORDS */}
          {currentTab === "ads" && <AdsView />}

          {/* TAB: REPORTS */}
          {currentTab === "reports" && (
            <ReportsView
              leads={leads}
              onSelectLead={(lead) => setSelectedLead(lead)}
            />
          )}

          {/* TAB: AI DESIGN STUDIO */}
          {currentTab === "ai-design" && <AiDesignView />}

          {/* TAB: ADMIN BRAND */}
          {currentTab === "brand" && <AdminBrandView />}

          {/* TAB: ADMIN USERS */}
          {currentTab === "users" && <AdminUsersView />}

          {/* TAB: ADMIN SETTINGS */}
          {currentTab === "settings" && <AdminSettingsView />}
        </main>
      </div>

      {/* Modals */}
      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdateStatus={handleUpdateStatus}
        onReassignSales={handleReassignSales}
      />

      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
        onAddLead={handleAddLead}
      />
    </div>
  );
}
