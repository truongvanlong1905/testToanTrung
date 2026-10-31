export type DesignMode = "banner" | "video" | "mockup";

export type AiConfigStatus = "checking" | "ready" | "missing" | "unavailable";

export interface AiModelConfig {
  textModel: string;
  imageModel: string;
}

export interface DesignJobItem {
  id: string;
  mode: DesignMode;
  modeLabel: string;
  promptSummary: string;
  specLabel: string;
  status: "processing" | "completed" | "failed";
  createdAt: string;
  imageDataUrl?: string | null;
  sourcePreviewUrl?: string | null;
  storyboards?: string[];
  modelUsed?: string;
  errorMessage?: string;
}
