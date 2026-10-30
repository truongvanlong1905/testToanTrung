"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  SlidersHorizontal,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatsCards } from "@/components/modules/leads/StatsCards";
import { LeadFilters } from "@/components/modules/leads/LeadFilters";
import { LeadTable } from "@/components/modules/leads/LeadTable";
import { OverviewView } from "@/components/modules/reports/OverviewView";
import { Lead, LeadStatus } from "@/types/lead";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ErrorState, PageSkeleton } from "@/components/ui/feedback-states";
import { Toast } from "@/components/ui/toast";

// Heavy / rarely-first views are split into their own chunks and fetched when first opened,
// so the first paint only ships the shell + Dashboard + Lead list.
const viewLoading = () => <PageSkeleton cards={4} rows={5} />;
const TrackingView = dynamic(
  () => import("@/components/modules/tracking/TrackingView").then((m) => m.TrackingView),
  { loading: viewLoading }
);
const AdsView = dynamic(
  () => import("@/components/modules/ads/AdsView").then((m) => m.AdsView),
  { loading: viewLoading }
);
const ReportsView = dynamic(
  () => import("@/components/modules/reports/ReportsView").then((m) => m.ReportsView),
  { loading: viewLoading }
);
const AiDesignView = dynamic(
  () => import("@/components/modules/design/AiDesignView").then((m) => m.AiDesignView),
  { loading: viewLoading }
);
const AdminBrandView = dynamic(
  () => import("@/components/shared/AdminBrandView").then((m) => m.AdminBrandView),
  { loading: viewLoading }
);
const AdminUsersView = dynamic(
  () => import("@/components/shared/AdminUsersView").then((m) => m.AdminUsersView),
  { loading: viewLoading }
);
const AdminSettingsView = dynamic(
  () => import("@/components/shared/AdminSettingsView").then((m) => m.AdminSettingsView),
  { loading: viewLoading }
);
const ProfileView = dynamic(
  () => import("@/components/shared/ProfileView").then((m) => m.ProfileView),
  { loading: viewLoading }
);
// Only mounted while open (see render below) so their code is not downloaded up-front.
const LeadDetailModal = dynamic(
  () => import("@/components/modules/leads/LeadDetailModal").then((m) => m.LeadDetailModal)
);
const NewLeadModal = dynamic(
  () => import("@/components/modules/leads/NewLeadModal").then((m) => m.NewLeadModal)
);
const ImportLeadsModal = dynamic(
  () => import("@/components/modules/leads/ImportLeadsModal").then((m) => m.ImportLeadsModal)
);

function parseLeadCreatedAt(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const d = new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
    if (!Number.isNaN(d.getTime())) return d;
  }
  const iso = new Date(dateStr);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

