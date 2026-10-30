"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  Plus,
  Award,
  FileSignature,
  Clock,
  ClipboardList,
  ArrowRight,
  Paperclip,
  Send,
  Inbox,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { Lead } from "@/types/lead";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { UnderlineTabs } from "@/components/ui/segmented-control";
import { Modal } from "@/components/ui/modal";
import { EmptyState, PageSkeleton, SearchInput } from "@/components/ui/feedback-states";

interface DepartmentReportRecord {
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

interface PromotionDecisionRecord {
  id: string;
  code: string;
  title: string;
  content: string;
  targetDepartment: string;
  newPosition: string;
  signedByName: string;
  status: string;
  createdAt: string;
  targetUser?: {
    id: string;
    name: string;
    email: string;
  };
}

type NotificationCategory = "report" | "quote_approval" | "promotion" | "sla_alert";
type FilterTab = "all" | "unread" | "approvals" | "sla" | "reports";

interface UnifiedNotificationItem {
  uid: string;
  reportId?: string;
  category: NotificationCategory;
  title: string;
  content: string;
  senderName: string;
  departmentLabel: string;
  timestampIso: string;
  timestampDisplay: string;
  isRead: boolean;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  linkedLead?: Lead;
  decisionCode?: string;
  decisionStatus?: string;
}

interface NotificationsViewProps {
  leads: Lead[];
  userRole?: string;
  onSelectLead: (lead: Lead) => void;
  onNavigateToTab: (tab: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

const DEPT_DISPLAY: Record<string, string> = {
  ADMIN: "Quản trị hệ thống",
  ADMIN_SYS: "Quản trị hệ thống",
  DIRECTOR: "Ban Giám Đốc",
  BOARD: "Ban Giám Đốc",
  SALES: "Phòng Kinh Doanh",
  "PHÒNG KINH DOANH": "Phòng Kinh Doanh",
  MARKETING: "Phòng Marketing",
  DESIGN: "Phòng Thiết Kế",
  ADS: "Bộ Phận Quảng Cáo",
};

export function NotificationsView({
  leads,
  userRole,
  onSelectLead,
  onNavigateToTab,
  onUnreadCountChange,
}: NotificationsViewProps) {
  const [reports, setReports] = useState<DepartmentReportRecord[]>([]);
  const [decisions, setDecisions] = useState<PromotionDecisionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  // Create Notification / Report Modal
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchNotificationsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [repRes, promRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/promotions"),
      ]);
      const [repJson, promJson] = await Promise.all([
        repRes.ok ? repRes.json() : null,
        promRes.ok ? promRes.json() : null,
      ]);

      if (repJson?.success && Array.isArray(repJson.data?.reports)) {
        setReports(repJson.data.reports);
        onUnreadCountChange?.(repJson.data.unreadCount || 0);
      }
      if (promJson?.success && Array.isArray(promJson.data?.decisions)) {
        setDecisions(promJson.data.decisions);
      }
    } catch (err) {
      console.warn("Error loading notifications page:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    void fetchNotificationsData();
  }, [fetchNotificationsData]);

