export interface TrackingEventItem {
  id: string;
  leadId?: string | null;
  websiteSource: string;
  source: string;
  medium: string;
  campaign?: string | null;
  landingPage: string;
  utmParams?: string | null;
  device?: string | null;
  ipAddress?: string | null;
  location?: string | null;
  createdAt: string;
}

export interface SyncJobItem {
  id: string;
  service: "GOOGLE_ADS" | "GA4" | "SEARCH_CONSOLE" | string;
  status: string;
  lastSyncTime?: string | null;
  recordsSynced: number;
  errorMessage?: string | null;
  createdAt: string;
}

