import { apiFetch } from "@/src/core/http/api-client";
import type { SyncJobItem, TrackingEventItem, TrackingOverviewData } from "./types";

export async function fetchTrackingDataApi(signal?: AbortSignal) {
  return apiFetch<TrackingOverviewData>("/api/tracking", { signal });
}

export async function triggerTrackingSyncApi(service: string) {
  return apiFetch<{ job?: SyncJobItem; message?: string }>("/api/tracking/sync", {
    method: "POST",
    body: { service },
  });
}

export async function createTrackingEventApi(payload: Partial<TrackingEventItem>) {
  return apiFetch<TrackingEventItem>("/api/tracking", {
    method: "POST",
    body: payload,
  });
}
