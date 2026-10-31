import { apiFetch, sharedGetJson } from "@/src/core/http/api-client";
import type {
  Lead,
  LeadActivityItem,
  LeadQuoteItem,
  LeadStatsSummary,
  LeadStatus,
} from "./types";

export interface FetchLeadsQuery {
  search?: string;
  status?: string;
  source?: string;
  salesId?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchLeadsList(
  query: FetchLeadsQuery = {},
  signal?: AbortSignal
): Promise<{ leads: Lead[]; stats: LeadStatsSummary }> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.append("search", query.search.trim());
  if (query.status && query.status !== "all") params.append("status", query.status);
  if (query.source && query.source !== "all") params.append("source", query.source);
  if (query.salesId && query.salesId !== "all") params.append("salesId", query.salesId);
  if (query.page) params.append("page", String(query.page));
  params.append("pageSize", String(query.pageSize ?? 50));

  const { ok, envelope } = await apiFetch<{ leads: Lead[]; stats: LeadStatsSummary }>(
    `/api/leads?${params.toString()}`,
    { signal }
  );

  if (!ok || !Array.isArray(envelope.data?.leads) || !envelope.data?.stats) {
    throw new Error(envelope.error?.message || "Không thể tải dữ liệu Lead từ máy chủ.");
  }

  return envelope.data;
}

export async function fetchLeadsAnalytics(signal?: AbortSignal) {
  return apiFetch<unknown>("/api/leads/analytics", { signal });
}

export async function fetchLeadById(id: string, signal?: AbortSignal) {
  return apiFetch<Lead>(`/api/leads/${id}`, { signal });
}

export async function updateLeadById(
  id: string,
  payload: Record<string, unknown>,
  signal?: AbortSignal
) {
  return apiFetch<Lead>(`/api/leads/${id}`, {
    method: "PATCH",
    body: payload,
    signal,
  });
}

export async function deleteLeadById(id: string, signal?: AbortSignal) {
  return apiFetch<{ deleted: boolean }>(`/api/leads/${id}`, {
    method: "DELETE",
    signal,
  });
}

export async function updateLeadStatusApi(
  id: string,
  status: LeadStatus,
  reason?: string
) {
  return apiFetch<{ lead?: Lead; message?: string }>(`/api/leads/${id}/status`, {
    method: "PATCH",
    body: { status, reason },
  });
}

export async function assignLeadSalesApi(
  leadId: string,
  newSalesPersonId: string,
  reason: string
) {
  return apiFetch<{ lead?: Lead; message?: string }>(`/api/leads/${leadId}/assign`, {
    method: "POST",
    body: { newSalesPersonId, reason },
  });
}

export async function createLeadActivityApi(
  leadId: string,
  payload: {
    type: string;
    summary: string;
    outcome?: string;
    nextFollowUpAt?: string | null;
  }
) {
  return apiFetch<LeadActivityItem>(`/api/leads/${leadId}/activities`, {
    method: "POST",
    body: payload,
  });
}

export async function createLeadQuoteApi(
  leadId: string,
  payload: Record<string, unknown>
) {
  return apiFetch<LeadQuoteItem>(`/api/leads/${leadId}/quotes`, {
    method: "POST",
    body: payload,
  });
}

export async function updateLeadQuoteApprovalApi(
  leadId: string,
  payload: { quoteId: string; decision: "APPROVED" | "REJECTED"; note?: string }
) {
  return apiFetch<LeadQuoteItem>(`/api/leads/${leadId}/quotes`, {
    method: "PATCH",
    body: payload,
  });
}

export async function importLeadsBatchApi(payload: Record<string, unknown>) {
  return apiFetch<{ importedCount: number }>("/api/leads/import", {
    method: "POST",
    body: payload,
  });
}

export async function requestLeadAiAssistApi(payload: Record<string, unknown>) {
  return apiFetch<unknown>("/api/leads/ai-assist", {
    method: "POST",
    body: payload,
  });
}

export async function checkDuplicateLeadApi(params: {
  phone?: string;
  companyName?: string;
}) {
  const qs = new URLSearchParams();
  if (params.phone) qs.append("phone", params.phone);
  if (params.companyName) qs.append("companyName", params.companyName);
  return apiFetch<{ isDuplicate: boolean; matchedLeads?: Lead[] }>(
    `/api/leads/check-duplicate?${qs.toString()}`
  );
}

export async function fetchSalesUsersCached(ttlMs = 60_000) {
  return sharedGetJson("/api/users", ttlMs);
}