export default function LeadsDashboardPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notificationsOpenSignal, setNotificationsOpenSignal] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

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
    avatar?: string | null;
  } | null>(null);

  // Server-backed & Client-side CRM Filters
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // The input updates `searchQuery` instantly; the API only sees the value after a short pause.
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
  const [isImportLeadsOpen, setIsImportLeadsOpen] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingLeads, setIsExportingLeads] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Auth Guard
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
      params.append("pageSize", "50");

      const res = await fetch(`/api/leads?${params.toString()}`, { signal: controller.signal });
      const json = await res.json();

      if (!res.ok || !json.success || !Array.isArray(json.data?.leads) || !json.data?.stats) {
        throw new Error(json.error?.message || "Không thể tải dữ liệu Lead từ máy chủ.");
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
  }, [debouncedSearch, statusFilter, sourceFilter, salesFilter]);

  useEffect(() => {
    fetchLeads();
    return () => fetchAbortRef.current?.abort();
  }, [fetchLeads]);

  // Apply additional Product & Date filters client-side without touching Backend API contract
  const displayedLeads = useMemo(() => {
    return leads.filter((lead) => {
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
            const fromD = customDateFrom ? new Date(`${customDateFrom}T00:00:00`) : null;
            const toD = customDateTo ? new Date(`${customDateTo}T23:59:59`) : null;
            if (fromD && parsed < fromD) return false;
            if (toD && parsed > toD) return false;
          }
        }
      }

      return true;
    });
  }, [leads, productFilter, dateFilter, customDateFrom, customDateTo]);

  const activeFilterCount = [
    Boolean(searchQuery.trim()),
    statusFilter !== "all",
    sourceFilter !== "all",
    salesFilter !== "all",
    productFilter !== "all",
    dateFilter !== "all",
  ].filter(Boolean).length;

  // KPI cards act as stage navigation, so they keep showing global totals while only
  // the status drill-down is applied; any other filter switches them to filtered counts.
  const nonStatusFilterCount = activeFilterCount - (statusFilter !== "all" ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
    setSalesFilter("all");
    setProductFilter("all");
    setDateFilter("all");
    setCustomDateFrom("");
    setCustomDateTo("");
    showToast("Đã đặt lại bộ lọc tìm kiếm");
  };

  const handleAddLead = () => {
    showToast("Đã lưu Lead mới vào cơ sở dữ liệu");
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
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
      setSelectedLead((prev) => (prev && prev.id === id ? { ...prev, status: newStatus } : prev));
      showToast(json.message || `Đã cập nhật trạng thái thành "${newStatus}"`);
      fetchLeads();
      return true;
    } catch (err: any) {
      showToast(err.message || "Không thể cập nhật trạng thái");
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

  const getPageMeta = (tab: string): { title: string; group: string } => {
    switch (tab) {
      case "overview":
        return { title: "Dashboard", group: "Tổng quan" };
      case "leads":
        return { title: "Quản lý Lead", group: "Workspace" };
      case "tracking":
        return { title: "Tracking", group: "Workspace" };
      case "ads":
        return { title: "Quảng cáo & Từ khóa", group: "Workspace" };
      case "reports":
        return { title: "Báo cáo", group: "Workspace" };
      case "ai-design":
        return { title: "AI Design", group: "Workspace" };
      case "brand":
        return { title: "Thương hiệu", group: "System" };
      case "users":
        return { title: "Quản lý nhân sự", group: "System" };
      case "profile":
        return { title: "Hồ sơ tài khoản", group: "System" };
      case "settings":
        return { title: "Cài đặt hệ thống", group: "System" };
      default:
        return { title: "Dashboard", group: "Workspace" };
    }
  };

  const pageMeta = getPageMeta(currentTab);

  return (
    <div className="min-h-screen flex app-canvas text-slate-900">
      {/* Toast Notification */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

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
        onOpenNotifications={() => setNotificationsOpenSignal((n) => n + 1)}
        unreadNotificationsCount={unreadNotificationsCount}
        leadsCount={hasLoadedLeads ? leadStats.total : undefined}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
          pageTitle={pageMeta.title}
          pageGroup={pageMeta.group}
          currentUser={currentUser || undefined}
          onNavigateToTab={(tab, searchText) => {
            setCurrentTab(tab);
            setSearchQuery(tab === "leads" ? searchText || "" : "");
          }}
          notificationsOpenSignal={notificationsOpenSignal}
          onUnreadCountChange={setUnreadNotificationsCount}
        />

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 max-w-[1440px] w-full mx-auto">
          {/* key={currentTab} remounts the wrapper so every tab switch gets a short entrance */}
          <div key={currentTab} className="space-y-6 animate-page-in">
          {/* TAB: DASHBOARD (OVERVIEW) */}
          {currentTab === "overview" && (
            <OverviewView
              leads={leads}
              stats={leadStats}
              hasLoadedLeads={hasLoadedLeads}
              onNavigateToLeads={(status) => {
                setStatusFilter(status && status !== "all" ? status : "all");
                setCurrentTab("leads");
              }}
              onNavigateToTab={(tab) => setCurrentTab(tab)}
              onSelectLead={(lead) => setSelectedLead(lead)}
            />
          )}

          {/* TAB: LEAD MANAGEMENT */}
          {currentTab === "leads" && (
            <div className="space-y-5">
              <PageHeader
                title="Quản lý Lead"
                description="Theo dõi cơ hội dự án Màn hình LED & Bảng điện tử từ tiếp nhận đến chốt hợp đồng."
                actions={
                  <>
                    <Button
                      variant={showFilters || activeFilterCount > 0 ? "subtle" : "secondary"}
                      size="md"
                      onClick={() => setShowFilters((v) => !v)}
                      leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                    >
                      Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                    </Button>

                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setIsImportLeadsOpen(true)}
                      leftIcon={<Upload className="w-3.5 h-3.5 text-blue-600" />}
                    >
                      Import &amp; Chia Sales
                    </Button>

                    <Button
                      variant="secondary"
                      size="md"
                      isLoading={isExportingLeads}
                      disabled={!hasLoadedLeads}
                      leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                      onClick={async () => {
                        const activeParts: string[] = [];
                        if (statusFilter !== "all") activeParts.push(`Trạng thái: ${statusFilter}`);
                        if (sourceFilter !== "all") activeParts.push(`Nguồn: ${sourceFilter}`);
                        if (salesFilter !== "all") activeParts.push(`Sales: ${salesFilter}`);
                        if (productFilter !== "all") activeParts.push(`SP: ${productFilter}`);
                        if (dateFilter !== "all") activeParts.push(`Kỳ: ${dateFilter}`);
                        if (searchQuery.trim()) activeParts.push(`Từ khóa: "${searchQuery.trim()}"`);
                        const filterLabel =
                          activeParts.length > 0 ? activeParts.join(" · ") : "Toàn bộ danh sách";

                        try {
                          setIsExportingLeads(true);
                          const { exportLeadsWorkbook } = await import("@/lib/excel-export");
                          await exportLeadsWorkbook({
                            leads: displayedLeads,
                            stats: activeParts.length === 0 ? leadStats : undefined,
                            filterLabel,
                            exportedBy: currentUser?.name || "Hệ thống Toàn Trung",
                          });
                          showToast("Đã xuất file Excel Quản lý Lead (.xlsx) thành công");
                        } catch {
                          showToast("Không thể xuất file Excel. Vui lòng thử lại.");
                        } finally {
                          setIsExportingLeads(false);
                        }
                      }}
                    >
                      Export
                    </Button>

                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setIsNewLeadOpen(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Thêm Lead
                    </Button>
                  </>
                }
              />

              {leadLoadError && (
                <ErrorState
                  title={
                    hasLoadedLeads
                      ? "Không thể làm mới dữ liệu"
                      : "Chưa tải được dữ liệu Lead"
                  }
                  message={
                    hasLoadedLeads
                      ? `Đang hiển thị dữ liệu đã tải trước đó. ${leadLoadError}`
                      : leadLoadError
                  }
                  warningOnly={hasLoadedLeads}
                  onRetry={() => void fetchLeads()}
                  isRetrying={isLoading}
                />
              )}

              {hasLoadedLeads ? (
                <>
                  <StatsCards
                    leads={displayedLeads}
                    stats={nonStatusFilterCount === 0 ? leadStats : undefined}
                    activeStatus={statusFilter}
                    onFilterStatus={(status) => {
                      setStatusFilter(status);
                      if (status !== "all") setShowFilters(true);
                    }}
                  />

                  {showFilters && (
                    <LeadFilters
                      search={searchQuery}
                      onSearchChange={setSearchQuery}
                      statusFilter={statusFilter}
                      onStatusFilterChange={setStatusFilter}
                      sourceFilter={sourceFilter}
                      onSourceFilterChange={setSourceFilter}
                      salesFilter={salesFilter}
                      onSalesFilterChange={setSalesFilter}
                      productFilter={productFilter}
                      onProductFilterChange={setProductFilter}
                      dateFilter={dateFilter}
                      onDateFilterChange={setDateFilter}
                      customDateFrom={customDateFrom}
                      onCustomDateFromChange={setCustomDateFrom}
                      customDateTo={customDateTo}
                      onCustomDateToChange={setCustomDateTo}
                      onResetFilters={handleResetFilters}
                      totalFiltered={displayedLeads.length}
                    />
                  )}

                  <div className="relative">
                    {isLoading && displayedLeads.length > 0 && (
                      <div className="pointer-events-none absolute right-3 top-2 z-20 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-card border border-slate-200">
                        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                        Đang đồng bộ...
                      </div>
                    )}
                    <LeadTable
                      leads={displayedLeads}
                      onSelectLead={(lead) => setSelectedLead(lead)}
                      onCreateLead={() => setIsNewLeadOpen(true)}
                      onQuickUpdateStatus={(lead, newStatus) => {
                        void handleUpdateStatus(lead.id, newStatus);
                      }}
                      hasActiveFilters={activeFilterCount > 0}
                      itemsPerPage={10}
                    />
                  </div>
                </>
              ) : !leadLoadError ? (
                <PageSkeleton cards={4} rows={6} />
              ) : null}
            </div>
          )}

          {/* TAB: TRACKING */}
          {currentTab === "tracking" && <TrackingView />}

          {/* TAB: ADS & KEYWORDS */}
          {currentTab === "ads" && <AdsView />}

          {/* TAB: REPORTS */}
          {currentTab === "reports" && (
            <ReportsView
              leads={leads}
              userRole={currentUser?.role}
              onSelectLead={(lead) => setSelectedLead(lead)}
            />
          )}

          {/* TAB: AI DESIGN STUDIO */}
          {currentTab === "ai-design" && <AiDesignView />}

          {/* TAB: ADMIN BRAND */}
          {currentTab === "brand" && <AdminBrandView />}

          {/* TAB: ADMIN USERS */}
          {currentTab === "users" && <AdminUsersView />}

          {/* TAB: USER / ADMIN PROFILE */}
          {currentTab === "profile" && (
            <ProfileView
              onProfileUpdated={(updatedUser) => setCurrentUser(updatedUser)}
              onNavigateToUsersAdmin={() => setCurrentTab("users")}
            />
          )}

          {/* TAB: ADMIN SETTINGS */}
          {currentTab === "settings" && <AdminSettingsView />}
          </div>
        </main>
      </div>

      {/* Slide-Over Detail Sheet & Create Modal — mounted only while open (code-split) */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdateStatus={handleUpdateStatus}
          onReassignSales={handleReassignSales}
          currentUserRole={currentUser?.role}
          onLeadMutated={() => void fetchLeads()}
        />
      )}

      {isNewLeadOpen && (
        <NewLeadModal
          isOpen={isNewLeadOpen}
          onClose={() => setIsNewLeadOpen(false)}
          onAddLead={handleAddLead}
        />
      )}

      {isImportLeadsOpen && (
        <ImportLeadsModal
          isOpen={isImportLeadsOpen}
          onClose={() => setIsImportLeadsOpen(false)}
          onImported={(msg) => {
            showToast(msg);
            void fetchLeads();
          }}
        />
      )}
    </div>
  );
}
