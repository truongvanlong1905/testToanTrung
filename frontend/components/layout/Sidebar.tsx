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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToanTrungLogo } from "@/components/shared/ToanTrungLogo";
import { getRoleMeta, StatusBadge } from "@/components/ui/badge";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  /** Total Leads, owned by the page (already fetched there — no second request here) */
  leadsCount?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  onClickOverride?: () => void;
}

const HEX_COLOR = /^#([0-9a-f]{6})$/i;

/** Connects the admin "brand colour" setting to the design tokens (--primary / --primary-hover). */
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
  onOpenNotifications,
  unreadNotificationsCount = 0,
  leadsCount = 0,
}: SidebarProps) {
  const [brand, setBrand] = useState({ name: "TOÀN TRUNG", logoUrl: "" });
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Tooltip for the icon-only (collapsed) rail; fixed-position so the scrolling nav can't clip it
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("tt_sidebar_collapsed");
      if (saved === "1") setIsCollapsed(true);
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

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("tt_sidebar_collapsed", next ? "1" : "0");
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const primaryItems: NavItem[] = [
    {
      id: "overview",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
  ];

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
      label: "AI Design",
      icon: Sparkles,
    },
  ];

  const systemItems: NavItem[] = [
    {
      id: "notifications-action",
      label: "Thông báo",
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
      onClickOverride: () => {
        if (onOpenNotifications) {
          onOpenNotifications();
        } else {
          onTabChange("reports");
        }
        if (window.innerWidth < 1024) onClose();
      },
    },
    {
      id: "profile",
      label: "Hồ sơ tài khoản",
      icon: User,
    },
    ...(userRole === "ADMIN"
      ? [
          {
            id: "users",
            label: "Quản lý nhân sự",
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
        ]
      : []),
  ];

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
        onMouseEnter={(e) => {
          if (isCollapsed && window.innerWidth >= 1024) {
            setTip({ label: item.label, top: e.currentTarget.getBoundingClientRect().top + 6 });
          }
        }}
        onMouseLeave={() => setTip(null)}
        onFocus={(e) => {
          if (isCollapsed && window.innerWidth >= 1024) {
            setTip({ label: item.label, top: e.currentTarget.getBoundingClientRect().top + 6 });
          }
        }}
        onBlur={() => setTip(null)}
        onClick={() => {
          setTip(null);
          if (item.onClickOverride) {
            item.onClickOverride();
            return;
          }
          onTabChange(item.id);
          if (window.innerWidth < 1024) onClose();
        }}
        className={cn(
          "relative w-full flex items-center rounded-lg text-[13px] transition-colors duration-150 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30",
          isCollapsed ? "lg:justify-center lg:px-0 lg:py-2 px-2.5 py-2 justify-between" : "justify-between px-2.5 py-2",
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
        <div className={cn("flex items-center min-w-0", isCollapsed ? "lg:gap-0 gap-2.5" : "gap-2.5")}>
          <Icon
            className={cn(
              "w-4 h-4 shrink-0 transition-colors duration-150",
              isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
            )}
          />
          <span className={cn("truncate", isCollapsed && "lg:hidden")}>{item.label}</span>
        </div>

        {item.badge !== undefined && (
          <span
            className={cn(
              "text-[11px] kpi-number px-1.5 py-0.5 rounded-md font-semibold shrink-0",
              isCollapsed && "lg:hidden",
              isActive
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

      {tip && (
        <div
          role="tooltip"
          className="hidden lg:block fixed z-[80] left-[76px] pointer-events-none rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-floating animate-fade-in"
          style={{ top: tip.top }}
        >
          {tip.label}
        </div>
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-[244px] bg-white border-r border-slate-200 flex flex-col transition-[width,transform] duration-200 ease-in-out lg:static lg:translate-x-0 select-none shrink-0",
          isCollapsed ? "lg:w-[68px]" : "lg:w-[244px]",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top Brand Bar (h-14 aligned with Header) */}
        <div
          className={cn(
            "h-14 flex items-center border-b border-slate-200/80 shrink-0",
            isCollapsed ? "lg:justify-center lg:px-2 justify-between px-3.5" : "justify-between px-3.5"
          )}
        >
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
                <div className={cn("min-w-0", isCollapsed && "lg:hidden")}>
                  <span className="block font-semibold text-[14px] leading-none tracking-[-0.02em] text-slate-900 truncate">
                    {brand.name}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className={cn(isCollapsed && "lg:hidden")}>
                  <ToanTrungLogo size="md" showText={true} />
                </div>
                <div className={cn("hidden", isCollapsed && "lg:block")}>
                  <ToanTrungLogo size="md" showText={false} />
                </div>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={toggleCollapse}
            className={cn(
              "hidden lg:inline-flex p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer",
              isCollapsed && "lg:hidden"
            )}
            aria-label="Thu gọn thanh điều hướng"
            title="Thu gọn sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
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
          {/* Primary: Dashboard */}
          <nav className="space-y-0.5" aria-label="Tổng quan">
            {primaryItems.map(renderNavButton)}
          </nav>

          {/* Group: Workspace */}
          <div>
            <div className={cn("px-2.5 mb-1.5", isCollapsed && "lg:hidden")}>
              <span className="text-[11px] font-semibold tracking-[0.05em] text-slate-400 uppercase">
                Workspace
              </span>
            </div>
            {isCollapsed && (
              <div className="hidden lg:block mx-2 mb-2 border-t border-slate-100" />
            )}
            <nav className="space-y-0.5" aria-label="Workspace">
              {workspaceItems.map(renderNavButton)}
            </nav>
          </div>

          {/* Group: System */}
          <div>
            <div
              className={cn(
                "px-2.5 mb-1.5",
                isCollapsed && "lg:hidden"
              )}
            >
              <span className="text-[11px] font-semibold tracking-[0.05em] text-slate-400 uppercase">
                System
              </span>
            </div>
            {isCollapsed && (
              <div className="hidden lg:block mx-2 mb-2 border-t border-slate-100" />
            )}
            <nav className="space-y-0.5" aria-label="Hệ thống">
              {systemItems.map(renderNavButton)}
            </nav>
          </div>
        </div>

        {/* Footer: Role Context & Expand Trigger */}
        <div className="p-2.5 border-t border-slate-200/80 bg-slate-50/40 shrink-0">
          {isCollapsed ? (
            <div className="hidden lg:flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={toggleCollapse}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Mở rộng thanh điều hướng"
                title="Mở rộng sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          <div
            className={cn(
              "flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white border border-slate-200/80",
              isCollapsed && "lg:hidden"
            )}
          >
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
