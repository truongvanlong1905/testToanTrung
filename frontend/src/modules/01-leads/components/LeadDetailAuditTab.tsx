"use client";

import React from "react";
import { Clock, UserCheck } from "lucide-react";
import type { AssignmentItem, StatusHistoryItem } from "../types";

interface LeadDetailAuditTabProps {
  statusTimeline: StatusHistoryItem[];
  assignmentTimeline: AssignmentItem[];
}

export function LeadDetailAuditTab({
  statusTimeline,
  assignmentTimeline,
}: LeadDetailAuditTabProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.05em] text-slate-400">
        Timeline Kiểm toán Trạng thái &amp; Bàn giao ({statusTimeline.length + assignmentTimeline.length})
      </h3>
      <div className="p-4 rounded-xl border border-slate-200/90 bg-white">
        {statusTimeline.length === 0 && assignmentTimeline.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">
            Chưa phát sinh lịch sử thay đổi trạng thái hoặc bàn giao nhân sự.
          </p>
        ) : (
          <div className="space-y-3">
            {statusTimeline.map((h) => (
              <div
                key={`st-${h.id}`}
                className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-800">
                      {h.fromStatus ? `${h.fromStatus} → ` : "Khởi tạo → "}
                      <span className="font-semibold text-blue-600">{h.toStatus}</span>
                    </p>
                    {h.reason && (
                      <p className="text-slate-600 mt-0.5">
                        Lý do: &ldquo;{h.reason}&rdquo;
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Thực hiện bởi: {h.changedBy}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  {h.createdAt}
                </span>
              </div>
            ))}

            {assignmentTimeline.map((a) => (
              <div
                key={`as-${a.id}`}
                className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-slate-800">
                      Bàn giao: {a.fromSales ? `${a.fromSales} → ` : ""}
                      <span className="font-semibold text-slate-900">{a.toSales}</span>
                    </p>
                    {a.reason && (
                      <p className="text-slate-600 mt-0.5">Ghi chú: {a.reason}</p>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  {a.createdAt}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
