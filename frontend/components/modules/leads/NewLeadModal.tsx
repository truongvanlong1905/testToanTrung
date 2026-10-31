"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  AlertCircle,
  Upload,
  FileText,
  AlertTriangle,
  Loader2,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { Lead } from "@/types/lead";
import { SALES_LIST } from "@/data/mockLeads";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { lockBodyScroll, unlockBodyScroll, recordModalOpenMetric } from "@/components/ui/modal";
import { peekSharedJson, sharedGetJson } from "@/lib/shared-fetch";
import { AiLeadDraft } from "./AiQuickLeadBar";

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (newLead: Lead) => void;
  initialDraft?: AiLeadDraft | null;
  initialWarning?: string | null;
}

interface DuplicateLeadMatch {
  id: string;
  code: string;
  customerName: string;
  companyName: string;
  phone: string;
  salesPersonName: string;
  status: string;
}

interface SalesUserOption {
  id?: string;
  name: string;
  initials: string;
}

const QUICK_PRODUCT_PRESETS = [
  {
    chip: "LED P2.5 Hội trường (18m²)",
    product: "Màn hình LED P2.5 Indoor Hội trường & Sân khấu (4.8m × 3.75m = 18m²)",
    category: "LED trong nhà",
    estimatedValue: "318.500.000 đ",
    ledModuleType: "LED P2.5 Indoor Hội trường & Tiệc cưới",
    ledWidth: 4.8,
    ledHeight: 3.75,
  },
  {
    chip: "LED P1.86 Phòng họp VIP (8m²)",
    product: "Màn hình LED P1.86 Indoor Phòng họp VIP (3.84m × 2.16m = 8.3m²)",
    category: "LED trong nhà",
    estimatedValue: "228.000.000 đ",
    ledModuleType: "LED P1.86 Indoor Phòng họp VIP (Cabinet nhôm đúc)",
    ledWidth: 3.84,
    ledHeight: 2.16,
  },
  {
    chip: "LED P3.0 Outdoor Mặt tiền (24m²)",
    product: "Màn hình LED P3.0 Outdoor Mặt tiền Tòa nhà IP65 (6m × 4m = 24m²)",
    category: "LED ngoài trời",
    estimatedValue: "495.000.000 đ",
    ledModuleType: "LED P3.0 Outdoor Mặt tiền Tòa nhà (Chống nước IP65)",
    ledWidth: 6,
    ledHeight: 4,
  },
  {
    chip: "Bảng điện tử Tỷ giá / Ma trận",
    product: "Hệ thống Bảng điện tử LED Ma trận / Hiển thị thông tin (8m²)",
    category: "Bảng điện tử",
    estimatedValue: "92.500.000 đ",
    ledModuleType: "Bảng điện tử LED Ma trận / Tỷ giá Ngân hàng",
    ledWidth: 4,
    ledHeight: 2,
  },
];

function getInitialSalesUsers(): SalesUserOption[] {
  const cached = peekSharedJson("/api/users?role=SALES", 60_000);
  if (cached?.success && Array.isArray(cached.data?.users) && cached.data.users.length > 0) {
    return cached.data.users.map((u: SalesUserOption) => ({
      id: u.id,
      name: u.name,
      initials: u.initials,
    }));
  }
  return SALES_LIST;
}

interface AiSmartPasteSectionProps {
  selectedSalesId?: string;
  onParsedDraft: (draft: AiLeadDraft) => void;
  onInstantCreated: (lead: Lead) => void;
  onError: (message: string | null) => void;
}

/**
 * Isolated AI Smart Paste Box: typing inside this textarea only re-renders this small box,
 * never forcing the 15 form fields below to re-render on each keystroke.
 */
