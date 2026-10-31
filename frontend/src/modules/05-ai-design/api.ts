import { apiFetch } from "@/src/core/http/api-client";
import type { AiModelConfig } from "./types";

export interface AiDesignStatusPayload extends AiModelConfig {
  configured: boolean;
}

export async function checkAiDesignConfigApi(signal?: AbortSignal) {
  return apiFetch<AiDesignStatusPayload>("/api/ai/design", { signal });
}

export async function requestAiDesignGenerationApi(
  formData: FormData,
  signal?: AbortSignal
) {
  return apiFetch<{
    text: string;
    imageDataUrl: string | null;
    model: string;
  }>("/api/ai/design", {
    method: "POST",
    body: formData,
    signal,
  });
}
