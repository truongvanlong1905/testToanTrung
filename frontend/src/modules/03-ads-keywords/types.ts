export interface CampaignItem {
  id: string;
  code: string;
  name: string;
  platform: string;
  status: string;
  budget: number;
  spent: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  platformConversions?: number;
  crmLeadsFromAds?: number;
  startDate?: string;
}

export interface KeywordItem {
  id: string;
  keyword: string;
  source: string;
  impressions: number;
  clicks: number;
  avgCpc: number;
  avgPosition: number;
  searchVolume?: number;
}

export interface AdsStatsSummary {
  totalBudget: number;
  totalSpent: number;
  totalClicks: number;
  totalImpressions: number;
  totalPlatformConversions?: number;
  totalCrmLeadsFromAds?: number;
  avgCtr: string;
  avgCpc: number;
}
