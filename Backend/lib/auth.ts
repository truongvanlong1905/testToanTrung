import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { UserSession } from "@/lib/auth-types";
import { SESSION_COOKIE_NAME, JWT_SECRET } from "@/lib/session-constants";

export { SESSION_COOKIE_NAME };
export type { UserSession };

/**
 * Tạo token JWT từ UserSession (thời hạn 7 ngày)
 */
export function signToken(payload: UserSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Lấy UserSession từ cookie (hoặc Authorization header fallback)
 */
export async function getCurrentUser(request?: Request): Promise<UserSession | null> {
  let token: string | undefined;

  // 1. Nếu có Request object, ưu tiên đọc từ Cookie
  if (request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    // Fallback: Authorization Bearer
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  }

  // 2. Không có token -> null
  if (!token) {
    return null;
  }

  // 3. Giải mã JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return decoded;
  } catch (error) {
    // Token hết hạn hoặc không hợp lệ
    return null;
  }
}

/**
 * Yêu cầu quyền đăng nhập + kiểm tra RBAC
 */
export async function requireAuth(
  request?: Request,
  allowedRoles?: UserSession["role"][]
): Promise<UserSession> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error("UNAUTHORIZED: Vui lòng đăng nhập để thực hiện thao tác");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN: Bạn không có quyền truy cập chức năng này");
  }

  return user;
}
