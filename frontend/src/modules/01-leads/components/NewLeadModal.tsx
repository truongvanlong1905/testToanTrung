"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Pencil,
  AlertCircle,
  Upload,
  FileText,
  AlertTriangle,
  Loader2,
  UserCheck,
} from "lucide-react";
import {
  Lead,
  LeadStatus,
  ProductCatalogOption,
  OFFICIAL_CATALOG_FALLBACK,
  OFFICIAL_DEMAND_TYPES,
  OFFICIAL_CONTACT_CHANNELS,
  SOURCE_LIST,
  STATUS_LIST,
  SALES_LIST,
} from "../types";
import { Button } from "@/src/core/ui/button";
import { lockBodyScroll, unlockBodyScroll, recordModalOpenMetric } from "@/src/core/ui/modal";
import { peekSharedJson, sharedGetJson } from "@/src/core/http/shared-fetch";

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (savedLead: Lead) => void;
  editingLead?: Lead | null;
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

function getInitialCatalogItems(): ProductCatalogOption[] {
  const cached = peekSharedJson("/api/categories", 60_000);
  if (cached?.success && Array.isArray(cached.data?.categories)) {
    const officialCats: ProductCatalogOption[] = cached.data.categories.filter(
      (c: ProductCatalogOption) => c.group === "LED_SCREEN" || c.group === "ELECTRONIC_BOARD"
    );
    if (officialCats.length > 0) return officialCats;
  }
  return OFFICIAL_CATALOG_FALLBACK;
}

function buildInitialFormData(
  editingLead: Lead | null,
  catalogItems: ProductCatalogOption[],
  salesUsers: SalesUserOption[]
) {
  if (editingLead) {
    const matchedCatalog = catalogItems.find(
      (c) =>
        c.code === editingLead.categoryCode ||
        c.name.toLowerCase() === (editingLead.product || "").toLowerCase() ||
        c.name.toLowerCase() === (editingLead.category || "").toLowerCase()
    );
    const inferredGroup =
      matchedCatalog?.group === "ELECTRONIC_BOARD" ||
      editingLead.productGroup === "ELECTRONIC_BOARD" ||
      (editingLead.category || "").toLowerCase().includes("bảng")
        ? "ELECTRONIC_BOARD"
        : "LED_SCREEN";

    return {
      customerName: editingLead.customerName || "",
      companyName: editingLead.companyName || "",
      phone: editingLead.phone || "",
      email: editingLead.email || "",
      productGroup: inferredGroup,
      categoryCode: matchedCatalog?.code || editingLead.categoryCode || "",
      product:
        editingLead.product && editingLead.product !== "Chưa xác định"
          ? editingLead.product
          : matchedCatalog?.name || "",
      productCustomText: editingLead.productCustomText || "",
      demandType: editingLead.demandType || "Chưa xác định",
      source: editingLead.source || "Hotline",
      contactChannel: editingLead.contactChannel || "Hotline",
      status: (editingLead.status || "Vừa nhận thông tin") as LeadStatus,
      failureReason: editingLead.failureReason || "",
      hasCustomerResponded: Boolean(editingLead.customerRespondedAt),
      customerResponseNote: editingLead.customerResponseNote || "",
      salesPersonId: editingLead.salesPerson?.id || editingLead.salesPersonId || "",
      transferToOtherSales: false,
      targetSalesPersonId: "",
      transferReason: "",
      installationAddress: editingLead.installationAddress || "",
      location: editingLead.location || "",
      notes: editingLead.notes || "",
    };
  }

  return {
    customerName: "",
    companyName: "",
    phone: "",
    email: "",
    productGroup: "LED_SCREEN",
    categoryCode: "",
    product: "",
    productCustomText: "",
    demandType: "Chưa xác định",
    source: "Hotline",
    contactChannel: "Hotline",
    status: "Vừa nhận thông tin" as LeadStatus,
    failureReason: "",
    hasCustomerResponded: false,
    customerResponseNote: "",
    salesPersonId: salesUsers[0]?.id || "",
    transferToOtherSales: false,
    targetSalesPersonId: "",
    transferReason: "",
    installationAddress: "",
    location: "",
    notes: "",
  };
}

