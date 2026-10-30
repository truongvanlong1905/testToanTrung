"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  AlertCircle,
  Upload,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Lead } from "@/types/lead";
import { SALES_LIST } from "@/data/mockLeads";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (newLead: Lead) => void;
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

export function NewLeadModal({ isOpen, onClose, onAddLead }: NewLeadModalProps) {
  const [salesList, setSalesList] = useState(SALES_LIST);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: "",
    companyName: "",
    phone: "",
    email: "",
    product: "",
    category: "LED trong nhà",
    source: "Hotline",
    salesPersonName: SALES_LIST[0].name,
    salesPersonId: "",
    estimatedValue: "",
    installationAddress: "",
    location: "TP. Hồ Chí Minh",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateLeadMatch[]>([]);
  const [, setIsCheckingDuplicate] = useState(false);

  const [attachments, setAttachments] = useState<
    Array<{ fileName: string; fileUrl: string; fileSize?: number; fileType: string }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function fetchSales() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.users?.length > 0) {
            setSalesList(
              json.data.users.map((u: any) => ({
                id: u.id,
                name: u.name,
                initials: u.initials,
              }))
            );
            if (!formData.salesPersonId) {
              setFormData((prev) => ({
                ...prev,
                salesPersonId: json.data.users[0].id,
                salesPersonName: json.data.users[0].name,
              }));
            }
          }
        }
      } catch {
        // fallback static list
      }
    }
    if (isOpen) {
      fetchSales();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!formData.phone.trim() && !formData.customerName.trim() && !formData.companyName.trim()) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const res = await fetch("/api/leads/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: formData.phone,
            email: formData.email,
            customerName: formData.customerName,
            companyName: formData.companyName,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.isDuplicate) {
            setDuplicateMatches(json.data.matchedLeads);
          } else {
            setDuplicateMatches([]);
          }
        }
      } catch {
        // ignore check error
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 550);

    return () => clearTimeout(timer);
  }, [formData.phone, formData.email, formData.customerName, formData.companyName]);

  if (!isOpen) return null;

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
      errs.product = "Vui lòng nhập sản phẩm / nhu cầu LED quan tâm.";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const selectedSales = salesList.find(
        (s: any) => s.name === formData.salesPersonName || s.id === formData.salesPersonId
      );

      const payload = {
        customerName: formData.customerName,
        companyName: formData.companyName || "Khách hàng cá nhân",
        phone: formData.phone,
        email: formData.email,
        product: formData.product,
        categoryName: formData.category,
        source: formData.source,
        status: "Vừa nhận thông tin",
        salesPersonId: (selectedSales as any)?.id,
        estimatedValue: formData.estimatedValue || "Đang khảo sát",
        installationAddress: formData.installationAddress,
        location: formData.location,
        notes: formData.notes,
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

      setFormData({
        customerName: "",
        companyName: "",
        phone: "",
        email: "",
        product: "",
        category: "LED trong nhà",
        source: "Hotline",
        salesPersonName: salesList[0]?.name || "Trần Minh Tuấn",
        salesPersonId: (salesList[0] as any)?.id || "",
        estimatedValue: "",
        installationAddress: "",
        location: "TP. Hồ Chí Minh",
        notes: "",
      });
      setAttachments([]);
      setDuplicateMatches([]);
      setErrors({});
    } catch (err: any) {
      setServerError(err.message || "Lỗi xử lý tạo Lead từ máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-lead-title"
    >
      <div
        className="bg-elevated rounded-2xl border border-slate-200 shadow-floating w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 id="new-lead-title" className="text-[16px] font-semibold text-slate-900">
              Thêm Lead mới
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Khởi tạo hồ sơ cơ hội khách hàng và tự động kiểm tra trùng lặp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Duplicate Warning */}
        {duplicateMatches.length > 0 && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200/80 text-amber-900 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Phát hiện hồ sơ có thông tin trùng lặp:</span>
            </div>
            <div className="space-y-1 pl-5">
              {duplicateMatches.map((m) => (
                <div key={m.id} className="text-[11.5px] text-amber-800">
                  • <strong>{m.customerName}</strong> ({m.companyName}) · SĐT:{" "}
                  <strong>{m.phone}</strong> · Sales: {m.salesPersonName} ({m.status})
                </div>
              ))}
            </div>
            <p className="text-[11px] text-amber-700 mt-1.5 pl-5">
              Bạn vẫn có thể lưu nếu đây là dự án lắp đặt mới độc lập.
            </p>
          </div>
        )}

        {/* Form Body */}
        <form id="new-lead-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nl-customer" className="crm-label">
                Tên khách hàng liên hệ <span className="text-rose-500">*</span>
              </label>
              <input
                id="nl-customer"
                type="text"
                placeholder="VD: Nguyễn Văn An"
                value={formData.customerName}
                onChange={(e) => {
                  setFormData({ ...formData, customerName: e.target.value });
                  if (errors.customerName) setErrors({ ...errors, customerName: "" });
                }}
                className="crm-input"
              />
              {errors.customerName && (
                <p className="text-[11.5px] text-rose-600 mt-1">{errors.customerName}</p>
              )}
            </div>

            <div>
              <label htmlFor="nl-company" className="crm-label">
                Tên công ty / Chủ đầu tư
              </label>
              <input
                id="nl-company"
                type="text"
                placeholder="VD: Khách sạn Royal Palace"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="crm-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nl-phone" className="crm-label">
                Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <input
                id="nl-phone"
                type="text"
                placeholder="VD: 0912 345 678"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  if (errors.phone) setErrors({ ...errors, phone: "" });
                }}
                className="crm-input"
              />
              {errors.phone && (
                <p className="text-[11.5px] text-rose-600 mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="nl-email" className="crm-label">
                Email liên hệ
              </label>
              <input
                id="nl-email"
                type="email"
                placeholder="contact@doanhnghiep.vn"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="crm-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="nl-product" className="crm-label">
              Hạng mục sản phẩm / Nhu cầu LED <span className="text-rose-500">*</span>
            </label>
            <input
              id="nl-product"
              type="text"
              placeholder="VD: Màn hình LED P2.5 trong nhà hội trường (25m²)"
              value={formData.product}
              onChange={(e) => {
                setFormData({ ...formData, product: e.target.value });
                if (errors.product) setErrors({ ...errors, product: "" });
              }}
              className="crm-input"
            />
            {errors.product && (
              <p className="text-[11.5px] text-rose-600 mt-1">{errors.product}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nl-category" className="crm-label">
                Phân loại sản phẩm
              </label>
              <select
                id="nl-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
              <label htmlFor="nl-budget" className="crm-label">
                Giá trị dự toán ước tính
              </label>
              <input
                id="nl-budget"
                type="text"
                placeholder="VD: 350.000.000 đ"
                value={formData.estimatedValue}
                onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                className="crm-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="nl-source" className="crm-label">
                Nguồn tiếp cận
              </label>
              <select
                id="nl-source"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="crm-select w-full"
              >
                <option value="Hotline">Hotline</option>
                <option value="Form">Form</option>
                <option value="Email">Email</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Facebook Ads">Facebook Ads</option>
                <option value="Website">Website</option>
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
                  const s = salesList.find((item: any) => item.name === e.target.value);
                  setFormData({
                    ...formData,
                    salesPersonName: e.target.value,
                    salesPersonId: (s as any)?.id || "",
                  });
                }}
                className="crm-select w-full"
              >
                {salesList.map((s: any) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
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
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="crm-input"
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
              placeholder="Số nhà, đường, phường/xã, quận/huyện..."
              value={formData.installationAddress}
              onChange={(e) =>
                setFormData({ ...formData, installationAddress: e.target.value })
              }
              className="crm-input"
            />
          </div>

          <div>
            <label className="crm-label">
              Tài liệu / Ảnh hiện trạng / Bản vẽ CAD
            </label>
            <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
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
                className="flex items-center justify-center gap-2 cursor-pointer text-slate-600 hover:text-blue-600 py-1.5"
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
                      Nhấn để tải ảnh hiện trạng hoặc bản vẽ (Tối đa 15MB)
                    </span>
                  </>
                )}
              </label>

              {attachments.length > 0 && (
                <div className="mt-2.5 space-y-1.5 pt-2.5 border-t border-slate-200/80">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700"
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
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="crm-textarea resize-none"
            />
          </div>
        </form>

        {/* Modal Footer: Cancel + Primary Action */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-end gap-2.5 shrink-0">
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
  );
}
