"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "warning" | "error" | "info" | "neutral";

interface StatusBadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
}

const TONE_CLASSES: Record<BadgeTone, { badge: string; dot: string }> = {
  success: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dot: "bg-emerald-500",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700 border-amber-200/80",
    dot: "bg-amber-500",
  },
  error: {
    badge: "bg-rose-50 text-rose-700 border-rose-200/80",
    dot: "bg-rose-500",
  },
  info: {
    badge: "bg-blue-50 text-blue-700 border-blue-200/80",
    dot: "bg-blue-500",
  },
  neutral: {
    badge: "bg-slate-100 text-slate-700 border-slate-200/90",
    dot: "bg-slate-400",
  },
};

export function StatusBadge({
  tone = "neutral",
  dot = true,
  size = "md",
  children,
  className,
}: StatusBadgeProps) {
  const styles = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium leading-none whitespace-nowrap",
        size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-[11.5px]",
        styles.badge,
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", styles.dot)} />}
      <span>{children}</span>
    </span>
  );
}

export function getLeadStatusTone(status: string): BadgeTone {
  switch (status) {
    case "Chốt thành công":
    case "Thành công":
      return "success";
    case "Đã gửi báo giá":
      return "info";
    case "Đang soạn báo giá":
    case "Đang lên báo giá":
      return "warning";
    case "Thất bại":
      return "error";
    case "Vừa nhận thông tin":
    case "Mới tiếp nhận":
    default:
      return "neutral";
  }
}

export function getRoleMeta(role?: string): { label: string; tone: BadgeTone } {
  switch (role) {
    case "ADMIN":
      return { label: "Quản Trị (ADMIN)", tone: "info" };
    case "DIRECTOR":
      return { label: "Giám Đốc", tone: "warning" };
    case "SALES":
      return { label: "Phòng Kinh Doanh", tone: "success" };
    case "MARKETING":
      return { label: "Phòng Marketing", tone: "info" };
    case "ADS":
      return { label: "Bộ Phận Ads", tone: "warning" };
    case "DESIGN":
      return { label: "Phòng Thiết Kế", tone: "neutral" };
    default:
      return { label: role || "Nhân sự (USER)", tone: "neutral" };
  }
}

export function getActorMeta(actorType?: string): { label: string; tone: BadgeTone } {
  switch (actorType) {
    case "ADMIN":
      return { label: "ADMIN", tone: "info" };
    case "DIRECTOR":
      return { label: "GIÁM ĐỐC", tone: "warning" };
    case "USER":
    default:
      return { label: "USER", tone: "success" };
  }
}
