"use client";

import React from "react";
import {
  Loader2,
  SlidersHorizontal,
  FileSpreadsheet,
  Upload,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/src/core/ui/page-header";
import { Button } from "@/src/core/ui/button";
import { ErrorState, PageSkeleton } from "@/src/core/ui/feedback-states";
import { StatsCards } from "./StatsCards";
import { LeadFilters } from "./LeadFilters";
import { LeadTable } from "./LeadTable";
import { AiQuickLeadBar, type AiLeadDraft } from "./AiQuickLeadBar";
import type { Lead, LeadStatsSummary, LeadStatus } from "../types";

export interface LeadsWorkspaceViewProps {
  displayedLeads: Lead[];
  leadStats: LeadStatsSummary;
  isLoading: boolean;
  hasLoadedLeads: boolean;
  leadLoadError: string | null;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  nonStatusFilterCount: number;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (val: string) => void;
  salesFilter: string;
  onSalesFilterChange: (val: string) => void;
  productFilter: string;
  onProductFilterChange: (val: string) => void;
  dateFilter: string;
  onDateFilterChange: (val: string) => void;
  customDateFrom: string;
  onCustomDateFromChange: (val: string) => void;
  customDateTo: string;
  onCustomDateToChange: (val: string) => void;
  onResetFilters: () => void;
  onFilterStatus: (status: string) => void;
  onSelectLead: (lead: Lead) => void;
  onOpenNewLead: () => void;
  onOpenImportLeads: () => void;
  onExportLeads: () => void;
  isExportingLeads: boolean;
  onQuickLeadCreated: (lead: Lead, msg: string) => void;
  onOpenPrefilledModal: (draft: AiLeadDraft, warning?: string) => void;
  onQuickUpdateStatus: (lead: Lead, newStatus: LeadStatus) => void;
  onRetryFetch: () => void;
}

export function LeadsWorkspaceView({
  displayedLeads,
  leadStats,
  isLoading,
  hasLoadedLeads,
  leadLoadError,
  showFilters,
  onToggleFilters,
  activeFilterCount,
  nonStatusFilterCount,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sourceFilter,
  onSourceFilterChange,
  salesFilter,
  onSalesFilterChange,
  productFilter,
  onProductFilterChange,
  dateFilter,
  onDateFilterChange,
  customDateFrom,
  onCustomDateFromChange,
  customDateTo,
  onCustomDateToChange,
  onResetFilters,
  onFilterStatus,
  onSelectLead,
  onOpenNewLead,
  onOpenImportLeads,
  onExportLeads,
  isExportingLeads,
  onQuickLeadCreated,
  onOpenPrefilledModal,
  onQuickUpdateStatus,
  onRetryFetch,
}: LeadsWorkspaceViewProps) {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý Lead"
        description="Theo dõi cơ hội dự án Màn hình LED & Bảng điện tử từ tiếp nhận đến chốt hợp đồng."
        actions={
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant={showFilters || activeFilterCount > 0 ? "subtle" : "secondary"}
              size="md"
              onClick={onToggleFilters}
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto justify-center"
            >
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={onOpenImportLeads}
              leftIcon={<Upload className="w-3.5 h-3.5 text-blue-600" />}
              className="w-full sm:w-auto justify-center"
            >
              Import &amp; Chia Sales
            </Button>

            <Button
              variant="secondary"
              size="md"
              isLoading={isExportingLeads}
              disabled={!hasLoadedLeads}
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              className="w-full sm:w-auto justify-center"
              onClick={onExportLeads}
            >
              Export
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={onOpenNewLead}
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="w-full sm:w-auto justify-center"
            >
              Thêm Lead / AI
            </Button>
          </div>
        }
      />

      {/* AI 1-Click Fast Lead Intake Bar */}
      <AiQuickLeadBar
        onLeadCreated={onQuickLeadCreated}
        onOpenPrefilledModal={onOpenPrefilledModal}
        onSelectLead={onSelectLead}
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
          onRetry={onRetryFetch}
          isRetrying={isLoading}
        />
      )}

      {hasLoadedLeads ? (
        <>
          <StatsCards
            leads={displayedLeads}
            stats={nonStatusFilterCount === 0 ? leadStats : undefined}
            activeStatus={statusFilter}
            onFilterStatus={onFilterStatus}
          />

          {showFilters && (
            <LeadFilters
              search={searchQuery}
              onSearchChange={onSearchChange}
              statusFilter={statusFilter}
              onStatusFilterChange={onStatusFilterChange}
              sourceFilter={sourceFilter}
              onSourceFilterChange={onSourceFilterChange}
              salesFilter={salesFilter}
              onSalesFilterChange={onSalesFilterChange}
              productFilter={productFilter}
              onProductFilterChange={onProductFilterChange}
              dateFilter={dateFilter}
              onDateFilterChange={onDateFilterChange}
              customDateFrom={customDateFrom}
              onCustomDateFromChange={onCustomDateFromChange}
              customDateTo={customDateTo}
              onCustomDateToChange={onCustomDateToChange}
              onResetFilters={onResetFilters}
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
              onSelectLead={onSelectLead}
              onCreateLead={onOpenNewLead}
              onQuickUpdateStatus={onQuickUpdateStatus}
              hasActiveFilters={activeFilterCount > 0}
              itemsPerPage={10}
            />
          </div>
        </>
      ) : !leadLoadError ? (
        <PageSkeleton cards={4} rows={6} />
      ) : null}
    </div>
  );
}
