"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  UserPlus,
  AlertCircle,
  Briefcase,
  Building2,
  Award,
  ShieldCheck,
  Edit3,
  Save,
  X,
  Lock,
  Unlock,
  Camera,
  Users2,
  FileSignature,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, SectionHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { SegmentedControl, UnderlineTabs } from "@/components/ui/segmented-control";
import { Toast } from "@/components/ui/toast";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { getActorMeta, getRoleMeta, StatusBadge } from "@/components/ui/badge";
import {
  EmptyState,
  PageSkeleton,
  SearchInput,
} from "@/components/ui/feedback-states";
import { invalidateSharedJson } from "@/lib/shared-fetch";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  actorType?: "ADMIN" | "DIRECTOR" | "USER";
  department?: string;
  position?: string;
  appointedDecisionCode?: string | null;
  initials: string;
  avatar?: string | null;
  address?: string | null;
  hometown?: string | null;
  achievements?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface DepartmentRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

interface PromotionDecisionRecord {
  id: string;
  code: string;
  title: string;
  content: string;
  targetUserId: string;
  targetDepartment: string;
  newPosition: string;
  signedByName: string;
  status: "SIGNED_BY_DIRECTOR" | "APPLIED_BY_ADMIN" | "REVOKED";
  signedAt: string;
  appliedAt?: string | null;
  targetUser?: {
    id: string;
    name: string;
    email: string;
    department: string;
    position: string;
    initials: string;
  };
}

const ACTOR_FILTER_OPTIONS = [
  { id: "ALL", label: "Tất cả tác nhân" },
  { id: "ADMIN", label: "ADMIN (Quản trị)" },
  { id: "DIRECTOR", label: "GIÁM ĐỐC" },
  { id: "USER", label: "USER (Các phòng ban)" },
] as const;

