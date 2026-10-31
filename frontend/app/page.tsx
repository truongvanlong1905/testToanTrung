"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/src/core/layout/Sidebar";
import { Header } from "@/src/core/layout/Header";
import { PageSkeleton } from "@/src/core/ui/feedback-states";
import { Toast } from "@/src/core/ui/toast";
import {
  LeadsWorkspaceView,
  useLeadsWorkspace,
  loadLeadDetailModal,
  loadNewLeadModal,
  loadImportLeadsModal,
} from "@/src/modules/01-leads";
import { OverviewView } from "@/src/modules/04-reports-dashboard";

// Heavy / rarely-first views are split into their own chunks and fetched when first opened,
// so the first paint only ships the shell + Dashboard + Lead list.
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

// Only mounted while open (see render below), with chunks preloaded on browser idle / button hover
// so clicking "Thêm Lead / AI" opens in a single frame with zero network wait.
const LeadDetailModal = dynamic(loadLeadDetailModal);
const NewLeadModal = dynamic(loadNewLeadModal);
const ImportLeadsModal = dynamic(loadImportLeadsModal);

function getPageMeta(tab: string): { title: string; group: string } {
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
    case "notifications":
      return { title: "Trung tâm Thông báo", group: "System" };
    case "users":
      return { title: "Tác nhân & Bổ nhiệm", group: "System" };
    case "profile":
      return { title: "Hồ sơ tài khoản", group: "System" };
    case "settings":
      return { title: "Cài đặt hệ thống", group: "System" };
    default:
      return { title: "Dashboard", group: "Workspace" };
  }
}

export default function LeadsDashboardPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // User state
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: string;
    initials: string;
    avatar?: string | null;
  } | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  const leadsWorkspace = useLeadsWorkspace({
    currentUserName: currentUser?.name,
    showToast,
  });

  // Preload modal chunks during browser idle time after initial hydration so first modal click is instant
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNewLeadModal();
      void loadLeadDetailModal();
      void loadImportLeadsModal();
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);

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
          if (tab !== "leads") leadsWorkspace.setSearchQuery("");
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userRole={currentUser?.role}
        unreadNotificationsCount={unreadNotificationsCount}
        leadsCount={
          leadsWorkspace.hasLoadedLeads
            ? leadsWorkspace.leadStats.total
            : undefined
        }
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
            leadsWorkspace.setSearchQuery(
              tab === "leads" ? searchText || "" : ""
            );
          }}
          onUnreadCountChange={setUnreadNotificationsCount}
        />

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 max-w-[1440px] w-full mx-auto">
          {/* key={currentTab} remounts the wrapper so every tab switch gets a short entrance */}
          <div key={currentTab} className="space-y-6 animate-page-in">
            {/* TAB: DASHBOARD (OVERVIEW) */}
            {currentTab === "overview" && (
              <OverviewView
                leads={leadsWorkspace.leads}
                stats={leadsWorkspace.leadStats}
                hasLoadedLeads={leadsWorkspace.hasLoadedLeads}
                onNavigateToLeads={(status) => {
                  leadsWorkspace.setStatusFilter(
                    status && status !== "all" ? status : "all"
                  );
                  setCurrentTab("leads");
                }}
                onNavigateToTab={(tab) => setCurrentTab(tab)}
                onSelectLead={leadsWorkspace.handleSelectLead}
              />
            )}

            {/* TAB: LEAD MANAGEMENT */}
            {currentTab === "leads" && (
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
                onOpenNewLead={leadsWorkspace.handleOpenNewLead}
                onOpenImportLeads={() =>
                  leadsWorkspace.setIsImportLeadsOpen(true)
                }
                onExportLeads={() => void leadsWorkspace.handleExportLeads()}
                isExportingLeads={leadsWorkspace.isExportingLeads}
                onQuickLeadCreated={leadsWorkspace.handleQuickLeadCreated}
                onOpenPrefilledModal={leadsWorkspace.handleOpenPrefilledModal}
                onQuickUpdateStatus={leadsWorkspace.handleQuickUpdateStatus}
                onRetryFetch={() => void leadsWorkspace.fetchLeads()}
              />
            )}

            {/* TAB: TRACKING */}
            {currentTab === "tracking" && <TrackingView />}

            {/* TAB: ADS & KEYWORDS */}
            {currentTab === "ads" && <AdsView />}

            {/* TAB: REPORTS */}
            {currentTab === "reports" && (
              <ReportsView
                leads={leadsWorkspace.leads}
                userRole={currentUser?.role}
                onSelectLead={leadsWorkspace.handleSelectLead}
              />
            )}

            {/* TAB: AI DESIGN STUDIO */}
            {currentTab === "ai-design" && <AiDesignView />}

            {/* TAB: NOTIFICATIONS CENTER */}
            {currentTab === "notifications" && (
              <NotificationsView
                leads={leadsWorkspace.leads}
                userRole={currentUser?.role}
                onSelectLead={leadsWorkspace.handleSelectLead}
                onNavigateToTab={(tab) => setCurrentTab(tab)}
                onUnreadCountChange={setUnreadNotificationsCount}
              />
            )}

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
      {leadsWorkspace.selectedLead && (
        <LeadDetailModal
          lead={leadsWorkspace.selectedLead}
          onClose={() => leadsWorkspace.setSelectedLead(null)}
          onUpdateStatus={leadsWorkspace.handleUpdateStatus}
          onReassignSales={leadsWorkspace.handleReassignSales}
          currentUserRole={currentUser?.role}
          onLeadMutated={() => void leadsWorkspace.fetchLeads()}
        />
      )}

      {leadsWorkspace.isNewLeadOpen && (
        <NewLeadModal
          isOpen={leadsWorkspace.isNewLeadOpen}
          onClose={() => {
            leadsWorkspace.setIsNewLeadOpen(false);
            leadsWorkspace.setAiLeadDraft(null);
            leadsWorkspace.setAiLeadWarning(null);
          }}
          onAddLead={leadsWorkspace.handleAddLead}
          initialDraft={leadsWorkspace.aiLeadDraft}
          initialWarning={leadsWorkspace.aiLeadWarning}
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