export const NewLeadModal = React.memo(function NewLeadModal({
  isOpen,
  onClose,
  onAddLead,
  editingLead = null,
}: NewLeadModalProps) {
  const isEditing = Boolean(editingLead);
  const [salesList, setSalesList] = useState<SalesUserOption[]>(getInitialSalesUsers);
  const [catalogItems, setCatalogItems] = useState<ProductCatalogOption[]>(
    getInitialCatalogItems
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const onCloseRef = useRef(onClose);
  const isSubmittingRef = useRef(isSubmitting);
  useEffect(() => {
    onCloseRef.current = onClose;
    isSubmittingRef.current = isSubmitting;
  }, [onClose, isSubmitting]);

  const [formData, setFormData] = useState(() =>
    buildInitialFormData(editingLead, getInitialCatalogItems(), getInitialSalesUsers())
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateLeadMatch[]>([]);

  const [attachments, setAttachments] = useState<
    Array<{ fileName: string; fileUrl: string; fileSize?: number; fileType: string }>
  >(() =>
    (editingLead?.attachments || []).map((a) => ({
      fileName: a.fileName,
      fileUrl: a.fileUrl,
      fileSize: a.fileSize,
      fileType: a.fileType,
    }))
  );
  const [isUploading, setIsUploading] = useState(false);

  const prevOpenIdentityRef = useRef<string>(
    `${isOpen}-${editingLead?.id || "new"}`
  );

  // Populate form only when switching open/editingLead identity
  useEffect(() => {
    if (!isOpen) return;
    const nextIdentity = `${isOpen}-${editingLead?.id || "new"}`;
    if (prevOpenIdentityRef.current === nextIdentity) return;
    prevOpenIdentityRef.current = nextIdentity;

    setErrors({});
    setServerError(null);
    setDuplicateMatches([]);
    setFormData(buildInitialFormData(editingLead, catalogItems, salesList));
    setAttachments(
      (editingLead?.attachments || []).map((a) => ({
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileSize: a.fileSize,
        fileType: a.fileType,
      }))
    );
  }, [isOpen, editingLead, catalogItems, salesList]);

  useEffect(() => {
    if (!isOpen) return;

    const openStartMs = typeof performance !== "undefined" ? performance.now() : 0;
    const previousFocused = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    recordModalOpenMetric(isEditing ? "Chỉnh sửa Lead" : "Thêm Lead mới", openStartMs);

    const rafId = requestAnimationFrame(() => {
      const firstInput = document.getElementById("nl-customer");
      firstInput?.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmittingRef.current) {
        event.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    let active = true;
    const fetchTimer = window.setTimeout(() => {
      sharedGetJson("/api/users?role=SALES", 60_000)
        .then(({ ok, payload }) => {
          if (!active || !ok || !payload?.success || !Array.isArray(payload.data?.users)) return;
          const users: SalesUserOption[] = payload.data.users.map((u: SalesUserOption) => ({
            id: u.id,
            name: u.name,
            initials: u.initials,
          }));
          if (users.length > 0) {
            setSalesList(users);
            setFormData((prev) => ({
              ...prev,
              salesPersonId: prev.salesPersonId || users[0].id || "",
              targetSalesPersonId: prev.targetSalesPersonId || users[0].id || "",
            }));
          }
        })
        .catch(() => {});

      sharedGetJson("/api/categories", 60_000)
        .then(({ ok, payload }) => {
          if (!active || !ok || !payload?.success || !Array.isArray(payload.data?.categories)) return;
          const officialCats: ProductCatalogOption[] = payload.data.categories.filter(
            (c: ProductCatalogOption) => c.group === "LED_SCREEN" || c.group === "ELECTRONIC_BOARD"
          );
          if (officialCats.length > 0) {
            setCatalogItems(officialCats);
          }
        })
        .catch(() => {});
    }, 170);

    return () => {
      active = false;
      window.clearTimeout(fetchTimer);
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
  }, [isOpen, isEditing]);

  // Real-time full-DB duplicate check
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
            excludeLeadId: editingLead?.id,
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
    }, 380);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, formData.phone, formData.customerName, formData.companyName, editingLead?.id]);

  if (!isOpen || typeof document === "undefined") return null;

  const groupProducts = catalogItems.filter((c) => c.group === formData.productGroup);
  const selectedProductObj = catalogItems.find(
    (c) => c.code === formData.categoryCode || c.name === formData.product
  );
  const requiresCustomProductText =
    Boolean(selectedProductObj?.allowCustomText) ||
    formData.categoryCode === "LED_OTHER" ||
    formData.categoryCode === "BOARD_OTHER" ||
    formData.product.toLowerCase().includes("khác");

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
        if (editingLead?.id) {
          data.append("leadId", editingLead.id);
        }

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
      errs.customerName = "Vui lòng nhập tên khách hàng liên hệ.";
    }
    if (!formData.phone.trim()) {
      errs.phone = "Vui lòng nhập số điện thoại.";
    } else if (formData.phone.replace(/\D/g, "").length < 8) {
      errs.phone = "Số điện thoại cần tối thiểu 8 chữ số.";
    }

    if (requiresCustomProductText && !formData.productCustomText.trim()) {
      errs.productCustomText = "Vui lòng nhập mô tả sản phẩm khi chọn mục 'Khác'.";
    }

    if (formData.transferToOtherSales) {
      if (!formData.targetSalesPersonId) {
        errs.targetSalesPersonId = "Vui lòng chọn nhân viên kinh doanh nhận bàn giao.";
      }
      if (!formData.transferReason.trim()) {
        errs.transferReason = "Vui lòng nhập lý do chuyển kinh doanh khác.";
      }
    }

    if (isEditing && formData.status === "Thất bại" && !formData.failureReason.trim()) {
      errs.failureReason = "Bắt buộc nhập lý do khi chọn trạng thái Thất bại.";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      if (isEditing && editingLead) {
        const updatePayload: Record<string, unknown> = {
          customerName: formData.customerName.trim(),
          companyName: formData.companyName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          product: formData.product.trim() || "Chưa xác định",
          categoryCode: formData.categoryCode || undefined,
          categoryName: selectedProductObj?.name || formData.product.trim() || undefined,
          productCustomText: requiresCustomProductText
            ? formData.productCustomText.trim()
            : null,
          demandType: formData.demandType,
          source: formData.source,
          contactChannel: formData.contactChannel,
          status: formData.status,
          failureReason:
            formData.status === "Thất bại" ? formData.failureReason.trim() : null,
          hasCustomerResponded: formData.hasCustomerResponded,
          customerResponseNote: formData.customerResponseNote.trim() || null,
          installationAddress: formData.installationAddress.trim(),
          location: formData.location.trim(),
          notes: formData.notes.trim(),
          transferToOtherSales: formData.transferToOtherSales,
          salesPersonId: formData.transferToOtherSales
            ? formData.targetSalesPersonId
            : formData.salesPersonId || undefined,
          transferReason: formData.transferToOtherSales
            ? formData.transferReason.trim()
            : undefined,
        };

        const res = await fetch(`/api/leads/${editingLead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Không thể cập nhật thông tin Lead");
        }
        onAddLead(json.data.lead);
        onClose();
      } else {
        const createPayload = {
          customerName: formData.customerName.trim(),
          companyName: formData.companyName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          product: formData.product.trim() || "Chưa xác định",
          categoryCode: formData.categoryCode || undefined,
          categoryName: selectedProductObj?.name || formData.product.trim() || undefined,
          productCustomText: requiresCustomProductText
            ? formData.productCustomText.trim()
            : null,
          demandType: formData.demandType,
          source: formData.source,
          contactChannel: formData.contactChannel,
          status: "Vừa nhận thông tin",
          salesPersonId: formData.transferToOtherSales
            ? formData.targetSalesPersonId
            : formData.salesPersonId || undefined,
          transferToOtherSales: formData.transferToOtherSales,
          transferReason: formData.transferToOtherSales
            ? formData.transferReason.trim()
            : undefined,
          installationAddress: formData.installationAddress.trim(),
          location: formData.location.trim(),
          notes: formData.notes.trim(),
          attachments,
        };

        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createPayload),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Không thể tạo Lead mới");
        }

        onAddLead(json.data.lead);
        onClose();
      }
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Lỗi xử lý dữ liệu Lead từ máy chủ");
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
        className="modal-panel bg-elevated rounded-2xl border border-slate-200 shadow-floating w-full max-w-2xl max-h-[90vh] my-auto flex flex-col overflow-hidden animate-scale-in"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="new-lead-title" className="text-[16px] font-semibold text-slate-900">
                {isEditing
                  ? `Chỉnh sửa thông tin Lead (${editingLead?.code})`
                  : "Thêm Lead khách hàng mới"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEditing
                  ? "Cập nhật thông tin liên hệ, danh mục sản phẩm, trạng thái và phân công kinh doanh."
                  : "Chỉ bắt buộc Tên khách hàng và Số điện thoại để tiếp nhận nhanh."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng cửa sổ"
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

        {/* Duplicate Warning (Full DB check, non-blocking) */}
        {duplicateMatches.length > 0 && (
          <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200/80 text-amber-900 text-xs shrink-0">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cảnh báo trùng số điện thoại / khách hàng trong toàn hệ thống:</span>
            </div>
            <div className="space-y-0.5 pl-5">
              {duplicateMatches.map((m) => (
                <div key={m.id} className="text-[11.5px] text-amber-800">
                  • <strong>{m.code}</strong> — <strong>{m.customerName}</strong>
                  {m.companyName ? ` (${m.companyName})` : ""} · SĐT: <strong>{m.phone}</strong> ·
                  Sales: {m.salesPersonName} ({m.status})
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
          {/* 1. Core Required Fields: Customer Name & Phone */}
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

          {/* 2. Structured Product Catalog (Màn hình LED / Bảng Điện Tử + 21 items + Nhu cầu Mua/Thuê) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="nl-product-group" className="crm-label">
                  Nhóm sản phẩm
                </label>
                <select
                  id="nl-product-group"
                  value={formData.productGroup}
                  onChange={(e) => {
                    const nextGroup = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      productGroup: nextGroup,
                      categoryCode: "",
                      product: "",
                      productCustomText: "",
                    }));
                  }}
                  className="crm-select w-full"
                >
                  <option value="LED_SCREEN">Màn hình LED</option>
                  <option value="ELECTRONIC_BOARD">Bảng Điện Tử</option>
                </select>
              </div>

              <div>
                <label htmlFor="nl-product-item" className="crm-label">
                  Danh mục sản phẩm
                </label>
                <select
                  id="nl-product-item"
                  value={formData.categoryCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const chosen = catalogItems.find((c) => c.code === code);
                    setFormData((prev) => ({
                      ...prev,
                      categoryCode: code,
                      product: chosen ? chosen.name : "",
                    }));
                  }}
                  className="crm-select w-full"
                >
                  <option value="">-- Chưa chọn / Nhập tự do --</option>
                  {groupProducts.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="nl-demand-type" className="crm-label">
                  Loại nhu cầu
                </label>
                <select
                  id="nl-demand-type"
                  value={formData.demandType}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, demandType: e.target.value }))
                  }
                  className="crm-select w-full"
                >
                  {OFFICIAL_DEMAND_TYPES.map((dt) => (
                    <option key={dt} value={dt}>
                      {dt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {requiresCustomProductText && (
              <div>
                <label htmlFor="nl-product-custom" className="crm-label">
                  Mô tả sản phẩm khác <span className="text-rose-500">*</span>
                </label>
                <input
                  id="nl-product-custom"
                  type="text"
                  placeholder="Nhập chi tiết dòng sản phẩm khách hàng yêu cầu..."
                  value={formData.productCustomText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({ ...prev, productCustomText: val }));
                    if (errors.productCustomText)
                      setErrors((prev) => ({ ...prev, productCustomText: "" }));
                  }}
                  className="crm-input bg-white"
                />
                {errors.productCustomText && (
                  <p className="text-[11.5px] text-rose-600 mt-1">{errors.productCustomText}</p>
                )}
              </div>
            )}
          </div>

          {/* 3. Source & Contact Channel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                {SOURCE_LIST.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="nl-channel" className="crm-label">
                Kênh liên hệ
              </label>
              <select
                id="nl-channel"
                value={formData.contactChannel}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, contactChannel: val }));
                }}
                className="crm-select w-full"
              >
                {OFFICIAL_CONTACT_CHANNELS.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Company, Location & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label htmlFor="nl-company" className="crm-label">
                Tên công ty / Đơn vị
              </label>
              <input
                id="nl-company"
                type="text"
                placeholder="Tùy chọn (để trống nếu chưa rõ)"
                value={formData.companyName}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, companyName: val }));
                }}
                className="crm-input"
              />
            </div>

            <div>
              <label htmlFor="nl-location" className="crm-label">
                Tỉnh / Thành phố
              </label>
              <input
                id="nl-location"
                type="text"
                placeholder="VD: TP. Hồ Chí Minh, Hà Nội..."
                value={formData.location}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, location: val }));
                }}
                className="crm-input"
              />
            </div>

            <div>
              <label htmlFor="nl-email" className="crm-label">
                Email liên hệ
              </label>
              <input
                id="nl-email"
                type="email"
                placeholder="khachhang@congty.vn"
                value={formData.email}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, email: val }));
                }}
                className="crm-input"
              />
            </div>
          </div>

          {/* 5. Status & Quote Response Tracking (when editing) */}
          {isEditing && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="nl-status" className="crm-label">
                    Trạng thái bán hàng
                  </label>
                  <select
                    id="nl-status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as LeadStatus,
                      }))
                    }
                    className="crm-select w-full font-medium"
                  >
                    {STATUS_LIST.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.status === "Đã gửi báo giá" && (
                  <div>
                    <label htmlFor="nl-quote-response" className="crm-label">
                      Phản hồi khách hàng sau báo giá
                    </label>
                    <select
                      id="nl-quote-response"
                      value={formData.hasCustomerResponded ? "responded" : "waiting"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          hasCustomerResponded: e.target.value === "responded",
                        }))
                      }
                      className="crm-select w-full"
                    >
                      <option value="waiting">Đã gửi báo giá — Chưa ghi nhận phản hồi</option>
                      <option value="responded">Khách hàng đã phản hồi</option>
                    </select>
                  </div>
                )}
              </div>

              {formData.status === "Đã gửi báo giá" && (
                <div>
                  <label htmlFor="nl-response-note" className="crm-label">
                    Ghi chú phản hồi báo giá
                  </label>
                  <input
                    id="nl-response-note"
                    type="text"
                    placeholder="Ghi chú ý kiến phản hồi của khách hàng về báo giá..."
                    value={formData.customerResponseNote}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customerResponseNote: e.target.value,
                      }))
                    }
                    className="crm-input bg-white"
                  />
                </div>
              )}

              {formData.status === "Thất bại" && (
                <div>
                  <label htmlFor="nl-failure-reason" className="crm-label">
                    Lý do Thất bại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="nl-failure-reason"
                    type="text"
                    placeholder="Nhập nguyên nhân khách không chốt..."
                    value={formData.failureReason}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, failureReason: val }));
                      if (errors.failureReason)
                        setErrors((prev) => ({ ...prev, failureReason: "" }));
                    }}
                    className="crm-input bg-white border-rose-300"
                  />
                  {errors.failureReason && (
                    <p className="text-[11.5px] text-rose-600 mt-1">{errors.failureReason}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 6. Sales Assignment & Checkbox "Chuyển kinh doanh khác" (AC-12) */}
          <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>
                  Nhân viên kinh doanh phụ trách hiện tại:{" "}
                  <strong className="text-slate-900">
                    {salesList.find((s) => s.id === formData.salesPersonId)?.name ||
                      editingLead?.salesPerson?.name ||
                      salesList[0]?.name ||
                      "Tự động gán"}
                  </strong>
                </span>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.transferToOtherSales}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      transferToOtherSales: checked,
                      targetSalesPersonId:
                        prev.targetSalesPersonId ||
                        salesList.find((s) => s.id !== prev.salesPersonId)?.id ||
                        salesList[0]?.id ||
                        "",
                    }));
                  }}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Chuyển kinh doanh khác</span>
              </label>
            </div>

            {formData.transferToOtherSales && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label htmlFor="nl-target-sales" className="crm-label">
                    Chọn nhân viên kinh doanh nhận Lead <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="nl-target-sales"
                    value={formData.targetSalesPersonId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, targetSalesPersonId: val }));
                      if (errors.targetSalesPersonId)
                        setErrors((prev) => ({ ...prev, targetSalesPersonId: "" }));
                    }}
                    className="crm-select w-full"
                  >
                    <option value="">-- Chọn Sales nhận bàn giao --</option>
                    {salesList.map((s) => (
                      <option key={s.id || s.name} value={s.id || s.name}>
                        {s.name} ({s.initials})
                      </option>
                    ))}
                  </select>
                  {errors.targetSalesPersonId && (
                    <p className="text-[11.5px] text-rose-600 mt-1">{errors.targetSalesPersonId}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="nl-transfer-reason" className="crm-label">
                    Lý do chuyển kinh doanh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="nl-transfer-reason"
                    type="text"
                    placeholder="VD: Phân tuyến khu vực / Chuyên môn dự án..."
                    value={formData.transferReason}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, transferReason: val }));
                      if (errors.transferReason)
                        setErrors((prev) => ({ ...prev, transferReason: "" }));
                    }}
                    className="crm-input"
                  />
                  {errors.transferReason && (
                    <p className="text-[11.5px] text-rose-600 mt-1">{errors.transferReason}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 7. Installation Address & Notes */}
          <div className="space-y-3">
            <div>
              <label htmlFor="nl-address" className="crm-label">
                Địa chỉ khảo sát / lắp đặt chi tiết
              </label>
              <input
                id="nl-address"
                type="text"
                placeholder="Số nhà, đường, tòa nhà..."
                value={formData.installationAddress}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, installationAddress: val }));
                }}
                className="crm-input"
              />
            </div>

            <div>
              <label htmlFor="nl-notes" className="crm-label">
                Ghi chú yêu cầu của khách hàng
              </label>
              <textarea
                id="nl-notes"
                rows={2}
                placeholder="Ghi chú nhu cầu kỹ thuật, tiến độ mong muốn..."
                value={formData.notes}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({ ...prev, notes: val }));
                }}
                className="crm-textarea resize-none"
              />
            </div>

            {/* File Attachments */}
            <div>
              <label className="crm-label">Tài liệu / Hình ảnh đính kèm</label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer transition-colors">
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{isUploading ? "Đang tải lên..." : "Chọn tệp đính kèm"}</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>

                {attachments.map((file, idx) => (
                  <span
                    key={`${file.fileName}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200/80 text-xs text-blue-700"
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[160px]">{file.fileName}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label={`Xóa tệp ${file.fileName}`}
                      className="text-blue-400 hover:text-blue-700 ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form="new-lead-form"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          >
            {isEditing ? "Lưu thay đổi" : "Lưu Lead mới"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
});
