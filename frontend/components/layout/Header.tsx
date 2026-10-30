"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Search,
  Sun,
  UserCog,
  X,
  Command,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/layout/ThemeProvider";
import { sharedGetJson } from "@/lib/shared-fetch";

const THEME_LABELS = {
  light: { current: "Sáng", next: "Tối" },
  dark: { current: "Tối", next: "Theo hệ thống" },
  system: { current: "Theo hệ thống", next: "Sáng" },
} as const;

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  tab: string;
}

interface DepartmentReport {
  id: string;
  title: string;
  content: string;
  department: string;
  attachmentName: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  isRead: boolean;
  createdBy: { name: string; role: string; initials: string };
}

interface HeaderProps {
  onMenuToggle: () => void;
  pageTitle?: string;
  pageGroup?: string;
  currentUser?: { name: string; role: string; initials: string; avatar?: string | null } | null;
  onNavigateToTab: (tab: string, searchText?: string) => void;
  notificationsOpenSignal?: number;
  onUnreadCountChange?: (count: number) => void;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  ADMIN: "Ban Giám Đốc",
  SALES: "Phòng Kinh Doanh",
  MARKETING: "Phòng Marketing",
  DESIGN: "Phòng Thiết Kế",
  ADS: "Bộ Phận Quảng Cáo",
};

