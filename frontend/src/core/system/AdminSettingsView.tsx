"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Database,
  RefreshCw,
  Globe,
  Radio,
  Lock,
  Terminal,
  Activity,
  Gauge,
} from "lucide-react";
import { PageHeader } from "@/src/core/ui/page-header";
import { CardHeader } from "@/src/core/ui/card";
import { Button } from "@/src/core/ui/button";
import { BadgeTone, StatusBadge } from "@/src/core/ui/badge";
import { Toast } from "@/src/core/ui/toast";

const HEALTH_ENDPOINTS: Array<{ key: string; label: string; module: string }> = [
  { key: "/api/auth/me", label: "Xác thực tài khoản", module: "Hệ thống xác thực" },
  { key: "/api/leads?pageSize=1", label: "Quản lý Lead", module: "Module 1 · Lead" },
  { key: "/api/tracking", label: "Sự kiện Tracking", module: "Module 2 · Tracking" },
  { key: "/api/campaigns", label: "Chiến dịch & Từ khóa", module: "Module 3 · Ads" },
  { key: "/api/reports", label: "Báo cáo phòng ban", module: "Module 4 · Báo cáo" },
  { key: "/api/ai/design", label: "Thiết kế AI", module: "Module 5 · Thiết kế AI" },
  { key: "/api/admin/brand", label: "Cấu hình thương hiệu", module: "Hệ thống" },
];

interface ProbeResult {
  status: "pending" | "ok" | "denied" | "error";
  latencyMs?: number;
  checkedAt?: string;
}

function probeMeta(result?: ProbeResult): { label: string; tone: BadgeTone } {
  if (!result || result.status === "pending") return { label: "Đang kiểm tra", tone: "info" };
  if (result.status === "ok") return { label: "Hoạt động", tone: "success" };
  if (result.status === "denied") return { label: "Giới hạn theo vai trò", tone: "warning" };
  return { label: "Không phản hồi", tone: "error" };
}

