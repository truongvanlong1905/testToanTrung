"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/src/core/layout/Sidebar";
import { Header } from "@/src/core/layout/Header";
import { PageSkeleton } from "@/src/core/ui/feedback-states";
import { Toast } from "@/src/core/ui/toast";
import { canRoleAccessTab, type AppTabId } from "@/src/core/auth/permissions";
import {
  LeadsWorkspaceView,
  useLeadsWorkspace,
  loadLeadDetailModal,
  loadNewLeadModal,
  loadImportLeadsModal,
} from "@/src/modules/01-leads";
import { OverviewView } from "@/src/modules/04-reports-dashboard";

const viewLoading = () => <PageSkeleton cards={4} rows={5} />;
const TrackingView = dynamic(
  () => import("@/src/modules/02-tracking").then((m) => m.TrackingView),
  { loading: viewLoading }
);
const AdsView = dynamic(
  () => import("@/src/modules/03-ads-keywords").then((m) => m.AdsView),
  { loading: viewLoading }
);
const ReportsView = dynamic(
  () => import("@/src/modules/04-reports-dashboard").then((m) => m.ReportsView),
  { loading: viewLoading }
);
const AiDesignView = dynamic(
  () => import("@/src/modules/05-ai-design").then((m) => m.AiDesignView),
  { loading: viewLoading }
);
const AdminBrandView = dynamic(
  () => import("@/src/core/system/AdminBrandView").then((m) => m.AdminBrandView),
  { loading: viewLoading }
);
const AdminUsersView = dynamic(
  () => import("@/src/core/system/AdminUsersView").then((m) => m.AdminUsersView),
  { loading: viewLoading }
);
const AdminSettingsView = dynamic(
  () =>
    import("@/src/core/system/AdminSettingsView").then(
      (m) => m.AdminSettingsView
    ),
  { loading: viewLoading }
);
const ProfileView = dynamic(
  () => import("@/src/core/system/ProfileView").then((m) => m.ProfileView),
  { loading: viewLoading }
);
const NotificationsView = dynamic(
  () =>
    import("@/src/core/system/NotificationsView").then(
      (m) => m.NotificationsView
    ),
  { loading: viewLoading }
);

const LeadDetailModal = dynamic(loadLeadDetailModal);
const NewLeadModal = dynamic(loadNewLeadModal);
const ImportLeadsModal = dynamic(loadImportLeadsModal);

function getPageMeta(tab: string): { title: string; group: string } {
  switch (tab) {
    case "overview":
      return { title: "Dashboard", group: "Tổng quan" };
    case "leads":
      return { title: "Quản lý Lead", group: "Kinh doanh" };
    case "tracking":
      return { title: "Tracking", group: "Tích hợp" };
    case "ads":
      return { title: "Quảng cáo & Từ khóa", group: "Marketing" };
    case "reports":
      return { title: "Báo cáo", group: "Thống kê" };
    case "ai-design":
      return { title: "AI Design", group: "Thiết kế" };
    case "brand":
      return { title: "Thương hiệu", group: "Hệ thống" };
    case "notifications":
      return { title: "Trung tâm Thông báo", group: "Hệ thống" };
    case "users":
      return { title: "Quản lý Tài khoản", group: "Hệ thống" };
    case "profile":
      return { title: "Hồ sơ tài khoản", group: "Hệ thống" };
    case "settings":
      return { title: "Cài đặt hệ thống", group: "Hệ thống" };
    default:
      return { title: "Dashboard", group: "Tổng quan" };
  }
}

