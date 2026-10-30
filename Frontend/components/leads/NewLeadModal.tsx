"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, AlertCircle, Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Lead, LeadSource } from "@/types/lead";
import { SOURCE_LIST, SALES_LIST } from "@/data/mockLeads";

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

  // Form State
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

  // Duplicate Warning State
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateLeadMatch[]>([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Attachments State
  const [attachments, setAttachments] = useState<
    Array<{ fileName: string; fileUrl: string; fileSize?: number; fileType: string }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch real users from DB on mount
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
      } catch (err) {
        console.warn("Could not fetch users list, fallback to static list:", err);
      }
    }
    if (isOpen) {
      fetchSales();
    }
  }, [isOpen]);

  // Check Duplicate Debounced
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
      } catch (e) {
        console.warn("Check duplicate error:", e);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.phone, formData.email, formData.customerName, formData.companyName]);

  if (!isOpen) return null;

  // File Upload Handler
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
          setServerError(json.error?.message || "Lỗi tải file");
        }
      }
    } catch (err: any) {
      setServerError("Lỗi kết nối khi tải file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const errs: Record<string, string> = {};
    if (!formData.customerName.trim()) {
      errs.customerName = "Vui lòng nhập tên khách hàng";
    }
    if (!formData.phone.trim()) {
      errs.phone = "Vui lòng nhập số điện thoại";
    }
    if (!formData.product.trim()) {
      errs.product = "Vui lòng nhập sản phẩm / nhu cầu LED quan tâm";
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
        throw new Error(json.error?.message || "Không thể tạo Lead");
      }

      // Trả kết quả Lead mới về cho trang chủ
      onAddLead(json.data.lead);
      onClose();

      // Reset form
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Thêm khách hàng tiềm năng mới
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hệ thống Tiếp nhận Lead Toàn Trung • Lưu trữ Database
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-100 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Duplicate Warning Box (Phase 5 Requirement #12) */}
        {duplicateMatches.length > 0 && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200/80 text-amber-900 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cảnh báo phát hiện khách hàng trùng lặp:</span>
            </div>
            <div className="space-y-1 pl-5">
              {duplicateMatches.map((m) => (
                <div key={m.id} className="text-[11px] text-amber-800">
                  • <strong>{m.customerName}</strong> ({m.companyName}) - SĐT:{" "}
                  <strong>{m.phone}</strong> - Sales: <em>{m.salesPersonName}</em> (Trạng thái: {m.status})
                </div>
              ))}
            </div>
            <p className="text-[10px] text-amber-600 mt-1.5 pl-5">
              * Đây là cảnh báo phòng tránh trùng dữ liệu. Bạn vẫn có thể tiếp tục lưu nếu đây là dự án riêng biệt.
            </p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Row 1: Customer Name & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Tên khách hàng liên hệ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn An"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {errors.customerName && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.customerName}</p>
              )}
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Tên công ty / Đơn vị dự án
              </label>
              <input
                type="text"
                placeholder="VD: Khách sạn Royal Palace"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 2: Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: 0912.345.678"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {errors.phone && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Email liên hệ
              </label>
              <input
                type="email"
                placeholder="VD: contact@royal.vn"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 3: Product Interest & Category */}
          <div className="space-y-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Sản phẩm / Nhu cầu hiển thị LED <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Màn hình LED P2.5 trong nhà hội trường (25m²)"
                value={formData.product}
                onChange={(e) =>
                  setFormData({ ...formData, product: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {errors.product && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.product}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Phân loại sản phẩm
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="LED trong nhà">LED trong nhà</option>
                  <option value="LED ngoài trời">LED ngoài trời</option>
                  <option value="Bảng điện tử">Bảng điện tử</option>
                  <option value="Màn hình cong / đặc thù">Màn hình cong / đặc thù</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Giá trị dự toán ước tính
                </label>
                <input
                  type="text"
                  placeholder="VD: 350.000.000 đ"
                  value={formData.estimatedValue}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedValue: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Source, Sales & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Nguồn tiếp cận
              </label>
              <select
                value={formData.source}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    source: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
              <label className="block font-medium text-slate-700 mb-1">
                Sales phụ trách
              </label>
              <select
                value={formData.salesPersonName}
                onChange={(e) => {
                  const s = salesList.find((item: any) => item.name === e.target.value);
                  setFormData({
                    ...formData,
                    salesPersonName: e.target.value,
                    salesPersonId: (s as any)?.id || "",
                  });
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {salesList.map((s: any) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Tỉnh / Thành phố
              </label>
              <input
                type="text"
                placeholder="VD: TP. Hồ Chí Minh"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Installation Address */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Địa chỉ lắp đặt công trình
            </label>
            <input
              type="text"
              placeholder="VD: Số 123 Lê Lợi, Phường Bến Thành, Quận 1, TP. HCM"
              value={formData.installationAddress}
              onChange={(e) =>
                setFormData({ ...formData, installationAddress: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* File Upload Section (Phase 5 Requirement #7) */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Đính kèm ảnh hiện trạng / Bản vẽ CAD / Tài liệu
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
                className="flex items-center justify-center gap-2 cursor-pointer text-slate-600 hover:text-blue-600 py-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-xs font-medium">Đang tải file lên...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium">
                      Nhấn để tải ảnh hoặc bản vẽ đính kèm (Tối đa 15MB)
                    </span>
                  </>
                )}
              </label>

              {/* Uploaded Files List */}
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-200">
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-700"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{file.fileName}</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                        Đã tải lên
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Ghi chú yêu cầu kỹ thuật & tiến độ
            </label>
            <textarea
              rows={2}
              placeholder="Nhập ghi chú yêu cầu khảo sát, độ sáng, kích thước phòng hoặc thời hạn bàn giao..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lưu Lead vào Database</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