export function AdminSettingsView() {
  const [isChecking, setIsChecking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ProbeResult>>({});

  const runHealthCheck = useCallback(async (announce: boolean) => {
    setIsChecking(true);
    setResults(
      Object.fromEntries(HEALTH_ENDPOINTS.map((e) => [e.key, { status: "pending" } as ProbeResult]))
    );

    await Promise.allSettled(
      HEALTH_ENDPOINTS.map((endpoint) => fetch(endpoint.key, { cache: "no-store" }))
    );

    const settled: Array<readonly [string, ProbeResult]> = [];
    for (const endpoint of HEALTH_ENDPOINTS) {
      const started = performance.now();
      try {
        const res = await fetch(endpoint.key, { cache: "no-store" });
        const rawElapsed = performance.now() - started;
        const latencyMs = Math.max(1, Math.round(rawElapsed));
        const status: ProbeResult["status"] = res.ok
          ? "ok"
          : res.status === 401 || res.status === 403
            ? "denied"
            : "error";
        settled.push([endpoint.key, { status, latencyMs }] as const);
      } catch {
        settled.push([endpoint.key, { status: "error" as const }] as const);
      }
    }

    const checkedAt = new Date().toLocaleTimeString("vi-VN");
    const next = Object.fromEntries(settled.map(([k, r]) => [k, { ...r, checkedAt }]));
    setResults(next);
    setIsChecking(false);

    if (announce) {
      const failed = settled.filter(([, r]) => r.status === "error").length;
      setToast(
        failed === 0
          ? "Đã kiểm tra: tất cả phân hệ phản hồi ổn định"
          : `Phát hiện ${failed} dịch vụ chưa phản hồi`
      );
      setTimeout(() => setToast(null), 3200);
    }
  }, []);

  useEffect(() => {
    void runHealthCheck(false);
  }, [runHealthCheck]);

  const resultList = HEALTH_ENDPOINTS.map((e) => results[e.key]).filter(Boolean);
  const okCount = resultList.filter((r) => r.status === "ok").length;
  const measured = resultList.filter((r) => typeof r.latencyMs === "number");
  const avgLatency =
    measured.length > 0
      ? Math.round(measured.reduce((s, r) => s + (r.latencyMs || 0), 0) / measured.length)
      : null;
  const doneChecking = !isChecking && resultList.length === HEALTH_ENDPOINTS.length;

  return (
    <div className="space-y-6">
      <Toast message={toast} onDismiss={() => setToast(null)} />

      <PageHeader
        title="Cài đặt hệ thống"
        description="Theo dõi tình trạng hoạt động của các phân hệ nghiệp vụ và chính sách phân quyền."
        actions={
          <Button
            variant="secondary"
            size="md"
            isLoading={isChecking}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => void runHealthCheck(true)}
          >
            Kiểm tra lại
          </Button>
        }
      />

      <div className="crm-card overflow-hidden">
        <CardHeader
          title="Tình trạng các phân hệ"
          description="Kiểm tra phản hồi trực tiếp của các dịch vụ nghiệp vụ"
          icon={<Gauge className="w-4 h-4" />}
          actions={
            doneChecking ? (
              <div className="flex items-center gap-2">
                <StatusBadge tone={okCount === HEALTH_ENDPOINTS.length ? "success" : "warning"}>
                  {okCount}/{HEALTH_ENDPOINTS.length} hoạt động
                </StatusBadge>
                {avgLatency !== null && (
                  <StatusBadge
                    tone={avgLatency <= 50 ? "success" : avgLatency <= 200 ? "neutral" : "warning"}
                    dot={false}
                  >
                    Trung bình {avgLatency} ms
                  </StatusBadge>
                )}
              </div>
            ) : undefined
          }
        />
        <div className="overflow-x-auto">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Dịch vụ</th>
                <th>Phân hệ</th>
                <th>Trạng thái</th>
                <th className="num">Thời gian phản hồi</th>
              </tr>
            </thead>
            <tbody>
              {HEALTH_ENDPOINTS.map((endpoint) => {
                const r = results[endpoint.key];
                const meta = probeMeta(r);
                const latency = r?.latencyMs;
                return (
                  <tr key={endpoint.key}>
                    <td className="font-medium text-slate-900">{endpoint.label}</td>
                    <td className="text-xs text-slate-500">{endpoint.module}</td>
                    <td>
                      <StatusBadge tone={meta.tone} size="sm">
                        {meta.label}
                      </StatusBadge>
                    </td>
                    <td className="num">
                      {typeof latency === "number" ? (
                        <span
                          className={
                            latency > 1500
                              ? "text-rose-600 font-medium"
                              : latency > 600
                                ? "text-amber-600 font-medium"
                                : latency <= 50
                                  ? "text-emerald-600 font-semibold"
                                  : "text-slate-700"
                          }
                        >
                          {latency} ms
                        </span>
                      ) : r?.status === "pending" ? (
                        <span className="skeleton inline-block h-3 w-12 align-middle" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {doneChecking && resultList[0]?.checkedAt && (
          <div className="px-5 py-2.5 border-t border-slate-200/80 bg-slate-50/60 text-caption">
            Lần kiểm tra gần nhất: {resultList[0].checkedAt}.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="crm-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-section-title">Lưu trữ dữ liệu nghiệp vụ</h2>
                <p className="text-caption">
                  Quản lý hồ sơ khách hàng, danh mục sản phẩm, báo cáo và phân quyền nhân sự
                </p>
              </div>
            </div>
            <StatusBadge tone="success" size="sm">
              Sẵn sàng
            </StatusBadge>
          </div>

          <dl className="divide-y divide-slate-200/70 text-xs bg-slate-50 px-4 py-1 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Cấu trúc hệ thống</dt>
              <dd className="font-semibold text-slate-900">5 phân hệ nghiệp vụ độc lập</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Danh mục sản phẩm</dt>
              <dd className="font-semibold text-slate-900">Màn hình LED &amp; Bảng Điện Tử</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Chính sách dữ liệu</dt>
              <dd className="font-medium text-emerald-700 text-right">
                Bảo toàn lịch sử bàn giao &amp; trạng thái Lead
              </dd>
            </div>
          </dl>
        </div>

        <div className="crm-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-section-title">Quản lý truy cập &amp; Phân quyền</h2>
                <p className="text-caption">
                  Kiểm soát truy cập theo đúng vai trò và phòng ban được phân công
                </p>
              </div>
            </div>
            <StatusBadge tone="info" size="sm">
              Đang bật
            </StatusBadge>
          </div>

          <dl className="divide-y divide-slate-200/70 text-xs bg-slate-50 px-4 py-1 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Cấp phát tài khoản</dt>
              <dd className="font-semibold text-slate-900">Quản trị viên (Admin) cấp phát</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Bảo vệ đăng nhập</dt>
              <dd className="font-semibold text-emerald-700">Giới hạn tối đa 5 lần sai / 15 phút</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Nhóm vai trò</dt>
              <dd className="font-semibold text-slate-900 text-right">
                Admin · Giám đốc · Kinh doanh · Marketing · Ads · Thiết kế
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="crm-card overflow-hidden">
        <CardHeader
          title="Kết nối nguồn dữ liệu tiếp thị"
          description="Đầu mối đồng bộ chiến dịch quảng cáo và tiếp nhận thông tin khách hàng"
          icon={<Globe className="w-4 h-4" />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5">
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-start gap-3">
            <Radio className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-card-title text-[13px]">Quảng cáo Google Ads &amp; Facebook</div>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                Đồng bộ chiến dịch và hiệu quả từ khóa tiếp thị.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-start gap-3">
            <Activity className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-card-title text-[13px]">Google Analytics &amp; Search Console</div>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                Theo dõi nguồn truy cập, chiến dịch và từ khóa tìm kiếm tự nhiên.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-start gap-3">
            <Terminal className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-card-title text-[13px]">Tiếp nhận Form Website</div>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                Ghi nhận thông tin khách hàng từ các trang đích và kiểm tra trùng số điện thoại.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
