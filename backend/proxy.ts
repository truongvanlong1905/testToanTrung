import { NextRequest, NextResponse } from "next/server";
import { verifyTokenAtEdge } from "@/src/core/auth/auth-edge";
import { SESSION_COOKIE_NAME } from "@/src/core/auth/session-constants";

/** Các path KHÔNG yêu cầu đăng nhập */
const PUBLIC_PATHS = ["/api/auth/login", "/api/auth/register", "/api/health"];

/** Các prefix tài nguyên tĩnh — luôn bỏ qua (đã loại bỏ /uploads để bắt buộc xác thực JWT cho tệp đính kèm nội bộ) */
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    (pathname === "/api/admin/brand" && request.method === "GET") ||
    (pathname === "/api/tracking" && ["POST", "OPTIONS"].includes(request.method));

  if (isPublic) {
    return applySecurityHeaders(NextResponse.next());
  }

  let token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    const rawCookie = request.headers.get("cookie") || "";
    const match = rawCookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
    if (match) {
      token = decodeURIComponent(match[1]);
    }
  }

  const user = token ? await verifyTokenAtEdge(token) : null;

  if (!user) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Vui lòng đăng nhập để thực hiện thao tác này",
          },
        },
        { status: 401 }
      )
    );
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