const AiSmartPasteSection = React.memo(function AiSmartPasteSection({
  selectedSalesId,
  onParsedDraft,
  onInstantCreated,
  onError,
}: AiSmartPasteSectionProps) {
  const [aiRawInput, setAiRawInput] = useState("");
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [isAiQuickCreating, setIsAiQuickCreating] = useState(false);

  const handleAiParseIntoForm = async () => {
    if (!aiRawInput.trim()) {
      onError("Vui lòng dán tin nhắn Zalo / Email / ghi chú khách hàng vào ô AI.");
      return;
    }
    setIsAiParsing(true);
    onError(null);
    try {
      const res = await fetch("/api/leads/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PARSE_RAW_TEXT",
          rawText: aiRawInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.parsed) {
        throw new Error(json.error?.message || "AI không thể bóc tách nội dung");
      }
      onParsedDraft(json.data.parsed as AiLeadDraft);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Lỗi kết nối AI bóc tách");
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleAiInstantCreate = async () => {
    if (!aiRawInput.trim()) {
      onError("Vui lòng dán tin nhắn khách hàng vào ô AI để tạo thẳng.");
      return;
    }
    setIsAiQuickCreating(true);
    onError(null);
    try {
      const res = await fetch("/api/leads/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "QUICK_CREATE",
          rawText: aiRawInput.trim(),
          salesPersonId: selectedSalesId || undefined,
        }),
      });
      const json = await res.json();

      if (res.status === 422 && json.data?.parsed) {
        onParsedDraft(json.data.parsed as AiLeadDraft);
        onError(json.error?.message || "Vui lòng bổ sung số điện thoại để hoàn tất.");
        return;
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể tạo nhanh Lead bằng AI");
      }

      onInstantCreated(json.data.lead as Lead);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Lỗi khởi tạo nhanh bằng AI");
    } finally {
      setIsAiQuickCreating(false);
    }
  };

  return (
    <div className="p-3.5 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-violet-50/40 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Gõ tắt không dấu hoặc dán tin nhắn Zalo (AI tự đọc &amp; phân chia nhanh)
        </span>
        <button
          type="button"
          onClick={() => setAiRawInput("truong van long 0926471382 led p2.5 2x3")}
          className="text-[11px] font-medium text-blue-600 hover:underline cursor-pointer"
        >
          Dán ví dụ gõ tắt
        </button>
      </div>
      <textarea
        rows={2}
        value={aiRawInput}
        onChange={(e) => setAiRawInput(e.target.value)}
        placeholder="VD: truong van long 0926471382 led p2.5 2x3 (hoặc dán nguyên tin nhắn Zalo / Email khách hàng...)"
        className="crm-textarea text-xs bg-white resize-none py-2"
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          isLoading={isAiParsing}
          disabled={isAiQuickCreating}
          leftIcon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
          onClick={() => void handleAiParseIntoForm()}
          className="bg-white"
        >
          AI Bóc tách điền vào Form
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          isLoading={isAiQuickCreating}
          disabled={isAiParsing}
          leftIcon={<Zap className="w-3.5 h-3.5" />}
          onClick={() => void handleAiInstantCreate()}
        >
          AI Tạo thẳng Lead &amp; Đóng
        </Button>
      </div>
    </div>
  );
});

