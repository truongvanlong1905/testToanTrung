"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users2,
  DollarSign,
  CheckCircle2,
  Tv,
  ArrowUpRight,
  Flame,
  Award,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Lead } from "@/types/lead";

interface OverviewViewProps {
  leads: Lead[];
  stats?: {
    total: number;
    newLeads: number;
    quotingLeads: number;
    wonLeads: number;
    lostLeads: number;
    salesLeaderboard: { name: string; initials: string; count: number }[];
  };
  onNavigateToLeads: () => void;
  onSelectLead: (lead: Lead) => void;
}

export function OverviewView({
  leads,
  stats,
  onNavigateToLeads,
  onSelectLead,
}: OverviewViewProps) {
  const totalLeads = stats?.total ?? leads.length;
  const newLeads = stats?.newLeads ?? leads.filter((l) => l.status === "Vừa nhận thông tin").length;
  const quotingLeads = stats?.quotingLeads ?? leads.filter(
    (l) => l.status === "Đang soạn báo giá" || l.status === "Đã gửi báo giá"
  ).length;
  const wonLeads = stats?.wonLeads ?? leads.filter((l) => l.status === "Chốt thành công").length;
  const lostLeads = stats?.lostLeads ?? leads.filter((l) => l.status === "Thất bại").length;

  const winRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Top Sales calculation
  const salesMap: Record<string, { count: number; initials: string }> = {};
  leads.forEach((l) => {
    const name = l.salesPerson.name;
    if (!salesMap[name]) {
      salesMap[name] = { count: 0, initials: l.salesPerson.initials || "TT" };
    }
    salesMap[name].count += 1;
  });

  const topSalesFromPage = Object.entries(salesMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);
  const topSales = stats ? stats.salesLeaderboard : topSalesFromPage;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-blue-100 text-xs font-medium mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Hệ thống Quản lý Marketing & Kinh doanh Toàn Trung Telecom</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Chào mừng trở lại, Ban Giám Đốc!
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-2 leading-relaxed">
            Hiện có <strong>{totalLeads} khách hàng tiềm năng</strong>, trong đó <strong>{quotingLeads} khách hàng đang ở bước báo giá</strong>. Tỷ lệ chốt hiện tại là <strong>{winRate}%</strong>.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateToLeads}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span>Xem danh sách Lead</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-blue-200 px-3 py-2 bg-black/10 rounded-xl backdrop-blur-sm border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Dữ liệu đồng bộ trực tiếp từ Database</span>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Tổng số Lead
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalLeads}
            </span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Dữ liệu hiện tại
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Toàn bộ khách hàng trong hệ thống</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Lead Mới Tiếp Nhận
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {newLeads}
            </span>
            <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
              Cần phân công
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Khách mới qua Hotline & Form</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Đang Soạn Báo Giá
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {quotingLeads}
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Đang theo dõi
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Đang khảo sát mặt bằng & bản vẽ</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Chốt Thành Công
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {wonLeads}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Tỷ lệ: {winRate}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Hợp đồng đã ký kết thi công</p>
        </div>
      </div>

      {/* Two Column Section: Pipeline Funnel & Top Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Progress (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Phễu Chuyển Đổi Tiến Độ Dự Án (Lead Pipeline)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Theo dõi từng giai đoạn chăm sóc khách hàng Toàn Trung
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Tự động cập nhật
            </span>
          </div>

          {/* Pipeline Visual Bar */}
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">1. Vừa nhận thông tin ({newLeads} lead)</span>
                <span className="text-slate-500">{totalLeads > 0 ? Math.round((newLeads / totalLeads) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalLeads > 0 ? (newLeads / totalLeads) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">2. Đang soạn báo giá & khảo sát ({quotingLeads} lead)</span>
                <span className="text-slate-500">{totalLeads > 0 ? Math.round((quotingLeads / totalLeads) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalLeads > 0 ? (quotingLeads / totalLeads) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">3. Chốt hợp đồng thành công ({wonLeads} dự án)</span>
                <span className="text-emerald-600 font-bold">{winRate}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">4. Thất bại / Tạm ngưng ({lostLeads} lead)</span>
                <span className="text-rose-500">{totalLeads > 0 ? Math.round((lostLeads / totalLeads) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-rose-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalLeads > 0 ? (lostLeads / totalLeads) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-center">
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-400 font-medium">Thời gian chốt TB</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">8.5 ngày</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-400 font-medium">Giá trị dự án TB</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">485 triệu đ</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[11px] text-slate-400 font-medium">Nguồn hiệu quả nhất</div>
              <div className="text-base font-bold text-blue-600 mt-0.5">Google Ads</div>
            </div>
          </div>
        </div>

        {/* Top Sales Leaderboard (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900">
                Xếp Hạng Sales Toàn Trung
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Tháng này</span>
          </div>

          <div className="space-y-3">
            {topSales.map((s, idx) => (
              <div
                key={s.name}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition-colors border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                      idx === 0
                        ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400/30"
                        : idx === 1
                        ? "bg-slate-200 text-slate-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      {s.name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Phòng Kinh doanh
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-blue-600">
                    {s.count} Leads
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">
                    Đang phụ trách
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Leads Activity Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Khách hàng tiềm năng gần đây
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              5 dự án LED và Bảng điện tử vừa được cập nhật
            </p>
          </div>
          <button
            onClick={onNavigateToLeads}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Xem toàn bộ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {leads.slice(0, 5).map((l) => (
            <div
              key={l.id}
              onClick={() => onSelectLead(l)}
              className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {l.code}
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {l.customerName} - {l.companyName}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    {l.product} • {l.location}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-xs font-medium text-emerald-600">
                  {l.estimatedValue}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                  {l.status}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLead(l);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
