"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Save, CheckCircle2, Sparkles, Tv, Upload, Monitor, Image as ImageIcon } from "lucide-react";

export function AdminBrandView() {
  // ── Brand cơ bản ─────────────────────────────────────────────────────────
  const [brandName, setBrandName]       = useState("TOÀN TRUNG");
  const [slogan, setSlogan]             = useState("Giải pháp hiển thị màn hình LED & Viễn thông chuyên nghiệp");
  const [supportHotline, setHotline]    = useState("0909.123.456");
  const [primaryColor, setColor]        = useState("#2563EB");
  const [logoUrl, setLogoUrl]           = useState("");

  // ── Tuỳ chỉnh trang Login ────────────────────────────────────────────────
  const [loginWelcomeTitle, setWelcomeTitle] = useState("Chào mừng trở lại");
  const [loginWelcomeDesc, setWelcomeDesc]   = useState(
    "Hệ thống quản trị nội bộ dành cho Marketing, Kinh doanh và Thiết kế của Công ty Cổ phần Điện tử Viễn thông Toàn Trung."
  );
  const [loginBgUrl, setLoginBgUrl] = useState("");

  const [isSaving, setIsSaving]         = useState(false);
  const [isUploading, setIsUploading]   = useState(false);
  const [toast, setToast]               = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  const uploadBrandImage = async (
    file: File | undefined,
    setImageUrl: (url: string) => void
  ) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Vui lòng chọn tệp ảnh.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Ảnh phải nhỏ hơn 15 MB.");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message || "Không tải được ảnh");
      }
      setImageUrl(payload.data.fileUrl);
      setToast("Đã tải ảnh lên. Nhấn Lưu để áp dụng.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không tải được ảnh");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Load từ API ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/brand")
      .then(async (r) => {
        const payload = await r.json();
        if (!r.ok || !payload.success) throw new Error(payload.error?.message || "Không tải được cấu hình thương hiệu");
        return payload;
      })
      .then((json) => {
        if (json.success && json.data?.setting) {
          const s = json.data.setting;
          if (s.brandName)        setBrandName(s.brandName);
          if (s.slogan)           setSlogan(s.slogan);
          if (s.supportHotline)   setHotline(s.supportHotline);
          if (s.primaryColor)     setColor(s.primaryColor);
          if (s.logoUrl && s.logoUrl !== "/logo.png") setLogoUrl(s.logoUrl);
          if (s.loginWelcomeTitle) setWelcomeTitle(s.loginWelcomeTitle);
          if (s.loginWelcomeDesc)  setWelcomeDesc(s.loginWelcomeDesc);
          if (s.loginBgUrl)        setLoginBgUrl(s.loginBgUrl);
        }
      })
      .catch((loadError) => {
        console.error("Load brand settings error:", loadError);
        setError("Không tải được cấu hình thương hiệu.");
      });
  }, []);

  // ── Lưu ──────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName, slogan, supportHotline, primaryColor, logoUrl,
          loginWelcomeTitle, loginWelcomeDesc, loginBgUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || "Không lưu được cấu hình");
      setError(null);
      setToast("Đã lưu cấu hình thương hiệu & trang đăng nhập!");
      setTimeout(() => setToast(null), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được cấu hình");
    } finally {
      setIsSaving(false);
    }
  };

  // Initials preview
  const initials = brandName.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "TT";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
          <span>Admin</span><span>/</span>
          <span className="text-blue-600">Brand Studio</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Quản Lý Thương Hiệu & Giao Diện
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Tuỳ chỉnh tên thương hiệu, màu sắc, logo và nội dung trang đăng nhập
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ─── SECTION 1: Thương hiệu cơ bản ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Tv className="w-4 h-4 text-blue-600" />
              Nhận diện thương hiệu
            </h2>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên Thương Hiệu Hệ Thống</label>
              <input
                type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Khẩu Hiệu / Tagline</label>
              <input
                type="text" value={slogan} onChange={(e) => setSlogan(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hotline Hỗ Trợ</label>
                <input
                  type="text" value={supportHotline} onChange={(e) => setHotline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Màu Chủ Đạo (Theme Color)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={primaryColor} onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-9 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text" value={primaryColor} onChange={(e) => setColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    placeholder="#2563EB"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Logo (có thể nhập URL hoặc tải ảnh lên)
              </label>
              <input
                type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="/logo.png"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={isUploading}
                onChange={(event) => void uploadBrandImage(event.target.files?.[0], setLogoUrl)}
                className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700"
              />
              {logoUrl && <img src={logoUrl} alt="Xem trước logo" className="mt-2 h-12 max-w-48 rounded border border-slate-200 object-contain p-1" />}
            </div>
          </div>

          {/* Preview card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Xem Trước
            </h2>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md text-xs font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {logoUrl ? <img src={logoUrl} alt={brandName} className="w-full h-full rounded-xl object-contain bg-white" /> : initials}
                </div>
                <div>
                  <div className="font-extrabold text-sm tracking-tight text-slate-900">{brandName}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">MARKETING MANAGEMENT</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 italic leading-relaxed pt-2 border-t border-slate-200/60">
                &ldquo;{slogan}&rdquo;
              </p>
              <div className="text-[11px] text-slate-500 font-medium">
                Hotline: <strong className="text-slate-800">{supportHotline}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ─── SECTION 2: Tuỳ chỉnh trang Login ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-500" />
              Tuỳ Chỉnh Trang Đăng Nhập
            </h2>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tiêu đề chào mừng (panel trái)
              </label>
              <input
                type="text" value={loginWelcomeTitle} onChange={(e) => setWelcomeTitle(e.target.value)}
                placeholder="Chào mừng trở lại"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mô tả ngắn (panel trái)
              </label>
              <textarea
                value={loginWelcomeDesc} onChange={(e) => setWelcomeDesc(e.target.value)}
                rows={3}
                placeholder="Hệ thống quản trị nội bộ..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ảnh nền panel trái{" "}
                <span className="font-normal text-slate-400">(để trống = dùng màu gradient)</span>
              </label>
              <input
                type="text" value={loginBgUrl} onChange={(e) => setLoginBgUrl(e.target.value)}
                placeholder="/login-bg.jpg — đặt file vào /public/"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={isUploading}
                onChange={(event) => void uploadBrandImage(event.target.files?.[0], setLoginBgUrl)}
                className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700"
              />
              {isUploading && <span className="text-[11px] text-blue-600">Đang tải ảnh lên...</span>}
              <p className="mt-1 text-[10px] text-slate-400">
                Đặt file ảnh vào thư mục <code>public/</code> trong project rồi nhập đường dẫn, ví dụ: <code>/login-bg.jpg</code>
              </p>
            </div>
          </div>

          {/* Preview mini login */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-indigo-500" />
              Preview trang Login
            </h2>
            <div className="rounded-xl overflow-hidden border border-slate-200 text-[8px]" style={{ height: 160 }}>
              {/* Mini layout preview */}
              <div className="flex h-full">
                <div
                  className="w-[55%] flex flex-col justify-between p-2"
                  style={{
                    background: loginBgUrl
                      ? `url(${loginBgUrl}) center/cover`
                      : `linear-gradient(135deg, ${primaryColor} 0%, #1e3a8a 100%)`,
                  }}
                >
                  <div className="flex items-center gap-1">
                    {logoUrl ? <img src={logoUrl} alt="" className="w-4 h-4 object-contain rounded" /> : <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center"><span className="text-white font-bold" style={{ fontSize: 5 }}>{initials}</span></div>}
                    <span className="text-white font-bold tracking-widest truncate" style={{ fontSize: 6 }}>{brandName}</span>
                  </div>
                  <div>
                    <div className="text-white font-bold mb-0.5 leading-tight" style={{ fontSize: 7 }}>{loginWelcomeTitle}</div>
                    <div className="text-blue-100 leading-tight" style={{ fontSize: 5, maxWidth: "90%" }}>
                      {loginWelcomeDesc.slice(0, 60)}…
                    </div>
                  </div>
                  <div className="text-blue-200/50" style={{ fontSize: 5 }}>© 2026 Toàn Trung Telecom JSC</div>
                </div>
                <div className="flex-1 bg-white flex flex-col justify-center px-2 py-2 gap-1">
                  <div className="font-bold text-slate-900" style={{ fontSize: 7 }}>Đăng nhập</div>
                  <div className="bg-slate-100 rounded h-3 w-full border border-slate-200" />
                  <div className="bg-slate-100 rounded h-3 w-full border border-slate-200" />
                  <div
                    className="rounded h-4 w-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: primaryColor, fontSize: 5 }}
                  >
                    Đăng nhập vào hệ thống
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">Lưu để áp dụng ngay cho trang Login</p>
          </div>
        </div>

        {error && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}

        {/* Nút Lưu */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Đang lưu..." : "Lưu Tất Cả Thay Đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}
