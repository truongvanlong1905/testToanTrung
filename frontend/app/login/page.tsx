"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  AlertCircle,
  Moon,
  Sun,
  User,
  Phone,
  MapPin,
  Home,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Users2,
  Megaphone,
  BarChart3,
} from "lucide-react";
import { useTheme } from "@/components/layout/ThemeProvider";
import { ToanTrungLogo } from "@/components/shared/ToanTrungLogo";
import { Button } from "@/components/ui/button";

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
  slogan: "Giải pháp hiển thị màn hình LED & Viễn thông chuyên nghiệp",
  primaryColor: "#2563EB",
  logoUrl: "",
  loginWelcomeTitle: "Hệ thống Quản trị Marketing & Kinh doanh Nội bộ",
  loginWelcomeDesc:
    "Không gian làm việc hợp nhất cho đội ngũ Kinh doanh, Marketing, Quảng cáo, Thiết kế và Ban Giám đốc Toàn Trung.",
  loginBgUrl: "",
};

const QUICK_ROLES = [
  { role: "ADMIN", label: "Admin", email: "admin@toantrung.vn", password: "Password123@" },
  { role: "SALES", label: "Sales", email: "tuan.tm@toantrung.vn", password: "Password123@" },
  { role: "MARKETING", label: "Marketing", email: "mkt@toantrung.vn", password: "Password123@" },
  { role: "ADS", label: "Ads", email: "mkt@toantrung.vn", password: "Password123@" },
  { role: "DESIGN", label: "Design", email: "design@toantrung.vn", password: "Password123@" },
];

const REGISTER_ROLES = [
  { value: "SALES", label: "Phòng Kinh Doanh (SALES)" },
  { value: "MARKETING", label: "Phòng Marketing (MKT)" },
  { value: "ADS", label: "Bộ phận Quảng cáo (ADS)" },
  { value: "DESIGN", label: "Phòng Thiết kế (DESIGN)" },
];

const PLATFORM_PILLARS = [
  {
    title: "Quản trị Pipeline & Cảnh báo trùng Lead",
    desc: "Theo dõi tiến độ báo giá dự án Màn hình LED & Bảng điện tử, kiểm soát bàn giao Sales và lưu vết lịch sử.",
    icon: Users2,
  },
  {
    title: "Tracking Đa Kênh & Phân Tích Chiến Dịch Ads",
    desc: "Ghi nhận nguồn UTM thực tế, theo dõi ngân sách chiến dịch, CPC, CTR và hiệu quả chuyển đổi từ khóa.",
    icon: Megaphone,
  },
  {
    title: "Báo Cáo Điều Hành & AI Design Studio",
    desc: "Tổng hợp báo cáo theo phòng ban, xuất báo cáo Excel (.xlsx) chuẩn in ấn và hỗ trợ phác thảo phối cảnh LED.",
    icon: BarChart3,
  },
];

