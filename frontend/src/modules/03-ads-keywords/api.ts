import { apiFetch } from "@/src/core/http/api-client";
import type { AdsStatsSummary, CampaignItem, KeywordItem } from "./types";

export interface CampaignsOverviewData {
  campaigns: CampaignItem[];
  keywords: KeywordItem[];
  summary: AdsStatsSummary;
}

export async function fetchCampaignsAndKeywordsApi(signal?: AbortSignal) {
  return apiFetch<CampaignsOverviewData>("/api/campaigns", { signal });
}

export async function createCampaignApi(payload: {
  name: string;
  platform: string;
  budget: number;
  spent?: number;
  status?: string;
}) {
  return apiFetch<CampaignItem>("/api/campaigns", {
    method: "POST",
    body: payload,
  });
}
