import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkLoginRateLimit, recordFailedLoginAttempt } from "@/backend/services/auth/login-rate-limit";

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
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateCheck = checkLoginRateLimit(`register:${ip}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: `Bạn đã gửi quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau ${rateCheck.waitMinutes} phút.`,
          },
        },
        { status: 429 }
      );
    }

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

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      recordFailedLoginAttempt(`register:${ip}`);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_EXISTS",
            message: "Địa chỉ Email này đã được đăng ký. Vui lòng đăng nhập hoặc liên hệ Admin.",
          },
        },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const words = name.trim().split(/\s+/).filter(Boolean);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase() || "TT";

    // Bảo mật ATTT: Tài khoản tự đăng ký luôn thuộc Tác nhân USER, cấp Nhân viên và ở trạng thái CHỜ ADMIN DUYỆT (isActive: false)
    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        phone: phone || null,
        role,
        actorType: "USER",
        department: role,
        position: "Nhân viên",
        initials,
        address: address || null,
        hometown: hometown || null,
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        actorType: true,
        department: true,
        position: true,
        initials: true,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: newUser.id,
        action: "REGISTER_PENDING_APPROVAL",
        entity: "AUTH",
        entityId: newUser.id,
        details: JSON.stringify({
          email: newUser.email,
          actorType: "USER",
          department: newUser.department,
          isActive: false,
        }),
        ipAddress: ip,
        userAgent: req.headers.get("user-agent"),
      },
    });

    return NextResponse.json(
      {
        success: true,
        pendingApproval: true,
        message:
          "Đã gửi yêu cầu đăng ký tài khoản USER thành công! Vui lòng liên hệ Quản trị viên (ADMIN) để kích hoạt tài khoản và phân quyền phòng ban trước khi đăng nhập.",
        data: { user: newUser },
      },
      { status: 201 }
    );
  } catch (error) {
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
