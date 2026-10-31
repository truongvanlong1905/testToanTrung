const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "currentpassword",
  "newpassword",
  "token",
  "cookie",
  "apikey",
  "secret",
  "authorization",
  "gemini_api_key",
  "session_secret",
  "jwt_secret",
]);

export function redactSensitiveData(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item));
  }
  if (typeof input === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        redacted[key] = "[REDACTED]";
      } else {
        redacted[key] = redactSensitiveData(value);
      }
    }
    return redacted;
  }
  return input;
}

export interface LogEntry {
  timestamp?: string;
  requestId?: string;
  moduleId?: string;
  action: string;
  durationMs?: number;
  status?: number | string;
  errorCode?: string | null;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface Logger {
  moduleId: string;
  info(entry: LogEntry): void;
  warn(entry: LogEntry): void;
  error(entry: LogEntry): void;
}

export function createLogger(moduleId: string): Logger {
  const formatEntry = (level: "INFO" | "WARN" | "ERROR", entry: LogEntry) => {
    return JSON.stringify({
      level,
      timestamp: entry.timestamp || new Date().toISOString(),
      requestId: entry.requestId || "system",
      moduleId: entry.moduleId || moduleId,
      action: entry.action,
      durationMs: entry.durationMs ?? 0,
      status: entry.status ?? 200,
      errorCode: entry.errorCode ?? null,
      message: entry.message || entry.action,
      meta: entry.meta ? (redactSensitiveData(entry.meta) as Record<string, unknown>) : undefined,
    });
  };

  return {
    moduleId,
    info(entry: LogEntry) {
      console.info(formatEntry("INFO", entry));
    },
    warn(entry: LogEntry) {
      console.warn(formatEntry("WARN", entry));
    },
    error(entry: LogEntry) {
      console.error(formatEntry("ERROR", entry));
    },
  };
}
