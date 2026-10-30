"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  UserPlus,
  AlertCircle,
  Briefcase,
  Palette,
  Megaphone,
  Edit3,
  Save,
  X,
  Lock,
  Unlock,
  Camera,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Toast } from "@/components/ui/toast";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { getRoleMeta, StatusBadge } from "@/components/ui/badge";
import {
  EmptyState,
  PageSkeleton,
  SearchInput,
} from "@/components/ui/feedback-states";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  initials: string;
  avatar?: string | null;
  address?: string | null;
  hometown?: string | null;
  achievements?: string | null;
  isActive: boolean;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { id: "ALL", label: "Tất cả" },
  { id: "ADMIN", label: "Ban Giám Đốc" },
  { id: "SALES", label: "Sales" },
  { id: "MARKETING", label: "Marketing" },
  { id: "ADS", label: "Ads" },
  { id: "DESIGN", label: "Design" },
] as const;

export function AdminUsersView() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Filter & Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Create Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123@");
  const [role, setRole] = useState("SALES");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hometown, setHometown] = useState("");
  const [achievements, setAchievements] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("SALES");
  const [editAddress, setEditAddress] = useState("");
  const [editHometown, setEditHometown] = useState("");
  const [editAchievements, setEditAchievements] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNewPassword, setEditNewPassword] = useState("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/users?all=true");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setUsers(json.data.users || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          phone: phone || null,
          address: address || null,
          hometown: hometown || null,
          achievements: achievements || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể tạo tài khoản");
      }

      showToastMsg(json.message || "Tạo tài khoản nhân sự thành công");
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setHometown("");
      setAchievements("");
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo tài khoản");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (u: UserRecord) => {
    setEditingUser(u);
    setEditName(u.name || "");
    setEditEmail(u.email || "");
    setEditPhone(u.phone || "");
    setEditRole(u.role || "SALES");
    setEditAddress(u.address || "");
    setEditHometown(u.hometown || "");
    setEditAchievements(u.achievements || "");
    setEditAvatar(u.avatar || "");
    setEditIsActive(u.isActive !== false);
    setEditNewPassword("");
    setEditError(null);
  };

  const handleEditAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        throw new Error(json.error?.message || "Lỗi tải ảnh");
      }
      setEditAvatar(json.data.fileUrl);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Không tải được ảnh đại diện"
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim() || null,
          role: editRole,
          address: editAddress.trim() || null,
          hometown: editHometown.trim() || null,
          achievements: editAchievements.trim() || null,
          avatar: editAvatar.trim() || null,
          isActive: editIsActive,
          newPassword: editNewPassword.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể cập nhật tài khoản");
      }

      showToastMsg(json.message || "Đã lưu thông tin tài khoản");
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Lỗi cập nhật tài khoản"
      );
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.address && u.address.toLowerCase().includes(q)) ||
        (u.hometown && u.hometown.toLowerCase().includes(q));
      const matchRole = roleFilter === "ALL" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const salesCount = users.filter((u) => u.role === "SALES").length;
  const marketingAdsCount = users.filter(
    (u) => u.role === "MARKETING" || u.role === "ADS"
  ).length;
  const designCount = users.filter((u) => u.role === "DESIGN").length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <Toast message={toast} onDismiss={() => setToast(null)} />

      {/* Header */}
      <PageHeader
        title="Quản lý nhân sự & Phân quyền"
        description="Khởi tạo tài khoản nội bộ, phân quyền RBAC theo phòng ban và quản lý trạng thái truy cập."
        actions={
          <Button
            variant={showAddForm ? "secondary" : "primary"}
            size="md"
            leftIcon={
              showAddForm ? (
                <X className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )
            }
            onClick={() => setShowAddForm((prev) => !prev)}
          >
            {showAddForm ? "Đóng biểu mẫu" : "Thêm tài khoản"}
          </Button>
        }
      />

      {/* 4 Clean Summary StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Tổng nhân sự"
          value={users.length > 0 ? `${users.length} tài khoản` : null}
          isEmpty={!isLoading && users.length === 0}
          icon={Users2}
          iconTone="blue"
          note={`${adminCount} tài khoản Ban Giám Đốc (ADMIN)`}
        />
        <StatCard
          label="Phòng Kinh Doanh"
          value={users.length > 0 ? `${salesCount} Sales` : null}
          isEmpty={!isLoading && users.length === 0}
          icon={Briefcase}
          iconTone="emerald"
          note="Phụ trách tiếp nhận Lead & báo giá dự án"
        />
        <StatCard
          label="Marketing & Ads"
          value={users.length > 0 ? `${marketingAdsCount} nhân sự` : null}
          isEmpty={!isLoading && users.length === 0}
          icon={Megaphone}
          iconTone="amber"
          note="Vận hành chiến dịch quảng cáo & đo lường UTM"
        />
        <StatCard
          label="Phòng Thiết Kế"
          value={users.length > 0 ? `${designCount} Designer` : null}
          isEmpty={!isLoading && users.length === 0}
          icon={Palette}
          iconTone="slate"
          note="Phụ trách maquette LED & AI Design Studio"
        />
      </div>

      {/* Add User Collapsible Card */}
      {showAddForm && (
        <div className="crm-card p-6 space-y-5 border-blue-200">
          <SectionHeader
            title="Khởi tạo tài khoản nhân sự mới"
            description="Cấp tài khoản đăng nhập hệ thống CRM theo đúng vai trò nghiệp vụ"
            action={
              <StatusBadge tone="neutral" dot={false}>
                Mật khẩu mặc định: Password123@
              </StatusBadge>
            }
          />

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg flex items-center gap-2 border border-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleCreateUser}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div>
              <label className="crm-label">
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Trần Minh Tuấn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">
                Email đăng nhập <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="VD: tuan.tm@toantrung.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="crm-input font-mono"
              />
            </div>

            <div>
              <label className="crm-label">
                Mật khẩu khởi tạo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="crm-input font-mono"
              />
            </div>

            <div>
              <label className="crm-label">Số điện thoại</label>
              <input
                type="text"
                placeholder="VD: 0912 334 556"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">Địa chỉ cư trú</label>
              <input
                type="text"
                placeholder="VD: Quận Tân Phú, TP.HCM"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">Quê quán</label>
              <input
                type="text"
                placeholder="VD: TP. Đà Nẵng"
                value={hometown}
                onChange={(e) => setHometown(e.target.value)}
                className="crm-input"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="crm-label">
                Phòng ban / Vai trò (RBAC){" "}
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="crm-select"
              >
                <option value="SALES">
                  Phòng Kinh Doanh (SALES) — Quản lý Lead &amp; Báo giá dự án
                </option>
                <option value="MARKETING">
                  Phòng Marketing (MARKETING) — Theo dõi chiến dịch &amp; Tracking
                </option>
                <option value="ADS">
                  Bộ phận Quảng cáo (ADS) — Quản lý ngân sách &amp; Chiến dịch Ads
                </option>
                <option value="DESIGN">
                  Phòng Thiết kế (DESIGN) — AI Design Studio &amp; Maquette LED
                </option>
                <option value="ADMIN">
                  Ban Giám Đốc (ADMIN) — Toàn quyền điều hành &amp; Quản trị
                </option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAddForm(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
              >
                Tạo tài khoản
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Users CRM Table */}
      {isLoading ? (
        <PageSkeleton cards={0} rows={6} />
      ) : (
        <div className="crm-card overflow-hidden">
          <div className="p-3 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <SegmentedControl
              ariaLabel="Lọc theo vai trò"
              value={roleFilter}
              onChange={setRoleFilter}
              options={ROLE_OPTIONS.map((r) => ({
                id: r.id,
                label: r.label,
                count: r.id === "ALL" ? users.length : users.filter((u) => u.role === r.id).length,
              }))}
              className="max-w-full overflow-x-auto"
            />

            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Tìm tên, email, SĐT, địa chỉ..."
              className="w-full lg:w-72"
            />
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users2}
              title="Không tìm thấy nhân sự phù hợp"
              description="Thử thay đổi bộ lọc vai trò hoặc từ khóa tìm kiếm."
            />
          ) : (
            <div className="overflow-x-auto max-h-[640px]">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Nhân sự</th>
                    <th>Email &amp; Điện thoại</th>
                    <th>Địa chỉ / Quê quán</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th className="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const roleMeta = getRoleMeta(u.role);
                    return (
                      <tr
                        key={u.id}
                        onClick={() => openEditModal(u)}
                        className={cn("cursor-pointer group", u.isActive === false && "opacity-70")}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {u.avatar ? (
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 font-semibold text-xs flex items-center justify-center shrink-0">
                                {u.initials}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-900">
                                {u.name}
                              </div>
                              {u.achievements && (
                                <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                  {u.achievements}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-xs text-slate-800">
                            {u.email}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {u.phone || "Chưa cập nhật SĐT"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-[200px] text-xs text-slate-600">
                          <div className="truncate">
                            {u.address || "Chưa cập nhật nơi trú"}
                          </div>
                          {u.hometown && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              Quê: {u.hometown}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge
                            tone={roleMeta.tone}
                            size="sm"
                            dot={false}
                          >
                            {roleMeta.label}
                          </StatusBadge>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {u.isActive !== false ? (
                            <StatusBadge tone="success" size="sm">
                              Hoạt động
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="error" size="sm">
                              Đã khóa
                            </StatusBadge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="secondary"
                            size="xs"
                            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                            onClick={() => openEditModal(u)}
                          >
                            Chỉnh sửa
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit User Modal */}
      <Modal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        preventClose={isUpdatingUser}
        size="lg"
        title={editingUser ? `Chỉnh sửa tài khoản: ${editingUser.name}` : "Chỉnh sửa tài khoản"}
        description="Cập nhật hồ sơ nhân sự, phân quyền vai trò hoặc cấp lại mật khẩu"
        icon={
          editAvatar ? (
            <img src={editAvatar} alt={editName} className="w-full h-full rounded-lg object-cover" />
          ) : (
            <span className="text-xs font-semibold">{editingUser?.initials}</span>
          )
        }
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              disabled={isUpdatingUser}
              onClick={() => setEditingUser(null)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              form="edit-user-form"
              variant="primary"
              isLoading={isUpdatingUser}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        {editingUser && (
            <form id="edit-user-form" onSubmit={handleSaveEditUser} className="space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-lg border border-rose-200 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="crm-label">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
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
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="crm-input font-mono"
                  />
                </div>

                <div>
                  <label className="crm-label">Số điện thoại</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="0909 xxx xxx"
                    className="crm-input"
                  />
                </div>

                <div>
                  <label className="crm-label">Vai trò / Phòng ban</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="crm-select"
                  >
                    <option value="ADMIN">Ban Giám Đốc (ADMIN)</option>
                    <option value="SALES">Phòng Kinh Doanh (SALES)</option>
                    <option value="MARKETING">Phòng Marketing (MARKETING)</option>
                    <option value="ADS">Bộ phận Quảng cáo (ADS)</option>
                    <option value="DESIGN">Phòng Thiết kế (DESIGN)</option>
                  </select>
                </div>

                <div>
                  <label className="crm-label">Địa chỉ cư trú</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="crm-input"
                  />
                </div>

                <div>
                  <label className="crm-label">Quê quán</label>
                  <input
                    type="text"
                    value={editHometown}
                    onChange={(e) => setEditHometown(e.target.value)}
                    className="crm-input"
                  />
                </div>
              </div>

              <div>
                <label className="crm-label">Ảnh đại diện (Avatar)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    placeholder="URL ảnh đại diện..."
                    className="crm-input font-mono flex-1"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer shrink-0">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingAvatar ? "Đang tải..." : "Tải ảnh"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="crm-label">Thành tích chuyên môn</label>
                <textarea
                  rows={2}
                  value={editAchievements}
                  onChange={(e) => setEditAchievements(e.target.value)}
                  className="crm-textarea"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="crm-label">
                    Đặt lại mật khẩu mới (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="Bỏ trống nếu giữ nguyên mật khẩu..."
                    className="crm-input font-mono"
                  />
                </div>

                <div>
                  <label className="crm-label">Trạng thái truy cập</label>
                  <button
                    type="button"
                    onClick={() => setEditIsActive((prev) => !prev)}
                    className={cn(
                      "w-full h-9 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-colors cursor-pointer",
                      editIsActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    )}
                  >
                    {editIsActive ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Đang hoạt động (Cho phép đăng nhập)</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Tạm khóa tài khoản</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
        )}
      </Modal>
    </div>
  );
}
