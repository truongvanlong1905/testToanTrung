"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  Camera,
  Save,
  AlertCircle,
  Shield,
  Calendar,
  Eye,
  EyeOff,
  Lock,
  User,
} from "lucide-react";
import { PageHeader, SectionHeader } from "@/src/core/ui/page-header";
import { Button } from "@/src/core/ui/button";
import { getRoleMeta, StatusBadge } from "@/src/core/ui/badge";
import { UnderlineTabs } from "@/src/core/ui/segmented-control";
import { PageSkeleton } from "@/src/core/ui/feedback-states";
import { Toast } from "@/src/core/ui/toast";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  department?: string;
  position?: string;
  initials: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: "Quản trị hệ thống, cấu hình phân quyền và quản lý tài khoản nhân sự",
  DIRECTOR: "Ban Giám đốc — Giám sát vận hành tổng thể, hiệu suất kinh doanh và tiếp thị",
  SALES: "Phòng Kinh doanh — Tiếp nhận, chăm sóc Lead và cập nhật tiến độ báo giá",
  MARKETING: "Phòng Marketing — Theo dõi nguồn Lead, chiến dịch và điều phối tiếp thị",
  DESIGN: "Phòng Thiết kế — Khởi tạo mẫu thiết kế và phối cảnh theo yêu cầu",
  ADS: "Bộ phận Quảng cáo — Theo dõi hiệu quả chiến dịch và chỉ số từ khóa",
};

type ProfileTab = "info" | "password";

export function ProfileView({
  onProfileUpdated,
  onNavigateToUsersAdmin,
}: {
  onProfileUpdated?: (user: any) => void;
  onNavigateToUsersAdmin?: () => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("info");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Basic Info states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");

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
          setAvatar(u.avatar || "");
        }
      }
    } catch (err) {
      console.error("Lỗi tải thông tin hồ sơ:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
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
      showToast("Đã tải ảnh đại diện mới. Nhấn 'Lưu thông tin' để áp dụng.");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Lỗi tải ảnh đại diện"
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Vui lòng nhập Họ và tên.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Vui lòng nhập Email công việc.");
      return;
    }

    try {
      setIsSavingInfo(true);
      setErrorMessage(null);

      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim(),
          avatar: avatar.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể cập nhật thông tin cá nhân");
      }

      showToast(json.message || "Đã cập nhật thông tin cá nhân thành công!");
      await fetchProfile();
      if (onProfileUpdated && json.data?.user) {
        onProfileUpdated(json.data.user);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Lỗi cập nhật thông tin cá nhân"
      );
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setErrorMessage("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      setErrorMessage("Mật khẩu mới cần tối thiểu 6 ký tự.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage("Mật khẩu xác nhận không trùng khớp.");
      return;
    }

    try {
      setIsSavingPass(true);
      setErrorMessage(null);

      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || profile?.name,
          email: email.trim() || profile?.email,
          currentPassword,
          newPassword: newPassword.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể đổi mật khẩu");
      }

      showToast("Đã đổi mật khẩu đăng nhập thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Lỗi đổi mật khẩu"
      );
    } finally {
      setIsSavingPass(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader title="Hồ sơ tài khoản" />
        <PageSkeleton cards={0} rows={5} />
      </div>
    );
  }

  const roleMeta = getRoleMeta(profile?.role || "SALES");
  const roleDesc =
    ROLE_DESCRIPTIONS[profile?.role || "SALES"] ||
    "Nhân sự hệ thống Toàn Trung";

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-8">
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />

      <PageHeader
        title="Hồ sơ tài khoản"
        actions={
          <>
            {(profile?.role === "ADMIN" || profile?.role === "DIRECTOR") &&
              onNavigateToUsersAdmin && (
                <Button
                  variant="secondary"
                  size="md"
                  leftIcon={<Shield className="w-4 h-4 text-blue-600" />}
                  onClick={onNavigateToUsersAdmin}
                >
                  Quản lý tài khoản nhân sự
                </Button>
              )}
            <StatusBadge tone="success">Đang hoạt động</StatusBadge>
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

      {/* Identity Summary Card */}
      <div className="crm-card p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-blue-700">
                {profile?.initials || "TT"}
              </span>
            )}
          </div>
          <label
            className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-subtle flex items-center justify-center cursor-pointer transition-colors ring-2 ring-white"
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

        <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <StatusBadge tone={roleMeta.tone} size="sm">
              {roleMeta.label}
            </StatusBadge>
            {profile?.position && (
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {profile.position}
              </span>
            )}
            <span className="text-xs text-slate-400 inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Tham gia:{" "}
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString("vi-VN")
                : "—"}
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-900 truncate">
            {name || "Nhân sự Toàn Trung"}
          </h2>

          <p className="text-xs text-slate-500">{roleDesc}</p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-1 text-xs text-slate-600 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {email || "Chưa có email"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {phone || "Chưa cập nhật SĐT"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs: 1. Thông tin cá nhân | 2. Đổi mật khẩu */}
      <div className="crm-card p-6 space-y-5">
        <UnderlineTabs
          value={activeTab}
          onChange={(v) => {
            setActiveTab(v);
            setErrorMessage(null);
          }}
          options={[
            {
              id: "info",
              label: "Thông tin cá nhân",
              icon: <User className="w-3.5 h-3.5" />,
            },
            {
              id: "password",
              label: "Đổi mật khẩu",
              icon: <Lock className="w-3.5 h-3.5" />,
            },
          ]}
        />

        {activeTab === "info" ? (
          <form onSubmit={handleSaveBasicInfo} className="space-y-5 pt-1">
            <SectionHeader
              title="Thông tin liên hệ công việc"
              description="Cập nhật họ tên, số điện thoại liên hệ và email công việc"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-name" className="crm-label">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn Toàn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="crm-input"
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="crm-label">
                  Số điện thoại
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  placeholder="VD: 0909 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="crm-input"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="crm-label">
                  Email công việc <span className="text-rose-500">*</span>
                </label>
                <input
                  id="profile-email"
                  type="email"
                  required
                  placeholder="VD: toan.nguyen@toantrung.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="crm-input"
                />
              </div>

              <div>
                <label htmlFor="profile-avatar" className="crm-label">
                  Ảnh đại diện
                </label>
                <div className="flex gap-2">
                  <input
                    id="profile-avatar"
                    type="text"
                    placeholder="Đường dẫn ảnh đại diện..."
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="crm-input flex-1"
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
                isLoading={isSavingInfo}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Lưu thông tin
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSavePassword} className="space-y-5 pt-1">
            <SectionHeader
              title="Đổi mật khẩu đăng nhập"
              description="Nhập mật khẩu hiện tại và mật khẩu mới (tối thiểu 6 ký tự)"
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
                <label htmlFor="curr-pass" className="crm-label">
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
                <input
                  id="curr-pass"
                  type={showPasswords ? "text" : "password"}
                  required
                  placeholder="Nhập mật khẩu đang dùng"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="crm-input"
                />
              </div>

              <div>
                <label htmlFor="new-pass" className="crm-label">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  id="new-pass"
                  type={showPasswords ? "text" : "password"}
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="crm-input"
                />
              </div>

              <div>
                <label htmlFor="confirm-pass" className="crm-label">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  id="confirm-pass"
                  type={showPasswords ? "text" : "password"}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="crm-input"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSavingPass}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Cập nhật mật khẩu
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
