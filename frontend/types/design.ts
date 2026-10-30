export type DesignMode = "banner" | "video" | "mockup";

export type AiConfigStatus = "checking" | "ready" | "missing" | "unavailable";

export interface AiModelConfig {
  textModel: string;
  imageModel: string;
}

