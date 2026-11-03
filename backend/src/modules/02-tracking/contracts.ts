import { z } from "zod";
import { getTrackingAllowedOrigins } from "@/src/core/env";

export const TrackingEventSchema = z.object({
  eventKey: z.string().trim().min(1).max(255).optional(),
  websiteSource: z.string().trim().min(1).max(255).optional(),
  source: z.string().trim().min(1).max(100).optional(),
  medium: z.string().trim().min(1).max(100).optional(),
  campaign: z.string().trim().max(255).nullable().optional(),
  landingPage: z.string().trim().min(1).max(2048).optional(),
  device: z.string().trim().max(100).optional(),
  location: z.string().trim().max(255).nullable().optional(),
  contactChannel: z.string().trim().max(100).nullable().optional(),
  utmParams: z.union([z.record(z.string(), z.string()), z.string()]).optional(),
  leadId: z.string().optional(),
});

export type TrackingEventInput = z.infer<typeof TrackingEventSchema>;

export const EXTERNAL_CONNECTOR_SPECS: Record<
  "GOOGLE_ADS" | "GA4" | "SEARCH_CONSOLE",
  {
    service: "GOOGLE_ADS" | "GA4" | "SEARCH_CONSOLE";
    label: string;
    requiredEnvKeys: string[];
  }
> = {
  GOOGLE_ADS: {
    service: "GOOGLE_ADS",
    label: "Google Ads API",
    requiredEnvKeys: [
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_CUSTOMER_ID",
      "GOOGLE_ADS_REFRESH_TOKEN",
    ],
  },
  GA4: {
    service: "GA4",
    label: "Google Analytics 4 (GA4)",
    requiredEnvKeys: ["GA4_PROPERTY_ID", "GOOGLE_APPLICATION_CREDENTIALS"],
  },
  SEARCH_CONSOLE: {
    service: "SEARCH_CONSOLE",
    label: "Google Search Console",
    requiredEnvKeys: ["SEARCH_CONSOLE_SITE_URL", "GOOGLE_APPLICATION_CREDENTIALS"],
  },
};

export type ExternalConnectorService = keyof typeof EXTERNAL_CONNECTOR_SPECS;

export function getExternalConnectorStatus(service: ExternalConnectorService) {
  const spec = EXTERNAL_CONNECTOR_SPECS[service];
  const missingEnvKeys = spec.requiredEnvKeys.filter((key) => !process.env[key]);
  const isConfigured = missingEnvKeys.length === 0;
  return {
    service: spec.service,
    label: spec.label,
    isConfigured,
    status: isConfigured ? "ERROR" : "NOT_CONFIGURED",
  };
}

export function resolveAllowedTrackingOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const origins = getTrackingAllowedOrigins();
  return origins.includes(origin) ? origin : null;
}