export const NewLeadModal = React.memo(function NewLeadModal({
  isOpen,
  onClose,
  onAddLead,
  initialDraft,
  initialWarning,
}: NewLeadModalProps) {
  const [salesList, setSalesList] = useState<SalesUserOption[]>(getInitialSalesUsers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [aiBannerSummary, setAiBannerSummary] = useState<string | null>(null);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState(() => {
    const initialSales = getInitialSalesUsers();
    return {
      customerName: "",
      companyName: "",
      phone: "",
      email: "",
      product: "",
      category: "LED trong nhà",
      source: "Hotline",
      salesPersonName: initialSales[0]?.name || SALES_LIST[0].name,
      salesPersonId: initialSales[0]?.id || "",
      estimatedValue: "",
      installationAddress: "",
      location: "TP. Hồ Chí Minh",
      notes: "",
      ledModuleType: null as string | null,
      ledWidth: null as number | null,
      ledHeight: null as number | null,
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateLeadMatch[]>([]);

  const [attachments, setAttachments] = useState<
    Array<{ fileName: string; fileUrl: string; fileSize?: number; fileType: string }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);

  // Apply initialDraft whenever opened from AiQuickLeadBar
  useEffect(() => {
    if (isOpen && initialDraft) {
      setFormData((prev) => ({
        ...prev,
        customerName: initialDraft.customerName || prev.customerName,
        companyName: initialDraft.companyName || prev.companyName,
        phone: initialDraft.phone || prev.phone,
        email: initialDraft.email || prev.email,
        product: initialDraft.product || prev.product,
        category: initialDraft.categoryName || prev.category,
        source: initialDraft.source || prev.source,
        location: initialDraft.location || prev.location,
        installationAddress: initialDraft.installationAddress || prev.installationAddress,
        estimatedValue: initialDraft.estimatedValue || prev.estimatedValue,
        notes: initialDraft.notes || prev.notes,
        ledModuleType: initialDraft.ledModuleType ?? null,
        ledWidth: initialDraft.ledWidth ?? null,
        ledHeight: initialDraft.ledHeight ?? null,
      }));
      setAiBannerSummary(
        initialDraft.aiSummary || "AI đã tự động bóc tách và điền sẵn các trường thông tin."
      );
      if (initialDraft.email || initialDraft.installationAddress || initialDraft.notes) {
        setShowAdvancedFields(true);
      }
    }
    if (isOpen && initialWarning) {
      setServerError(initialWarning);
    } else if (isOpen && !initialWarning) {
      setServerError(null);
    }
  }, [isOpen, initialDraft, initialWarning]);

  useEffect(() => {
    if (!isOpen) return;

    const openStartMs = typeof performance !== "undefined" ? performance.now() : 0;
    const previousFocused = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    recordModalOpenMetric("Thêm Lead nhanh với Trợ lý AI", openStartMs);

    const rafId = requestAnimationFrame(() => {
      const firstInput = document.getElementById("nl-customer");
      firstInput?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Only fetch sales users if not already populated with real DB IDs
    let active = true;
    sharedGetJson("/api/users?role=SALES", 60_000)
      .then(({ ok, payload }) => {
        if (!active || !ok || !payload?.success || !Array.isArray(payload.data?.users)) return;
        const users: SalesUserOption[] = payload.data.users.map((u: SalesUserOption) => ({
          id: u.id,
          name: u.name,
          initials: u.initials,
        }));
        if (users.length > 0) {
          setSalesList((prev) => (prev[0]?.id === users[0]?.id && prev.length === users.length ? prev : users));
          setFormData((prev) =>
            prev.salesPersonId
              ? prev
              : {
                  ...prev,
                  salesPersonId: users[0].id || "",
                  salesPersonName: users[0].name,
                }
          );
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleKeyDown);
      unlockBodyScroll();
      if (previousFocused && typeof previousFocused.focus === "function") {
        try {
          previousFocused.focus({ preventScroll: true });
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, isSubmitting, onClose]);

  // Debounced duplicate check with minimum length threshold + AbortController (zero wasted renders)
  useEffect(() => {
    if (!isOpen) return;
    const phoneDigits = formData.phone.replace(/\D/g, "");
    const cleanName = formData.customerName.trim();
    const cleanCompany = formData.companyName.trim();

    if (phoneDigits.length < 6 && cleanName.length < 3 && cleanCompany.length < 3) {
      setDuplicateMatches((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/leads/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            phone: formData.phone,
            customerName: cleanName,
            companyName: cleanCompany,
          }),
        });
        if (res.ok && !controller.signal.aborted) {
          const json = await res.json();
          if (json.success && json.data?.isDuplicate && Array.isArray(json.data.matchedLeads)) {
            setDuplicateMatches(json.data.matchedLeads);
          } else {
            setDuplicateMatches((prev) => (prev.length === 0 ? prev : []));
          }
        }
      } catch {
        // ignore aborted or network check error
      }
    }, 420);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, formData.phone, formData.customerName, formData.companyName]);

  const handleParsedDraft = useCallback((p: AiLeadDraft) => {
    setFormData((prev) => ({
      ...prev,
      customerName: p.customerName || prev.customerName,
      companyName: p.companyName || prev.companyName,
      phone: p.phone || prev.phone,
      email: p.email || prev.email,
      product: p.product || prev.product,
      category: p.categoryName || prev.category,
      source: p.source || prev.source,
      location: p.location || prev.location,
      installationAddress: p.installationAddress || prev.installationAddress,
      estimatedValue: p.estimatedValue || prev.estimatedValue,
      notes: p.notes || prev.notes,
      ledModuleType: p.ledModuleType ?? null,
      ledWidth: p.ledWidth ?? null,
      ledHeight: p.ledHeight ?? null,
    }));
    setAiBannerSummary(p.aiSummary || "Đã bóc tách thông tin & tính dự toán LED tự động!");
    setErrors({});
    if (p.email || p.installationAddress) setShowAdvancedFields(true);
  }, []);

  const handleInstantCreated = useCallback(
    (lead: Lead) => {
      onAddLead(lead);
      onClose();
    },
    [onAddLead, onClose]
  );

  if (!isOpen || typeof document === "undefined") return null;

  const selectedSalesObj = salesList.find(
    (s) => s.name === formData.salesPersonName || (s.id && s.id === formData.salesPersonId)
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setServerError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = new FormData();
        data.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: data,
        });

        const json = await res.json();
        if (json.success) {
          setAttachments((prev) => [
            ...prev,
            {
              fileName: json.data.fileName,
              fileUrl: json.data.fileUrl,
              fileSize: json.data.fileSize,
              fileType: json.data.fileType,
            },
          ]);
        } else {
          setServerError(json.error?.message || "Lỗi tải tệp đính kèm");
        }
      }
    } catch {
      setServerError("Lỗi kết nối khi tải tệp đính kèm");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!formData.customerName.trim()) {
      errs.customerName = "Vui lòng nhập tên người liên hệ.";
    }
    if (!formData.phone.trim()) {
      errs.phone = "Vui lòng nhập số điện thoại.";
    }
    if (!formData.product.trim()) {
      errs.product = "Vui lòng nhập hoặc bấm chọn nhanh sản phẩm LED.";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        customerName: formData.customerName,
        companyName: formData.companyName || "Khách hàng doanh nghiệp",
        phone: formData.phone,
        email: formData.email,
        product: formData.product,
        categoryName: formData.category,
        source: formData.source,
        status: "Vừa nhận thông tin",
        salesPersonId: selectedSalesObj?.id,
        estimatedValue: formData.estimatedValue || "Đang khảo sát",
        installationAddress: formData.installationAddress,
        location: formData.location,
        notes: formData.notes,
        ledModuleType: formData.ledModuleType,
        ledWidth: formData.ledWidth,
        ledHeight: formData.ledHeight,
        attachments,
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể tạo Lead mới");
      }

      onAddLead(json.data.lead);
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Lỗi xử lý tạo Lead từ máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-lead-title"
    >
      <div
        ref={dialogRef}
        className="modal-panel bg-elevated rounded-2xl border border-slate-200 shadow-floating w-full max-w-2xl max-h-[88vh] my-auto flex flex-col overflow-hidden animate-scale-in"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="new-lead-title" className="text-[16px] font-semibold text-slate-900">
                Thêm Lead nhanh với Trợ lý AI
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dán tin nhắn để AI tự bóc tách 1 chạm hoặc chọn nhanh cấu hình LED bên dưới
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng cửa sổ tạo Lead"
            className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Server Error */}
        {serverError && (
          <div
            role="alert"
            className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center gap-2 shrink-0"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* AI Filled Confirmation */}
        {aiBannerSummary && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{aiBannerSummary}</span>
          </div>
        )}

        {/* Duplicate Warning */}
        {duplicateMatches.length > 0 && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200/80 text-amber-900 text-xs shrink-0">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Phát hiện hồ sơ có SĐT / Công ty trùng lặp trong hệ thống:</span>
            </div>
            <div className="space-y-0.5 pl-5">
              {duplicateMatches.map((m) => (
                <div key={m.id} className="text-[11.5px] text-amber-800">
                  • <strong>{m.customerName}</strong> ({m.companyName}) · SĐT:{" "}
                  <strong>{m.phone}</strong> · Sales: {m.salesPersonName} ({m.status})
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form
          id="new-lead-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        >
          {/* Isolated AI Smart Paste Box (typing here never re-renders the form below) */}
          <AiSmartPasteSection
            selectedSalesId={selectedSalesObj?.id}
            onParsedDraft={handleParsedDraft}
            onInstantCreated={handleInstantCreated}
            onError={setServerError}
          />

          {/* Core Fast Fields (Only 3 required inputs!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="nl-customer" className="crm-label">
                Tên khách hàng liên hệ <span className="text-rose-500">*</span>
              </label>
              <input
                id="nl-customer"
                type="text"
                placeholder="VD: Anh Minh / Nguyễn Văn An"
                value={formData.customerName}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, customerName: val }));
                  if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: "" }));
                }}
                className="crm-input"
              />
              {errors.customerName && (
                <p className="text-[11.5px] text-rose-600 mt-1">{errors.customerName}</p>
              )}
            </div>

            <div>
              <label htmlFor="nl-phone" className="crm-label">
                Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <input
                id="nl-phone"
                type="text"
                placeholder="VD: 0903 888 912"
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, phone: val }));
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                }}
                className="crm-input font-mono"
              />
              {errors.phone && (
                <p className="text-[11.5px] text-rose-600 mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Product + 1-Click Preset Chips */}
          <div>
            <label htmlFor="nl-product" className="crm-label">
              Hạng mục sản phẩm / Nhu cầu LED <span className="text-rose-500">*</span>
            </label>
            <input
              id="nl-product"
              type="text"
              placeholder="VD: Màn hình LED P2.5 trong nhà hội trường (18m²)"
              value={formData.product}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({ ...prev, product: val }));
                if (errors.product) setErrors((prev) => ({ ...prev, product: "" }));
              }}
              className="crm-input"
            />
            {errors.product && (
              <p className="text-[11.5px] text-rose-600 mt-1">{errors.product}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 mr-0.5">Chọn nhanh:</span>
              {QUICK_PRODUCT_PRESETS.map((preset) => (
                <button
                  key={preset.chip}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      product: preset.product,
                      category: preset.category,
                      estimatedValue: prev.estimatedValue || preset.estimatedValue,
                      ledModuleType: preset.ledModuleType,
                      ledWidth: preset.ledWidth,
                      ledHeight: preset.ledHeight,
                    }));
                    if (errors.product) setErrors((prev) => ({ ...prev, product: "" }));
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  + {preset.chip}
                </button>
              ))}
            </div>
          </div>

          {/* Company & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="nl-company" className="crm-label">
                Tên công ty / Chủ đầu tư
              </label>
              <input
                id="nl-company"
                type="text"
                placeholder="VD: Khách sạn Rex / Tập đoàn Hòa Bình"
                value={formData.companyName}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, companyName: val }));
                }}
                className="crm-input"
              />
            </div>

            <div>
              <label htmlFor="nl-budget" className="crm-label">
                Dự toán ước tính (AI tự tính theo m²)
              </label>
              <input
                id="nl-budget"
                type="text"
                placeholder="VD: 325.500.000 đ"
                value={formData.estimatedValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, estimatedValue: val }));
                }}
                className="crm-input font-semibold text-blue-700"
              />
            </div>
          </div>

          {/* Compact Assignment Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label htmlFor="nl-category" className="crm-label">
                Phân loại LED
              </label>
              <select
                id="nl-category"
                value={formData.category}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, category: val }));
                }}
                className="crm-select w-full"
              >
                <option value="LED trong nhà">LED trong nhà</option>
                <option value="LED ngoài trời">LED ngoài trời</option>
                <option value="Bảng điện tử">Bảng điện tử</option>
                <option value="Màn hình cong / đặc thù">Màn hình cong / đặc thù</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label htmlFor="nl-source" className="crm-label">
                Nguồn tiếp cận
              </label>
              <select
                id="nl-source"
                value={formData.source}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, source: val }));
                }}
                className="crm-select w-full"
              >
                <option value="Hotline">Hotline / Zalo</option>
                <option value="Website">Website Toàn Trung</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Form">Form đăng ký</option>
                <option value="Email">Email</option>
                <option value="Giới thiệu">Giới thiệu</option>
                <option value="Triển lãm">Triển lãm</option>
              </select>
            </div>

            <div>
              <label htmlFor="nl-sales" className="crm-label">
                Sales phụ trách
              </label>
              <select
                id="nl-sales"
                value={formData.salesPersonName}
                onChange={(e) => {
                  const val = e.target.value;
                  const s = salesList.find((item) => item.name === val);
                  setFormData((prev) => ({
                    ...prev,
                    salesPersonName: val,
                    salesPersonId: s?.id || "",
                  }));
                }}
                className="crm-select w-full"
              >
                {salesList.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Collapsible Optional Details to keep fast entry clean */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvancedFields((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 cursor-pointer"
            >
              {showAdvancedFields ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>
                {showAdvancedFields
                  ? "Thu gọn thông tin bổ sung (Email, Địa chỉ công trình, Bản vẽ CAD)"
                  : "Mở rộng thông tin bổ sung (Email, Địa chỉ lắp đặt, Đính kèm bản vẽ CAD)"}
              </span>
            </button>

            {showAdvancedFields && (
              <div className="mt-3 space-y-3.5 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="nl-email" className="crm-label">
                      Email liên hệ
                    </label>
                    <input
                      id="nl-email"
                      type="email"
                      placeholder="contact@doanhnghiep.vn"
                      value={formData.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, email: val }));
                      }}
                      className="crm-input bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="nl-location" className="crm-label">
                      Tỉnh / Thành phố
                    </label>
                    <input
                      id="nl-location"
                      type="text"
                      placeholder="TP. Hồ Chí Minh"
                      value={formData.location}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, location: val }));
                      }}
                      className="crm-input bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="nl-address" className="crm-label">
                    Địa chỉ công trình lắp đặt
                  </label>
                  <input
                    id="nl-address"
                    type="text"
                    placeholder="Số nhà, đường, quận/huyện..."
                    value={formData.installationAddress}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, installationAddress: val }));
                    }}
                    className="crm-input bg-white"
                  />
                </div>

                <div>
                  <label className="crm-label">Tài liệu / Ảnh hiện trạng / Bản vẽ CAD</label>
                  <div className="border border-dashed border-slate-300 rounded-xl p-2.5 bg-white">
                    <input
                      type="file"
                      multiple
                      id="file-upload-input"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.dwg,.dxf"
                    />
                    <label
                      htmlFor="file-upload-input"
                      className="flex items-center justify-center gap-2 cursor-pointer text-slate-600 hover:text-blue-600 py-1"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span className="text-xs font-medium">Đang tải tệp lên...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-medium">
                            Tải ảnh mặt bằng hoặc bản vẽ CAD (Tối đa 15MB)
                          </span>
                        </>
                      )}
                    </label>

                    {attachments.length > 0 && (
                      <div className="mt-2 space-y-1 pt-2 border-t border-slate-200/80">
                        {attachments.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate">{file.fileName}</span>
                            </div>
                            <StatusBadge tone="success" dot={false} size="sm">
                              Đã tải
                            </StatusBadge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="nl-notes" className="crm-label">
                    Ghi chú kỹ thuật &amp; tiến độ
                  </label>
                  <textarea
                    id="nl-notes"
                    rows={2}
                    placeholder="Ghi chú kích thước, độ sáng, khoảng cách nhìn, thời hạn báo giá..."
                    value={formData.notes}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, notes: val }));
                    }}
                    className="crm-textarea bg-white resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-2.5 shrink-0">
          <span className="text-[11.5px] text-slate-500 hidden sm:inline">
            Tự động gắn SLA gọi trong <strong>2 giờ</strong> &amp; chấm điểm ưu tiên Lead
          </span>
          <div className="flex items-center gap-2.5 ml-auto">
            <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              type="submit"
              form="new-lead-form"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {isSubmitting ? "Đang lưu..." : "Lưu Lead"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});
