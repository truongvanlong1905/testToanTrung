"use client";

import React from "react";
import { Search, Filter, RotateCcw } from "lucide-react";
import { LeadStatus, LeadSource } from "@/types/lead";
import { STATUS_LIST, SOURCE_LIST, SALES_LIST } from "@/data/mockLeads";

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (source: string) => void;
  salesFilter: string;
  onSalesFilterChange: (sales: string) => void;
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
  onResetFilters,
  totalFiltered,
}: LeadFiltersProps) {
  const hasActiveFilter =
    Boolean(search) ||
    statusFilter !== "all" ||
    sourceFilter !== "all" ||
    salesFilter !== "all";

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên khách, công ty, SĐT, mã lead, sản phẩm..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50/70 border border-slate-200/90 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex-1 sm:flex-initial min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200/90 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex-1 sm:flex-initial min-w-[140px]">
            <select
              value={sourceFilter}
              onChange={(e) => onSourceFilterChange(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200/90 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Tất cả nguồn khách</option>
              {SOURCE_LIST.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          {/* Sales Filter */}
          <div className="flex-1 sm:flex-initial min-w-[140px]">
            <select
              value={salesFilter}
              onChange={(e) => onSalesFilterChange(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200/90 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Tất cả Sales</option>
              {SALES_LIST.map((sl) => (
                <option key={sl.name} value={sl.name}>
                  {sl.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          {hasActiveFilter && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter summary info */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Tìm thấy <strong className="text-slate-800">{totalFiltered}</strong> khách hàng tiềm năng
          </span>
        </span>
        {hasActiveFilter && (
          <span className="text-[11px] text-blue-600 font-medium">
            Đang lọc kết quả
          </span>
        )}
      </div>
    </div>
  );
}

