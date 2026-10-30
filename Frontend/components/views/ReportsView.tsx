"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileText,
  DollarSign,
  Send,
  Plus,
  Paperclip,
  Eye,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  Shield,
  Lock,
  Globe,
  User,
  Sparkles,
  RefreshCw,
  Search,
  Check,
} from "lucide-react";
import { Lead } from "@/types/lead";
import { cn } from "@/lib/utils";

interface ReportsViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

interface ReportItem {
  id: string;
  title: string;
  content: string;
  department: string;
  attachmentName: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  isRead: boolean;
  createdBy: {
    name: string;
    role: string;
    initials: string;
  };
}

const DEPARTMENT_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "Ban Giám Đốc", color: "bg-red-50 text-red-700 border-red-200" },
  SALES: { label: "Phòng Kinh Doanh", color: "bg-blue-50 text-blue-700 border-blue-200" },
  MARKETING: { label: "Phòng Marketing", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DESIGN: { label: "Phòng AI Design", color: "bg-purple-50 text-purple-700 border-purple-200" },
  ADS: { label: "Bộ Phận Quảng Cáo (ADS)", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

export function ReportsView({ leads, onSelectLead }: ReportsViewProps) {
  // Tab chính: "reports_feed" (Văn bản & Báo cáo) hoặc "leads_analytics" (Phân tích Lead)
  const [activeMainTab, setActiveMainTab] = useState<"reports_feed" | "leads_analytics">("reports_feed");

  // State quản lý báo cáo phòng ban
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("SALES");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [searchReportText, setSearchReportText] = useState("");
  const [selectedReportDetail, setSelectedReportDetail] = useState<ReportItem | null>(null);

  // Modal soạn thảo báo cáo phong cách Word
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportContent, setReportContent] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Time range cho phân tích lead
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "quarter" | "year">("30d");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Tải danh sách báo cáo
  const fetchReports = async () => {
    try {
      setIsLoadingReports(true);
      const res = await fetch("/api/department-reports");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setReports(json.data.reports || []);
          if (json.data.currentUserRole) setCurrentUserRole(json.data.currentUserRole);
          if (json.data.currentUserId) setCurrentUserId(json.data.currentUserId);
        }
      }
    } catch (err) {
      console.error("Lỗi tải báo cáo:", err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Xử lý chèn cú pháp định dạng văn bản như Word
  const insertFormatting = (prefix: string, suffix: string = "", defaultPlaceholder: string = "") => {
    const textarea = document.getElementById("word_editor_textarea") as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = reportContent.substring(start, end) || defaultPlaceholder;

    const newContent =
      reportContent.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      reportContent.substring(end);

    setReportContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 50);
  };

  // Upload tệp đính kèm báo cáo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingFile(true);
      const formData = new FormData();
      formData.set("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tải tệp thất bại");
      }

      setAttachmentName(file.name);
      setAttachmentUrl(json.data.fileUrl);
      showToast(`Đã đính kèm tệp "${file.name}"`);
    } catch (err: any) {
      alert(err.message || "Không thể tải tệp lên");
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Gửi báo cáo
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle.trim()) {
      alert("Vui lòng nhập tiêu đề báo cáo");
      return;
    }
    if (!reportContent.trim()) {
      alert("Vui lòng nhập nội dung báo cáo");
      return;
    }

    try {
      setIsSubmittingReport(true);
      const res = await fetch("/api/department-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reportTitle.trim(),
          content: reportContent.trim(),
          attachmentName,
          attachmentUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Lỗi gửi báo cáo");
      }

      showToast(json.message || "Đã gửi báo cáo thành công");
      setReportTitle("");
      setReportContent("");
      setAttachmentName(null);
      setAttachmentUrl(null);
      setIsEditorOpen(false);
      fetchReports();
    } catch (err: any) {
      alert(err.message || "Gửi báo cáo thất bại");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Xuất file CSV phân tích Leads
  const handleExportCSV = () => {
    const headers = [
      "Mã Lead",
      "Khách hàng",
      "Công ty",
      "Số điện thoại",
      "Email",
      "Sản phẩm",
      "Nguồn",
      "Trạng thái",
      "Sales phụ trách",
      "Giá trị dự kiến",
      "Ngày tiếp nhận",
    ];

    const rows = leads.map((l) => [
      l.code,
      `"${l.customerName}"`,
      `"${l.companyName}"`,
      l.phone,
      l.email || "",
      `"${l.product}"`,
      l.source,
      l.status,
      `"${l.salesPerson.name}"`,
      `"${l.estimatedValue}"`,
      l.createdAt,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_Cao_Lead_Toan_Trung_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const quotingLeads = leads.filter(
    (l) => l.status === "Đang soạn báo giá" || l.status === "Đã gửi báo giá"
  );
  const pendingLeads = leads.filter((l) => l.status === "Vừa nhận thông tin");
  const wonLeads = leads.filter((l) => l.status === "Chốt thành công");

  // Lọc báo cáo theo ô tìm kiếm
  const filteredReports = reports.filter(
    (r) =>
      r.title.toLowerCase().includes(searchReportText.toLowerCase()) ||
      r.content.toLowerCase().includes(searchReportText.toLowerCase()) ||
      r.createdBy.name.toLowerCase().includes(searchReportText.toLowerCase())
  );

  const isAdmin = currentUserRole === "ADMIN";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-blue-600 font-semibold">Trung Tâm Báo Cáo</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Báo Cáo Phòng Ban & Hiệu Quả Doanh Nghiệp
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gửi báo cáo công việc lên Ban Giám Đốc, nhận chỉ đạo điều hành và theo dõi tiến độ kinh doanh Toàn Trung Telecom
          </p>
        </div>

        {/* Nút Soạn Báo Cáo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setReportTitle("");
              setReportContent("");
              setAttachmentName(null);
              setAttachmentUrl(null);
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Soạn Báo Cáo Mới</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveMainTab("reports_feed")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeMainTab === "reports_feed"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Văn Bản & Báo Cáo Phòng Ban</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500 text-white font-bold">
            {reports.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab("leads_analytics")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeMainTab === "leads_analytics"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Phân Tích Kinh Doanh & Dự Án Lead</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: DANH SÁCH BÁO CÁO PHÒNG BAN & TRÌNH BAN GIÁM ĐỐC
         ───────────────────────────────────────────────────────────── */}
      {activeMainTab === "reports_feed" && (
        <div className="space-y-4">
          {/* Thanh phân quyền & tìm kiếm */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-bold">
                  <Shield className="w-3.5 h-3.5" />
                  Bạn là Ban Giám Đốc: Xem được báo cáo của toàn bộ các phòng ban
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  Phân quyền: Chỉ Bạn &amp; Ban Giám Đốc mới xem được báo cáo này
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tiêu đề, nội dung báo cáo..."
                value={searchReportText}
                onChange={(e) => setSearchReportText(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Danh sách bài báo cáo */}
          {isLoadingReports ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Đang đồng bộ báo cáo phòng ban...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">Chưa có báo cáo nào</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Hãy bấm &quot;Soạn Báo Cáo Mới&quot; để gửi báo cáo tuần/tháng hoặc kế hoạch công việc lên Ban Giám Đốc.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredReports.map((report) => {
                const isFromAdmin = report.createdBy.role === "ADMIN";
                const deptInfo = DEPARTMENT_LABELS[report.department] || {
                  label: report.department,
                  color: "bg-slate-100 text-slate-700 border-slate-200",
                };

                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReportDetail(report)}
                    className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                            deptInfo.color
                          )}
                        >
                          {deptInfo.label}
                        </span>

                        {isFromAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                            <Globe className="w-3 h-3" />
                            Thông báo toàn hệ thống
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            <Lock className="w-3 h-3 text-amber-500" />
                            Chỉ Ban Giám Đốc &amp; Người gửi
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(report.createdAt).toLocaleString("vi-VN")}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {report.content.replace(/[#*`_>]/g, "")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center">
                          {report.createdBy.initials || "TT"}
                        </span>
                        <span className="font-semibold text-slate-700">{report.createdBy.name}</span>
                      </div>

                      {report.attachmentName && (
                        <div className="flex items-center gap-1 text-blue-600 font-medium text-[11px]">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{report.attachmentName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: PHÂN TÍCH KINH DOANH & LEAD HIỆN TẠI
         ───────────────────────────────────────────────────────────── */}
      {activeMainTab === "leads_analytics" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setTimeRange("7d")}
                className={cn("px-3 py-1.5 rounded-lg", timeRange === "7d" && "bg-blue-600 text-white")}
              >
                7 Ngày qua
              </button>
              <button
                onClick={() => setTimeRange("30d")}
                className={cn("px-3 py-1.5 rounded-lg", timeRange === "30d" && "bg-blue-600 text-white")}
              >
                30 Ngày qua
              </button>
              <button
                onClick={() => setTimeRange("quarter")}
                className={cn("px-3 py-1.5 rounded-lg", timeRange === "quarter" && "bg-blue-600 text-white")}
              >
                Quý này
              </button>
              <button
                onClick={() => setTimeRange("year")}
                className={cn("px-3 py-1.5 rounded-lg", timeRange === "year" && "bg-blue-600 text-white")}
              >
                Năm 2026
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Báo Cáo Excel (.CSV)</span>
            </button>
          </div>

          {/* 3 Thẻ KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Đang Chờ Phản Hồi Báo Giá</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">{quotingLeads.length} Dự án</div>
              <p className="text-xs text-slate-400 mt-1">Đã gửi bản vẽ &amp; báo giá, cần Sales liên hệ thúc đẩy</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                <AlertTriangle className="w-4 h-4 text-sky-500" />
                <span>Lead Mới Chưa Khảo Sát</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">{pendingLeads.length} Khách hàng</div>
              <p className="text-xs text-slate-400 mt-1">Cần kỹ thuật Toàn Trung liên hệ khảo sát mặt bằng</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Dự Án Đã Chốt Hợp Đồng</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">{wonLeads.length} Hợp đồng</div>
              <p className="text-xs text-emerald-600 font-semibold mt-1">Tỷ lệ chuyển đổi thành công ấn tượng</p>
            </div>
          </div>

          {/* Bảng Quoting Leads */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Danh Sách Khách Hàng Đã Gửi Báo Giá Cần Theo Dõi (Follow-up)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Ưu tiên bám sát để thúc đẩy ký kết hợp đồng thi công</p>
              </div>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                {quotingLeads.length} Khách hàng
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {quotingLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                      {lead.code}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {lead.customerName} - {lead.companyName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {lead.product} • SĐT: <strong>{lead.phone}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-emerald-600 text-sm">{lead.estimatedValue}</div>
                      <div className="text-slate-400 text-[11px]">Sales: {lead.salesPerson.name}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL SOẠN BÁO CÁO PHONG CÁCH WORD (ĐẦY ĐỦ TIỆN ÍCH)
         ───────────────────────────────────────────────────────────── */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-heading">
                    Soạn Thảo Báo Cáo Doanh Nghiệp Toàn Trung
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAdmin
                      ? "📢 Bạn đang soạn thông báo / báo cáo Ban Giám Đốc phát toàn hệ thống"
                      : "🔒 Bạn đang soạn báo cáo phòng ban gửi lên Ban Giám Đốc (Bảo mật 100%)"}
                  </p>
                </div>
              </div>

              {/* Toggle Soạn Thảo / Xem Trước */}
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditorMode("write")}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all",
                      editorMode === "write" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                    )}
                  >
                    Soạn Thảo (Word)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("preview")}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all flex items-center gap-1",
                      editorMode === "preview" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem Trước Văn Bản</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body Soạn Thảo */}
            <form onSubmit={handleSubmitReport} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Tiêu đề báo cáo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tiêu Đề Báo Cáo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Báo cáo tiến độ nghiệm thu màn hình LED P3 Outdoor tại KCN Tân Bình - Tuần 44"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>

                {editorMode === "write" ? (
                  <div className="space-y-2">
                    {/* Thanh Công Cụ Soạn Thảo Phong Cách Word (Rich Toolbar) */}
                    <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-2 rounded-xl border border-slate-200 text-slate-700">
                      <button
                        type="button"
                        onClick={() => insertFormatting("**", "**", "Văn bản in đậm")}
                        title="In đậm (Bold)"
                        className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-800"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting("*", "*", "Văn bản in nghiêng")}
                        title="In nghiêng (Italic)"
                        className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-800"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting("<u>", "</u>", "Văn bản gạch chân")}
                        title="Gạch chân (Underline)"
                        className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-800"
                      >
                        <Underline className="w-4 h-4" />
                      </button>

                      <span className="w-px h-5 bg-slate-300 mx-1" />

                      <button
                        type="button"
                        onClick={() => insertFormatting("\n# ", "", "Tiêu đề lớn (Heading 1)")}
                        title="Tiêu đề chính H1"
                        className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-800 flex items-center gap-0.5 text-xs font-bold"
                      >
                        <Heading1 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting("\n## ", "", "Tiêu đề phụ (Heading 2)")}
                        title="Tiêu đề phụ H2"
                        className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-800 flex items-center gap-0.5 text-xs font-bold"
                      >
                        <Heading2 className="w-4 h-4" />
                      </button>

                      <span className="w-px h-5 bg-slate-300 mx-1" />

                      <button
                        type="button"
                        onClick={() => insertFormatting("\n- ", "", "Mục cần báo cáo")}
                        title="Danh sách gạch đầu dòng"
                        className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-800"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting("\n1. ", "", "Bước 1 / Tiến độ công việc")}
                        title="Danh sách đánh số"
                        className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-800"
                      >
                        <ListOrdered className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormatting("\n> ", "", "Ý kiến đề xuất / Lưu ý quan trọng...")}
                        title="Khối trích dẫn / Đề xuất"
                        className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-800"
                      >
                        <Quote className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertFormatting(
                            "\n| Hạng Mục | Tiến Độ | Dự Toán | Ghi Chú |\n|---|---|---|---|\n| Lắp khung sắt | 100% | 45.000.000 đ | Đã xong |\n| Đấu nối Module LED | 80% | 120.000.000 đ | Đang test |"
                          )
                        }
                        title="Chèn bảng số liệu dự án"
                        className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-800 flex items-center gap-1 text-xs font-semibold"
                      >
                        <TableIcon className="w-4 h-4" />
                        <span className="text-[11px]">Bảng số liệu</span>
                      </button>

                      <span className="w-px h-5 bg-slate-300 mx-1" />

                      {/* Nút Đính Kèm Tệp */}
                      <label className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 rounded-lg border border-slate-200 cursor-pointer text-xs font-semibold transition-all">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{isUploadingFile ? "Đang tải..." : "Đính kèm tệp/bản vẽ CAD"}</span>
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.png,.jpg,.jpeg"
                        />
                      </label>
                    </div>

                    {/* Vùng gõ nội dung Word */}
                    <div className="relative">
                      <textarea
                        id="word_editor_textarea"
                        required
                        rows={12}
                        placeholder={`Soạn thảo báo cáo công việc theo phong cách Word...\n\n# 1. KẾT QUẢ TRIỂN KHAI\n- Tiến độ thi công màn hình LED:\n- Số lượng khách hàng tiếp cận:\n\n# 2. KHÓ KHĂN & VƯỚNG MẮC\n> Ghi nhận các trở ngại cần Ban Giám Đốc tháo gỡ...\n\n# 3. KẾ HOẠCH TUẦN TIẾP THEO\n1. Khảo sát mặt bằng dự án mới\n2. Hoàn thiện báo giá và gửi khách hàng`}
                        value={reportContent}
                        onChange={(e) => setReportContent(e.target.value)}
                        className="w-full p-4 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
                      />
                      <div className="text-right text-[11px] text-slate-400 mt-1">
                        {reportContent.length} ký tự • {reportContent.split(/\s+/).filter(Boolean).length} từ
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Chế độ Xem Trước (Preview bài Word) */
                  <div className="bg-slate-50 border border-slate-300 rounded-xl p-8 min-h-[300px] text-slate-800 space-y-4">
                    <div className="border-b-2 border-slate-800 pb-3">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        CÔNG TY CỔ PHẦN ĐIỆN TỬ VIỄN THÔNG TOÀN TRUNG
                      </div>
                      <h1 className="text-xl font-black text-slate-900 mt-1 font-heading">
                        {reportTitle || "Tiêu Đề Báo Cáo"}
                      </h1>
                      <div className="text-xs text-slate-500 mt-1">
                        Ngày tạo: {new Date().toLocaleDateString("vi-VN")} • Bộ phận: {currentUserRole}
                      </div>
                    </div>

                    <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm font-sans">
                      {reportContent || "Chưa có nội dung soạn thảo."}
                    </div>

                    {attachmentName && (
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-blue-600" />
                        <span>Tệp đính kèm: <strong>{attachmentName}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Hiển thị tệp đính kèm nếu có */}
                {attachmentName && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      <span>Tệp đã đính kèm: <strong>{attachmentName}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentName(null);
                        setAttachmentUrl(null);
                      }}
                      className="text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      Xóa tệp
                    </button>
                  </div>
                )}
              </div>

              {/* Footer Modal Action */}
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>
                    {isAdmin
                      ? "Báo cáo này sẽ được phát hành TOÀN HỆ THỐNG"
                      : "Báo cáo chỉ gửi tới Ban Giám Đốc và lưu vết riêng tư"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingReport ? "Đang gửi..." : "Gửi Báo Cáo Chính Thức"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL XEM CHI TIẾT BÁO CÁO KHI BẤM VÀO ITEM
         ───────────────────────────────────────────────────────────── */}
      {selectedReportDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {selectedReportDetail.createdBy.initials || "TT"}
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-900">{selectedReportDetail.createdBy.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {DEPARTMENT_LABELS[selectedReportDetail.department]?.label || selectedReportDetail.department} •{" "}
                    {new Date(selectedReportDetail.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedReportDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <h2 className="text-lg font-black text-slate-900 font-heading">
                {selectedReportDetail.title}
              </h2>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {selectedReportDetail.content}
              </div>

              {selectedReportDetail.attachmentUrl && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold">
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    <span>Tệp đính kèm: {selectedReportDetail.attachmentName || "Tài liệu báo cáo"}</span>
                  </div>
                  <a
                    href={selectedReportDetail.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải Về</span>
                  </a>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50">
              <button
                onClick={() => setSelectedReportDetail(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
