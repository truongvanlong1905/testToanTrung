import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { UserSession, SystemActorType, LegacyRoleType } from "@/lib/auth-types";
import { SESSION_COOKIE_NAME, JWT_SECRET } from "@/lib/session-constants";

export { SESSION_COOKIE_NAME };
export type { UserSession, SystemActorType, LegacyRoleType };

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
 * và đối chiếu trực tiếp với Database để thu hồi phiên tức thì nếu tài khoản bị khóa.
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

    // Kiểm tra trạng thái thực tế trong DB để chống dùng lại token cũ khi tài khoản đã khóa hoặc đổi quyền
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!dbUser || !dbUser.isActive) {
      return null;
    }

    const dbUserRecord = dbUser as Record<string, unknown>;
    const resolved = resolveActorAndDept({
      role: dbUser.role,
      actorType: typeof dbUserRecord.actorType === "string" ? dbUserRecord.actorType : undefined,
      department: typeof dbUserRecord.department === "string" ? dbUserRecord.department : undefined,
      position: typeof dbUserRecord.position === "string" ? dbUserRecord.position : undefined,
    });

    return {
      userId: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: resolved.effectiveRole,
      actorType: resolved.actorType,
      department: resolved.department,
      position: resolved.position,
      initials: dbUser.initials,
    };
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
