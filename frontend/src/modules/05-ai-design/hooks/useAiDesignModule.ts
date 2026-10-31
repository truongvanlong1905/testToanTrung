"use client";

import { useCallback, useEffect, useState } from "react";
import { checkAiDesignConfigApi } from "../api";
import type {
  AiConfigStatus,
  AiModelConfig,
  DesignJobItem,
  DesignMode,
} from "../types";

export function useAiDesignModule() {
  const [activeTab, setActiveTab] = useState<DesignMode>("banner");
  const [aiConfigStatus, setAiConfigStatus] =
    useState<AiConfigStatus>("checking");
  const [aiModels, setAiModels] = useState<AiModelConfig | null>(null);
  const [recentJobs, setRecentJobs] = useState<DesignJobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    checkAiDesignConfigApi()
      .then(({ ok, envelope }) => {
        if (!ok || !envelope.data) {
          throw new Error(
            envelope.error?.message || "Không kiểm tra được cấu hình AI"
          );
        }
        if (!active) return;
        setAiConfigStatus(envelope.data.configured ? "ready" : "missing");
        setAiModels({
          textModel: envelope.data.textModel,
          imageModel: envelope.data.imageModel,
        });
      })
      .catch(() => {
        if (active) setAiConfigStatus("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  const upsertJob = useCallback((job: DesignJobItem) => {
    setRecentJobs((prev) => {
      const idx = prev.findIndex((item) => item.id === job.id);
      if (idx === -1) return [job, ...prev];
      const next = [...prev];
      next[idx] = job;
      return next;
    });
  }, []);

  return {
    activeTab,
    setActiveTab,
    aiConfigStatus,
    aiModels,
    recentJobs,
    setRecentJobs,
    selectedJobId,
    setSelectedJobId,
    upsertJob,
  };
}
