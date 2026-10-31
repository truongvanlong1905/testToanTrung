"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchCampaignsAndKeywordsApi } from "../api";
import type { AdsStatsSummary, CampaignItem, KeywordItem } from "../types";

export function useAdsModule() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [summary, setSummary] = useState<AdsStatsSummary>({
    totalBudget: 0,
    totalSpent: 0,
    totalClicks: 0,
    totalImpressions: 0,
    avgCtr: "0.00",
    avgCpc: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");

  const fetchAdsData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ok, envelope } = await fetchCampaignsAndKeywordsApi();
      if (!ok || !envelope.data) {
        throw new Error(
          envelope.error?.message ||
            "Không thể tải dữ liệu chiến dịch & từ khóa từ máy chủ."
        );
      }
      setCampaigns(envelope.data.campaigns || []);
      setKeywords(envelope.data.keywords || []);
      if (envelope.data.summary) setSummary(envelope.data.summary);
      setHasLoaded(true);
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Không thể kết nối dữ liệu Quảng cáo. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAdsData();
  }, [fetchAdsData]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchPlatform =
        platformFilter === "all" || c.platform === platformFilter;
      const matchText =
        !searchText ||
        c.name.toLowerCase().includes(searchText.toLowerCase()) ||
        c.code.toLowerCase().includes(searchText.toLowerCase());
      return matchPlatform && matchText;
    });
  }, [campaigns, platformFilter, searchText]);

  const filteredKeywords = useMemo(() => {
    return keywords.filter((k) => {
      if (!searchText) return true;
      return k.keyword.toLowerCase().includes(searchText.toLowerCase());
    });
  }, [keywords, searchText]);

  return {
    campaigns,
    keywords,
    summary,
    isLoading,
    hasLoaded,
    loadError,
    searchText,
    setSearchText,
    platformFilter,
    setPlatformFilter,
    filteredCampaigns,
    filteredKeywords,
    fetchAdsData,
  };
}
