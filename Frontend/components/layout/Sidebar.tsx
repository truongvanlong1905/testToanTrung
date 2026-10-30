"use client";

import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users2,
  Activity,
  Megaphone,
  BarChart3,
  Sparkles,
  ShieldCheck,
  UserCog,
  Settings,
  Tv2,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToanTrungLogo } from "@/components/common/ToanTrungLogo";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

export function Sidebar({ currentTab, onTabChange, isOpen, onClose, userRole }: SidebarProps) {
  const [brand, setBrand] = useState({ name: "TOÀN TRUNG", logoUrl: "" });
  const [leadsCount, setLeadsCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/brand")
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được nhận diện thương hiệu");
        return response.json();
      })
      .then((payload) => {
        if (payload.success && payload.data?.setting) {
          setBrand({
            name: payload.data.setting.brandName || "TOÀN TRUNG",
            logoUrl: payload.data.setting.logoUrl || "",
          });
        }
      })
      .catch((error) => console.error("Load sidebar brand error:", error));

    fetch("/api/leads?pageSize=1")
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được số Lead");
        return response.json();
      })
      .then((payload) => {
        if (payload.success) setLeadsCount(payload.data.stats.total);
      })
      .catch((error) => console.error("Load sidebar lead count error:", error));
  }, []);

  const workspaceItems = [
    { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
    { id: "leads", label: "Quản lý Lead", icon: Users2, badge: leadsCount > 0 ? leadsCount.toLocaleString("vi-VN") : undefined },
    { id: "tracking", label: "Tracking", icon: Activity },
    { id: "ads", label: "Quảng cáo", icon: Megaphone },
    { id: "reports", label: "Báo cáo", icon: BarChart3 },
    { id: "ai-design", label: "AI Design", icon: Sparkles, isNew: true },
  ];

  const adminItems = userRole === "ADMIN" ? [
    { id: "brand", label: "Quản lý thương hiệu", icon: ShieldCheck },
    { id: "users", label: "Quản lý người dùng", icon: UserCog },
    { id: "settings", label: "Cài đặt", icon: Settings },
  ] : [];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="h-18 flex items-center justify-between px-4 border-b border-slate-100 bg-white/70 backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              onTabChange("overview");
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex items-center text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 py-1"
            title="Về trang chính Toàn Trung"
          >
            {brand.logoUrl && brand.logoUrl !== "/logo.png" ? (
              <div className="flex items-center gap-2.5">
                <img src={brand.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-contain shadow-sm" />
                <div>
                  <span className="block font-black text-[15px] font-heading leading-none tracking-tight text-slate-900">
                    {brand.name}
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                    Telecom & LED Display
                  </span>
                </div>
              </div>
            ) : (
              <ToanTrungLogo size="md" />
            )}
          </button>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* WORKSPACE group */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              WORKSPACE
            </div>
            <nav className="space-y-1">
              {workspaceItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      isActive
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isActive
                            ? "text-blue-600"
                            : "text-slate-400 group-hover:text-slate-600"
                        )}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-semibold",
                          isActive
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.isNew && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                        Mới
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ADMIN group */}
          {adminItems.length > 0 && (
            <div>
            <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              ADMIN
            </div>
            <nav className="space-y-1">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      isActive
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "w-4 h-4 transition-colors",
                          isActive
                            ? "text-blue-600"
                            : "text-slate-400 group-hover:text-slate-600"
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
            </div>
          )}
        </div>

        {/* Footer info box */}
        <div className="p-3 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>LED & Bảng điện tử</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Giải pháp hiển thị chuyên nghiệp Toàn Trung Telecom JSC.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
