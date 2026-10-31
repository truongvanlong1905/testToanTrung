"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchTrackingDataApi, triggerTrackingSyncApi } from "../api";
import type { SyncJobItem, TrackingEventItem } from "../types";

export function useTrackingModule() {
  const [events, setEvents] = useState<TrackingEventItem[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJobItem[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncingService, setSyncingService] = useState<string | null>(null);

  const fetchTrackingData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ok, envelope } = await fetchTrackingDataApi();
      if (!ok || !envelope.data) {
        throw new Error(
          envelope.error?.message || "Không thể tải dữ liệu Tracking từ máy chủ."
        );
      }
      setEvents(envelope.data.events || []);
      setSyncJobs(envelope.data.syncJobs || []);
      setTotalEvents(
        envelope.data.stats?.totalEvents || (envelope.data.events || []).length
      );
      setHasLoaded(true);
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Không thể kết nối dữ liệu Tracking. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTrackingData();
  }, [fetchTrackingData]);

  const triggerSync = useCallback(
    async (service: string) => {
      try {
        setSyncingService(service);
        const { ok, envelope } = await triggerTrackingSyncApi(service);
        if (!ok) {
          throw new Error(envelope.error?.message || "Đồng bộ thất bại");
        }
        await fetchTrackingData();
        return envelope;
      } finally {
        setSyncingService(null);
      }
    },
    [fetchTrackingData]
  );

  return {
    events,
    syncJobs,
    totalEvents,
    isLoading,
    hasLoaded,
    loadError,
    syncingService,
    fetchTrackingData,
    triggerSync,
  };
}
