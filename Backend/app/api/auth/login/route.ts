import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, SESSION_COOKIE_NAME, UserSession } from "@/lib/auth";
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
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rateCheck = checkLoginRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: `Quá nhiều lần thử đăng nhập thất bại. Vui lòng thử lại sau ${rateCheck.waitMinutes} phút.`,
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

    const user = await authenticateUser(email, password);
    if (!user) {
      recordFailedLoginAttempt(ip);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email hoặc mật khẩu không chính xác",
          },
        },
        { status: 401 }
      );
    }

    // Đăng nhập thành công -> clear rate limit
    clearLoginRateLimit(ip);

    // Tạo JWT Session
    const sessionPayload: UserSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "ADMIN" | "SALES" | "MARKETING" | "DESIGN",
      initials: user.initials,
    };

    const token = signToken(sessionPayload);

    // Ghi AuditLog
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entity: "AUTH",
        entityId: user.id,
        ipAddress: req.headers.get("x-forwarded-for") || "localhost",
        userAgent: req.headers.get("user-agent"),
      },
    });

    // Trả response và set HttpOnly Cookie
    const response = NextResponse.json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
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
      maxAge: 7 * 24 * 3600, // 7 ngày
    });

    return response;
  } catch (error: any) {
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
