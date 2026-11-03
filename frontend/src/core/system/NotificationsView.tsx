"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  Plus,
  Award,
  ClipboardList,
  ArrowRight,
  Paperclip,
  Send,
  Users2,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";
import { Lead } from "@/src/modules/01-leads";
import { cn } from "@/src/core/utils/utils";
import { PageHeader } from "@/src/core/ui/page-header";
import { Button } from "@/src/core/ui/button";
import { StatusBadge } from "@/src/core/ui/badge";
import { UnderlineTabs } from "@/src/core/ui/segmented-control";
import { Modal } from "@/src/core/ui/modal";
import { EmptyState, PageSkeleton, SearchInput } from "@/src/core/ui/feedback-states";

interface ServerNotificationItem {
  id: string;
  notificationKey: string;
  category: "lead_assignment" | "report" | "promotion";
  title: string;
  content: string;
  senderName: string;
  departmentLabel: string;
  createdAt: string;
  isRead: boolean;
  reportId?: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  targetLeadId?: string | null;
  targetLeadCode?: string | null;
  canAccessTargetLead?: boolean;
}

type FilterTab = "all" | "unread";

interface NotificationsViewProps {
  leads: Lead[];
  userRole?: string;
  onSelectLead: (lead: Lead) => void;
  onNavigateToTab: (tab: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

interface ComposeNotificationModalProps {
  open: boolean;
  onClose: () => void;
  isBoardOrAdmin: boolean;
  onSent: (message: string) => void;
}

function formatRelativeOrShortTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatOneLineSummary(rawContent: string): string {
  if (!rawContent) return "";
  return rawContent
    .replace(/\[AI Bóc tách nhanh\]\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ComposeNotificationModal = React.memo(function ComposeNotificationModal({
  open,
  onClose,
  isBoardOrAdmin,
  onSent,
}: ComposeNotificationModalProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (open) {
      setNewTitle("");
      setNewContent("");
      setIsSending(false);
    }
  }, [open]);

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
        onClose();
        onSent(json.message || "Đã gửi thông báo thành công!");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      preventClose={isSending}
      size="lg"
      icon={<Send className="w-4 h-4" />}
      title={
        isBoardOrAdmin
          ? "Phát thông báo nội bộ"
          : "Gửi thông báo / báo cáo công việc"
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="md"
            disabled={isSending}
            onClick={onClose}
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
            Gửi thông báo
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
            placeholder="Nhập tiêu đề thông báo..."
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
            placeholder="Nhập nội dung thông báo hoặc báo cáo tiến độ..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="crm-textarea text-xs"
          />
        </div>
      </form>
    </Modal>
  );
});

export function NotificationsView({
  leads,
  userRole,
  onSelectLead,
  onNavigateToTab,
  onUnreadCountChange,
}: NotificationsViewProps) {
  const [items, setItems] = useState<ServerNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalItem, setActiveModalItem] = useState<ServerNotificationItem | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [accessNotice, setAccessNotice] = useState<string | null>(null);

  const fetchNotificationsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.notifications)) {
          setItems(json.data.notifications);
          onUnreadCountChange?.(json.data.unreadCount || 0);
        }
      }
    } catch (err) {
      console.warn("Error loading notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    void fetchNotificationsData();
  }, [fetchNotificationsData]);

  const counts = useMemo(() => {
    const unread = items.filter((i) => !i.isRead).length;
    return {
      all: items.length,
      unread,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (filterTab === "unread" && item.isRead) return false;
      if (q) {
        const hay = `${item.title} ${item.content} ${item.senderName} ${item.departmentLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterTab, searchQuery]);

  const handleSelectItem = async (item: ServerNotificationItem) => {
    setAccessNotice(null);
    const updatedItem = { ...item, isRead: true };
    setActiveModalItem(updatedItem);

    if (!item.isRead) {
      setItems((prev) => {
        const next = prev.map((n) =>
          n.notificationKey === item.notificationKey ? { ...n, isRead: true } : n
        );
        const remainingUnread = next.filter((n) => !n.isRead).length;
        onUnreadCountChange?.(remainingUnread);
        return next;
      });
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationKey: item.notificationKey }),
        });
      } catch {
        // Ignore transient network error
      }
    }
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        onUnreadCountChange?.(0);
        setFeedback("Đã đánh dấu đã đọc tất cả thông báo!");
        window.setTimeout(() => setFeedback(null), 3500);
      }
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleOpenTargetLead = async (item: ServerNotificationItem) => {
    setAccessNotice(null);
    if (!item.targetLeadId) return;

    try {
      const res = await fetch(`/api/leads/${item.targetLeadId}`, {
        cache: "no-store",
      });
      if (res.status === 403 || res.status === 404) {
        setAccessNotice(
          "Hồ sơ Lead này đã được chuyển giao cho nhân viên kinh doanh khác phụ trách. Bạn không còn quyền truy cập chi tiết hồ sơ này."
        );
        return;
      }
      const json = await res.json().catch(() => null);
      const matched =
        leads.find((l) => l.id === item.targetLeadId) || json?.data?.lead;
      setActiveModalItem(null);
      if (matched) {
        onSelectLead(matched);
      } else {
        onNavigateToTab("leads");
      }
    } catch {
      setAccessNotice("Không thể kiểm tra quyền truy cập hồ sơ Lead lúc này.");
    }
  };

  const handleNotificationSent = useCallback(
    async (msg: string) => {
      setFeedback(msg);
      window.setTimeout(() => setFeedback(null), 4000);
      await fetchNotificationsData();
    },
    [fetchNotificationsData]
  );

  const renderCategoryBadge = (cat: ServerNotificationItem["category"]) => {
    switch (cat) {
      case "lead_assignment":
        return (
          <StatusBadge tone="info" size="sm">
            Phân công / Chuyển Lead
          </StatusBadge>
        );
      case "promotion":
        return (
          <StatusBadge tone="success" size="sm">
            Quyết định Bổ nhiệm
          </StatusBadge>
        );
      case "report":
      default:
        return (
          <StatusBadge tone="neutral" size="sm">
            Thông báo nội bộ
          </StatusBadge>
        );
    }
  };

  const renderCategoryIcon = (cat: ServerNotificationItem["category"], isRead: boolean) => {
    const baseTone = !isRead
      ? "bg-blue-50 text-blue-600 border-blue-200"
      : "bg-slate-100 text-slate-500 border-slate-200/80";
    switch (cat) {
      case "lead_assignment":
        return (
          <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", baseTone)}>
            <Users2 className="w-4 h-4" />
          </div>
        );
      case "promotion":
        return (
          <div
            className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
              !isRead
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200/80"
            )}
          >
            <Award className="w-4 h-4" />
          </div>
        );
      case "report":
      default:
        return (
          <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", baseTone)}>
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  if (isLoading) {
    return <PageSkeleton cards={0} rows={6} />;
  }

  const isBoardOrAdmin = userRole === "ADMIN" || userRole === "DIRECTOR";

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <PageHeader
        title="Trung tâm Thông báo"
        actions={
          <>
            <Button
              variant="secondary"
              size="md"
              isLoading={isMarkingAll}
              disabled={counts.unread === 0}
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
              {isBoardOrAdmin ? "Phát thông báo" : "Gửi thông báo"}
            </Button>
          </>
        }
      />

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          {feedback}
        </div>
      )}

      <div className="crm-card overflow-hidden">
        {/* Thanh điều hướng gọn: chỉ giữ 2 tab Tất cả / Chưa đọc + Ô tìm kiếm */}
        <div className="px-4 sm:px-5 pt-3 border-b border-slate-200/80 bg-slate-50/40">
          <UnderlineTabs
            value={filterTab}
            onChange={setFilterTab}
            className="border-b-0"
            trailing={
              <div className="w-full sm:w-72 pb-2">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Tìm nhanh thông báo..."
                />
              </div>
            }
            options={[
              { id: "all", label: "Tất cả", count: counts.all },
              { id: "unread", label: "Chưa đọc", count: counts.unread },
            ]}
          />
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Bell}
              title="Không có thông báo nào"
              description="Khi có Lead được bàn giao hoặc thông báo công việc liên quan đến bạn, nội dung sẽ xuất hiện tại đây."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100 bg-white">
            {filteredItems.map((item) => {
              const oneLineDesc = formatOneLineSummary(item.content);
              return (
                <button
                  key={item.notificationKey}
                  type="button"
                  onClick={() => void handleSelectItem(item)}
                  className={cn(
                    "w-full text-left px-4 sm:px-5 py-3.5 transition-colors cursor-pointer flex items-start gap-3.5 group",
                    !item.isRead
                      ? "bg-blue-50/35 hover:bg-blue-50/70"
                      : "bg-white hover:bg-slate-50/90"
                  )}
                >
                  {/* Chấm tròn chỉ báo chưa đọc rõ ràng + Icon phân loại */}
                  <div className="relative pt-0.5 shrink-0">
                    {renderCategoryIcon(item.category, item.isRead)}
                    {!item.isRead && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-600 ring-2 ring-white"
                        aria-label="Chưa đọc"
                        title="Thông báo chưa đọc"
                      />
                    )}
                  </div>

                  {/* Nội dung chính: Phân cấp rõ Tiêu đề lớn/đậm + 1 dòng mô tả ngắn */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3
                        className={cn(
                          "text-[15px] leading-snug break-words",
                          !item.isRead
                            ? "font-bold text-slate-950"
                            : "font-medium text-slate-700"
                        )}
                      >
                        {item.title}
                      </h3>

                      <span
                        className={cn(
                          "text-xs whitespace-nowrap shrink-0",
                          !item.isRead
                            ? "font-semibold text-blue-600"
                            : "font-normal text-slate-400"
                        )}
                      >
                        {formatRelativeOrShortTime(item.createdAt)}
                      </span>
                    </div>

                    <p
                      className={cn(
                        "text-[13px] mt-1 line-clamp-1 leading-relaxed",
                        !item.isRead ? "text-slate-700" : "text-slate-500"
                      )}
                    >
                      {oneLineDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bảng chi tiết thông báo hiển thị ở chính giữa màn hình khi bấm kiểm tra */}
      <Modal
        open={Boolean(activeModalItem)}
        onClose={() => {
          setActiveModalItem(null);
          setAccessNotice(null);
        }}
        size="lg"
        icon={<Bell className="w-4 h-4" />}
        title="Chi tiết thông báo"
        footer={
          activeModalItem ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <span className="text-xs text-slate-500">
                {activeModalItem.isRead ? "✓ Đã ghi nhận đã đọc" : "• Chưa đọc"}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setActiveModalItem(null);
                    setAccessNotice(null);
                  }}
                >
                  Đóng
                </Button>

                {activeModalItem.targetLeadId && (
                  <Button
                    variant={
                      activeModalItem.canAccessTargetLead === false
                        ? "secondary"
                        : "primary"
                    }
                    size="md"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    onClick={() => void handleOpenTargetLead(activeModalItem)}
                  >
                    {activeModalItem.canAccessTargetLead === false
                      ? `Kiểm tra quyền xem Lead (${activeModalItem.targetLeadCode || ""})`
                      : `Xem hồ sơ khách hàng (${activeModalItem.targetLeadCode || ""})`}
                  </Button>
                )}

                {activeModalItem.category === "promotion" && isBoardOrAdmin && (
                  <Button
                    variant="primary"
                    size="md"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    onClick={() => {
                      setActiveModalItem(null);
                      onNavigateToTab("users");
                    }}
                  >
                    Mở Quản lý tài khoản
                  </Button>
                )}

                {activeModalItem.category === "report" && (
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<ClipboardList className="w-4 h-4" />}
                    onClick={() => {
                      setActiveModalItem(null);
                      onNavigateToTab("reports");
                    }}
                  >
                    Mở trang Báo cáo
                  </Button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {activeModalItem && (
          <div className="space-y-4">
            {accessNotice && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{accessNotice}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                {renderCategoryBadge(activeModalItem.category)}
                <span className="text-xs font-medium text-slate-500">
                  {activeModalItem.departmentLabel}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {new Date(activeModalItem.createdAt).toLocaleString("vi-VN")}
              </span>
            </div>

            <div>
              <h2 className="text-[17px] font-bold text-slate-900 leading-snug break-words">
                {activeModalItem.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 inline-flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Người gửi:{" "}
                <strong className="text-slate-800">{activeModalItem.senderName}</strong>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-[14px] text-slate-800 whitespace-pre-wrap leading-relaxed">
              {activeModalItem.content.replace(/\[AI Bóc tách nhanh\]\s*/gi, "")}
            </div>

            {activeModalItem.attachmentUrl && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-medium text-slate-900 truncate">
                    {activeModalItem.attachmentName || "Tài liệu đính kèm"}
                  </span>
                </div>
                <a
                  href={activeModalItem.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 shrink-0"
                >
                  Mở tài liệu
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ComposeNotificationModal
        open={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        isBoardOrAdmin={isBoardOrAdmin}
        onSent={handleNotificationSent}
      />
    </div>
  );
}
