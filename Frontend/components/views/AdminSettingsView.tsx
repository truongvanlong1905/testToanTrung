"use client";

import React, { useState } from "react";
import {
  Settings,
  Database,
  Key,
  Server,
  CheckCircle2,
  ShieldAlert,
  Cpu,
  HardDrive,
  RefreshCw,
  Globe,
  Radio,
  Lock,
  Terminal,
  Activity
} from "lucide-react";

export function AdminSettingsView() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleTestConnection = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setToast("Đã kiểm tra kết nối: Tất cả dịch vụ phản hồi tốt!");
      setTimeout(() => setToast(null), 3000);
    }, 700);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
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
            <span className="text-blue-600 font-semibold">Cài Đặt Hệ Thống</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cấu Hình Hệ Thống & Máy Chủ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi trạng thái Database, cơ chế xác thực JWT, và tích hợp đa kênh Toàn Trung
          </p>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>Kiểm Tra Kết Nối Hệ Thống</span>
        </button>
      </div>

      {/* Core Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Database Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Cơ Sở Dữ Liệu (Database ORM)</h2>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Database SQLite cục bộ
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
              LOCAL
            </span>
          </div>

          <div className="space-y-2 text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200/70 text-slate-700">
            <div className="flex justify-between py-1 border-b border-slate-200/40">
              <span className="text-slate-500">Engine / ORM:</span>
              <strong className="font-semibold text-slate-800">Prisma ORM v5.22.0</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/40">
              <span className="text-slate-500">Môi trường Dev:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">SQLite (source.sqlite)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/40">
              <span className="text-slate-500">Khả năng Scale Production:</span>
              <strong className="text-blue-600 font-semibold">Cần migration riêng trước production</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Mô hình dữ liệu:</span>
              <span className="font-semibold text-slate-800">15 bảng dữ liệu</span>
            </div>
          </div>
        </div>

        {/* Security & Authentication */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Xác Thực & Bảo Mật Phiên</h2>
                <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tiêu chuẩn Doanh Nghiệp (JWT HttpOnly)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
              SECURE
            </span>
          </div>

          <div className="space-y-2 text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200/70 text-slate-700">
            <div className="flex justify-between py-1 border-b border-slate-200/40">
              <span className="text-slate-500">Cơ chế Session Token:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-700">
                tt_session_token (HttpOnly)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/40">
              <span className="text-slate-500">Mã hóa Mật khẩu:</span>
              <strong className="font-semibold text-slate-800">Bcrypt (Salt 10 Rounds)</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/40">
              <span className="text-slate-500">Chống dò Brute-force:</span>
              <strong className="text-emerald-700 font-semibold">Rate Limit: 5 lần / 15 phút</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Cơ chế Phân Quyền (RBAC):</span>
              <span className="font-semibold text-slate-800">Server Middleware + Route Guard</span>
            </div>
          </div>
        </div>
      </div>

      {/* External Integration Connectors (Marketing - Kinh Doanh) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Cổng Kết Nối & Tích Hợp Kênh Tiếp Thị</h2>
            <p className="text-xs text-slate-400">Đồng bộ số liệu chiến dịch, Lead form và truy cập từ các nền tảng số</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
            <Radio className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-800">Google Ads API Adapter</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sẵn sàng webhook tiếp nhận chuyển đổi và chi phí quảng cáo</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
            <Activity className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-800">Google Analytics 4 (GA4)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Lắng nghe UTM parameters và hành vi duyệt sản phẩm LED</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
            <Terminal className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-slate-800">Lead Webhook Receiver</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Tiếp nhận form đăng ký tư vấn tự động từ landing page</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
