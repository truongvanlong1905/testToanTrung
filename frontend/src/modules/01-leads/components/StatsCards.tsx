"use client";

import React from "react";
import { Users2, UserPlus2, Clock, CheckCircle2 } from "lucide-react";
import { Lead } from "../types";
import { StatCard } from "@/src/core/ui/stat-card";

interface StatsCardsProps {
  leads: Lead[];
  stats?: {
    total: number;
    newLeads: number;
    quotingLeads: number;
    wonLeads: number;
  };
  /** Currently applied status filter, used to highlight the matching card */
  activeStatus?: string;
  /** Drill-down: clicking a card filters the Lead table by that stage ("all" clears) */
  onFilterStatus?: (status: string) => void;
}

export const StatsCards = React.memo(function StatsCards({
  leads,
  stats,
  activeStatus = "all",
  onFilterStatus,
}: StatsCardsProps) {
  const totalLeads = stats?.total ?? leads.length;
  const newLeads =
    stats?.newLeads ?? leads.filter((l) => l.status === "Vừa nhận thông tin").length;
  const quotingLeads =
    stats?.quotingLeads ??
    leads.filter((l) => l.status === "Đang soạn báo giá" || l.status === "Đã gửi báo giá").length;
  const wonLeads =
    stats?.wonLeads ?? leads.filter((l) => l.status === "Chốt thành công").length;
  const pct = (n: number) => (totalLeads > 0 ? Math.round((n / totalLeads) * 100) : 0);
  const winRate = pct(wonLeads);

  const toggle = (status: string) =>
    onFilterStatus ? () => onFilterStatus(activeStatus === status ? "all" : status) : undefined;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
      <StatCard
        label="Tổng Lead"
        value={totalLeads.toLocaleString("vi-VN")}
        icon={Users2}
        iconTone="blue"
        note="Tổng hồ sơ khách hàng tiềm năng"
        onClick={onFilterStatus ? () => onFilterStatus("all") : undefined}
        actionHint="Xem tất cả"
        // "Tổng Lead" is the reset action, not a selectable filter, so it never looks "selected"
      />
      <StatCard
        label="Lead mới"
        value={newLeads.toLocaleString("vi-VN")}
        icon={UserPlus2}
        iconTone="violet"
        progress={pct(newLeads)}
        note={`${pct(newLeads)}% tổng số · cần liên hệ`}
        onClick={toggle("Vừa nhận thông tin")}
        actionHint="Lọc"
        active={activeStatus === "Vừa nhận thông tin"}
      />
      <StatCard
        label="Đang báo giá"
        value={quotingLeads.toLocaleString("vi-VN")}
        icon={Clock}
        iconTone="amber"
        progress={pct(quotingLeads)}
        badgeText={quotingLeads > 0 ? "Cần bám sát" : undefined}
        badgeTone="warning"
        note="Đang soạn & đã gửi báo giá"
        onClick={toggle("Đã gửi báo giá")}
        actionHint="Lọc đã gửi"
        active={activeStatus === "Đã gửi báo giá"}
      />
      <StatCard
        label="Thành công"
        value={wonLeads.toLocaleString("vi-VN")}
        icon={CheckCircle2}
        iconTone="emerald"
        progress={winRate}
        badgeText={totalLeads > 0 ? `${winRate}% chốt` : undefined}
        badgeTone="success"
        note="Hợp đồng đã xác nhận triển khai"
        onClick={toggle("Chốt thành công")}
        actionHint="Lọc"
        active={activeStatus === "Chốt thành công"}
      />
    </div>
  );
});
