"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Home,
  Camera,
  Save,
  AlertCircle,
  Shield,
  Calendar,
  Eye,
  EyeOff,
} from "lucide-react";
import { PageHeader, SectionHeader } from "@/src/core/ui/page-header";
import { Button } from "@/src/core/ui/button";
import { getRoleMeta, StatusBadge } from "@/src/core/ui/badge";
import { PageSkeleton } from "@/src/core/ui/feedback-states";
import { Toast } from "@/src/core/ui/toast";

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

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: "Toàn quyền quản trị hệ thống, nhân sự và điều hành Toàn Trung",
  SALES: "Tiếp nhận Lead, khảo sát mặt bằng và chốt hợp đồng màn hình LED",
  MARKETING: "Vận hành chiến dịch tiếp thị đa kênh và phát triển nguồn Lead",
  DESIGN: "Thiết kế maquette, Banner LED và dựng phối cảnh công trình",
  ADS: "Quản lý ngân sách quảng cáo và tối ưu hiệu suất từ khóa đa nền tảng",
};

export function ProfileView({
  onProfileUpdated,
  onNavigateToUsersAdmin,
}: {
  onProfileUpdated?: (user: any) => void;
  onNavigateToUsersAdmin?: () => void;
}) {
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

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Vui lòng chọn tệp hình ảnh (.jpg, .png, .webp)");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setErrorMessage(null);
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
      showToast("Đã tải ảnh đại diện mới. Nhấn 'Lưu thay đổi' để áp dụng.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Lỗi tải ảnh đại diện"
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Vui lòng nhập Họ và tên.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Vui lòng nhập địa chỉ Email đăng nhập.");
      return;
    }
    if (newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        setErrorMessage("Mật khẩu mới cần tối thiểu 6 ký tự.");
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setErrorMessage("Mật khẩu xác nhận không trùng khớp.");
        return;
      }
      if (!currentPassword) {
        setErrorMessage(
          "Vui lòng nhập mật khẩu hiện tại để xác thực đổi mật khẩu."
        );
        return;
      }
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const res = await fetch("/api/users/profile", {
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
          currentPassword: currentPassword || null,
          newPassword: newPassword.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể cập nhật hồ sơ");
      }

      showToast(json.message || "Đã cập nhật thông tin tài khoản");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      fetchProfile();
      if (onProfileUpdated && json.data?.user) {
        onProfileUpdated(json.data.user);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Lỗi cập nhật hồ sơ"
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader
          title="Hồ sơ cá nhân"
          description="Quản lý thông tin định danh, liên hệ nội bộ và thiết lập bảo mật tài khoản."
        />
        <PageSkeleton cards={0} rows={6} />
      </div>
    );
  }

  const roleMeta = getRoleMeta(profile?.role || "SALES");
  const roleDesc =
    ROLE_DESCRIPTIONS[profile?.role || "SALES"] ||
    "Nhân sự Công ty Cổ phần Điện tử Viễn thông Toàn Trung";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Toast Feedback */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      {/* Header */}
      <PageHeader
        title="Hồ sơ cá nhân"
        description="Cập nhật thông tin liên hệ, địa chỉ công tác, thành tích chuyên môn và mật khẩu đăng nhập."
        actions={
          <>
            {profile?.role === "ADMIN" && onNavigateToUsersAdmin && (
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Shield className="w-4 h-4 text-blue-600" />}
                onClick={onNavigateToUsersAdmin}
              >
                Quản lý nhân sự
              </Button>
            )}
            <StatusBadge tone="success">Tài khoản xác thực</StatusBadge>
          </>
        }
      />

      {errorMessage && (
        <div
          role="alert"
          className="p-3.5 bg-rose-50 text-rose-700 rounded-xl flex items-center gap-2.5 border border-rose-200 text-xs font-medium"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Clean Enterprise Identity Card (No heavy hero gradient) */}
      <div className="crm-card p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-blue-700">
                {profile?.initials || "TT"}
              </span>
            )}
          </div>
          <label
            className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-subtle flex items-center justify-center cursor-pointer transition-colors ring-2 ring-white"
            title="Đổi ảnh đại diện"
          >
            <Camera className="w-3.5 h-3.5" />
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={isUploadingAvatar}
            />
          </label>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <StatusBadge tone={roleMeta.tone} size="sm">
              {roleMeta.label} ({profile?.role})
            </StatusBadge>
            <span className="text-xs text-slate-400 inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Tham gia:{" "}
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString("vi-VN")
                : "—"}
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 truncate">
            {name || "Nhân sự Toàn Trung"}
          </h2>

          <p className="text-xs text-slate-500">{roleDesc}</p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-1.5 text-xs text-slate-600 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {email || "Chưa có email"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {phone || "Chưa cập nhật SĐT"}
            </span>
            {address && (
              <span className="inline-flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                {address}
              </span>
            )}
            {hometown && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Quê quán: {hometown}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form Sections */}
      <form onSubmit={handleSaveProfile} className="space-y-5">
        {/* Section 1: Basic & Contact Info */}
        <div className="crm-card p-6 space-y-5">
          <SectionHeader
            title="1. Thông tin định danh & Liên hệ"
            description="Thông tin hiển thị trên phiếu Lead, báo cáo nội bộ và danh bạ doanh nghiệp"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="crm-label">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn Toàn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">Số điện thoại</label>
              <input
                type="tel"
                placeholder="VD: 0909 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">
                Email đăng nhập <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="VD: toan.nguyen@toantrung.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="crm-input font-mono"
              />
            </div>

            <div>
              <label className="crm-label">Ảnh đại diện (URL hoặc tải tệp)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Đường dẫn ảnh đại diện..."
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="crm-input font-mono flex-1"
                />
                <label className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer shrink-0 transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isUploadingAvatar ? "Đang tải..." : "Tải ảnh"}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Address & Achievements */}
        <div className="crm-card p-6 space-y-5">
          <SectionHeader
            title="2. Địa chỉ & Hồ sơ năng lực"
            description="Phục vụ điều phối công tác khảo sát công trình và ghi nhận thành tích chuyên môn"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="crm-label">Địa chỉ cư trú hiện tại</label>
              <input
                type="text"
                placeholder="VD: Quận Tân Phú, TP. Hồ Chí Minh"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">Quê quán</label>
              <input
                type="text"
                placeholder="VD: TP. Đà Nẵng / Nam Định..."
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                className="crm-input"
              />
            </div>
          </div>

          <div>
            <label className="crm-label">
              Thành tích &amp; Dự án tiêu biểu
            </label>
            <textarea
              rows={3}
              placeholder="Ghi nhận chứng chỉ kỹ thuật, danh hiệu kinh doanh hoặc các công trình LED trọng điểm đã tham gia..."
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              className="crm-textarea"
            />
          </div>
        </div>

        {/* Section 3: Password Security */}
        <div className="crm-card p-6 space-y-5">
          <SectionHeader
            title="3. Đổi mật khẩu bảo mật (Tùy chọn)"
            description="Để trống các ô bên dưới nếu bạn không có nhu cầu thay đổi mật khẩu hiện tại"
            action={
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowPasswords((v) => !v)}
                leftIcon={
                  showPasswords ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )
                }
              >
                {showPasswords ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              </Button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="crm-label">Mật khẩu hiện tại</label>
              <input
                type={showPasswords ? "text" : "password"}
                placeholder="Nhập mật khẩu đang dùng"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">Mật khẩu mới</label>
              <input
                type={showPasswords ? "text" : "password"}
                placeholder="Tối thiểu 6 ký tự"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">Xác nhận mật khẩu mới</label>
              <input
                type={showPasswords ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="crm-input"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Cập nhật gần nhất:{" "}
              {profile?.updatedAt
                ? new Date(profile.updatedAt).toLocaleString("vi-VN")
                : "—"}
            </span>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
