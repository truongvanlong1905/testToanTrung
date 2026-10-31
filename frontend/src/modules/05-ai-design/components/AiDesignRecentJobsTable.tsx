"use client";

import React from "react";
import { Clock, Eye } from "lucide-react";
import { cn } from "@/src/core/utils/utils";
import { CardHeader } from "@/src/core/ui/card";
import { Button } from "@/src/core/ui/button";
import { StatusBadge } from "@/src/core/ui/badge";
import { EmptyState } from "@/src/core/ui/feedback-states";
import type { DesignJobItem } from "../types";

export interface AiDesignRecentJobsTableProps {
  recentJobs: DesignJobItem[];
  selectedJobId: string | null;
  onSelectJob: (job: DesignJobItem) => void;
}

export function AiDesignRecentJobsTable({
  recentJobs,
  selectedJobId,
  onSelectJob,
}: AiDesignRecentJobsTableProps) {
  return (
    <div className="crm-card overflow-hidden">
      <CardHeader
        title="Recent Jobs"
        description="Các yêu cầu thiết kế đã chạy trong phiên làm việc này — bấm Xem để mở lại kết quả"
        count={recentJobs.length}
      />

      {recentJobs.length === 0 ? (
        <EmptyState
          compact
          icon={Clock}
          title="Chưa có tác vụ thiết kế nào trong phiên"
          description="Khi bạn chạy tạo Banner LED, Storyboard hoặc Mockup, trạng thái xử lý và kết quả đầu ra sẽ hiển thị tại đây."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Mã Job</th>
                <th>Hạng mục</th>
                <th>Nội dung yêu cầu</th>
                <th>Thông số</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th className="text-right">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => (
                <tr
                  key={job.id}
                  className={cn(selectedJobId === job.id && "bg-blue-50/50")}
                >
                  <td className="py-3 px-4 font-mono text-xs font-medium text-blue-600 whitespace-nowrap">
                    {job.id}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusBadge tone="neutral" size="sm" dot={false}>
                      {job.modeLabel}
                    </StatusBadge>
                  </td>
                  <td className="py-3 px-4 max-w-[280px]">
                    <div className="truncate font-medium text-slate-800">
                      {job.promptSummary}
                    </div>
                    {job.errorMessage && (
                      <div className="text-[11px] text-rose-600 truncate">
                        {job.errorMessage}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {job.specLabel}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 font-mono whitespace-nowrap kpi-number">
                    {new Date(job.createdAt).toLocaleTimeString("vi-VN")}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {job.status === "completed" && (
                      <StatusBadge tone="success" size="sm">
                        Hoàn tất
                      </StatusBadge>
                    )}
                    {job.status === "processing" && (
                      <StatusBadge tone="info" size="sm">
                        Đang xử lý
                      </StatusBadge>
                    )}
                    {job.status === "failed" && (
                      <StatusBadge tone="error" size="sm">
                        Thất bại
                      </StatusBadge>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={job.status === "processing"}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => onSelectJob(job)}
                    >
                      Xem
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
