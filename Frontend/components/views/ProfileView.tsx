"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Award,
  Camera,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  Briefcase,
  Sparkles,
  Calendar,
  RefreshCw,
  Star,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  initials: string;
  avatar: string | null;
  address: string | null;
  hometown: string | null;
  achievements: string | null;
  createdAt: string;
  updatedAt: string;
}

const ROLE_DISPLAY_NAMES: Record<string, { label: string; color: string; desc: string }> = {
  ADMIN: {
    label: "Ban Giám Đốc",
    color: "bg-red-50 text-red-700 border-red-200",
    desc: "Toàn quyền quản trị hệ thống và điều hành",
  },
  SALES: {
    label: "Phòng Kinh Doanh (Sales)",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "Tiếp nhận Lead, khảo sát & chốt hợp đồng màn hình LED",
  },
  MARKETING: {
    label: "Phòng Marketing",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Vận hành chiến dịch đa kênh & thu hút khách hàng",
  },
  DESIGN: {
    label: "Phòng AI Design",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "Thiết kế market, banner LED & phối cảnh công trình",
  },
  ADS: {
    label: "Bộ Phận Quảng Cáo (ADS)",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "Độc quyền quản lý ngân sách & tối ưu Google/Facebook Ads",
  },
};

export function ProfileView({ onProfileUpdated }: { onProfileUpdated?: (user: any) => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [hometown, setHometown] = useState("");
  const [avatar, setAvatar] = useState("");
  const [achievements, setAchievements] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Tải thông tin hồ sơ
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/users/profile");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.user) {
          const u: UserProfile = json.data.user;
          setProfile(u);
          setName(u.name || "");
          setPhone(u.phone || "");
          setEmail(u.email || "");
          setAddress(u.address || "");
          setHometown(u.hometown || "");
          setAvatar(u.avatar || "");
          setAchievements(u.achievements || "");
        }
      }
    } catch (err) {
      console.error("Lỗi tải thông tin hồ sơ:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Xử lý upload ảnh đại diện (Avatar)
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn tệp hình ảnh (.jpg, .png, .webp)");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.set("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Tải ảnh đại diện thất bại");
      }

      setAvatar(json.data.fileUrl);
      showToast("Đã tải ảnh lên! Hãy bấm 'Lưu Thông Tin' để cập nhật.");
    } catch (err: any) {
      alert(err.message || "Lỗi tải ảnh đại diện");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Lưu thông tin hồ sơ
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Vui lòng nhập Họ và Tên");
      return;
    }
    if (!email.trim()) {
      alert("Vui lòng nhập Email / Gmail");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const res = await fetch("/api/users/profile", {
        method: "POST", // Hoặc PATCH
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          hometown: hometown.trim(),
          avatar: avatar.trim() || null,
          achievements: achievements.trim(),
        }),
      });

      // Thử PATCH nếu POST không khớp
      let json = await res.json();
      if (res.status === 405) {
        const patchRes = await fetch("/api/users/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            address: address.trim(),
            hometown: hometown.trim(),
            avatar: avatar.trim() || null,
            achievements: achievements.trim(),
          }),
        });
        json = await patchRes.json();
      }

      if (!json.success) {
        throw new Error(json.error?.message || "Không thể cập nhật hồ sơ");
      }

      showToast(json.message || "Cập nhật thông tin thành công!");
      fetchProfile();
      if (onProfileUpdated && json.data?.user) {
        onProfileUpdated(json.data.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi cập nhật hồ sơ");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-16 text-center border border-slate-200">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700">Đang tải thông tin hồ sơ cá nhân...</p>
      </div>
    );
  }

  const roleInfo = ROLE_DISPLAY_NAMES[profile?.role || "SALES"] || {
    label: profile?.role || "Thành viên",
    color: "bg-slate-100 text-slate-800 border-slate-200",
    desc: "Nhân sự Toàn Trung Telecom",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl mx-auto pb-10">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Tài Khoản</span>
            <span>/</span>
            <span className="text-blue-600 font-semibold">Hồ Sơ Cá Nhân</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
            Cập Nhật &amp; Điều Chỉnh Thông Tin Cá Nhân
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý lý lịch, nơi cư trú, quê quán và bảng vàng thành tích công tác tại Toàn Trung Telecom
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            Hệ thống nội bộ Toàn Trung
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-xl flex items-center gap-3 border border-rose-200 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ─── THẺ CARD PROFILE TỔNG QUAN VỚI AVATAR LỚN ─── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-950/20 relative overflow-hidden">
        {/* Glow hiệu ứng LED */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar & Nút Camera */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white/10 p-1.5 ring-4 ring-white/20 backdrop-blur-md shadow-2xl overflow-hidden flex items-center justify-center">
              {avatar ? (
                <img src={avatar} alt={name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-black font-heading">
                  {profile?.initials || "TT"}
                </div>
              )}
            </div>

            {/* Nút upload ảnh đại diện */}
            <label
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ring-2 ring-white"
              title="Tải ảnh đại diện mới"
            >
              <Camera className="w-4 h-4" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={isUploadingAvatar}
              />
            </label>
          </div>

          {/* Thông tin nhanh */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", roleInfo.color)}>
                {roleInfo.label}
              </span>
              <span className="text-xs text-blue-200/80 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Tham gia: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "Toàn Trung"}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-heading">
              {name || "Họ và Tên Nhân Viên"}
            </h2>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-blue-100/90 pt-1">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-300" />
                {email || "Chưa có email"}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-300" />
                {phone || "Chưa có SĐT"}
              </span>
              {address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-300" />
                  {address}
                </span>
              )}
            </div>

            <p className="text-xs text-blue-200/70 pt-2 italic">
              {roleInfo.desc}
            </p>
          </div>
        </div>
      </div>

      {/* ─── FORM ĐIỀU CHỈNH THÔNG TIN CHI TIẾT ─── */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 font-heading">
              1. Thông Tin Cơ Bản &amp; Liên Hệ
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Các thông tin liên hệ chính thức phục vụ trao đổi nội bộ và tiếp nhận khách hàng
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            {/* Họ Tên */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                Họ và Tên <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn Toàn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-xs"
                />
              </div>
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                Số Điện Thoại
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="VD: 0909.123.456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-xs"
                />
              </div>
            </div>

            {/* Gmail / Email */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                Gmail / Email Đăng Nhập <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="VD: toan.nguyen@toantrung.com.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-xs font-mono"
                />
              </div>
            </div>

            {/* Avatar URL (Tùy chỉnh hoặc tự động upload) */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                Đường Dẫn Avatar
              </label>
              <div className="relative">
                <Camera className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tự động điền khi bấm tải ảnh ở trên hoặc dán link ảnh"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 pt-3 pb-4">
            <h3 className="text-base font-bold text-slate-900 font-heading">
              2. Nơi Cư Trú &amp; Quê Quán
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hỗ trợ công tác phân bổ công trình, dự án lắp đặt màn hình LED theo khu vực địa lý
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            {/* Nơi Trú Hiện Tại */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nơi Cư Trú Hiện Tại (Địa Chỉ Thường Trú)
              </label>
              <div className="relative">
                <Home className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="VD: 31 Đường số 18, P. Tân Quý, Q. Tân Phú, TP. Hồ Chí Minh"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-xs"
                />
              </div>
            </div>

            {/* Quê Quán */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                Quê Quán (Nguyên Quán)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="VD: TP. Hải Phòng / Nam Định / TP. Cần Thơ..."
                  value={hometown}
                  onChange={(e) => setHometown(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-xs"
                />
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 pt-3 pb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900 font-heading">
                3. Bảng Vàng Thành Tích &amp; Dự Án LED Tiêu Biểu
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ghi nhận các giải thưởng, danh hiệu xuất sắc, chứng chỉ kỹ thuật LED hoặc hợp đồng công trình lớn đã thực hiện
            </p>
          </div>

          <div className="text-xs space-y-2">
            <textarea
              rows={4}
              placeholder={`Ghi nhận thành tích của bạn tại Toàn Trung Telecom...\nVD:\n• Top 1 Chiến binh Kinh doanh xuất sắc Q3/2026 - Doanh số 4.8 tỷ VNĐ\n• Chủ trì nghiệm thu màn hình LED ngoài trời P3 120m2 tại TTTM Aeon Mall Tân Phú\n• Chứng chỉ Kỹ thuật Điều khiển Novastar Certified Engineer (NCE)`}
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all leading-relaxed shadow-inner"
            />
            <p className="text-[11px] text-slate-400 italic">
              * Thành tích này sẽ được vinh danh trong hồ sơ nội bộ công ty Toàn Trung.
            </p>
          </div>

          {/* Action button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Cập nhật lần cuối: {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString("vi-VN") : "Vừa xong"}
            </span>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Đang lưu thay đổi..." : "Lưu Thông Tin Hồ Sơ"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

