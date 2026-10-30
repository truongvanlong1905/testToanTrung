import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, SESSION_COOKIE_NAME, UserSession } from "@/lib/auth";

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Họ và tên phải có ít nhất 2 ký tự").max(100),
  email: z.string().trim().email("Địa chỉ Email / Gmail không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự").max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  role: z.enum(["SALES", "MARKETING", "DESIGN", "ADS"]).default("SALES"),
  address: z.string().trim().max(300).optional().nullable(),
  hometown: z.string().trim().max(200).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = RegisterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.issues[0]?.message || "Thông tin đăng ký không hợp lệ",
          },
        },
        { status: 400 }
      );
    }

    const { name, email, password, phone, role, address, hometown } = validation.data;
    const normalizedEmail = email.toLowerCase();

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "Địa chỉ Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.",
          },
        },
        { status: 400 }
      );
    }

    // Mã hóa mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo chữ viết tắt (initials)
    const words = name.trim().split(/\s+/).filter(Boolean);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase() || "TT";

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        phone: phone || null,
        role,
        initials,
        address: address || null,
        hometown: hometown || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        initials: true,
        phone: true,
        address: true,
        hometown: true,
      },
    });

    // Ghi nhận AuditLog
    await prisma.auditLog.create({
      data: {
        userId: newUser.id,
        action: "REGISTER",
        entity: "AUTH",
        entityId: newUser.id,
        details: JSON.stringify({ email: newUser.email, role: newUser.role }),
        ipAddress: req.headers.get("x-forwarded-for") || "localhost",
        userAgent: req.headers.get("user-agent"),
      },
    });

    // Tự động đăng nhập sau khi đăng ký thành công
    const sessionPayload: UserSession = {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role as UserSession["role"],
      initials: newUser.initials,
    };

    const token = signToken(sessionPayload);

    const response = NextResponse.json(
      {
        success: true,
        message: "Đăng ký tài khoản thành công!",
        data: { user: newUser },
      },
      { status: 201 }
    );

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
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Lỗi xử lý đăng ký tài khoản từ máy chủ",
        },
      },
      { status: 500 }
    );
  }
}

