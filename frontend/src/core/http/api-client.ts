import { invalidateSharedJson, peekSharedJson, sharedGetJson } from "./shared-fetch";

export interface ApiErrorPayload {
  code?: string;
  message: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<{
  ok: boolean;
  status: number;
  envelope: ApiEnvelope<T>;
}> {
  const { body, headers, signal, ...rest } = options;
  const resolvedHeaders = new Headers(headers);
  let serializedBody: BodyInit | undefined;

  if (body !== undefined) {
    if (
      typeof body === "string" ||
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof Blob
    ) {
      serializedBody = body;
    } else {
      if (!resolvedHeaders.has("Content-Type")) {
        resolvedHeaders.set("Content-Type", "application/json");
      }
      serializedBody = JSON.stringify(body);
    }
  }

  const res = await fetch(url, {
    credentials: "same-origin",
    ...rest,
    headers: resolvedHeaders,
    body: serializedBody,
    signal,
  });

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    envelope = {
      success: false,
      error: { message: "Phản hồi không hợp lệ từ máy chủ" },
    };
  }

  return {
    ok: res.ok && Boolean(envelope?.success),
    status: res.status,
    envelope,
  };
}

export { invalidateSharedJson, peekSharedJson, sharedGetJson };
