const DEFAULT_UPLOAD_MAX_BYTES = 15 * 1024 * 1024; // 15MB

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function getGeminiTextModel(): string {
  return process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-2.5-flash";
}

export function getGeminiImageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-nano-banana-2.1";
}

export function getSessionSecret(): string {
  const configuredJwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!configuredJwtSecret || configuredJwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return configuredJwtSecret;
}

export function getUploadMaxBytes(): number {
  const raw = process.env.UPLOAD_MAX_BYTES;
  if (!raw) return DEFAULT_UPLOAD_MAX_BYTES;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_UPLOAD_MAX_BYTES;
}

export function getTrackingAllowedOrigins(): string[] {
  const configuredOrigins = process.env.TRACKING_ALLOWED_ORIGINS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = configuredOrigins?.length
    ? [...configuredOrigins]
    : ["https://toantrungtelecom.com", "https://ledtoantrung.vn"];
  if (!isProduction() && !origins.includes("http://localhost:3001")) {
    origins.push("http://localhost:3001");
  }
  return origins;
}
