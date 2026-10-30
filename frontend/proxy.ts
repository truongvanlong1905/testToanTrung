import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenAtEdge } from '@/lib/auth-edge'
import { SESSION_COOKIE_NAME } from '@/lib/session-constants'

/** Các path KHÔNG yêu cầu đăng nhập */
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/register', '/api/health']

/** Các prefix tài nguyên tĩnh — đã loại bỏ /uploads để bắt buộc xác thực khi mở file đính kèm nội bộ */
const STATIC_PREFIXES = ['/_next', '/favicon.ico', '/robots.txt', '/sitemap.xml']

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bỏ qua tài nguyên tĩnh hệ thống
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    (pathname === "/api/admin/brand" && request.method === "GET") ||
    (pathname === "/api/tracking" && ["POST", "OPTIONS"].includes(request.method))

  // Nếu đang ở trang login nhưng đã đăng nhập → redirect về workspace
  if (pathname.startsWith('/login')) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
    if (token && await verifyTokenAtEdge(token)) {
      return applySecurityHeaders(NextResponse.redirect(new URL('/', request.url)))
    }
    return applySecurityHeaders(NextResponse.next())
  }

  // Các public path khác (ví dụ /api/auth/login)
  if (isPublic) {
    return applySecurityHeaders(NextResponse.next())
  }

  // Tất cả route còn lại (bao gồm /api/* và /uploads/*) yêu cầu xác thực
  let token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    const rawCookie = request.headers.get('cookie') || ''
    const match = rawCookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`))
    if (match) {
      token = decodeURIComponent(match[1])
    }
  }

  const user = token ? await verifyTokenAtEdge(token) : null

  if (!user) {
    if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/')) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Vui lòng đăng nhập để truy cập dữ liệu hoặc tài liệu nội bộ',
            },
          },
          { status: 401 }
        )
      )
    }

    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('returnTo', pathname)
    }
    return applySecurityHeaders(NextResponse.redirect(loginUrl))
  }

  return applySecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