function LoginContent() {
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [showPass, setShowPass] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regRole, setRegRole] = useState("SALES");
  const [regAddress, setRegAddress] = useState("");
  const [regHometown, setRegHometown] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND);

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
    fetch("/api/admin/brand")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.success && j.data?.setting) {
          setBrand({ ...DEFAULT_BRAND, ...j.data.setting });
        }
      })
      .catch(() => {});
  }, []);

  const rawRedirect = searchParams.get("redirect") || searchParams.get("from") || "/";
  const nextPath =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";

  const handleSelectQuickRole = (item: (typeof QUICK_ROLES)[0]) => {
    setSelectedRole(item.role);
    setEmail(item.email);
    setPassword(item.password);
    setError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ email công việc.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Email hoặc mật khẩu không chính xác.");
        return;
      }

      window.location.replace(nextPath);
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regName.trim() || regName.trim().length < 2) {
      setError("Vui lòng nhập họ và tên đầy đủ (tối thiểu 2 ký tự).");
      return;
    }
    if (!regEmail.trim() || !regEmail.includes("@")) {
      setError("Vui lòng nhập địa chỉ Email hợp lệ.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          phone: regPhone.trim(),
          role: regRole,
          address: regAddress.trim(),
          hometown: regHometown.trim(),
          password: regPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "Đăng ký tài khoản thất bại.");
        return;
      }

      setSuccessMsg(json.message || "Đăng ký thành công! Đang chuyển vào hệ thống...");
      setTimeout(() => {
        window.location.replace(nextPath);
      }, 800);
    } catch {
      setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-page text-slate-900">
      {/* Left Enterprise Overview Panel */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[52%] flex-col justify-between p-10 xl:p-14 bg-page border-r border-slate-200/90">
        <div className="flex items-center justify-between">
          <ToanTrungLogo size="lg" />
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Internal CRM Workspace
          </span>
        </div>

        <div className="my-auto py-8 max-w-lg">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-blue-600 mb-2.5">
            Toàn Trung Telecom JSC
          </p>
          <h1 className="text-[28px] xl:text-[32px] font-semibold tracking-[-0.025em] text-slate-900 leading-[1.25]">
            {brand.loginWelcomeTitle || DEFAULT_BRAND.loginWelcomeTitle}
          </h1>
          <p className="mt-3 text-[14px] text-slate-600 leading-relaxed">
            {brand.loginWelcomeDesc || DEFAULT_BRAND.loginWelcomeDesc}
          </p>

          <div className="mt-8 space-y-3">
            {PLATFORM_PILLARS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 flex items-start gap-3.5 transition-colors hover:border-slate-300"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[13.5px] font-semibold text-slate-900">
                      {item.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-5 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              ISO 9001:2015
            </span>
            <span>·</span>
            <span>Xác thực phiên HttpOnly</span>
          </div>
          <span className="text-slate-400">© {new Date().getFullYear()} Toàn Trung JSC</span>
        </div>
      </div>

      {/* Right Authentication Panel */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-white overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <ToanTrungLogo size="sm" />
          </div>
          <div className="hidden lg:block text-xs text-slate-500">
            Cổng đăng nhập nhân sự nội bộ
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Chuyển đổi giao diện Sáng / Tối"
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{theme === "dark" ? "Sáng" : "Tối"}</span>
          </button>
        </div>

        <div className="w-full max-w-[420px] mx-auto my-8">
          {/* Segmented Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg border border-slate-200/80 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                activeTab === "login"
                  ? "bg-white text-slate-900 shadow-card border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                activeTab === "register"
                  ? "bg-white text-slate-900 shadow-card border border-slate-200/60"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Đăng ký tài khoản
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === "login" ? (
            <>
              <div className="mb-5">
                <h2 className="text-[20px] font-semibold text-slate-900 tracking-[-0.02em]">
                  Đăng nhập hệ thống
                </h2>
                <p className="text-[13px] text-slate-500 mt-1">
                  Sử dụng email công việc Toàn Trung hoặc chọn nhanh tài khoản kiểm thử.
                </p>
              </div>

              {/* Quick Role Fill */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-500">
                    Điền nhanh theo vai trò
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {QUICK_ROLES.map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => handleSelectQuickRole(item)}
                      className={`h-8 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        selectedRole === item.role
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="crm-label">
                    Email công việc <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={emailRef}
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="ten@toantrung.vn"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      disabled={isLoading}
                      className="crm-input h-10 pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="crm-label">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPass ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      disabled={isLoading}
                      className="crm-input h-10 pl-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full mt-2"
                >
                  {isLoading ? "Đang xác thực..." : "Đăng nhập"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-[20px] font-semibold text-slate-900 tracking-[-0.02em]">
                  Tạo tài khoản nhân sự
                </h2>
                <p className="text-[13px] text-slate-500 mt-1">
                  Điền thông tin cá nhân và bộ phận công tác để khởi tạo quyền truy cập.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} noValidate className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-name" className="crm-label">
                      Họ và tên <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-name"
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="crm-input pl-8"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-phone" className="crm-label">
                      Số điện thoại
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-phone"
                        type="text"
                        placeholder="0909 123 456"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="crm-input pl-8"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-email" className="crm-label">
                      Email công việc <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-email"
                        type="email"
                        placeholder="ten@toantrung.vn"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="crm-input pl-8"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-role" className="crm-label">
                      Bộ phận công tác
                    </label>
                    <div className="relative">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        id="reg-role"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        className="crm-select w-full pl-8"
                      >
                        {REGISTER_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-address" className="crm-label">
                      Nơi ở hiện tại
                    </label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-address"
                        type="text"
                        placeholder="Tân Bình, TP.HCM"
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        className="crm-input pl-8"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-hometown" className="crm-label">
                      Quê quán
                    </label>
                    <div className="relative">
                      <Home className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-hometown"
                        type="text"
                        placeholder="Đà Nẵng / Đồng Nai"
                        value={regHometown}
                        onChange={(e) => setRegHometown(e.target.value)}
                        className="crm-input pl-8"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="reg-pass" className="crm-label">
                      Mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-pass"
                        type="password"
                        placeholder="Tối thiểu 6 ký tự"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="crm-input pl-8"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reg-confirm" className="crm-label">
                      Xác nhận mật khẩu <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="reg-confirm"
                        type="password"
                        placeholder="Nhập lại mật khẩu"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className="crm-input pl-8"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[11.5px] text-slate-400">
                  Các trường đánh dấu (*) là thông tin bắt buộc.
                </p>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Đang khởi tạo..." : "Hoàn tất đăng ký"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400">
          Công ty Cổ phần Điện tử Viễn thông Toàn Trung · Hệ thống quản trị nội bộ
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-page">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
