"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  Send,
  Sun,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/layout/ThemeProvider";

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
  currentUser?: { name: string; role: string; initials: string } | null;
  onNavigateToTab: (tab: string, searchText?: string) => void;
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  ADMIN: "Ban Giám Đốc",
  SALES: "Phòng Kinh Doanh",
  MARKETING: "Phòng Marketing",
  DESIGN: "Phòng Design",
  ADS: "Bộ Phận Quảng Cáo (ADS)",
};

export function Header({
  onMenuToggle,
  pageTitle = "Quản lý Lead",
  currentUser,
  onNavigateToTab,
}: HeaderProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportContent, setReportContent] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const loadReports = async () => {
    try {
      const response = await fetch("/api/department-reports");
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "Không tải được thông báo");
      }
      setReports(payload.data.reports);
      setUnreadCount(payload.data.unreadCount);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không tải được thông báo");
    }
  };

  useEffect(() => {
    if (currentUser) void loadReports();
  }, [currentUser?.name]);

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
      const response = await fetch(`/api/department-reports/${report.id}/read`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Không cập nhật được trạng thái thông báo");
      setReports((items) => items.map((item) => item.id === report.id ? { ...item, isRead: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không cập nhật được trạng thái thông báo");
    }
  };

  const submitReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;
    setIsSubmittingReport(true);
    try {
      let attachment: { fileName: string; fileUrl: string } | null = null;
      if (reportFile) {
        const formData = new FormData();
        formData.set("file", reportFile);
        const uploadResponse = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadPayload.success) {
          throw new Error(uploadPayload.error?.message || "Không tải được tệp báo cáo");
        }
        attachment = {
          fileName: uploadPayload.data.fileName,
          fileUrl: uploadPayload.data.fileUrl,
        };
      }

      const response = await fetch("/api/department-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reportTitle,
          content: reportContent,
          attachmentName: attachment?.fileName,
          attachmentUrl: attachment?.fileUrl,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "Không gửi được báo cáo");
      }

      setNotice("Đã gửi báo cáo đến bảng thông báo chung");
      setReportTitle("");
      setReportContent("");
      setReportFile(null);
      setShowReportForm(false);
      await loadReports();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không gửi được báo cáo");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const roleText = currentUser ? (ROLE_DISPLAY_NAMES[currentUser.role] || currentUser.role) : "";

  return (
    <>
      <header className="relative sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => onNavigateToTab("overview")}
            className="hidden sm:flex items-center gap-2 text-left group"
            title="Về trang chính"
          >
            <span className="font-bold text-sm text-slate-800 group-hover:text-blue-600">TOÀN TRUNG</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-sm text-slate-800">{pageTitle}</span>
          </button>
          <span className="sm:hidden font-semibold text-slate-800 text-sm truncate">{pageTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block w-56 lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              placeholder="Tìm Lead, chiến dịch, nhân viên..."
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearchOpen(false);
                if (event.key === "Enter" && searchResults[0]) handleResultSelect(searchResults[0]);
              }}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white"
              aria-label="Tìm kiếm toàn hệ thống"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400" aria-label="Xóa tìm kiếm">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {searchOpen && query.trim().length >= 2 && (
              <>
                <button className="fixed inset-0 z-30 cursor-default" aria-label="Đóng kết quả tìm kiếm" onClick={() => setSearchOpen(false)} />
                <div className="absolute z-40 top-full mt-2 left-0 right-0 max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                  {isSearching ? (
                    <p className="p-4 text-xs text-slate-500">Đang tìm kiếm...</p>
                  ) : searchResults.length ? searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultSelect(result)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <span className="block text-xs font-semibold text-slate-800">{result.title}</span>
                      <span className="block mt-1 text-[11px] text-slate-500">{result.subtitle}</span>
                    </button>
                  )) : <p className="p-4 text-xs text-slate-500">Không tìm thấy kết quả phù hợp.</p>}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setMobileSearchOpen((open) => !open)}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            aria-label={mobileSearchOpen ? "Đóng tìm kiếm" : "Mở tìm kiếm"}
          >
            {mobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
          {mobileSearchOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg p-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  placeholder="Tìm Lead, chiến dịch, nhân viên..."
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                  aria-label="Tìm kiếm trên điện thoại"
                />
              </div>
              {query.trim().length >= 2 && (
                <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-100">
                  {isSearching ? <p className="p-3 text-xs text-slate-500">Đang tìm kiếm...</p> :
                    searchResults.length ? searchResults.map((result) => (
                      <button key={`${result.type}-${result.id}`} onClick={() => handleResultSelect(result)} className="w-full text-left px-3 py-2.5 border-b border-slate-100 last:border-0">
                        <span className="block text-xs font-semibold text-slate-800">{result.title}</span>
                        <span className="block mt-1 text-[11px] text-slate-500">{result.subtitle}</span>
                      </button>
                    )) : <p className="p-3 text-xs text-slate-500">Không tìm thấy kết quả phù hợp.</p>}
                </div>
              )}
            </div>
          )}

          <button onClick={toggleTheme} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg" aria-label={theme === "dark" ? "Bật giao diện sáng" : "Bật giao diện tối"} title={theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}>
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {currentUser ? (
            <>
              <div className="relative">
                <button
                  onClick={() => { setShowNotifications((shown) => !shown); setShowDropdown(false); void loadReports(); }}
                  className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                  aria-label="Thông báo báo cáo phòng ban"
                  title="Thông báo báo cáo phòng ban"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                </button>
                {showNotifications && (
                  <>
                    <button className="fixed inset-0 z-30 cursor-default" aria-label="Đóng thông báo" onClick={() => setShowNotifications(false)} />
                    <div className="absolute z-40 right-0 top-full mt-2 w-[min(90vw,24rem)] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                      <div className="p-4 flex items-center justify-between border-b border-slate-100">
                        <div>
                          <h2 className="font-semibold text-sm text-slate-900">Báo cáo phòng ban</h2>
                          <p className="text-[11px] text-slate-500 mt-1">{unreadCount} báo cáo chưa đọc</p>
                        </div>
                        <button onClick={() => { setShowNotifications(false); setShowReportForm(true); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700">
                          <ClipboardList className="w-3.5 h-3.5" /> Gửi báo cáo
                        </button>
                      </div>
                      <div className="max-h-[65vh] overflow-y-auto divide-y divide-slate-100">
                        {reports.length ? reports.map((report) => (
                          <article key={report.id} onClick={() => void markReportRead(report)} className={`p-4 ${report.isRead ? "bg-white" : "bg-blue-50/60"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-xs font-semibold text-slate-800">{report.title}</h3>
                                <p className="mt-1 text-[11px] text-slate-500">{ROLE_DISPLAY_NAMES[report.department] || report.department} · {report.createdBy.name}</p>
                              </div>
                              {!report.isRead && <span className="mt-1 w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                            </div>
                            <p className="mt-2 text-xs text-slate-600 whitespace-pre-wrap">{report.content}</p>
                            {report.attachmentUrl && <a className="inline-block mt-2 text-xs font-medium text-blue-600 underline" href={report.attachmentUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{report.attachmentName || "Mở tệp báo cáo"}</a>}
                            <time className="block mt-2 text-[10px] text-slate-400">{new Date(report.createdAt).toLocaleString("vi-VN")}</time>
                          </article>
                        )) : <p className="p-6 text-center text-xs text-slate-500">Chưa có báo cáo được gửi.</p>}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative pl-2 sm:border-l sm:border-slate-200">
                <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 text-left" aria-label="Tài khoản">
                  <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center">{currentUser.initials}</span>
                  <span className="hidden lg:block">
                    <span className="block text-xs font-semibold text-slate-800">{currentUser.name}</span>
                    <span className="block text-[11px] text-slate-400">{roleText}</span>
                  </span>
                  <ChevronDown className="hidden lg:block w-3.5 h-3.5 text-slate-400" />
                </button>
                {showDropdown && (
                  <>
                    <button className="fixed inset-0 z-30 cursor-default" aria-label="Đóng menu tài khoản" onClick={() => setShowDropdown(false)} />
                    <div className="absolute z-40 right-0 top-full mt-2 w-52 rounded-xl bg-white border border-slate-200 shadow-xl p-2">
                      <p className="px-2 py-2 text-xs font-semibold text-slate-800">{currentUser.name}</p>
                      <button onClick={() => { setShowDropdown(false); setShowReportForm(true); }} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-50">
                        <ClipboardList className="w-3.5 h-3.5" /> Gửi báo cáo phòng ban
                      </button>
                      <button onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
                        <LogOut className="w-3.5 h-3.5" /> {isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <button onClick={() => router.push("/login")} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">
              <LogIn className="w-3.5 h-3.5" /> Đăng nhập
            </button>
          )}
        </div>
      </header>

      {showReportForm && currentUser && (
        <div className="fixed inset-0 z-[60] bg-slate-950/50 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="report-form-title">
          <form onSubmit={submitReport} className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="report-form-title" className="text-base font-bold text-slate-900">Gửi báo cáo phòng ban</h2>
                <p className="text-xs text-slate-500 mt-1">Thông báo được chia sẻ với người dùng toàn hệ thống.</p>
              </div>
              <button type="button" onClick={() => setShowReportForm(false)} aria-label="Đóng" className="p-1 text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            <label className="block text-xs font-semibold text-slate-700">Tiêu đề
              <input required minLength={3} maxLength={120} value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-slate-700">Nội dung báo cáo
              <textarea required minLength={3} maxLength={5000} rows={5} value={reportContent} onChange={(event) => setReportContent(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-slate-700">Tệp đính kèm (không bắt buộc)
              <input type="file" onChange={(event) => setReportFile(event.target.files?.[0] || null)} className="mt-1 block w-full text-xs" />
              <span className="mt-1 block font-normal text-slate-400">Tối đa 15 MB.</span>
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowReportForm(false)} className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
              <button disabled={isSubmittingReport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                <Send className="w-3.5 h-3.5" /> {isSubmittingReport ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {notice && (
        <div className="fixed top-20 right-5 z-[70] max-w-sm bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs" role="status">
          {notice}
          <button className="ml-3 text-slate-300 underline" onClick={() => setNotice(null)}>Đóng</button>
        </div>
      )}
    </>
  );
}
