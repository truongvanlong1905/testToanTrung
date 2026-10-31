"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchPromotionsApi, fetchReportsApi, markReportReadApi } from "../api";
import type { PromotionItem, ReportItem } from "../types";

export function useReportsModule() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [hasLoadedReports, setHasLoadedReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setIsLoadingReports(true);
      const { ok, envelope } = await fetchReportsApi();
      if (!ok || !Array.isArray(envelope.data)) {
        throw new Error(
          envelope.error?.message || "Không thể tải danh sách báo cáo."
        );
      }
      setReports(envelope.data);
      setHasLoadedReports(true);
      setReportsError(null);
    } catch (error) {
      setReportsError(
        error instanceof Error
          ? error.message
          : "Không thể kết nối dữ liệu Báo cáo. Vui lòng thử lại."
      );
    } finally {
      setIsLoadingReports(false);
    }
  }, []);

  const fetchPromotions = useCallback(async () => {
    const { ok, envelope } = await fetchPromotionsApi();
    if (ok && Array.isArray(envelope.data)) {
      setPromotions(envelope.data);
    }
  }, []);

  const markReportAsRead = useCallback(async (reportId: string) => {
    await markReportReadApi(reportId);
    setReports((prev) =>
      prev.map((item) =>
        item.id === reportId ? { ...item, isRead: true } : item
      )
    );
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  return {
    reports,
    setReports,
    promotions,
    isLoadingReports,
    hasLoadedReports,
    reportsError,
    fetchReports,
    fetchPromotions,
    markReportAsRead,
  };
}
