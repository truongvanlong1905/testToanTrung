import { z } from "zod";
import { prisma } from "@/src/core/db/prisma";
import { isProduction } from "@/src/core/env";
import { AppError } from "@/src/core/http";
import {
  signToken,
  resolveActorAndDept,
  SESSION_COOKIE_NAME,
  UserSession,
} from "./auth";
import { authenticateUser } from "./authenticate-user";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  recordFailedLoginAttempt,
} from "./login-rate-limit";

const LoginSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const meProfileCache = new Map<string, { data: Record<string, unknown>; expiresAt: number }>();
const ME_CACHE_TTL_MS = 8_000;

export function invalidateMeProfileCache(userId?: string) {
  if (!userId) {
    meProfileCache.clear();
    return;
  }
  meProfileCache.delete(userId);
}

export function getSessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 3600,
  };
}

export function getClearSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  };
}

export async function loginUser(
  body: unknown,
  meta: { ip: string; userAgent?: string | null }
) {
  const ipRateCheck = checkLoginRateLimit(`ip:${meta.ip}`);
  if (!ipRateCheck.allowed) {
    throw new AppError(
      429,
      `Quá nhiều lần thử đăng nhập thất bại từ địa chỉ mạng này. Vui lòng thử lại sau ${ipRateCheck.waitMinutes} phút.`,
      "TOO_MANY_REQUESTS"
    );
  }

  const validation = LoginSchema.safeParse(body);
  if (!validation.success) {
    throw new AppError(
      400,
      validation.error.issues[0]?.message || "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const { email, password } = validation.data;
  const normalizedEmail = email.trim().toLowerCase();

  const emailRateCheck = checkLoginRateLimit(`email:${normalizedEmail}`);
  if (!emailRateCheck.allowed) {
    throw new AppError(
      429,
      `Tài khoản này đang tạm khóa bảo vệ do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${emailRateCheck.waitMinutes} phút.`,
      "TOO_MANY_REQUESTS"
    );
  }

  const user = await authenticateUser(normalizedEmail, password);
  if (!user) {
    recordFailedLoginAttempt(`ip:${meta.ip}`);
    recordFailedLoginAttempt(`email:${normalizedEmail}`);
    throw new AppError(
      401,
      "Email hoặc mật khẩu không chính xác (hoặc tài khoản đã bị vô hiệu hóa)",
      "INVALID_CREDENTIALS"
    );
  }

  clearLoginRateLimit(`ip:${meta.ip}`);
  clearLoginRateLimit(`email:${normalizedEmail}`);

  const userRecord = user as Record<string, unknown>;
  const resolved = resolveActorAndDept({
    role: user.role,
    actorType: typeof userRecord.actorType === "string" ? userRecord.actorType : undefined,
    department: typeof userRecord.department === "string" ? userRecord.department : undefined,
    position: typeof userRecord.position === "string" ? userRecord.position : undefined,
  });

  const sessionPayload: UserSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: resolved.effectiveRole,
    actorType: resolved.actorType,
    department: resolved.department,
    position: resolved.position,
    initials: user.initials,
  };

  const token = signToken(sessionPayload);

  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entity: "AUTH",
        entityId: user.id,
        ipAddress: meta.ip,
        userAgent: meta.userAgent || null,
      },
    });
  } catch (auditErr) {
    console.warn("Login audit log skipped:", auditErr);
  }

  return {
    token,
    cookieOptions: getSessionCookieOptions(token),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: resolved.effectiveRole,
      actorType: resolved.actorType,
      department: resolved.department,
      position: resolved.position,
      initials: user.initials,
      phone: user.phone,
    },
  };
}

export async function logoutUser(
  user: UserSession | null,
  meta: { ip: string; userAgent?: string | null }
) {
  if (user) {
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "LOGOUT",
        entity: "AUTH",
        entityId: user.userId,
        ipAddress: meta.ip,
        userAgent: meta.userAgent || null,
      },
    });
    invalidateMeProfileCache(user.userId);
  }

  return {
    cookieOptions: getClearSessionCookieOptions(),
  };
}

export async function getMeProfile(session: UserSession | null) {
  if (!session) {
    throw new AppError(
      401,
      "Chưa đăng nhập hoặc phiên làm việc đã hết hạn",
      "UNAUTHORIZED"
    );
  }

  const now = Date.now();
  const cached = meProfileCache.get(session.userId);
  if (cached && now < cached.expiresAt) {
    return { user: cached.data };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      actorType: true,
      department: true,
      position: true,
      appointedDecisionCode: true,
      initials: true,
      phone: true,
      avatar: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    meProfileCache.delete(session.userId);
    throw new AppError(
      401,
      "Tài khoản không tồn tại hoặc đã bị khóa",
      "USER_NOT_FOUND"
    );
  }

  const resolved = resolveActorAndDept(user);
  const payload = {
    ...user,
    role: resolved.effectiveRole,
    actorType: resolved.actorType,
    department: resolved.department,
    position: resolved.position,
  };

  meProfileCache.set(session.userId, {
    data: payload,
    expiresAt: now + ME_CACHE_TTL_MS,
  });

  return { user: payload };
}

export async function registerUser(
  _body: unknown,
  _meta: { ip: string; userAgent?: string | null }
): Promise<never> {
  throw new AppError(
    403,
    "Chức năng tự đăng ký tài khoản đã được khóa. Chỉ Quản trị viên (Admin) mới có quyền tạo và cấp tài khoản nhân sự.",
    "PUBLIC_REGISTRATION_DISABLED"
  );
}
