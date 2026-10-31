import {
  getGeminiApiKey,
  getGeminiTextModel,
  getGeminiImageModel,
} from "@/src/core/env";

export type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
};

export type GeminiInteractionContent = {
  type?: string;
  text?: string;
  data?: string;
  mime_type?: string;
  mimeType?: string;
};

export function extractJsonObject(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const trimmed = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(trimmed.slice(first, last + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function getGeminiParts(payload: unknown): GeminiPart[] {
  if (!payload || typeof payload !== "object") return [];
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> })
    .candidates;
  return candidates?.[0]?.content?.parts || [];
}

export function getInteractionContent(payload: unknown): GeminiInteractionContent[] {
  if (!payload || typeof payload !== "object") return [];
  const steps = (
    payload as {
      steps?: Array<{ type?: string; content?: GeminiInteractionContent[] }>;
    }
  ).steps;
  return (
    steps
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content || []) || []
  );
}

export function getProviderError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const message = (payload as { error?: { message?: unknown } }).error?.message;
  return typeof message === "string" ? message : fallback;
}

export function getGeminiConfigStatus() {
  return {
    configured: Boolean(getGeminiApiKey()),
    textModel: getGeminiTextModel(),
    imageModel: getGeminiImageModel(),
  };
}

/**
 * Low-level JSON generation adapter used by M01 (01-leads)
 */
export async function callGeminiJson(
  prompt: string,
  timeoutMs = 5000
): Promise<{ data: Record<string, unknown> | null; modelUsed: string | null }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return { data: null, modelUsed: null };

  const primaryModel = getGeminiTextModel();
  const models = Array.from(new Set([primaryModel, "gemini-2.5-flash", "gemini-2.0-flash"]));

  for (const model of models) {
    try {
      const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          ...(model.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        }
      );

      if (!res.ok) continue;
      const payload = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text =
        payload.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "";
      const obj = extractJsonObject(text);
      if (obj) {
        return { data: obj, modelUsed: model };
      }
    } catch {
      // Fallback gracefully
    }
  }

  return { data: null, modelUsed: null };
}

/**
 * Low-level multimodal/text/image interaction adapter used by M05 (05-ai-design)
 */
export async function callGeminiMultimodal(options: {
  instruction: string;
  imageMode: boolean;
  inputImage?: { mimeType: string; data: string } | null;
  timeoutMs?: number;
}): Promise<{
  ok: boolean;
  text: string;
  imageDataUrl: string | null;
  usedModel: string;
  errorType?: "NOT_CONFIGURED" | "TIMEOUT" | "PROVIDER_ERROR";
  lastError?: string | null;
}> {
  const apiKey = getGeminiApiKey();
  const timeoutMs = options.timeoutMs ?? 90_000;
  const primaryModel = options.imageMode ? getGeminiImageModel() : getGeminiTextModel();

  if (!apiKey) {
    return {
      ok: false,
      text: "",
      imageDataUrl: null,
      usedModel: primaryModel,
      errorType: "NOT_CONFIGURED",
      lastError: "GEMINI_API_KEY not configured",
    };
  }

  const candidateModels = [
    primaryModel,
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
  ];

  let lastError: string | null = null;
  let payload: unknown = null;
  let usedModel = primaryModel;

  try {
    if (options.imageMode) {
      const input: Array<Record<string, string>> = [];
      if (options.inputImage) {
        input.push({
          type: "image",
          data: options.inputImage.data,
          mime_type: options.inputImage.mimeType,
        });
      }
      input.push({ type: "text", text: options.instruction });

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({ model: primaryModel, input }),
          signal: AbortSignal.timeout(timeoutMs),
        }
      );

      if (response.ok) {
        payload = await response.json();
      } else {
        const errBody: unknown = await response.json().catch(() => null);
        lastError = getProviderError(errBody, `HTTP ${response.status}`);
      }
    } else {
      const textParts = [{ text: options.instruction }];
      for (const model of candidateModels) {
        try {
          usedModel = model;
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({ contents: [{ parts: textParts }] }),
              signal: AbortSignal.timeout(timeoutMs),
            }
          );

          if (response.ok) {
            payload = await response.json();
            break;
          }

          const errBody: unknown = await response.json().catch(() => null);
          lastError = getProviderError(errBody, `HTTP ${response.status}`);
          console.warn(`Model ${model} failed with ${lastError}, trying next...`);
        } catch (error) {
          if (error instanceof Error && error.name === "TimeoutError") {
            throw error;
          }
          lastError = error instanceof Error ? error.message : "Connection error";
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        ok: false,
        text: "",
        imageDataUrl: null,
        usedModel,
        errorType: "TIMEOUT",
        lastError: "TimeoutError",
      };
    }
    return {
      ok: false,
      text: "",
      imageDataUrl: null,
      usedModel,
      errorType: "PROVIDER_ERROR",
      lastError: error instanceof Error ? error.message : "Connection error",
    };
  }

  if (!payload) {
    return {
      ok: false,
      text: "",
      imageDataUrl: null,
      usedModel,
      errorType: "PROVIDER_ERROR",
      lastError,
    };
  }

  const responseParts = options.imageMode
    ? getInteractionContent(payload).map((part) => ({
        text: part.text,
        inlineData:
          part.type === "image" && part.data
            ? { mimeType: part.mime_type || part.mimeType, data: part.data }
            : undefined,
      }))
    : getGeminiParts(payload);

  const text = responseParts
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n");
  const imagePart = responseParts.find(
    (part) => part.inlineData?.data && part.inlineData.mimeType
  );

  return {
    ok: true,
    text,
    imageDataUrl: imagePart?.inlineData
      ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
      : null,
    usedModel,
    lastError: null,
  };
}
