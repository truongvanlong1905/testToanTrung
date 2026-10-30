"use client";

import React from "react";
import { Users2, UserPlus2, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Lead } from "@/types/lead";

interface StatsCardsProps {
  leads: Lead[];
  stats?: {
    total: number;
    newLeads: number;
    quotingLeads: number;
    wonLeads: number;
  };
}

export function StatsCards({ leads, stats }: StatsCardsProps) {
  const totalLeads = stats?.total ?? leads.length;
  const newLeads = stats?.newLeads ?? leads.filter((l) => l.status === "Vừa nhận thông tin").length;
  const quotingLeads = stats?.quotingLeads ?? leads.filter(
    (l) => l.status === "Đang soạn báo giá" || l.status === "Đã gửi báo giá"
  ).length;
  const wonLeads = stats?.wonLeads ?? leads.filter((l) => l.status === "Chốt thành công").length;
  const winRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const cards = [
    {
      title: "Tổng Lead",
      value: totalLeads.toString(),
      subtext: "Toàn bộ lead trong hệ thống",
      trend: "Tổng hiện tại",
      icon: Users2,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
    },
    {
      title: "Lead mới",
      value: newLeads.toString(),
      subtext: "Trạng thái vừa nhận thông tin",
      trend: "Theo dữ liệu thật",
      icon: UserPlus2,
      iconColor: "text-sky-600",
      iconBg: "bg-sky-50",
    },
    {
      title: "Đang báo giá",
      value: quotingLeads.toString(),
      subtext: "Đang soạn & đã gửi báo giá",
      trend: "Đang soạn hoặc đã gửi",
      icon: FileSpreadsheet,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
    },
    {
      title: "Chốt thành công",
      value: wonLeads.toString(),
      subtext: `${winRate}% trên tổng Lead hiện có`,
      trend: "Đã chốt thành công",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] hover:border-slate-300 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {item.title}
              </span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.iconBg}`}
              >
                <Icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {item.value}
              </span>
              <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                {item.trend}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1">{item.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}
