import { apiFetch } from "@/src/core/http/api-client";
import type { PromotionItem, ReportItem } from "./types";

export async function fetchReportsApi(signal?: AbortSignal) {
  return apiFetch<ReportItem[]>("/api/reports", { signal });
}

export async function createReportApi(payload: {
  title: string;
  content: string;
  department: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
}) {
  return apiFetch<ReportItem>("/api/reports", {
    method: "POST",
    body: payload,
  });
}

export async function markReportReadApi(id: string) {
  return apiFetch<{ id: string; isRead: boolean }>(`/api/reports/${id}/read`, {
    method: "PATCH",
  });
}

export async function fetchPromotionsApi(signal?: AbortSignal) {
  return apiFetch<PromotionItem[]>("/api/promotions", { signal });
}

export async function createPromotionApi(payload: Partial<PromotionItem>) {
  return apiFetch<PromotionItem>("/api/promotions", {
    method: "POST",
    body: payload,
  });
}