export default function LeadsDashboardPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: string;
    initials: string;
    avatar?: string | null;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  const canAccessLeads = Boolean(
    currentUser && canRoleAccessTab(currentUser.role, "leads")
  );

  const leadsWorkspace = useLeadsWorkspace({
    currentUserName: currentUser?.name,
    enabled: canAccessLeads,
    showToast,
  });

  // Safe tab switcher with role permission guard (AC-03)
  const navigateToTabSafe = useCallback(
    (targetTab: string, searchText?: string) => {
      if (currentUser && !canRoleAccessTab(currentUser.role, targetTab as AppTabId)) {
        showToast("Vai trò của bạn không có quyền truy cập mục này.");
        setCurrentTab("overview");
        return;
      }
      setCurrentTab(targetTab);
      if (targetTab === "leads" && typeof searchText === "string") {
        leadsWorkspace.setSearchQuery(searchText);
      } else if (targetTab !== "leads") {
        leadsWorkspace.setSearchQuery("");
      }
    },
    [currentUser, leadsWorkspace, showToast]
  );

  // Preload modal chunks during browser idle time after initial hydration
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNewLeadModal();
      void loadLeadDetailModal();
      void loadImportLeadsModal();
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

  // Auth Guard & URL ?tab= Guard (AC-03)
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
          const user = json.data.user;
          setCurrentUser(user);

          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const requestedTab = params.get("tab");
            if (requestedTab) {
              if (canRoleAccessTab(user.role, requestedTab as AppTabId)) {
                setCurrentTab(requestedTab);
              } else {
                showToast("Vai trò của bạn không có quyền truy cập đường dẫn này.");
                setCurrentTab("overview");
              }
            }
          }
        } else if (json !== null) {
          router.push("/login");
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router, showToast]);

  const pageMeta = getPageMeta(currentTab);

  return (
    <div className="min-h-screen flex app-canvas text-slate-900">
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => navigateToTabSafe(tab)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userRole={currentUser?.role}
        unreadNotificationsCount={unreadNotificationsCount}
        leadsCount={
          canAccessLeads && leadsWorkspace.hasLoadedLeads
            ? leadsWorkspace.leadStats.total
            : undefined
        }
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
          pageTitle={pageMeta.title}
          pageGroup={pageMeta.group}
          currentUser={currentUser || undefined}
          onNavigateToTab={(tab, searchText) => navigateToTabSafe(tab, searchText)}
          onUnreadCountChange={setUnreadNotificationsCount}
        />

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 max-w-[1440px] w-full mx-auto">
          <div key={currentTab} className="space-y-6 animate-page-in">
            {/* TAB: DASHBOARD (OVERVIEW) */}
            {currentTab === "overview" && (
              <OverviewView
                leads={leadsWorkspace.leads}
                stats={leadsWorkspace.leadStats}
                hasLoadedLeads={leadsWorkspace.hasLoadedLeads || !canAccessLeads}
                userRole={currentUser?.role}
                onNavigateToLeads={(status) => {
                  if (!canAccessLeads) {
                    showToast("Vai trò của bạn không có quyền truy cập Quản lý Lead.");
                    return;
                  }
                  leadsWorkspace.setStatusFilter(
                    status && status !== "all" ? status : "all"
                  );
                  setCurrentTab("leads");
                }}
                onNavigateToTab={(tab) => navigateToTabSafe(tab)}
                onSelectLead={leadsWorkspace.handleSelectLead}
              />
            )}

            {/* TAB: LEAD MANAGEMENT */}
            {currentTab === "leads" && canAccessLeads && (
              <LeadsWorkspaceView
                displayedLeads={leadsWorkspace.displayedLeads}
                leadStats={leadsWorkspace.leadStats}
                isLoading={leadsWorkspace.isLoading}
                hasLoadedLeads={leadsWorkspace.hasLoadedLeads}
                leadLoadError={leadsWorkspace.leadLoadError}
                showFilters={leadsWorkspace.showFilters}
                onToggleFilters={() =>
                  leadsWorkspace.setShowFilters((v) => !v)
                }
                activeFilterCount={leadsWorkspace.activeFilterCount}
                nonStatusFilterCount={leadsWorkspace.nonStatusFilterCount}
                searchQuery={leadsWorkspace.searchQuery}
                onSearchChange={leadsWorkspace.setSearchQuery}
                statusFilter={leadsWorkspace.statusFilter}
                onStatusFilterChange={leadsWorkspace.setStatusFilter}
                sourceFilter={leadsWorkspace.sourceFilter}
                onSourceFilterChange={leadsWorkspace.setSourceFilter}
                salesFilter={leadsWorkspace.salesFilter}
                onSalesFilterChange={leadsWorkspace.setSalesFilter}
                productFilter={leadsWorkspace.productFilter}
                onProductFilterChange={leadsWorkspace.setProductFilter}
                dateFilter={leadsWorkspace.dateFilter}
                onDateFilterChange={leadsWorkspace.setDateFilter}
                customDateFrom={leadsWorkspace.customDateFrom}
                onCustomDateFromChange={leadsWorkspace.setCustomDateFrom}
                customDateTo={leadsWorkspace.customDateTo}
                onCustomDateToChange={leadsWorkspace.setCustomDateTo}
                onResetFilters={leadsWorkspace.handleResetFilters}
                onFilterStatus={leadsWorkspace.handleFilterStatus}
                onSelectLead={leadsWorkspace.handleSelectLead}
                onEditLead={leadsWorkspace.handleOpenEditLead}
                onOpenNewLead={leadsWorkspace.handleOpenNewLead}
                onOpenImportLeads={() =>
                  leadsWorkspace.setIsImportLeadsOpen(true)
                }
                onExportLeads={() => void leadsWorkspace.handleExportLeads()}
                isExportingLeads={leadsWorkspace.isExportingLeads}
                onQuickUpdateStatus={leadsWorkspace.handleQuickUpdateStatus}
                onRetryFetch={() => void leadsWorkspace.fetchLeads()}
              />
            )}

            {/* TAB: TRACKING */}
            {currentTab === "tracking" &&
              canRoleAccessTab(currentUser?.role, "tracking") && <TrackingView />}

            {/* TAB: ADS & KEYWORDS */}
            {currentTab === "ads" &&
              canRoleAccessTab(currentUser?.role, "ads") && <AdsView />}

            {/* TAB: REPORTS */}
            {currentTab === "reports" &&
              canRoleAccessTab(currentUser?.role, "reports") && (
                <ReportsView
                  leads={leadsWorkspace.leads}
                  userRole={currentUser?.role}
                  onSelectLead={leadsWorkspace.handleSelectLead}
                />
              )}

            {/* TAB: AI DESIGN STUDIO */}
            {currentTab === "ai-design" &&
              canRoleAccessTab(currentUser?.role, "ai-design") && <AiDesignView />}

            {/* TAB: NOTIFICATIONS CENTER */}
            {currentTab === "notifications" && (
              <NotificationsView
                leads={leadsWorkspace.leads}
                userRole={currentUser?.role}
                onSelectLead={leadsWorkspace.handleSelectLead}
                onNavigateToTab={(tab) => navigateToTabSafe(tab)}
                onUnreadCountChange={setUnreadNotificationsCount}
              />
            )}

            {/* TAB: ADMIN BRAND */}
            {currentTab === "brand" &&
              canRoleAccessTab(currentUser?.role, "brand") && <AdminBrandView />}

            {/* TAB: ADMIN USERS */}
            {currentTab === "users" &&
              canRoleAccessTab(currentUser?.role, "users") && <AdminUsersView />}

            {/* TAB: USER / ADMIN PROFILE */}
            {currentTab === "profile" && (
              <ProfileView
                onProfileUpdated={(updatedUser) => setCurrentUser(updatedUser)}
                onNavigateToUsersAdmin={() => navigateToTabSafe("users")}
              />
            )}

            {/* TAB: ADMIN SETTINGS */}
            {currentTab === "settings" &&
              canRoleAccessTab(currentUser?.role, "settings") && <AdminSettingsView />}
          </div>
        </main>
      </div>

      {/* Slide-Over Detail Sheet & Create/Edit Modal */}
      {leadsWorkspace.selectedLead && (
        <LeadDetailModal
          lead={leadsWorkspace.selectedLead}
          onClose={() => leadsWorkspace.setSelectedLead(null)}
          onEditLead={(leadToEdit) => {
            leadsWorkspace.handleOpenEditLead(leadToEdit);
          }}
          onUpdateStatus={leadsWorkspace.handleUpdateStatus}
          onReassignSales={leadsWorkspace.handleReassignSales}
          currentUserRole={currentUser?.role}
          onLeadMutated={() => void leadsWorkspace.fetchLeads()}
        />
      )}

      {leadsWorkspace.isNewLeadOpen && (
        <NewLeadModal
          isOpen={leadsWorkspace.isNewLeadOpen}
          editingLead={leadsWorkspace.editingLead}
          onClose={() => {
            leadsWorkspace.setIsNewLeadOpen(false);
            leadsWorkspace.setEditingLead(null);
          }}
          onAddLead={leadsWorkspace.handleAddLead}
        />
      )}

      {leadsWorkspace.isImportLeadsOpen && (
        <ImportLeadsModal
          isOpen={leadsWorkspace.isImportLeadsOpen}
          onClose={() => leadsWorkspace.setIsImportLeadsOpen(false)}
          onImported={(msg) => {
            showToast(msg);
            void leadsWorkspace.fetchLeads();
          }}
        />
      )}
    </div>
  );
}