export function Header({
  onMenuToggle,
  pageTitle = "Dashboard",
  pageGroup = "Workspace",
  currentUser,
  onNavigateToTab,
  notificationsOpenSignal = 0,
  onUnreadCountChange,
}: HeaderProps) {
  const router = useRouter();
  const { preference, toggleTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [reports, setReports] = useState<DepartmentReport[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error?.message || "Không thể tìm kiếm dữ liệu");
        }
        setSearchResults(payload.data.results);
      } catch (error) {
        if (!controller.signal.aborted) {
          setNotice(error instanceof Error ? error.message : "Không thể tìm kiếm dữ liệu");
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const loadReports = async () => {
    try {
      // Shares the in-flight request with the Dashboard, which asks for the same list on first load.
      const { ok, payload } = await sharedGetJson("/api/reports");
      if (!ok || !payload.success) {
        throw new Error(payload.error?.message || "Không tải được thông báo");
      }
      setReports(payload.data.reports);
      const nextUnread = payload.data.unreadCount || 0;
      setUnreadCount(nextUnread);
      onUnreadCountChange?.(nextUnread);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không tải được thông báo");
    }
  };

  useEffect(() => {
    if (currentUser) void loadReports();
  }, [currentUser?.name]);

  useEffect(() => {
    if (notificationsOpenSignal > 0 && currentUser) {
      setShowNotifications(true);
      setShowDropdown(false);
      void loadReports();
    }
  }, [notificationsOpenSignal]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Đăng xuất không thành công");
      router.push("/login");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Đăng xuất không thành công");
      setIsLoggingOut(false);
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    onNavigateToTab(result.tab, result.type === "lead" ? result.title : undefined);
    setQuery("");
    setSearchOpen(false);
    setMobileSearchOpen(false);
  };

  const markReportRead = async (report: DepartmentReport) => {
    if (report.isRead) return;
    try {
      const response = await fetch(`/api/reports/${report.id}/read`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Không cập nhật được trạng thái thông báo");
      setReports((items) =>
        items.map((item) => (item.id === report.id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((count) => {
        const next = Math.max(0, count - 1);
        onUnreadCountChange?.(next);
        return next;
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không cập nhật được trạng thái thông báo");
    }
  };

  const roleText = currentUser ? ROLE_DISPLAY_NAMES[currentUser.role] || currentUser.role : "";

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left: Mobile Trigger + Breadcrumb Context */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200/80 transition-colors"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="w-4 h-4" />
          </button>

          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[13px] min-w-0">
            <button
              type="button"
              onClick={() => onNavigateToTab("overview")}
              className="text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer"
            >
              {pageGroup}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="font-semibold text-slate-900 truncate">{pageTitle}</span>
          </nav>

          <span className="sm:hidden font-semibold text-slate-900 text-[13.5px] truncate">
            {pageTitle}
          </span>
        </div>

        {/* Right: Global Search + Notifications + Theme + Account */}
        <div className="flex items-center gap-2">
          {/* Desktop Global Search */}
          <div className="relative hidden md:block w-60 lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Tìm Lead, chiến dịch, nhân sự..."
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearchOpen(false);
                if (event.key === "Enter" && searchResults[0]) handleResultSelect(searchResults[0]);
              }}
              className="h-8 w-full pl-8.5 pl-8 pr-12 text-[12.5px] bg-slate-50 border border-slate-200/90 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:bg-white transition-colors"
              aria-label="Tìm kiếm toàn hệ thống"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-medium text-slate-400">
                <Command className="w-2.5 h-2.5" />K
              </span>
            )}

            {searchOpen && query.trim().length >= 2 && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-30 cursor-default"
                  aria-label="Đóng kết quả tìm kiếm"
                  onClick={() => setSearchOpen(false)}
                />
                <div className="absolute z-40 top-full mt-1.5 left-0 right-0 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-elevated shadow-floating animate-dropdown-in">
                  {isSearching ? (
                    <p className="p-3.5 text-xs text-slate-500">Đang tìm kiếm dữ liệu...</p>
                  ) : searchResults.length ? (
                    searchResults.map((result) => (
                      <button
                        type="button"
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultSelect(result)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                      >
                        <div className="min-w-0">
                          <span className="block text-[13px] font-medium text-slate-900 truncate">
                            {result.title}
                          </span>
                          <span className="block mt-0.5 text-xs text-slate-500 truncate">
                            {result.subtitle}
                          </span>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    ))
                  ) : (
                    <p className="p-3.5 text-xs text-slate-500">
                      Không tìm thấy kết quả phù hợp.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile Search Toggle */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((open) => !open)}
            className="md:hidden h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200/80"
            aria-label={mobileSearchOpen ? "Đóng tìm kiếm" : "Mở tìm kiếm"}
          >
            {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          {/* Theme: cycles Sáng → Tối → Theo hệ thống */}
          <button
            type="button"
            onClick={toggleTheme}
            className="h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            aria-label={`Giao diện: ${THEME_LABELS[preference].current}. Nhấn để chuyển sang ${THEME_LABELS[preference].next}`}
            title={`Giao diện: ${THEME_LABELS[preference].current} — nhấn để chuyển sang ${THEME_LABELS[preference].next}`}
          >
            {preference === "dark" ? (
              <Moon className="w-4 h-4 text-blue-600" />
            ) : preference === "light" ? (
              <Sun className="w-4 h-4 text-amber-600" />
            ) : (
              <Monitor className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {currentUser ? (
            <>
              {/* Notifications Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotifications((shown) => !shown);
                    setShowDropdown(false);
                    void loadReports();
                  }}
                  className="relative h-8 w-8 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
                  aria-label="Thông báo hệ thống"
                  title="Thông báo & báo cáo mới"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-blue-600 text-white text-[10px] kpi-number font-semibold flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-30 cursor-default"
                      aria-label="Đóng thông báo"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute z-40 right-0 top-full mt-2 w-[min(92vw,24rem)] bg-elevated border border-slate-200 rounded-xl shadow-floating overflow-hidden animate-dropdown-in">
                      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/60">
                        <div>
                          <h2 className="font-semibold text-[13.5px] text-slate-900">
                            Thông báo &amp; Báo cáo
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {unreadCount > 0
                              ? `${unreadCount} báo cáo chưa đọc`
                              : "Tất cả thông báo đã được đọc"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotifications(false);
                            onNavigateToTab("reports");
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          <ClipboardList className="w-3.5 h-3.5" /> Xem tất cả
                        </button>
                      </div>
                      <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-100">
                        {reports.length ? (
                          reports.map((report) => (
                            <article
                              key={report.id}
                              onClick={() => void markReportRead(report)}
                              className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                                report.isRead ? "bg-white" : "bg-blue-50/40"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2.5">
                                <div className="min-w-0">
                                  <h3 className="text-[13px] font-semibold text-slate-900 truncate">
                                    {report.title}
                                  </h3>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {ROLE_DISPLAY_NAMES[report.department] || report.department} ·{" "}
                                    {report.createdBy.name}
                                  </p>
                                </div>
                                {!report.isRead && (
                                  <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                )}
                              </div>
                              <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 whitespace-pre-wrap leading-relaxed">
                                {report.content}
                              </p>
                              <time className="block mt-1.5 text-[11px] text-slate-400">
                                {new Date(report.createdAt).toLocaleString("vi-VN")}
                              </time>
                            </article>
                          ))
                        ) : (
                          <p className="p-6 text-center text-xs text-slate-500">
                            Chưa có thông báo hoặc báo cáo mới.
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Account Dropdown */}
              <div className="relative pl-1.5 sm:border-l sm:border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-slate-100/80 text-left transition-colors cursor-pointer"
                  aria-label="Menu tài khoản người dùng"
                >
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-[#1E3A8A] text-white font-semibold text-[11px] flex items-center justify-center shrink-0">
                      {currentUser.initials}
                    </span>
                  )}
                  <span className="hidden lg:block max-w-[140px]">
                    <span className="block text-[12.5px] font-semibold text-slate-900 leading-tight truncate">
                      {currentUser.name}
                    </span>
                    <span className="block text-[11px] text-slate-500 leading-tight truncate">
                      {roleText}
                    </span>
                  </span>
                  <ChevronDown className="hidden lg:block w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {showDropdown && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-30 cursor-default"
                      aria-label="Đóng menu tài khoản"
                      onClick={() => setShowDropdown(false)}
                    />
                    <div className="absolute z-40 right-0 top-full mt-2 w-60 rounded-xl bg-elevated border border-slate-200 shadow-floating p-1.5 space-y-0.5 animate-dropdown-in">
                      <div className="px-3 py-2 border-b border-slate-100 mb-1">
                        <p className="text-[13px] font-semibold text-slate-900 truncate">
                          {currentUser.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{roleText}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          onNavigateToTab("profile");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        <UserCog className="w-4 h-4 text-slate-500" /> Hồ sơ tài khoản
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropdown(false);
                          onNavigateToTab("reports");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        <ClipboardList className="w-4 h-4 text-slate-500" /> Báo cáo phòng ban
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />{" "}
                        {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="h-8 inline-flex items-center gap-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" /> Đăng nhập
            </button>
          )}
        </div>
      </header>

      {/* Mobile Search Bar */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 py-2.5 bg-white border-b border-slate-200">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Tìm Lead, chiến dịch, nhân sự..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full pl-8 pr-8 text-[13px] bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>
          {query.trim().length >= 2 && (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 max-h-60 overflow-auto">
              {searchResults.map((result) => (
                <button
                  type="button"
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultSelect(result)}
                  className="w-full text-left px-3 py-2 text-[13px] hover:bg-slate-50"
                >
                  <p className="font-medium text-slate-900">{result.title}</p>
                  <p className="text-xs text-slate-500">{result.subtitle}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {notice && (
        <div
          className="fixed top-[68px] right-4 sm:right-6 z-[70] max-w-sm bg-slate-900 text-white border border-white/10 px-3.5 py-2.5 rounded-lg shadow-floating text-xs flex items-center justify-between gap-3 animate-toast-in"
          role="status"
        >
          <span>{notice}</span>
          <button
            type="button"
            className="text-slate-300 hover:text-white font-medium text-xs cursor-pointer"
            onClick={() => setNotice(null)}
          >
            Đóng
          </button>
        </div>
      )}
    </>
  );
}
