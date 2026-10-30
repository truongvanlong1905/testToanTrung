import type { UserSession } from "@/lib/auth-types";
import { JWT_SECRET } from "@/lib/session-constants";

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes.buffer;
}

export async function verifyTokenAtEdge(token: string): Promise<UserSession | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) return null;

    const [header, payload, signature] = parts;
    const jwtHeader = JSON.parse(new TextDecoder().decode(decodeBase64Url(header)));
    if (jwtHeader.alg !== "HS256") return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signature),
      new TextEncoder().encode(`${header}.${payload}`)
    );
    if (!valid) return null;

    const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
    const now = Date.now() / 1000;
    if (typeof session.exp !== "number" || session.exp <= now) return null;
    if (session.nbf !== undefined && (typeof session.nbf !== "number" || session.nbf > now)) return null;
    if (typeof session.userId !== "string" || typeof session.email !== "string") return null;
    return session as UserSession;
  } catch {
    return null;
  }
}
