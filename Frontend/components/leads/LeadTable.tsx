"use client";

import React, { useState } from "react";
import {
  Eye,
  Phone,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Tv,
  ExternalLink,
} from "lucide-react";
import { Lead, LeadStatus } from "@/types/lead";
import { cn } from "@/lib/utils";

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onCreateLead?: () => void;
  hasActiveFilters?: boolean;
  itemsPerPage?: number;
}

export function LeadTable({
  leads,
  onSelectLead,
  onCreateLead,
  hasActiveFilters = false,
  itemsPerPage = 8,
}: LeadTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(leads.length / itemsPerPage));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * itemsPerPage;
  const currentLeads = leads.slice(startIndex, startIndex + itemsPerPage);

  // Status Badge Component with pastel colors
  const renderStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case "Vừa nhận thông tin":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {status}
          </span>
        );
      case "Đang soạn báo giá":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {status}
          </span>
        );
      case "Đã gửi báo giá":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            {status}
          </span>
        );
      case "Chốt thành công":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {status}
          </span>
        );
      case "Thất bại":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // Source Badge
  const renderSourceBadge = (source: string) => {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
        {source}
      </span>
    );
  };

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-[0_1px_3px_0_rgba(15,23,42,0.03)]">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <Tv className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          {hasActiveFilters ? "Không tìm thấy Lead phù hợp" : "Chưa có Lead nào"}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          {hasActiveFilters
            ? "Không có kết quả phù hợp với bộ lọc hiện tại. Hãy thử thay đổi điều kiện tìm kiếm."
            : "Thêm khách hàng tiềm năng đầu tiên để bắt đầu theo dõi cơ hội bán hàng."}
        </p>
        {!hasActiveFilters && onCreateLead && (
          <button
            type="button"
            onClick={onCreateLead}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Thêm Lead đầu tiên
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Mã Lead</th>
              <th className="py-3 px-4">Khách hàng / Công ty</th>
              <th className="py-3 px-4">Số điện thoại</th>
              <th className="py-3 px-4">Sản phẩm quan tâm</th>
              <th className="py-3 px-4">Nguồn khách</th>
              <th className="py-3 px-4">Trạng thái</th>
              <th className="py-3 px-4">Sales phụ trách</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {currentLeads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
              >
                {/* 1. Mã Lead */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                    {lead.code}
                  </span>
                </td>

                {/* 2. Khách hàng / Công ty */}
                <td className="py-3.5 px-4 min-w-[200px]">
                  <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                    {lead.customerName}
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-[220px]">
                    {lead.companyName}
                  </div>
                </td>

                {/* 3. Số điện thoại */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="text-xs font-mono font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                    {lead.phone}
                  </span>
                </td>

                {/* 4. Sản phẩm quan tâm */}
                <td className="py-3.5 px-4 min-w-[240px]">
                  <div className="text-xs font-medium text-slate-800 line-clamp-1">
                    {lead.product}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span>{lead.location}</span>
                    <span>•</span>
                    <span className="font-medium text-slate-600">
                      {lead.estimatedValue}
                    </span>
                  </div>
                </td>

                {/* 5. Nguồn khách */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {renderSourceBadge(lead.source)}
                </td>

                {/* 6. Trạng thái */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {renderStatusBadge(lead.status)}
                </td>

                {/* 7. Sales phụ trách */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                      {lead.salesPerson.initials}
                    </div>
                    <span className="text-xs font-medium text-slate-700">
                      {lead.salesPerson.name}
                    </span>
                  </div>
                </td>

                {/* 8. Thao tác */}
                <td
                  className="py-3.5 px-4 text-right whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onSelectLead(lead)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <a
                      href={`tel:${lead.phone}`}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Gọi điện"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Hiển thị{" "}
          <strong className="text-slate-800">
            {leads.length > 0 ? startIndex + 1 : 0} –{" "}
            {Math.min(startIndex + itemsPerPage, leads.length)}
          </strong>{" "}
          trên tổng số{" "}
          <strong className="text-slate-800">{leads.length}</strong> khách hàng
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={validPage === 1}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
            aria-label="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={cn(
                "w-7 h-7 rounded-lg text-xs font-medium transition-colors",
                validPage === page
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={validPage === totalPages}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-600"
            aria-label="Trang tiếp"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