  // Build unified notifications stream from real DB records + real Lead SLA / approval states
  const unifiedItems = useMemo<UnifiedNotificationItem[]>(() => {
    const items: UnifiedNotificationItem[] = [];

    // 1. Department Reports & Quote Approval Submissions
    reports.forEach((rep) => {
      const isQuoteApproval =
        rep.title.includes("[Trình Giám đốc duyệt giá]") ||
        rep.title.toLowerCase().includes("duyệt giá");

      // Match Lead by code if mentioned in report content (e.g. TT-LED-2610-0001)
      const matchedLead = leads.find((l) => rep.content.includes(l.code));

      items.push({
        uid: `rep-${rep.id}`,
        reportId: rep.id,
        category: isQuoteApproval ? "quote_approval" : "report",
        title: rep.title,
        content: rep.content,
        senderName: rep.createdBy?.name || "Hệ thống",
        departmentLabel: DEPT_DISPLAY[rep.department] || rep.department,
        timestampIso: rep.createdAt,
        timestampDisplay: new Date(rep.createdAt).toLocaleString("vi-VN"),
        isRead: rep.isRead,
        attachmentName: rep.attachmentName,
        attachmentUrl: rep.attachmentUrl,
        linkedLead: matchedLead,
      });
    });

    // 2. Official Director-Signed Promotion Congratulation Notices
    decisions.forEach((dec) => {
      items.push({
        uid: `prom-${dec.id}`,
        category: "promotion",
        title: `🎉 ${dec.title}`,
        content: `${dec.content}\n\n• Mã quyết định: ${dec.code}\n• Nhân sự được bổ nhiệm: ${
          dec.targetUser?.name || "Nhân sự"
        }\n• Chức vụ mới: ${dec.newPosition} (${
          DEPT_DISPLAY[dec.targetDepartment] || dec.targetDepartment
        })\n• Người ký ban hành: ${dec.signedByName}`,
        senderName: dec.signedByName,
        departmentLabel: "Ban Giám Đốc",
        timestampIso: dec.createdAt,
        timestampDisplay: new Date(dec.createdAt).toLocaleString("vi-VN"),
        isRead: dec.status === "APPLIED_BY_ADMIN",
        decisionCode: dec.code,
        decisionStatus: dec.status,
      });
    });

    // 3. Real-time Lead SLA & Director Pricing Alerts
    leads.forEach((lead) => {
      if (lead.directorApprovalStatus === "PENDING") {
        items.push({
          uid: `lead-dir-${lead.id}`,
          category: "quote_approval",
          title: `Chờ Giám đốc duyệt báo giá LED — ${lead.customerName} (${lead.code})`,
          content: `Hồ sơ dự án "${lead.product}" của đơn vị ${lead.companyName} (Giá trị dự toán: ${lead.estimatedValue}, Chiết khấu: ${
            lead.discountPercent || 0
          }%) đang chờ Tác nhân Giám Đốc phê duyệt khung giá trước khi chốt hợp đồng.\n\nSales phụ trách: ${
            lead.salesPerson.name
          } · Khu vực: ${lead.location}`,
          senderName: lead.salesPerson.name,
          departmentLabel: "Phòng Kinh Doanh",
          timestampIso: lead.nextFollowUpAt || new Date().toISOString(),
          timestampDisplay: `Hồ sơ ${lead.code} · ${lead.createdAt}`,
          isRead: false,
          linkedLead: lead,
        });
      } else if (lead.slaStatus === "OVERDUE" || lead.slaStatus === "DUE_SOON") {
        items.push({
          uid: `lead-sla-${lead.id}`,
          category: "sla_alert",
          title: `${lead.slaStatus === "OVERDUE" ? "Cảnh báo quá hạn SLA" : "Sắp đến hạn gọi SLA"} — ${
            lead.customerName
          } (${lead.code})`,
          content: `Khách hàng ${lead.customerName} (${lead.companyName}) đang ở trạng thái "${
            lead.status
          }" (${lead.slaLabel || "Cần liên hệ"}).\n• Hạng mục: ${lead.product} (${
            lead.estimatedValue
          })\n• Ghi chú hành động tiếp theo: ${
            lead.nextActionNote || "Gọi điện chăm sóc & cập nhật tiến độ khảo sát"
          }\n• Sales phụ trách: ${lead.salesPerson.name}`,
          senderName: "Hệ thống Giám sát SLA",
          departmentLabel: "Cảnh báo Tác chiến",
          timestampIso: lead.nextFollowUpAt || new Date().toISOString(),
          timestampDisplay: `${lead.slaLabel || "SLA"} · Mã ${lead.code}`,
          isRead: false,
          linkedLead: lead,
        });
      }
    });

    return items.sort(
      (a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
    );
  }, [reports, decisions, leads]);

  const counts = useMemo(() => {
    const unread = unifiedItems.filter((i) => !i.isRead).length;
    const approvals = unifiedItems.filter(
      (i) => i.category === "quote_approval" || i.category === "promotion"
    ).length;
    const sla = unifiedItems.filter((i) => i.category === "sla_alert").length;
    const repOnly = unifiedItems.filter((i) => i.category === "report").length;
    return {
      all: unifiedItems.length,
      unread,
      approvals,
      sla,
      reports: repOnly,
    };
  }, [unifiedItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unifiedItems.filter((item) => {
      if (filterTab === "unread" && item.isRead) return false;
      if (
        filterTab === "approvals" &&
        item.category !== "quote_approval" &&
        item.category !== "promotion"
      ) {
        return false;
      }
      if (filterTab === "sla" && item.category !== "sla_alert") return false;
      if (filterTab === "reports" && item.category !== "report") return false;

      if (q) {
        const hay = `${item.title} ${item.content} ${item.senderName} ${item.departmentLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [unifiedItems, filterTab, searchQuery]);

  const activeItem = useMemo(() => {
    if (filteredItems.length === 0) return null;
    return filteredItems.find((i) => i.uid === selectedUid) || filteredItems[0];
  }, [filteredItems, selectedUid]);

  const handleSelectItem = async (item: UnifiedNotificationItem) => {
    setSelectedUid(item.uid);
    if (item.reportId && !item.isRead) {
      try {
        const res = await fetch(`/api/reports/${item.reportId}/read`, { method: "PATCH" });
        if (res.ok) {
          setReports((prev) => {
            const next = prev.map((r) => (r.id === item.reportId ? { ...r, isRead: true } : r));
            const remainingUnread = next.filter((r) => !r.isRead).length;
            onUnreadCountChange?.(remainingUnread);
            return next;
          });
        }
      } catch {
        // Ignore transient network errors
      }
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      const res = await fetch("/api/reports", { method: "PATCH" });
      if (res.ok) {
        setReports((prev) => prev.map((r) => ({ ...r, isRead: true })));
        onUnreadCountChange?.(0);
        setFeedback("Đã đánh dấu đã đọc toàn bộ thông báo & báo cáo!");
        window.setTimeout(() => setFeedback(null), 3500);
      }
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNewTitle("");
        setNewContent("");
        setIsComposeOpen(false);
        setFeedback(json.message || "Đã phát thông báo thành công!");
        window.setTimeout(() => setFeedback(null), 4000);
        await fetchNotificationsData();
      }
    } finally {
      setIsSending(false);
    }
  };

  const renderCategoryBadge = (cat: NotificationCategory) => {
    switch (cat) {
      case "quote_approval":
        return (
          <StatusBadge tone="warning" size="sm">
            Trình duyệt giá LED
          </StatusBadge>
        );
      case "promotion":
        return (
          <StatusBadge tone="success" size="sm">
            Quyết định Bổ nhiệm
          </StatusBadge>
        );
      case "sla_alert":
        return (
          <StatusBadge tone="error" size="sm">
            Cảnh báo SLA
          </StatusBadge>
        );
      case "report":
      default:
        return (
          <StatusBadge tone="info" size="sm">
            Thông báo / Báo cáo
          </StatusBadge>
        );
    }
  };

  const renderCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case "quote_approval":
        return <FileSignature className="w-4 h-4 text-amber-600 shrink-0" />;
      case "promotion":
        return <Award className="w-4 h-4 text-emerald-600 shrink-0" />;
      case "sla_alert":
        return <Flame className="w-4 h-4 text-rose-600 shrink-0" />;
      case "report":
      default:
        return <Bell className="w-4 h-4 text-blue-600 shrink-0" />;
    }
  };

  if (isLoading) {
    return <PageSkeleton cards={4} rows={6} />;
  }

  const isBoardOrAdmin = userRole === "ADMIN" || userRole === "DIRECTOR";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trung tâm Thông báo"
        description="Quản lý tập trung toàn bộ thông báo Ban Giám Đốc, quyết định bổ nhiệm nhân sự, tờ trình phê duyệt báo giá LED và cảnh báo SLA khách hàng."
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              isLoading={isMarkingAll}
              disabled={reports.every((r) => r.isRead)}
              leftIcon={<CheckCheck className="w-4 h-4 text-emerald-600" />}
              onClick={handleMarkAllRead}
            >
              Đánh dấu đã đọc tất cả
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsComposeOpen(true)}
            >
              {isBoardOrAdmin ? "Phát thông báo toàn công ty" : "Gửi báo cáo / thông báo"}
            </Button>
          </>
        }
      />

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          {feedback}
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <StatCard
          label="Tổng thông báo hệ thống"
          value={counts.all}
          note="Hợp nhất tất cả luồng nghiệp vụ"
          icon={Bell}
          iconTone="blue"
          active={filterTab === "all"}
          onClick={() => setFilterTab("all")}
        />
        <StatCard
          label="Chưa đọc / Cần chú ý"
          value={counts.unread}
          note="Nhấn để lọc các mục mới"
          icon={Inbox}
          iconTone="violet"
          active={filterTab === "unread"}
          onClick={() => setFilterTab("unread")}
        />
        <StatCard
          label="Duyệt giá & Bổ nhiệm"
          value={counts.approvals}
          note="Luồng kiểm soát 3 tác nhân"
          icon={ShieldCheck}
          iconTone="amber"
          active={filterTab === "approvals"}
          onClick={() => setFilterTab("approvals")}
        />
        <StatCard
          label="Cảnh báo SLA Lead"
          value={counts.sla}
          note="Hồ sơ quá hạn hoặc sắp tới hạn gọi"
          icon={Clock}
          iconTone="rose"
          active={filterTab === "sla"}
          onClick={() => setFilterTab("sla")}
        />
      </div>

      {/* Filter Tabs + Search */}
      <div className="crm-card p-4 space-y-4">
        <UnderlineTabs
          value={filterTab}
          onChange={setFilterTab}
          trailing={
            <div className="w-full sm:w-64">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Tìm nội dung thông báo, mã Lead..."
              />
            </div>
          }
          options={[
            { id: "all", label: "Tất cả thông báo", count: counts.all },
            { id: "unread", label: "Chưa đọc", count: counts.unread },
            { id: "approvals", label: "Duyệt giá & Bổ nhiệm", count: counts.approvals },
            { id: "sla", label: "Cảnh báo SLA Lead", count: counts.sla },
            { id: "reports", label: "Báo cáo phòng ban", count: counts.reports },
          ]}
        />

        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Không có thông báo nào trong mục này"
            description="Mọi thông báo hệ thống, tờ trình duyệt giá LED và cảnh báo SLA mới sẽ hiển thị đầy đủ tại đây."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Feed List */}
            <div className="lg:col-span-5 border border-slate-200/90 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[620px] overflow-y-auto bg-white">
              {filteredItems.map((item) => {
                const isSelected = activeItem?.uid === item.uid;
                return (
                  <button
                    key={item.uid}
                    type="button"
                    onClick={() => void handleSelectItem(item)}
                    className={cn(
                      "w-full text-left p-3.5 transition-colors cursor-pointer block",
                      isSelected
                        ? "bg-blue-50/70 border-l-[3px] border-l-blue-600"
                        : !item.isRead
                          ? "bg-slate-50/50 hover:bg-slate-100/70"
                          : "bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {renderCategoryIcon(item.category)}
                        <span className="text-[11px] font-semibold text-slate-500 truncate">
                          {item.departmentLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                        <span className="text-[10.5px] text-slate-400 font-mono">
                          {item.timestampDisplay.split(" ")[0]}
                        </span>
                      </div>
                    </div>

                    <h3
                      className={cn(
                        "text-[13px] mt-1.5 line-clamp-1",
                        !item.isRead
                          ? "font-semibold text-slate-900"
                          : "font-medium text-slate-700"
                      )}
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {item.content}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Right Full Detail Reader */}
            <div className="lg:col-span-7 border border-slate-200/90 rounded-xl bg-white p-5 sm:p-6 flex flex-col justify-between min-h-[380px]">
              {activeItem ? (
                <>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderCategoryBadge(activeItem.category)}
                        <span className="text-xs font-medium text-slate-500">
                          {activeItem.departmentLabel}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {activeItem.timestampDisplay}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-[17px] font-semibold text-slate-900 leading-snug">
                        {activeItem.title}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Người gửi / Nguồn khởi tạo:{" "}
                        <strong className="text-slate-800">{activeItem.senderName}</strong>
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 text-[13.5px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {activeItem.content}
                    </div>

                    {activeItem.attachmentUrl && (
                      <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-medium text-slate-900 truncate">
                            {activeItem.attachmentName || "Tài liệu đính kèm"}
                          </span>
                        </div>
                        <a
                          href={activeItem.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 shrink-0"
                        >
                          Mở tài liệu
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Contextual Action Footer */}
                  <div className="pt-4 mt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">
                      {activeItem.isRead ? "✓ Đã ghi nhận xem" : "• Thông báo mới"}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {activeItem.linkedLead && (
                        <Button
                          variant="primary"
                          size="sm"
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          onClick={() => onSelectLead(activeItem.linkedLead!)}
                        >
                          Mở Hồ sơ Lead ({activeItem.linkedLead.code})
                        </Button>
                      )}

                      {activeItem.category === "promotion" && isBoardOrAdmin && (
                        <Button
                          variant="primary"
                          size="sm"
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          onClick={() => onNavigateToTab("users")}
                        >
                          Mở trang Tác nhân &amp; Bổ nhiệm
                        </Button>
                      )}

                      {activeItem.category === "report" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<ClipboardList className="w-3.5 h-3.5" />}
                          onClick={() => onNavigateToTab("reports")}
                        >
                          Xem phân tích Báo cáo
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Gửi thông báo / báo cáo mới */}
      <Modal
        open={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        preventClose={isSending}
        size="lg"
        icon={<Send className="w-4 h-4" />}
        title={
          isBoardOrAdmin
            ? "Phát Thông báo Toàn Hệ thống Toàn Trung"
            : "Gửi Thông báo & Báo cáo lên Ban Giám Đốc"
        }
        description={
          isBoardOrAdmin
            ? "Thông báo này sẽ xuất hiện tức thì tại Trung tâm Thông báo và chuông báo của toàn bộ nhân sự các phòng ban."
            : "Gửi đề xuất, báo cáo công việc hoặc kiến nghị trực tiếp lên Ban Giám Đốc và Quản trị viên."
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="md"
              disabled={isSending}
              onClick={() => setIsComposeOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={isSending}
              leftIcon={<Send className="w-3.5 h-3.5" />}
              onClick={handleSendNotification}
            >
              Gửi thông báo ngay
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSendNotification} className="space-y-4">
          <div>
            <label htmlFor="notif-title" className="crm-label text-xs">
              Tiêu đề thông báo *
            </label>
            <input
              id="notif-title"
              type="text"
              required
              placeholder="VD: Thông báo áp dụng bảng giá Module LED P2.0 Indoor Quý IV..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="crm-input"
            />
          </div>
          <div>
            <label htmlFor="notif-content" className="crm-label text-xs">
              Nội dung chi tiết *
            </label>
            <textarea
              id="notif-content"
              rows={5}
              required
              placeholder="Nhập đầy đủ nội dung chỉ đạo, quy định hoặc báo cáo tiến độ..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="crm-textarea text-xs"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
