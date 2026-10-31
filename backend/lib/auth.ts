import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { UserSession, SystemActorType, LegacyRoleType } from "@/lib/auth-types";
import { SESSION_COOKIE_NAME, JWT_SECRET } from "@/lib/session-constants";

export { SESSION_COOKIE_NAME };
export type { UserSession, SystemActorType, LegacyRoleType };

const SESSION_CACHE_TTL_MS = 10_000;
const sessionCache = new Map<string, { session: UserSession; expiresAt: number }>();

export function invalidateUserSessionCache(userId?: string): void {
  if (!userId) {
    sessionCache.clear();
    return;
  }
  sessionCache.delete(userId);
}

/**
 * Chuẩn hóa role/actorType theo mô hình 3 tác nhân ATTT:
 * - ADMIN (Quản trị hệ thống)
 * - DIRECTOR (Giám đốc)
 * - USER (Nhân sự thuộc các phòng ban do Admin tạo: SALES, MARKETING, DESIGN, ADS, ...)
 */
export function resolveActorAndDept(input: {
  role?: string | null;
  actorType?: string | null;
  department?: string | null;
  position?: string | null;
}): {
  actorType: SystemActorType;
  department: string;
  position: string;
  effectiveRole: LegacyRoleType;
} {
  const rawRole = (input.role || "SALES").toUpperCase();
  const rawActor = (input.actorType || "").toUpperCase();

  let actorType: SystemActorType = "USER";
  if (rawActor === "ADMIN" || rawRole === "ADMIN") {
    actorType = "ADMIN";
  } else if (rawActor === "DIRECTOR" || rawRole === "DIRECTOR") {
    actorType = "DIRECTOR";
  }

  const department =
    input.department?.trim().toUpperCase() ||
    (actorType === "ADMIN"
      ? "ADMIN_SYS"
      : actorType === "DIRECTOR"
        ? "BOARD"
        : ["SALES", "MARKETING", "DESIGN", "ADS"].includes(rawRole)
          ? rawRole
          : "SALES");

  const position =
    input.position?.trim() ||
    (actorType === "ADMIN"
      ? "Quản trị hệ thống"
      : actorType === "DIRECTOR"
        ? "Giám đốc"
        : "Nhân viên");

  let effectiveRole: LegacyRoleType = "SALES";
  if (actorType === "ADMIN") {
    effectiveRole = "ADMIN";
  } else if (actorType === "DIRECTOR") {
    effectiveRole = "DIRECTOR";
  } else if (["SALES", "MARKETING", "DESIGN", "ADS"].includes(department)) {
    effectiveRole = department as LegacyRoleType;
  } else if (["SALES", "MARKETING", "DESIGN", "ADS"].includes(rawRole)) {
    effectiveRole = rawRole as LegacyRoleType;
  }

  return { actorType, department, position, effectiveRole };
}

export function isManagerialPosition(position?: string | null): boolean {
  if (!position) return false;
  const normalized = position.trim().toLowerCase();
  return (
    normalized.includes("trưởng phòng") ||
    normalized.includes("trưởng ban") ||
    normalized.includes("phó phòng") ||
    normalized.includes("trưởng nhóm") ||
    normalized.includes("giám đốc") ||
    normalized.includes("quản trị")
  );
}

export function canAccessAllLeads(user: UserSession): boolean {
  return (
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR" ||
    user.role === "ADMIN" ||
    user.role === "DIRECTOR" ||
    isManagerialPosition(user.position)
  );
}

/**
 * Tạo token JWT từ UserSession (thời hạn 7 ngày)
 */
export function signToken(payload: UserSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Lấy UserSession từ cookie (hoặc Authorization header fallback)
 * Sử dụng bộ nhớ đệm ngắn hạn (10s) kết hợp truy vấn cột tối giản để giảm độ trễ API xuống < 1ms.
 */
export async function getCurrentUser(request?: Request): Promise<UserSession | null> {
  let token: string | undefined;

  if (request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]*)`));
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  }

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    if (!decoded?.userId) return null;

    const now = Date.now();
    const cached = sessionCache.get(decoded.userId);
    if (cached && now < cached.expiresAt) {
      return cached.session;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        actorType: true,
        department: true,
        position: true,
        initials: true,
        isActive: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      sessionCache.delete(decoded.userId);
      return null;
    }

    const resolved = resolveActorAndDept({
      role: dbUser.role,
      actorType: dbUser.actorType,
      department: dbUser.department,
      position: dbUser.position,
    });

    const session: UserSession = {
      userId: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: resolved.effectiveRole,
      actorType: resolved.actorType,
      department: resolved.department,
      position: resolved.position,
      initials: dbUser.initials,
    };

    sessionCache.set(decoded.userId, {
      session,
      expiresAt: now + SESSION_CACHE_TTL_MS,
    });

    return session;
  } catch {
    return null;
  }
}

export function unauthorizedResponse(message = "Vui lòng đăng nhập để thực hiện thao tác này") {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message,
      },
    },
    { status: 401 }
  );
}

export function forbiddenResponse(message = "Bạn không có quyền truy cập chức năng này") {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "FORBIDDEN",
        message,
      },
    },
    { status: 403 }
  );
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
