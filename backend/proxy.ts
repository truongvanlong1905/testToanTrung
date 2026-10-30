import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenAtEdge } from '@/lib/auth-edge'
import { SESSION_COOKIE_NAME } from '@/lib/session-constants'

/** Các path KHÔNG yêu cầu đăng nhập */
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register', '/api/health']

/** Các prefix tài nguyên tĩnh — luôn bỏ qua */
const STATIC_PREFIXES = ['/_next', '/uploads', '/favicon.ico', '/robots.txt', '/sitemap.xml']

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bỏ qua tài nguyên tĩnh
  if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    (pathname === "/api/admin/brand" && request.method === "GET") ||
    (pathname === "/api/tracking" && ["POST", "OPTIONS"].includes(request.method))

  if (isPublic) {
    return applySecurityHeaders(NextResponse.next())
  }

  // Tất cả route còn lại yêu cầu xác thực
  let token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  // Nếu không có trong request.cookies, thử parse từ raw header cookie
  if (!token) {
    const rawCookie = request.headers.get('cookie') || ''
    const match = rawCookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`))
    if (match) {
      token = decodeURIComponent(match[1])
    }
  }

  const user = token ? await verifyTokenAtEdge(token) : null

  if (!user) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Vui lòng đăng nhập để thực hiện thao tác này',
          },
        },
        { status: 401 }
      )
    )
  }

  return applySecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: [
    /*
     * Match tất cả request path NGOẠI TRỪ:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
