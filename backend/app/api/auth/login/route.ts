import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, resolveActorAndDept, SESSION_COOKIE_NAME, UserSession } from "@/lib/auth";
import { authenticateUser } from "@/backend/services/auth/authenticate-user";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  recordFailedLoginAttempt,
} from "@/backend/services/auth/login-rate-limit";

const LoginSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const ipRateCheck = checkLoginRateLimit(`ip:${ip}`);
    if (!ipRateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: `Quá nhiều lần thử đăng nhập thất bại từ địa chỉ mạng này. Vui lòng thử lại sau ${ipRateCheck.waitMinutes} phút.`,
          },
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validation = LoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.issues[0]?.message || "Dữ liệu không hợp lệ",
          },
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.trim().toLowerCase();

    // Chống Brute-Force theo cả địa chỉ Email (ngăn kẻ tấn công đổi IP liên tục để dò mật khẩu Admin)
    const emailRateCheck = checkLoginRateLimit(`email:${normalizedEmail}`);
    if (!emailRateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: `Tài khoản này đang tạm khóa bảo vệ do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${emailRateCheck.waitMinutes} phút.`,
          },
        },
        { status: 429 }
      );
    }

    const user = await authenticateUser(normalizedEmail, password);
    if (!user) {
      recordFailedLoginAttempt(`ip:${ip}`);
      recordFailedLoginAttempt(`email:${normalizedEmail}`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email hoặc mật khẩu không chính xác (hoặc tài khoản chưa được Admin kích hoạt)",
          },
        },
        { status: 401 }
      );
    }

    clearLoginRateLimit(`ip:${ip}`);
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
          ipAddress: ip,
          userAgent: req.headers.get("user-agent"),
        },
      });
    } catch (auditErr) {
      console.warn("Login audit log skipped:", auditErr);
    }

    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
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
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi xử lý đăng nhập từ máy chủ",
        },
      },
      { status: 500 }
    );
  }
}
