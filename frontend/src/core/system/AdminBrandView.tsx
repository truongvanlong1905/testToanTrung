"use client";

import React, { useState, useEffect } from "react";
import {
  Save,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { PageHeader, SectionHeader } from "@/src/core/ui/page-header";
import { Button } from "@/src/core/ui/button";
import { Toast } from "@/src/core/ui/toast";

export function AdminBrandView() {
  const [brandName, setBrandName] = useState("TOÀN TRUNG");
  const [slogan, setSlogan] = useState(
    "Giải pháp hiển thị màn hình LED & Viễn thông chuyên nghiệp"
  );
  const [supportHotline, setHotline] = useState("0909.123.456");
  const [primaryColor, setColor] = useState("#2563EB");
  const [logoUrl, setLogoUrl] = useState("");

  const [loginWelcomeTitle, setWelcomeTitle] = useState("Chào mừng trở lại");
  const [loginWelcomeDesc, setWelcomeDesc] = useState(
    "Hệ thống quản trị nội bộ dành cho Marketing, Kinh doanh và Thiết kế của Công ty Cổ phần Điện tử Viễn thông Toàn Trung."
  );
  const [loginBgUrl, setLoginBgUrl] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadBrandImage = async (
    file: File | undefined,
    setImageUrl: (url: string) => void
  ) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Vui lòng chọn tệp ảnh định dạng PNG, JPG hoặc WebP.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Dung lượng ảnh tối đa 15 MB.");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "Không tải được ảnh");
      }
      setImageUrl(payload.data.fileUrl);
      setToast("Đã tải ảnh lên. Nhấn 'Lưu cấu hình' để áp dụng.");
      setTimeout(() => setToast(null), 3200);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Không tải được ảnh"
      );
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetch("/api/admin/brand")
      .then(async (r) => {
        const payload = await r.json();
        if (!r.ok || !payload.success) {
          throw new Error(
            payload.error?.message || "Không tải được cấu hình thương hiệu"
          );
        }
        return payload;
      })
      .then((json) => {
        if (json.success && json.data?.setting) {
          const s = json.data.setting;
          if (s.brandName) setBrandName(s.brandName);
          if (s.slogan) setSlogan(s.slogan);
          if (s.supportHotline) setHotline(s.supportHotline);
          if (s.primaryColor) setColor(s.primaryColor);
          if (s.logoUrl && s.logoUrl !== "/logo.png") setLogoUrl(s.logoUrl);
          if (s.loginWelcomeTitle) setWelcomeTitle(s.loginWelcomeTitle);
          if (s.loginWelcomeDesc) setWelcomeDesc(s.loginWelcomeDesc);
          if (s.loginBgUrl) setLoginBgUrl(s.loginBgUrl);
        }
      })
      .catch((loadError) => {
        console.error("Load brand settings error:", loadError);
        setError("Không tải được cấu hình thương hiệu.");
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          slogan,
          supportHotline,
          primaryColor,
          logoUrl,
          loginWelcomeTitle,
          loginWelcomeDesc,
          loginBgUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không lưu được cấu hình");
      }
      setError(null);
      setToast("Đã lưu cấu hình thương hiệu & trang đăng nhập");
      setTimeout(() => setToast(null), 3200);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không lưu được cấu hình"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const initials =
    brandName
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TT";

  return (
    <div className="space-y-6">
      <Toast message={toast} onDismiss={() => setToast(null)} />

      <PageHeader
        title="Thương hiệu & Trang đăng nhập"
        description="Thiết lập nhận diện thương hiệu nội bộ, màu nhấn chủ đạo, logo và thông điệp chào mừng trên cổng đăng nhập."
      />

      {error && (
        <div
          role="alert"
          className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3.5"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Core Brand Identity */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 crm-card p-6 space-y-4">
            <SectionHeader
              title="Nhận diện thương hiệu hệ thống"
              description="Hiển thị trên thanh điều hướng, tiêu đề báo cáo và thông tin hỗ trợ kỹ thuật"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="crm-label">Tên thương hiệu</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="crm-input font-semibold"
                />
              </div>

              <div>
                <label className="crm-label">Hotline hỗ trợ nội bộ</label>
                <input
                  type="text"
                  value={supportHotline}
                  onChange={(e) => setHotline(e.target.value)}
                  className="crm-input"
                />
              </div>
            </div>

            <div>
              <label className="crm-label">Khẩu hiệu / Tagline</label>
              <input
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="crm-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="crm-label">Màu nhấn chủ đạo (Primary)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-9 p-0.5 rounded-lg border border-slate-200 bg-white cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#2563EB"
                    className="crm-input font-mono flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="crm-label">Logo hệ thống (URL hoặc Tải ảnh)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="/logo.png"
                    className="crm-input font-mono flex-1"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? "..." : "Tải lên"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={isUploading}
                      onChange={(event) =>
                        void uploadBrandImage(
                          event.target.files?.[0],
                          setLogoUrl
                        )
                      }
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Brand Preview Card */}
          <div className="lg:col-span-4 crm-card p-6 space-y-4">
            <SectionHeader
              title="Xem trước thẻ thương hiệu"
              description="Mô phỏng hiển thị trên Sidebar & Báo cáo"
            />
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
                  style={{ backgroundColor: primaryColor }}
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={brandName}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 truncate">
                    {brandName}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    INTERNAL CRM WORKSPACE
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-200/70">
                {slogan}
              </p>
              <div className="text-xs text-slate-500">
                Hotline hỗ trợ:{" "}
                <strong className="text-slate-800">{supportHotline}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Login Screen Customization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 crm-card p-6 space-y-4">
            <SectionHeader
              title="Nội dung cổng đăng nhập (/login)"
              description="Tùy biến thông điệp giới thiệu và hình nền cột bên trái màn hình đăng nhập"
            />

            <div>
              <label className="crm-label">Tiêu đề chào mừng</label>
              <input
                type="text"
                value={loginWelcomeTitle}
                onChange={(e) => setWelcomeTitle(e.target.value)}
                placeholder="Chào mừng trở lại"
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">Mô tả hệ thống</label>
              <textarea
                rows={3}
                value={loginWelcomeDesc}
                onChange={(e) => setWelcomeDesc(e.target.value)}
                className="crm-textarea"
              />
            </div>

            <div>
              <label className="crm-label">
                Ảnh nền cột giới thiệu (Để trống để dùng nền Navy tiêu chuẩn)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={loginBgUrl}
                  onChange={(e) => setLoginBgUrl(e.target.value)}
                  placeholder="/login-bg.jpg"
                  className="crm-input font-mono flex-1"
                />
                <label className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer shrink-0">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{isUploading ? "..." : "Chọn ảnh"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={isUploading}
                    onChange={(event) =>
                      void uploadBrandImage(
                        event.target.files?.[0],
                        setLoginBgUrl
                      )
                    }
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Mini Login Layout Preview */}
          <div className="lg:col-span-4 crm-card p-6 space-y-4">
            <SectionHeader
              title="Mô phỏng màn hình Login"
              description="Bố cục 2 cột B2B SaaS"
            />
            <div className="rounded-xl overflow-hidden border border-slate-200 h-44 flex">
              <div
                className="w-[52%] flex flex-col justify-between p-3 text-white"
                style={{
                  background: loginBgUrl
                    ? `linear-gradient(rgba(15,23,42,0.7), rgba(15,23,42,0.82)), url(${loginBgUrl}) center/cover`
                    : `linear-gradient(150deg, #0f172a 0%, #1e3a8a 100%)`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-white/15 flex items-center justify-center text-[7px] font-bold">
                    {initials}
                  </div>
                  <span className="text-[8px] font-semibold tracking-wider truncate">
                    {brandName}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] font-bold leading-snug line-clamp-2">
                    {loginWelcomeTitle}
                  </div>
                  <div className="text-[7px] text-slate-300 line-clamp-2">
                    {loginWelcomeDesc}
                  </div>
                </div>
                <div className="text-[6px] text-slate-400">
                  © Toàn Trung Telecom JSC
                </div>
              </div>

              <div className="flex-1 bg-white p-3 flex flex-col justify-center gap-2">
                <div className="text-[9px] font-bold text-slate-900">
                  Đăng nhập
                </div>
                <div className="h-3.5 rounded bg-slate-100 border border-slate-200" />
                <div className="h-3.5 rounded bg-slate-100 border border-slate-200" />
                <div
                  className="h-4 rounded flex items-center justify-center text-white text-[7px] font-semibold"
                  style={{ backgroundColor: primaryColor }}
                >
                  Đăng nhập
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Lưu cấu hình thương hiệu
          </Button>
        </div>
      </form>
    </div>
  );
}
