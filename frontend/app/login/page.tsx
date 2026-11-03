"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { ToanTrungLogo } from "@/src/core/layout/ToanTrungLogo";
import { Button } from "@/src/core/ui/button";

interface BrandSettingData {
  brandName: string;
  slogan: string;
  logoUrl: string;
  primaryColor: string;
  supportHotline: string;
  loginWelcomeTitle: string;
  loginWelcomeDesc: string;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandSettingData | null>(null);

  useEffect(() => {
    fetch("/api/admin/brand")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((payload) => {
        if (payload?.success && payload.data?.setting) {
          setBrand(payload.data.setting);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setError(payload.error?.message || "Email hoặc mật khẩu không chính xác");
        setIsLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại sau.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-6 sm:p-8">
          <div className="flex flex-col items-center text-center mb-6">
            {brand?.logoUrl && brand.logoUrl !== "/logo.png" ? (
              <div className="flex items-center gap-2.5 mb-4">
                <img
                  src={brand.logoUrl}
                  alt={brand.brandName || "TOÀN TRUNG"}
                  className="w-10 h-10 rounded-xl object-contain border border-slate-200 p-1 bg-white"
                />
                <span className="font-bold text-lg text-slate-900 tracking-tight">
                  {brand.brandName || "TOÀN TRUNG"}
                </span>
              </div>
            ) : (
              <div className="mb-4">
                <ToanTrungLogo size="lg" variant="color" />
              </div>
            )}

            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {brand?.loginWelcomeTitle || "Đăng nhập hệ thống"}
            </h1>
            {brand?.loginWelcomeDesc ? (
              <p className="mt-1.5 text-[13px] text-slate-500">
                {brand.loginWelcomeDesc}
              </p>
            ) : (
              <p className="mt-1.5 text-[13px] text-slate-500">
                Nhập tài khoản được cấp để làm việc trên hệ thống Toàn Trung
              </p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-700 text-xs font-medium leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="crm-label">
                Email công việc
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten.nhanvien@toantrung.vn"
                  className="crm-input pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="crm-label">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="crm-input pl-9 pr-9"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full h-10 mt-2 text-[13.5px]"
              rightIcon={
                !isLoading ? <ArrowRight className="w-4 h-4" /> : undefined
              }
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang xác thực...
                </span>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 leading-relaxed">
              Tài khoản nhân sự do Quản trị viên (Admin) cấp và phân quyền.
              {brand?.supportHotline ? (
                <>
                  {" "}
                  Hỗ trợ nội bộ:{" "}
                  <strong className="text-slate-700 font-semibold">
                    {brand.supportHotline}
                  </strong>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
