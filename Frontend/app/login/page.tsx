"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, AlertCircle, Sparkles, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/layout/ThemeProvider";
import { ToanTrungLogo } from "@/components/common/ToanTrungLogo";

interface BrandConfig {
  brandName: string;
  slogan: string;
  primaryColor: string;
  logoUrl: string;
  loginWelcomeTitle: string;
  loginWelcomeDesc: string;
  loginBgUrl: string;
}

const DEFAULT_BRAND: BrandConfig = {
  brandName: "TOÀN TRUNG",
  slogan: "Giải pháp màn hình LED & Viễn thông chuyên nghiệp",
  primaryColor: "#2563EB",
  logoUrl: "",
  loginWelcomeTitle: "Hệ Thống Quản Trị Marketing & Kinh Doanh",
  loginWelcomeDesc: "Đồng hành cùng sự phát triển và quản lý dữ liệu thông minh của Toàn Trung Telecom JSC.",
  loginBgUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop", // Default LED / Tech background
};

function LoginForm() {
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/brand")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.setting) {
          const s = json.data.setting;
          setBrand({
            brandName: s.brandName || DEFAULT_BRAND.brandName,
            slogan: s.slogan || DEFAULT_BRAND.slogan,
            primaryColor: s.primaryColor || DEFAULT_BRAND.primaryColor,
            logoUrl: s.logoUrl || "",
            loginWelcomeTitle: s.loginWelcomeTitle || DEFAULT_BRAND.loginWelcomeTitle,
            loginWelcomeDesc: s.loginWelcomeDesc || DEFAULT_BRAND.loginWelcomeDesc,
            loginBgUrl: s.loginBgUrl || DEFAULT_BRAND.loginBgUrl,
          });
        }
      })
      .catch(() => {});
  }, []);

  const getSafeReturnTo = (): string => {
    const raw = searchParams.get("returnTo") ?? "";
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(
          json.error?.message ??
            (res.status === 401
              ? "Email hoặc mật khẩu không chính xác."
              : `Đăng nhập thất bại (HTTP ${res.status}). Vui lòng kiểm tra terminal.`)
        );
        setIsLoading(false);
        return;
      }

      // Đăng nhập thành công -> chuyển thẳng vào Workspace
      window.location.href = getSafeReturnTo();
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
      setIsLoading(false);
    }
  };

  const initials = brand.brandName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "TT";

  return (
    <div className="w-full flex min-h-screen bg-slate-900">
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-20 p-2.5 rounded-xl bg-slate-900/80 text-white hover:bg-slate-800 shadow-lg"
        aria-label={theme === "dark" ? "Bật giao diện sáng" : "Bật giao diện tối"}
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
      {/* ─── CỘT TRÁI (60%): BACKGROUND DO ADMIN TÙY BIẾN ─── */}
      <div className="hidden lg:relative lg:flex lg:w-7/12 flex-col justify-between p-12 overflow-hidden">
        {/* Background Image / Custom Banner */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url(${brand.loginBgUrl || DEFAULT_BRAND.loginBgUrl})`,
          }}
        />

        {/* Lớp phủ chuyển sắc tối tạo chiều sâu cho màn hình LED */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/60 backdrop-blur-[2px]" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          {brand.logoUrl && brand.logoUrl !== "/logo.png" ? (
            <div className="flex items-center gap-3">
              <img src={brand.logoUrl} alt={brand.brandName} className="h-12 w-auto object-contain drop-shadow" />
              <div>
                <div className="text-white font-extrabold text-xl tracking-wider drop-shadow-sm font-heading">
                  {brand.brandName}
                </div>
                <div className="text-[11px] text-blue-300 font-medium tracking-widest uppercase">
                  Telecom JSC · LED Displays
                </div>
              </div>
            </div>
          ) : (
            <ToanTrungLogo size="lg" variant="light" />
          )}
        </div>

        {/* Nội dung Banner giới thiệu */}
        <div className="relative z-10 max-w-lg space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-blue-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Màn Hình LED &amp; Viễn Thông Hàng Đầu</span>
          </div>

          <h1 className="text-white text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight drop-shadow-md">
            {brand.loginWelcomeTitle}
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed drop-shadow">
            {brand.loginWelcomeDesc}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="p-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white">
              <div className="text-lg font-bold">100% Online</div>
              <div className="text-[11px] text-slate-400">Theo dõi khách hàng &amp; dự án</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white">
              <div className="text-lg font-bold">Realtime</div>
              <div className="text-[11px] text-slate-400">Báo cáo &amp; phân quyền tức thì</div>
            </div>
          </div>
        </div>

        {/* Footer Cột Trái */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-4">
          <span>© 2026 Toàn Trung Telecom JSC. All rights reserved.</span>
          <span className="text-slate-500">Hệ thống quản trị bảo mật nội bộ</span>
        </div>
      </div>

      {/* ─── CỘT PHẢI (40% - 50%): FORM ĐĂNG NHẬP SANG TRỌNG ─── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14 bg-white relative">
        <div className="w-full max-w-sm space-y-7">
          {/* Mobile Brand Info */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            {brand.logoUrl && brand.logoUrl !== "/logo.png" ? (
              <div className="flex items-center gap-2.5">
                <img src={brand.logoUrl} alt={brand.brandName} className="w-10 h-10 object-contain shadow" />
                <div>
                  <div className="font-extrabold text-slate-900 text-lg leading-tight font-heading">{brand.brandName}</div>
                  <div className="text-[11px] text-slate-400">Marketing & Sales Management</div>
                </div>
              </div>
            ) : (
              <ToanTrungLogo size="md" />
            )}
          </div>

          {/* Form Header */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Đăng nhập tài khoản
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Nhập email và mật khẩu được cấp để truy cập không gian làm việc
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4.5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Email công ty
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  required
                  placeholder="ten@congty.vn"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: brand.primaryColor }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực tài khoản...</span>
                </>
              ) : (
                <span>Đăng nhập hệ thống</span>
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-slate-400">
            Sử dụng tài khoản được quản trị viên cấp cho bạn.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span>Đang tải giao diện Toàn Trung...</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
