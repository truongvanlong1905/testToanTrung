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
}

const inflight = new Map<string, Promise<SharedResult>>();

export async function sharedGetJson(url: string): Promise<{
  ok: boolean;
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}> {
  let pending = inflight.get(url);
  if (!pending) {
    pending = fetch(url, { credentials: "same-origin" })
      .then(async (res) => ({ ok: res.ok, status: res.status, text: await res.text() }))
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

