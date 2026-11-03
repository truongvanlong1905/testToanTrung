"use client";

import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users2,
  Activity,
  Megaphone,
  BarChart3,
  Sparkles,
  Bell,
  UserCog,
  Settings,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { canRoleAccessTab } from "@/src/core/auth/permissions";
import { cn } from "@/src/core/utils/utils";
import { ToanTrungLogo } from "@/src/core/layout/ToanTrungLogo";
import { getRoleMeta, StatusBadge } from "@/src/core/ui/badge";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  unreadNotificationsCount?: number;
  leadsCount?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  highlightUnread?: boolean;
}

const HEX_COLOR = /^#([0-9a-f]{6})$/i;

function applyBrandColor(hex?: string) {
  const root = document.documentElement;
  if (!hex || !HEX_COLOR.test(hex)) {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-hover");
    return;
  }
  const n = parseInt(hex.slice(1), 16);
  const rgb: [number, number, number] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const darker = rgb.map((v) => Math.round(v * 0.84));
  root.style.setProperty("--primary", rgb.join(" "));
  root.style.setProperty("--primary-hover", darker.join(" "));
}

export function Sidebar({
  currentTab,
  onTabChange,
  isOpen,
  onClose,
  userRole,
  unreadNotificationsCount = 0,
  leadsCount = 0,
}: SidebarProps) {
  const [brand, setBrand] = useState({ name: "TOÀN TRUNG", logoUrl: "" });

  useEffect(() => {
    try {
      window.localStorage.removeItem("tt_sidebar_collapsed");
    } catch {
      // ignore storage errors
    }

    fetch("/api/admin/brand")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((payload) => {
        if (payload?.success && payload.data?.setting) {
          setBrand({
            name: payload.data.setting.brandName || "TOÀN TRUNG",
            logoUrl: payload.data.setting.logoUrl || "",
          });
          applyBrandColor(payload.data.setting.primaryColor);
        }
      })
      .catch(() => {});
  }, []);

  const primaryItems: NavItem[] = [
    {
      id: "overview",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
  ].filter((item) => canRoleAccessTab(userRole, item.id));

  const workspaceItems: NavItem[] = [
    {
      id: "leads",
      label: "Quản lý Lead",
      icon: Users2,
      badge: leadsCount > 0 ? leadsCount.toLocaleString("vi-VN") : undefined,
    },
    {
      id: "tracking",
      label: "Tracking",
      icon: Activity,
    },
    {
      id: "ads",
      label: "Quảng cáo & Từ khóa",
      icon: Megaphone,
    },
    {
      id: "reports",
      label: "Báo cáo",
      icon: BarChart3,
    },
    {
      id: "ai-design",
      label: "Thiết kế AI",
      icon: Sparkles,
    },
  ].filter((item) => canRoleAccessTab(userRole, item.id));

  const systemItems: NavItem[] = [
    {
      id: "notifications",
      label: "Thông báo",
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      highlightUnread: unreadNotificationsCount > 0,
    },
    {
      id: "profile",
      label: "Hồ sơ tài khoản",
      icon: User,
    },
    {
      id: "users",
      label: "Quản lý tài khoản",
      icon: UserCog,
    },
    {
      id: "brand",
      label: "Thương hiệu",
      icon: ShieldCheck,
    },
    {
      id: "settings",
      label: "Cài đặt hệ thống",
      icon: Settings,
    },
  ].filter((item) => canRoleAccessTab(userRole, item.id));

  const roleMeta = getRoleMeta(userRole);

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;

    return (
      <button
        key={item.id}
        type="button"
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        onClick={() => {
          onTabChange(item.id);
          if (window.innerWidth < 1024) onClose();
        }}
        className={cn(
          "relative w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] transition-colors duration-150 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30",
          isActive
            ? "bg-gradient-to-r from-blue-50 to-violet-50/70 text-blue-700 font-semibold"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
        )}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute -left-2.5 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b from-blue-600 to-violet-600"
          />
        )}
        <div className="relative flex items-center gap-2.5 min-w-0">
          <Icon
            className={cn(
              "w-4 h-4 shrink-0 transition-colors duration-150",
              isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
            )}
          />
          <span className="truncate">{item.label}</span>
        </div>

        {item.badge !== undefined && (
          <span
            className={cn(
              "text-[11px] kpi-number px-1.5 py-0.5 rounded-md font-semibold shrink-0",
              item.highlightUnread
                ? "bg-blue-600 text-white"
                : isActive
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
            )}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden transition-opacity duration-150"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-[244px] bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 select-none shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top Brand Bar */}
        <div className="h-14 max-h-[80px] flex items-center justify-between px-3.5 border-b border-slate-200/80 shrink-0">
          <button
            type="button"
            onClick={() => {
              onTabChange("overview");
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex items-center text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25 py-1 cursor-pointer min-w-0"
            title="Về trang Dashboard Toàn Trung"
          >
            {brand.logoUrl && brand.logoUrl !== "/logo.png" ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="w-8 h-8 rounded-lg object-contain border border-slate-200 bg-white p-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <span className="block font-semibold text-[14px] leading-none tracking-[-0.02em] text-slate-900 truncate">
                    {brand.name}
                  </span>
                  <span className="block text-[10px] font-semibold tracking-[0.06em] text-slate-400 uppercase mt-0.5 truncate">
                    MINI CRM
                  </span>
                </div>
              </div>
            ) : (
              <ToanTrungLogo size="md" showText={true} />
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Đóng menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
          <nav className="space-y-0.5" aria-label="Tổng quan">
            {primaryItems.map(renderNavButton)}
          </nav>

          {workspaceItems.length > 0 && (
            <div>
              <div className="px-2.5 mb-1.5">
                <span className="text-[11px] font-semibold tracking-[0.05em] text-slate-400 uppercase">
                  Nghiệp vụ
                </span>
              </div>
              <nav className="space-y-0.5" aria-label="Nghiệp vụ">
                {workspaceItems.map(renderNavButton)}
              </nav>
            </div>
          )}

          {systemItems.length > 0 && (
            <div>
              <div className="px-2.5 mb-1.5">
                <span className="text-[11px] font-semibold tracking-[0.05em] text-slate-400 uppercase">
                  Hệ thống
                </span>
              </div>
              <nav className="space-y-0.5" aria-label="Hệ thống">
                {systemItems.map(renderNavButton)}
              </nav>
            </div>
          )}
        </div>

        {/* Footer: Role Context */}
        <div className="p-2.5 border-t border-slate-200/80 bg-slate-50/40 shrink-0">
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white border border-slate-200/80">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-medium text-slate-600 truncate">
                Phiên làm việc
              </span>
            </div>
            <StatusBadge tone={roleMeta.tone} dot={false} size="sm">
              {roleMeta.label}
            </StatusBadge>
          </div>
        </div>
      </aside>
    </>
  );
}
