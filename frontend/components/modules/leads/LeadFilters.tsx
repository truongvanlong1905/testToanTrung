"use client";

import React from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { STATUS_LIST, SOURCE_LIST, SALES_LIST } from "@/data/mockLeads";
import { SearchInput } from "@/components/ui/feedback-states";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const PRODUCT_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả sản phẩm" },
  { value: "LED trong nhà", label: "LED trong nhà" },
  { value: "LED ngoài trời", label: "LED ngoài trời" },
  { value: "Bảng điện tử", label: "Bảng điện tử" },
  { value: "Màn hình cong / đặc thù", label: "Màn hình cong / đặc thù" },
  { value: "Khác", label: "Sản phẩm khác" },
];

export const DATE_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả thời gian" },
  { value: "7d", label: "7 ngày gần đây" },
  { value: "30d", label: "30 ngày gần đây" },
  { value: "custom", label: "Tùy chọn ngày..." },
];

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (source: string) => void;
  salesFilter: string;
  onSalesFilterChange: (sales: string) => void;
  productFilter?: string;
  onProductFilterChange?: (product: string) => void;
  dateFilter?: string;
  onDateFilterChange?: (date: string) => void;
  customDateFrom?: string;
  onCustomDateFromChange?: (date: string) => void;
  customDateTo?: string;
  onCustomDateToChange?: (date: string) => void;
  onResetFilters: () => void;
  totalFiltered: number;
}

export function LeadFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sourceFilter,
  onSourceFilterChange,
  salesFilter,
  onSalesFilterChange,
  productFilter = "all",
  onProductFilterChange,
  dateFilter = "all",
  onDateFilterChange,
  customDateFrom = "",
  onCustomDateFromChange,
  customDateTo = "",
  onCustomDateToChange,
  onResetFilters,
  totalFiltered,
}: LeadFiltersProps) {
  const activeFlags = [
    Boolean(search.trim()),
    statusFilter !== "all",
    sourceFilter !== "all",
    salesFilter !== "all",
    productFilter !== "all",
    dateFilter !== "all",
  ];
  const activeCount = activeFlags.filter(Boolean).length;
  const hasActiveFilter = activeCount > 0;

  // Selects that currently narrow the data get a tinted style, so "what is filtered" is visible at a glance.
  const selectClass = (active: boolean) =>
    cn("crm-select w-full sm:w-auto sm:min-w-[148px] cursor-pointer", active && "crm-select-active");

  return (
    <div className="crm-card p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="hidden xl:inline-flex h-9 items-center gap-1.5 pr-1 text-xs font-semibold text-slate-500"
          aria-hidden="true"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Bộ lọc
        </span>

        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Tìm tên khách, công ty, SĐT, mã Lead..."
          aria-label="Tìm kiếm Lead"
          containerClassName="w-full sm:w-72 sm:flex-none"
        />

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          aria-label="Lọc theo trạng thái"
          className={selectClass(statusFilter !== "all")}
        >
          <option value="all">Trạng thái: Tất cả</option>
          {STATUS_LIST.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => onSourceFilterChange(e.target.value)}
          aria-label="Lọc theo nguồn Lead"
          className={selectClass(sourceFilter !== "all")}
        >
          <option value="all">Nguồn: Tất cả</option>
          {SOURCE_LIST.map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>

        <select
          value={salesFilter}
          onChange={(e) => onSalesFilterChange(e.target.value)}
          aria-label="Lọc theo Sales phụ trách"
          className={selectClass(salesFilter !== "all")}
        >
          <option value="all">Sales: Tất cả</option>
          {SALES_LIST.map((sl) => (
            <option key={sl.name} value={sl.name}>
              {sl.name}
            </option>
          ))}
        </select>

        <select
          value={productFilter}
          onChange={(e) => onProductFilterChange?.(e.target.value)}
          aria-label="Lọc theo nhóm sản phẩm"
          className={selectClass(productFilter !== "all")}
        >
          {PRODUCT_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => onDateFilterChange?.(e.target.value)}
          aria-label="Lọc theo thời gian tiếp nhận"
          className={selectClass(dateFilter !== "all")}
        >
          {DATE_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {dateFilter === "custom" && (
          <div className="flex items-center gap-1.5 animate-dropdown-in">
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => onCustomDateFromChange?.(e.target.value)}
              aria-label="Từ ngày"
              className="crm-input w-auto"
            />
            <span className="text-slate-400">–</span>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => onCustomDateToChange?.(e.target.value)}
              aria-label="Đến ngày"
              className="crm-input w-auto"
            />
          </div>
        )}
      </div>

      {/* Result summary + clear */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Hiển thị{" "}
            <strong className="font-semibold text-slate-900 kpi-number">{totalFiltered}</strong> kết
            quả
          </span>
          {hasActiveFilter && (
            <StatusBadge tone="info" size="sm" dot={false}>
              Đang áp dụng {activeCount} bộ lọc
            </StatusBadge>
          )}
        </div>

        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onResetFilters}
            leftIcon={<RotateCcw className="w-3 h-3" />}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>
    </div>
  );
}
