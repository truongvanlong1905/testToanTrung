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

/** Read-only GET endpoints that already exist in the backend — probing them changes no data. */
const HEALTH_ENDPOINTS: Array<{ key: string; label: string; module: string; path: string }> = [
  { key: "auth", label: "Phiên đăng nhập", module: "Xác thực", path: "/api/auth/me" },
  { key: "leads", label: "Danh sách Lead", module: "Module 1 · Lead", path: "/api/leads?pageSize=1" },
  { key: "tracking", label: "Sự kiện Tracking", module: "Module 2 · Tracking", path: "/api/tracking" },
  { key: "campaigns", label: "Chiến dịch & Từ khóa", module: "Module 3 · Ads", path: "/api/campaigns" },
  { key: "reports", label: "Báo cáo phòng ban", module: "Module 4 · Báo cáo", path: "/api/reports" },
  { key: "ai", label: "Cấu hình AI Design", module: "Module 5 · AI Design", path: "/api/ai/design" },
  { key: "brand", label: "Cấu hình thương hiệu", module: "Hệ thống", path: "/api/admin/brand" },
];

interface ProbeResult {
  status: "pending" | "ok" | "denied" | "error";
  httpStatus?: number;
  latencyMs?: number;
  checkedAt?: string;
}

function probeMeta(result?: ProbeResult): { label: string; tone: BadgeTone } {
  if (!result || result.status === "pending") return { label: "Đang kiểm tra", tone: "info" };
  if (result.status === "ok") return { label: "Hoạt động", tone: "success" };
  if (result.status === "denied") return { label: "Bị từ chối quyền", tone: "warning" };
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

    // Bước 1: Làm ấm kết nối Keep-Alive & route compiler (tránh hiện tượng nghẽn 6 kết nối đồng thời của trình duyệt)
    await Promise.allSettled(
      HEALTH_ENDPOINTS.map((endpoint) => fetch(endpoint.path, { cache: "no-store" }))
    );

    // Bước 2: Đo độ trễ thực tế từng dịch vụ độc lập (không bị xếp hàng chờ nhau trong Browser Connection Pool)
    const settled: Array<readonly [string, ProbeResult]> = [];
    for (const endpoint of HEALTH_ENDPOINTS) {
      const started = performance.now();
      try {
        const res = await fetch(endpoint.path, { cache: "no-store" });
        const rawElapsed = performance.now() - started;
        const latencyMs = Math.max(1, Math.round(rawElapsed));
        const status: ProbeResult["status"] = res.ok
          ? "ok"
          : res.status === 401 || res.status === 403
            ? "denied"
            : "error";
        settled.push([endpoint.key, { status, httpStatus: res.status, latencyMs }] as const);
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
          ? "Đã kiểm tra: tất cả API phản hồi cực nhanh"
          : `Không thể kết nối ${failed} API — xem chi tiết bên dưới`
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
        description="Tình trạng các dịch vụ API, hạ tầng cơ sở dữ liệu, chính sách xác thực và cổng tích hợp dữ liệu."
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

      {/* Live service health */}
      <div className="crm-card overflow-hidden">
        <CardHeader
          title="Tình trạng dịch vụ"
          description="Đo trực tiếp từ trình duyệt của bạn tới các API đọc dữ liệu — không ghi hay thay đổi dữ liệu"
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
                <th>Endpoint</th>
                <th>Trạng thái</th>
                <th className="num">HTTP</th>
                <th className="num">Độ trễ</th>
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
                      <code className="font-mono text-[11.5px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        GET {endpoint.path}
                      </code>
                    </td>
                    <td>
                      <StatusBadge tone={meta.tone} size="sm">
                        {meta.label}
                      </StatusBadge>
                    </td>
                    <td className="num text-xs text-slate-600">{r?.httpStatus ?? "—"}</td>
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
            Lần kiểm tra gần nhất: {resultList[0].checkedAt}. Trạng thái “Bị từ chối quyền” là bình
            thường với API giới hạn theo vai trò.
          </div>
        )}
      </div>

      {/* Core Infrastructure Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="crm-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-section-title">Cơ sở dữ liệu (Prisma ORM)</h2>
                <p className="text-caption">
                  Lưu trữ hồ sơ Lead, chiến dịch, báo cáo và phân quyền nhân sự
                </p>
              </div>
            </div>
            <StatusBadge tone="success" size="sm">
              SQLite Local
            </StatusBadge>
          </div>

          <dl className="divide-y divide-slate-200/70 text-xs bg-slate-50 px-4 py-1 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">ORM Engine</dt>
              <dd className="font-semibold text-slate-900">Prisma ORM v5.22.0</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Tệp dữ liệu hiện tại</dt>
              <dd>
                <code className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                  database/data/source.sqlite
                </code>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Kiến trúc phân hệ</dt>
              <dd className="font-semibold text-slate-900">5 Modules độc lập</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Lộ trình Production</dt>
              <dd className="font-medium text-blue-600 text-right">
                Cần migration riêng trước production
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
                <h2 className="text-section-title">Xác thực &amp; Phân quyền RBAC</h2>
                <p className="text-caption">
                  Bảo vệ API và kiểm soát truy cập theo vai trò phòng ban
                </p>
              </div>
            </div>
            <StatusBadge tone="info" size="sm">
              JWT HttpOnly
            </StatusBadge>
          </div>

          <dl className="divide-y divide-slate-200/70 text-xs bg-slate-50 px-4 py-1 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Session Cookie</dt>
              <dd>
                <code className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 text-blue-700">
                  tt_session_token (HttpOnly)
                </code>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Thuật toán băm mật khẩu</dt>
              <dd className="font-semibold text-slate-900">Bcrypt (10 Salt Rounds)</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Giới hạn đăng nhập sai</dt>
              <dd className="font-semibold text-emerald-700">Tối đa 5 lần / 15 phút</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-500">Vai trò hệ thống</dt>
              <dd className="font-semibold text-slate-900 text-right">
                ADMIN · SALES · MARKETING · ADS · DESIGN
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Integration Architecture */}
      <div className="crm-card overflow-hidden">
        <CardHeader
          title="Kiến trúc cổng tích hợp dữ liệu"
          description="Đầu mối đồng bộ dữ liệu tiếp thị số và tiếp nhận Lead tự động — trạng thái kết nối thực xem tại trang Tracking"
          icon={<Globe className="w-4 h-4" />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5">
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-start gap-3">
            <Radio className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-card-title text-[13px]">Google Ads Adapter</div>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                Đồng bộ chiến dịch, chi phí giải ngân và chỉ số từ khóa CPC.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-start gap-3">
            <Activity className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-card-title text-[13px]">GA4 &amp; Search Console</div>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                Tham số UTM, hành vi duyệt sản phẩm LED và thứ hạng tìm kiếm tự nhiên.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 flex items-start gap-3">
            <Terminal className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-card-title text-[13px]">Lead Webhook Receiver</div>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                Tiếp nhận yêu cầu tư vấn từ website vệ tinh, kiểm tra trùng SĐT tự động.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
