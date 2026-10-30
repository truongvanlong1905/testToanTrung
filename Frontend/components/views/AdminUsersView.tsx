"use client";

import React, { useState, useEffect } from "react";
import {
  UserCog,
  UserPlus,
  Shield,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Search,
  Filter,
  KeyRound,
  Trash2,
  Sparkles,
  Users,
  Briefcase,
  TrendingUp,
  Palette,
  ShieldAlert
} from "lucide-react";

export function AdminUsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123@");
  const [role, setRole] = useState("SALES");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/users");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setUsers(json.data.users);
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
        body: JSON.stringify({ name, email, password, role, phone }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Không thể tạo tài khoản");
      }

      setToast(json.message || "Tạo người dùng thành công");
      setTimeout(() => setToast(null), 3000);
      setName("");
      setEmail("");
      setPhone("");
      setShowAddForm(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Lỗi tạo tài khoản");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Role Statistics
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const salesCount = users.filter((u) => u.role === "SALES").length;
  const marketingCount = users.filter((u) => u.role === "MARKETING").length;
  const designCount = users.filter((u) => u.role === "DESIGN").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-blue-600 font-semibold">Quản Lý Người Dùng</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Nhân Sự & Phân Quyền Hệ Thống
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cấp quyền truy cập trực tiếp cho các bộ phận Ban Giám Đốc, Sales, Marketing và Design
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{showAddForm ? "Đóng Cửa Sổ Thêm" : "+ Thêm Nhân Viên Mới"}</span>
        </button>
      </div>

      {/* Quick Role Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ban Giám Đốc</div>
            <div className="text-xl font-bold text-slate-800">{adminCount} <span className="text-xs font-normal text-slate-400">admin</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kinh Doanh (Sales)</div>
            <div className="text-xl font-bold text-slate-800">{salesCount} <span className="text-xs font-normal text-slate-400">nhân sự</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Marketing</div>
            <div className="text-xl font-bold text-slate-800">{marketingCount} <span className="text-xs font-normal text-slate-400">nhân sự</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AI Design</div>
            <div className="text-xl font-bold text-slate-800">{designCount} <span className="text-xs font-normal text-slate-400">nhân sự</span></div>
          </div>
        </div>
      </div>

      {/* Add User Modal / Form Accordion */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border-2 border-blue-500/20 p-6 shadow-xl space-y-5 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Khởi Tạo Tài Khoản Nhân Viên Mới
              </h2>
            </div>
            <span className="text-[11px] bg-slate-100 px-2.5 py-1 rounded-full text-slate-500 font-medium">
              Mật khẩu mặc định: <strong className="text-slate-700">Password123@</strong>
            </span>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 text-rose-700 rounded-xl flex items-center gap-2.5 border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Họ và Tên Nhân Viên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Trần Minh Tuấn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Email Đăng Nhập <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="VD: tuan.tm@toantrung.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Số Điện Thoại
              </label>
              <input
                type="text"
                placeholder="VD: 0912.334.556"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Phòng Ban / Vai Trò (Role) <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-semibold"
              >
                <option value="SALES">Phòng Kinh Doanh (SALES) — Quản lý Lead & Dự án</option>
                <option value="MARKETING">Phòng Marketing (MARKETING) — Theo dõi Ads & Tracking</option>
                <option value="DESIGN">Phòng AI Design (DESIGN) — Thiết kế & AI Studio</option>
                <option value="ADS">Bộ Phận Quảng Cáo (ADS) — Độc quyền quản lý Ads</option>
                <option value="ADMIN">Ban Giám Đốc (ADMIN) — Toàn quyền quản trị</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? "Đang xử lý..." : "Xác nhận tạo tài khoản"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table Container with Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, sđt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">Lọc theo vai trò:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {["ALL", "ADMIN", "SALES", "MARKETING", "DESIGN"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    roleFilter === r
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {r === "ALL" ? "Tất cả" : r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">Nhân sự</th>
                <th className="py-3.5 px-5">Email đăng nhập</th>
                <th className="py-3.5 px-5">Số điện thoại</th>
                <th className="py-3.5 px-5">Vai trò (Role)</th>
                <th className="py-3.5 px-5">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Không tìm thấy nhân sự phù hợp
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleStyle =
                    u.role === "ADMIN"
                      ? "bg-purple-50 text-purple-700 border-purple-200/80"
                      : u.role === "SALES"
                      ? "bg-blue-50 text-blue-700 border-blue-200/80"
                      : u.role === "MARKETING"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                      : "bg-amber-50 text-amber-700 border-amber-200/80";

                  const roleTitle =
                    u.role === "ADMIN"
                      ? "Ban Giám Đốc"
                      : u.role === "SALES"
                      ? "Phòng Kinh Doanh"
                      : u.role === "MARKETING"
                      ? "Phòng Marketing"
                      : "Phòng AI Design";

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                            {u.initials}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{u.name}</span>
                            <span className="text-[10px] text-slate-400">{roleTitle}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-slate-600">{u.email}</td>
                      <td className="py-3.5 px-5 text-slate-600">{u.phone || "—"}</td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${roleStyle}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Hoạt động
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