interface EditUserModalProps {
  editingUser: UserRecord | null;
  departments: DepartmentRecord[];
  decisions: PromotionDecisionRecord[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}

const EditUserModal = React.memo(function EditUserModal({
  editingUser,
  departments,
  decisions,
  onClose,
  onSaved,
}: EditUserModalProps) {
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editActorType, setEditActorType] = useState<"ADMIN" | "DIRECTOR" | "USER">("USER");
  const [editDepartment, setEditDepartment] = useState("SALES");
  const [editPosition, setEditPosition] = useState("Nhân viên");
  const [editDecisionId, setEditDecisionId] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editHometown, setEditHometown] = useState("");
  const [editAchievements, setEditAchievements] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNewPassword, setEditNewPassword] = useState("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (editingUser) {
      setEditName(editingUser.name || "");
      setEditEmail(editingUser.email || "");
      setEditPhone(editingUser.phone || "");
      const resolvedActor =
        editingUser.actorType ||
        (editingUser.role === "ADMIN"
          ? "ADMIN"
          : editingUser.role === "DIRECTOR"
            ? "DIRECTOR"
            : "USER");
      setEditActorType(resolvedActor);
      setEditDepartment(
        editingUser.department || (resolvedActor === "USER" ? editingUser.role : "SALES")
      );
      setEditPosition(
        editingUser.position ||
          (resolvedActor === "ADMIN"
            ? "Quản trị hệ thống"
            : resolvedActor === "DIRECTOR"
              ? "Giám đốc"
              : "Nhân viên")
      );
      setEditDecisionId("");
      setEditAddress(editingUser.address || "");
      setEditHometown(editingUser.hometown || "");
      setEditAchievements(editingUser.achievements || "");
      setEditAvatar(editingUser.avatar || "");
      setEditIsActive(editingUser.isActive !== false);
      setEditNewPassword("");
      setEditError(null);
    }
  }, [editingUser]);

  const handleEditAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setEditError(err instanceof Error ? err.message : "Không tải được ảnh đại diện");
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
      const effectiveDept =
        editActorType === "ADMIN"
          ? "ADMIN_SYS"
          : editActorType === "DIRECTOR"
            ? "BOARD"
            : editDepartment;
      const effectivePos =
        editActorType === "ADMIN"
          ? "Quản trị hệ thống"
          : editActorType === "DIRECTOR"
            ? "Giám đốc"
            : editPosition;

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim() || null,
          actorType: editActorType,
          department: effectiveDept,
          position: effectivePos,
          role: editActorType === "USER" ? effectiveDept : editActorType,
          decisionId: editDecisionId || null,
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

      invalidateSharedJson("/api/users");
      onClose();
      onSaved(json.message || "Đã lưu thông tin tài khoản");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Lỗi cập nhật tài khoản");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  return (
    <Modal
      open={Boolean(editingUser)}
      onClose={onClose}
      preventClose={isUpdatingUser}
      size="lg"
      title={editingUser ? `Phân quyền & Hồ sơ: ${editingUser.name}` : "Chỉnh sửa tài khoản"}
      description="Cập nhật Tác nhân (ADMIN / GIÁM ĐỐC / USER), Phòng ban và Chức vụ (yêu cầu Quyết định của Giám đốc khi bổ nhiệm Trưởng phòng/Trưởng ban)"
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
            onClick={onClose}
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
              <label className="crm-label">Tác nhân hệ thống (Actor)</label>
              <select
                value={editActorType}
                onChange={(e) =>
                  setEditActorType(e.target.value as "ADMIN" | "DIRECTOR" | "USER")
                }
                className="crm-select"
              >
                <option value="USER">USER — Nhân sự thuộc các Phòng ban</option>
                <option value="DIRECTOR">GIÁM ĐỐC — Ban Giám Đốc</option>
                <option value="ADMIN">ADMIN — Quản trị hệ thống</option>
              </select>
            </div>

            {editActorType === "USER" && (
              <div>
                <label className="crm-label">Phòng ban (trong USER)</label>
                <select
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="crm-select"
                >
                  {departments.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {editActorType === "USER" && (
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="crm-label">Chức vụ trong Phòng ban</label>
                  <select
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="crm-select"
                  >
                    <option value="Nhân viên">Nhân viên (Mặc định)</option>
                    <option value="Trưởng nhóm">Trưởng nhóm (Cần QĐ Giám đốc)</option>
                    <option value="Phó phòng">Phó phòng (Cần QĐ Giám đốc)</option>
                    <option value="Trưởng ban">Trưởng ban (Cần QĐ Giám đốc)</option>
                    <option value="Trưởng phòng">Trưởng phòng (Cần QĐ Giám đốc)</option>
                  </select>
                </div>

                <div>
                  <label className="crm-label">
                    Căn cứ Quyết định Giám đốc ký (khi nâng chức)
                  </label>
                  <select
                    value={editDecisionId}
                    onChange={(e) => setEditDecisionId(e.target.value)}
                    className="crm-select"
                  >
                    <option value="">
                      {editingUser.appointedDecisionCode
                        ? `Đang áp dụng: ${editingUser.appointedDecisionCode}`
                        : "-- Chọn thông báo Giám đốc đã ký --"}
                    </option>
                    {decisions
                      .filter((d) => d.targetUserId === editingUser.id)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          [{d.code}] Bổ nhiệm {d.newPosition} ({d.signedByName})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

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
              <label className="crm-label">Địa chỉ cư trú</label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="crm-label">Đặt lại mật khẩu mới (Tùy chọn)</label>
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
                    <span>Tạm khóa / Chờ Admin duyệt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
});

export function AdminUsersView() {
  const [activeSubTab, setActiveSubTab] = useState<"actors" | "departments" | "promotions">("actors");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [decisions, setDecisions] = useState<PromotionDecisionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Filter & Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [actorFilter, setActorFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Create User Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123@");
  const [actorType, setActorType] = useState<"ADMIN" | "DIRECTOR" | "USER">("USER");
  const [department, setDepartment] = useState("SALES");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [hometown, setHometown] = useState("");
  const [achievements, setAchievements] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Department State (Admin)
  const [deptCode, setDeptCode] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [isCreatingDept, setIsCreatingDept] = useState(false);

  // Sign Promotion Notice State (Director)
  const [targetUserId, setTargetUserId] = useState("");
  const [targetDepartment, setTargetDepartment] = useState("SALES");
  const [newPosition, setNewPosition] = useState("Trưởng phòng");
  const [promoTitle, setPromoTitle] = useState("");
  const [promoContent, setPromoContent] = useState("");
  const [isSigningPromo, setIsSigningPromo] = useState(false);
  const [applyingDecisionId, setApplyingDecisionId] = useState<string | null>(null);

  // Edit User Modal State (form fields isolated inside EditUserModal)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, deptRes, promoRes] = await Promise.all([
        fetch("/api/users?all=true"),
        fetch("/api/departments"),
        fetch("/api/promotions"),
      ]);

      if (usersRes.ok) {
        const json = await usersRes.json();
        if (json.success) {
          const list: UserRecord[] = json.data.users || [];
          setUsers(list);
          if (!targetUserId && list.length > 0) {
            const firstStaff = list.find((u) => (u.actorType || "USER") === "USER") || list[0];
            setTargetUserId(firstStaff.id);
            setTargetDepartment(firstStaff.department || "SALES");
          }
        }
      }
      if (deptRes.ok) {
        const json = await deptRes.json();
        if (json.success) setDepartments(json.data.departments || []);
      }
      if (promoRes.ok) {
        const json = await promoRes.json();
        if (json.success) setDecisions(json.data.decisions || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const effectiveDept =
        actorType === "ADMIN" ? "ADMIN_SYS" : actorType === "DIRECTOR" ? "BOARD" : department;
      const effectivePos =
        actorType === "ADMIN" ? "Quản trị hệ thống" : actorType === "DIRECTOR" ? "Giám đốc" : "Nhân viên";

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          actorType,
          department: effectiveDept,
          position: effectivePos,
          role: actorType === "USER" ? effectiveDept : actorType,
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

      showToastMsg(json.message || "Tạo tài khoản thành công");
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setHometown("");
      setAchievements("");
      setShowAddForm(false);
      fetchAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo tài khoản");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingDept(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: deptCode.trim().toUpperCase(),
          name: deptName.trim(),
          description: deptDesc.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể tạo phòng ban");
      }
      showToastMsg(json.message || "Đã tạo phòng ban mới");
      setDeptCode("");
      setDeptName("");
      setDeptDesc("");
      fetchAllData();
    } catch (err) {
      showToastMsg(err instanceof Error ? err.message : "Lỗi tạo phòng ban");
    } finally {
      setIsCreatingDept(false);
    }
  };

  const handleDirectorSignPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningPromo(true);
    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SIGN_NOTICE",
          targetUserId,
          targetDepartment,
          newPosition,
          title: promoTitle.trim(),
          content: promoContent.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể ký thông báo bổ nhiệm");
      }
      showToastMsg(json.message);
      setPromoTitle("");
      setPromoContent("");
      fetchAllData();
    } catch (err) {
      showToastMsg(err instanceof Error ? err.message : "Lỗi ký thông báo bổ nhiệm");
    } finally {
      setIsSigningPromo(false);
    }
  };

  const handleAdminApplyPromotion = async (decisionId: string) => {
    setApplyingDecisionId(decisionId);
    try {
      const res = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPLY_PERMISSION",
          decisionId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể cấp quyền");
      }
      showToastMsg(json.message);
      fetchAllData();
    } catch (err) {
      showToastMsg(err instanceof Error ? err.message : "Lỗi cấp quyền");
    } finally {
      setApplyingDecisionId(null);
    }
  };

  const openEditModal = useCallback((u: UserRecord) => {
    setEditingUser(u);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditingUser(null);
  }, []);

  const handleSavedEditUser = useCallback((msg: string) => {
    showToastMsg(msg);
    fetchAllData();
  }, []);

  const normalizeUserActor = (u: UserRecord): "ADMIN" | "DIRECTOR" | "USER" => {
    if (u.actorType) return u.actorType;
    if (u.role === "ADMIN") return "ADMIN";
    if (u.role === "DIRECTOR") return "DIRECTOR";
    return "USER";
  };

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return users.filter((u) => {
      const uActor = normalizeUserActor(u);
      const uDept = u.department || u.role;
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.position && u.position.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q));
      const matchActor = actorFilter === "ALL" || uActor === actorFilter;
      const matchDept = deptFilter === "ALL" || uDept === deptFilter;
      return matchSearch && matchActor && matchDept;
    });
  }, [users, searchTerm, actorFilter, deptFilter]);

  const adminCount = users.filter((u) => normalizeUserActor(u) === "ADMIN").length;
  const directorCount = users.filter((u) => normalizeUserActor(u) === "DIRECTOR").length;
  const userActorCount = users.filter((u) => normalizeUserActor(u) === "USER").length;
  const pendingDecisionsCount = decisions.filter((d) => d.status === "SIGNED_BY_DIRECTOR").length;

  return (
    <div className="space-y-6">
      <Toast message={toast} onDismiss={() => setToast(null)} />

      <PageHeader
        title="Quản trị Tác nhân (ADMIN · GIÁM ĐỐC · USER) & Bổ nhiệm"
        description="Kiến trúc phân quyền chuẩn ATTT: 3 tác nhân độc lập, Admin quản lý phòng ban trong USER và chỉ cấp quyền chức vụ (Trưởng phòng/Trưởng ban) dựa trên Thông báo chúc mừng có chữ ký của Giám đốc."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<FileSignature className="w-4 h-4" />}
              onClick={() => setActiveSubTab("promotions")}
            >
              Quyết định Giám đốc ({decisions.length})
            </Button>
            <Button
              variant={showAddForm ? "secondary" : "primary"}
              size="md"
              leftIcon={showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              onClick={() => {
                setActiveSubTab("actors");
                setShowAddForm((prev) => !prev);
              }}
            >
              {showAddForm ? "Đóng biểu mẫu" : "Thêm tài khoản"}
            </Button>
          </div>
        }
      />

      {/* 4 KPI Cards reflecting the 3-Actor Security Model */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Tác nhân ADMIN"
          value={`${adminCount} Quản trị viên`}
          icon={ShieldCheck}
          iconTone="blue"
          note="Quản lý hệ thống, tạo phòng ban & thực thi cấp quyền"
        />
        <StatCard
          label="Tác nhân GIÁM ĐỐC"
          value={`${directorCount} Giám đốc`}
          icon={Award}
          iconTone="violet"
          note="Điều hành & ký Thông báo chúc mừng bổ nhiệm"
        />
        <StatCard
          label="Tác nhân USER"
          value={`${userActorCount} Nhân sự`}
          icon={Users2}
          iconTone="emerald"
          note={`Thuộc ${departments.length} phòng ban (Sales, MKT, Design, Ads...)`}
        />
        <StatCard
          label="Quyết định Bổ nhiệm"
          value={`${decisions.length} Quyết định`}
          icon={Briefcase}
          iconTone="amber"
          note={
            pendingDecisionsCount > 0
              ? `${pendingDecisionsCount} quyết định Giám đốc đã ký chờ Admin cấp quyền`
              : "Tất cả quyết định của Giám đốc đã được cấp quyền"
          }
        />
      </div>

      {/* Sub-navigation Tabs */}
      <UnderlineTabs
        value={activeSubTab}
        onChange={setActiveSubTab}
        options={[
          { id: "actors", label: "1. Tác nhân & Nhân sự (ADMIN / GIÁM ĐỐC / USER)", count: users.length },
          { id: "departments", label: "2. Phòng ban trong USER (Admin tạo)", count: departments.length },
          {
            id: "promotions",
            label: "3. Thông báo chúc mừng Giám đốc ký & Admin cấp quyền",
            count: decisions.length,
          },
        ]}
      />

      {activeSubTab === "actors" && (
        <>
          {showAddForm && (
            <div className="crm-card p-6 space-y-5 border-blue-200">
              <SectionHeader
                title="Khởi tạo tài khoản theo chuẩn 3 Tác nhân (ADMIN · GIÁM ĐỐC · USER)"
                description="Tác nhân USER mặc định ở cấp Nhân viên trong phòng ban được chọn. Việc nâng lên Trưởng phòng/Trưởng ban phải thông qua Quyết định của Giám đốc ký."
                action={
                  <StatusBadge tone="info" dot={false}>
                    Chuẩn ATTT 3 Tác nhân
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
                  <label className="crm-label">
                    Tác nhân hệ thống (Actor) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={actorType}
                    onChange={(e) => setActorType(e.target.value as "ADMIN" | "DIRECTOR" | "USER")}
                    className="crm-select"
                  >
                    <option value="USER">USER — Nhân sự thuộc các Phòng ban</option>
                    <option value="DIRECTOR">GIÁM ĐỐC — Ban Giám Đốc ký duyệt bổ nhiệm</option>
                    <option value="ADMIN">ADMIN — Quản trị hệ thống &amp; Phòng ban</option>
                  </select>
                </div>

                {actorType === "USER" ? (
                  <div>
                    <label className="crm-label">
                      Phòng ban trong USER (Do Admin tạo) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="crm-select"
                    >
                      {departments.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="crm-label">Chức danh mặc định</label>
                    <input
                      type="text"
                      disabled
                      value={actorType === "ADMIN" ? "Quản trị hệ thống (ADMIN)" : "Giám đốc (DIRECTOR)"}
                      className="crm-input opacity-75"
                    />
                  </div>
                )}

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

                <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" isLoading={isSubmitting}>
                    Tạo tài khoản
                  </Button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? (
            <PageSkeleton cards={0} rows={6} />
          ) : (
            <div className="crm-card overflow-hidden">
              <div className="p-3 border-b border-slate-200/80 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SegmentedControl
                    ariaLabel="Lọc theo tác nhân"
                    value={actorFilter}
                    onChange={setActorFilter}
                    options={ACTOR_FILTER_OPTIONS.map((r) => ({
                      id: r.id,
                      label: r.label,
                      count:
                        r.id === "ALL"
                          ? users.length
                          : users.filter((u) => normalizeUserActor(u) === r.id).length,
                    }))}
                    className="max-w-full overflow-x-auto"
                  />

                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="crm-select w-auto min-w-[180px]"
                    aria-label="Lọc theo phòng ban"
                  >
                    <option value="ALL">Tất cả phòng ban</option>
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Tìm tên, email, chức vụ, phòng ban..."
                  className="w-full xl:w-72"
                />
              </div>

              {filteredUsers.length === 0 ? (
                <EmptyState
                  icon={Users2}
                  title="Không tìm thấy nhân sự phù hợp"
                  description="Thử thay đổi bộ lọc Tác nhân, Phòng ban hoặc từ khóa tìm kiếm."
                />
              ) : (
                <div className="overflow-x-auto max-h-[640px]">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Nhân sự</th>
                        <th>Tác nhân (Actor)</th>
                        <th>Phòng ban (trong USER)</th>
                        <th>Chức vụ &amp; Căn cứ bổ nhiệm</th>
                        <th>Email &amp; Liên hệ</th>
                        <th>Trạng thái</th>
                        <th className="text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const uActor = normalizeUserActor(u);
                        const actorMeta = getActorMeta(uActor);
                        const deptMeta = getRoleMeta(u.department || u.role);
                        const pos =
                          u.position ||
                          (uActor === "ADMIN"
                            ? "Quản trị hệ thống"
                            : uActor === "DIRECTOR"
                              ? "Giám đốc"
                              : "Nhân viên");

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
                                  <div className="font-semibold text-slate-900">{u.name}</div>
                                  {u.achievements && (
                                    <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                                      {u.achievements}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <StatusBadge tone={actorMeta.tone} size="sm" dot>
                                {actorMeta.label}
                              </StatusBadge>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {uActor === "USER" ? (
                                <StatusBadge tone={deptMeta.tone} size="sm" dot={false}>
                                  {deptMeta.label} ({u.department || u.role})
                                </StatusBadge>
                              ) : (
                                <span className="text-xs font-medium text-slate-500">
                                  {uActor === "ADMIN" ? "Quản trị Hệ thống" : "Ban Giám Đốc"}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="text-xs font-semibold text-slate-900">{pos}</div>
                              {u.appointedDecisionCode ? (
                                <div className="text-[11px] text-emerald-700 font-mono mt-0.5">
                                  ✓ Giám đốc ký: {u.appointedDecisionCode}
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {uActor === "USER" ? "Cấp mặc định" : "Thẩm quyền gốc"}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-mono text-xs text-slate-800">{u.email}</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {u.phone || "Chưa cập nhật SĐT"}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {u.isActive !== false ? (
                                <StatusBadge tone="success" size="sm">
                                  Hoạt động
                                </StatusBadge>
                              ) : (
                                <StatusBadge tone="warning" size="sm">
                                  Chờ duyệt / Đã khóa
                                </StatusBadge>
                              )}
                            </td>

                            <td
                              className="py-3.5 px-4 text-right whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="secondary"
                                size="xs"
                                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                                onClick={() => openEditModal(u)}
                              >
                                Phân quyền / Sửa
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
        </>
      )}

      {activeSubTab === "departments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="crm-card p-5 space-y-4">
            <SectionHeader
              title="Admin khởi tạo Phòng ban mới"
              description="Các phòng ban được tạo tại đây sẽ nằm trong Tác nhân USER (VD: Design, Kinh doanh, Kỹ thuật LED...)"
            />
            <form onSubmit={handleCreateDepartment} className="space-y-3.5">
              <div>
                <label className="crm-label">
                  Mã phòng ban (Viết hoa) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: TECH_LED hoặc DESIGN"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                  className="crm-input font-mono"
                />
              </div>
              <div>
                <label className="crm-label">
                  Tên phòng ban <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Phòng Kỹ Thuật & Lắp Đặt LED"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="crm-input"
                />
              </div>
              <div>
                <label className="crm-label">Chức năng / Mô tả nghiệp vụ</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả phạm vi công việc của phòng ban..."
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="crm-textarea"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isCreatingDept}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Tạo phòng ban trong USER
              </Button>
            </form>
          </div>

          <div className="lg:col-span-2 crm-card p-5 space-y-4">
            <SectionHeader
              title="Danh sách Phòng ban thuộc Tác nhân USER"
              description="Mỗi nhân sự thuộc Tác nhân USER được phân vào 1 phòng ban và quản lý bởi Trưởng phòng / Trưởng ban"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {departments.map((d) => {
                const members = users.filter(
                  (u) => normalizeUserActor(u) === "USER" && (u.department || u.role) === d.code
                );
                const head = members.find(
                  (m) =>
                    m.position?.includes("Trưởng phòng") ||
                    m.position?.includes("Trưởng ban") ||
                    m.position?.includes("Phó phòng")
                );
                return (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-slate-900">{d.name}</span>
                        <StatusBadge tone="info" size="sm" dot={false}>
                          {d.code}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {d.description || "Phòng ban nghiệp vụ thuộc Tác nhân USER"}
                      </p>
                    </div>
                    <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        Nhân sự: <strong>{members.length}</strong> USER
                      </span>
                      <span className="text-slate-600">
                        Phụ trách:{" "}
                        <strong className="text-blue-700">
                          {head ? `${head.name} (${head.position})` : "Chưa bổ nhiệm"}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "promotions" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Director Sign Form */}
          <div className="crm-card p-5 space-y-4">
            <SectionHeader
              title="Bước 1: Giám đốc ký Thông báo chúc mừng"
              description="Giám đốc ký quyết định bổ nhiệm/chúc mừng lên chức vụ. Sau khi ký, thông báo được gửi toàn hệ thống để Admin căn cứ cấp quyền."
            />
            <form onSubmit={handleDirectorSignPromotion} className="space-y-3.5">
              <div>
                <label className="crm-label">
                  Nhân sự USER được bổ nhiệm <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    setTargetUserId(uid);
                    const found = users.find((u) => u.id === uid);
                    if (found?.department) setTargetDepartment(found.department);
                  }}
                  className="crm-select"
                  required
                >
                  {users
                    .filter((u) => normalizeUserActor(u) === "USER")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — Phòng {u.department || u.role} (Hiện tại: {u.position || "Nhân viên"})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="crm-label">Phòng ban bổ nhiệm</label>
                  <select
                    value={targetDepartment}
                    onChange={(e) => setTargetDepartment(e.target.value)}
                    className="crm-select"
                  >
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="crm-label">Chức vụ bổ nhiệm mới</label>
                  <select
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    className="crm-select"
                  >
                    <option value="Trưởng phòng">Trưởng phòng</option>
                    <option value="Trưởng ban">Trưởng ban</option>
                    <option value="Phó phòng">Phó phòng</option>
                    <option value="Trưởng nhóm">Trưởng nhóm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="crm-label">
                  Tiêu đề Thông báo chúc mừng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Chúc mừng bổ nhiệm Trưởng Phòng Thiết Kế LED"
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  className="crm-input"
                />
              </div>

              <div>
                <label className="crm-label">
                  Nội dung Giám đốc chúc mừng &amp; giao nhiệm vụ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ban Giám Đốc chúc mừng nhân sự chính thức đảm nhận chức vụ mới..."
                  value={promoContent}
                  onChange={(e) => setPromoContent(e.target.value)}
                  className="crm-textarea"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isSigningPromo}
                leftIcon={<FileSignature className="w-4 h-4" />}
              >
                Giám đốc Ký &amp; Phát thông báo chúc mừng
              </Button>
            </form>
          </div>

          {/* Admin Apply List */}
          <div className="lg:col-span-2 crm-card p-5 space-y-4">
            <SectionHeader
              title="Bước 2: Admin căn cứ Thông báo của Giám đốc để Cấp quyền"
              description="Chỉ những quyết định đã có chữ ký số của Giám đốc tại đây mới đủ điều kiện để Admin bấm nâng quyền chức vụ trên hệ thống."
            />

            {decisions.length === 0 ? (
              <EmptyState
                icon={Award}
                title="Chưa có thông báo bổ nhiệm nào"
                description="Khi Giám đốc ký thông báo chúc mừng thăng chức ở khung bên trái, quyết định sẽ hiển thị tại đây để Admin cấp quyền."
              />
            ) : (
              <div className="space-y-3">
                {decisions.map((d) => (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {d.code}
                        </span>
                        <span className="font-semibold text-sm text-slate-900">{d.title}</span>
                        {d.status === "APPLIED_BY_ADMIN" ? (
                          <StatusBadge tone="success" size="sm">
                            Đã được Admin cấp quyền
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="warning" size="sm">
                            Giám đốc đã ký — Chờ Admin cấp quyền
                          </StatusBadge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{d.content}</p>
                      <div className="text-[11px] text-slate-500 pt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          Nhân sự: <strong>{d.targetUser?.name || "Nhân viên"}</strong>
                        </span>
                        <span>
                          Bổ nhiệm: <strong className="text-emerald-700">{d.newPosition}</strong> (Phòng{" "}
                          <strong>{d.targetDepartment}</strong>)
                        </span>
                        <span>
                          Người ký: <strong>{d.signedByName}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {d.status === "SIGNED_BY_DIRECTOR" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={applyingDecisionId === d.id}
                          leftIcon={<CheckCircle2 className="w-4 h-4" />}
                          onClick={() => handleAdminApplyPromotion(d.id)}
                        >
                          Admin Cấp quyền ngay
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          Đã hiệu lực
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal (State-Isolated Component) */}
      <EditUserModal
        editingUser={editingUser}
        departments={departments}
        decisions={decisions}
        onClose={handleCloseEditModal}
        onSaved={handleSavedEditUser}
      />
    </div>
  );
}
