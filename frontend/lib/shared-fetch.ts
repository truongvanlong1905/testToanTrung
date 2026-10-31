/**
 * De-duplicates identical GET requests that are in flight at the same time
 * (e.g. Header notifications and the Dashboard both asking for /api/reports on first load).
 *
 * - Only shares a request while it is still pending; nothing is cached afterwards, so data is never stale
 *   and per-account scoping/permissions are always evaluated by the server.
 * - Every caller receives its own parsed copy of the JSON body.
 */
interface SharedResult {
  ok: boolean;
  status: number;
  text: string;
  timestamp: number;
}

const inflight = new Map<string, Promise<SharedResult>>();
const responseCache = new Map<string, SharedResult>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function peekSharedJson(url: string, maxAgeMs = 60_000): any | null {
  const cached = responseCache.get(url);
  if (!cached || !cached.ok) return null;
  if (Date.now() - cached.timestamp > maxAgeMs) return null;
  try {
    return JSON.parse(cached.text);
  } catch {
    return null;
  }
}

export function invalidateSharedJson(urlPrefix?: string): void {
  if (!urlPrefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(urlPrefix)) {
      responseCache.delete(key);
    }
  }
}

export async function sharedGetJson(
  url: string,
  ttlMs = 0
): Promise<{
  ok: boolean;
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}> {
  if (ttlMs > 0) {
    const cached = responseCache.get(url);
    if (cached && Date.now() - cached.timestamp <= ttlMs) {
      let payload = null;
      try {
        payload = JSON.parse(cached.text);
      } catch {
        payload = { success: false, error: { message: "Phản hồi không hợp lệ từ máy chủ" } };
      }
      return { ok: cached.ok, status: cached.status, payload };
    }
  }

  let pending = inflight.get(url);
  if (!pending) {
    pending = fetch(url, { credentials: "same-origin" })
      .then(async (res) => {
        const entry: SharedResult = {
          ok: res.ok,
          status: res.status,
          text: await res.text(),
          timestamp: Date.now(),
        };
        if (res.ok) {
          responseCache.set(url, entry);
        }
        return entry;
      })
      .finally(() => {
        inflight.delete(url);
      });
    inflight.set(url, pending);
  }
  const result = await pending;
  let payload = null;
  try {
    payload = JSON.parse(result.text);
  } catch {
    payload = { success: false, error: { message: "Phản hồi không hợp lệ từ máy chủ" } };
  }
  return { ok: result.ok, status: result.status, payload };
}

