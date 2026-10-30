import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, signToken, SESSION_COOKIE_NAME, UserSession } from "@/lib/auth";

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, "Họ và tên tối thiểu 2 ký tự").max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email("Email / Gmail không hợp lệ"),
  address: z.string().trim().max(300).optional().nullable(),
  hometown: z.string().trim().max(200).optional().nullable(),
  avatar: z.string().trim().optional().nullable(),
  achievements: z.string().trim().max(5000).optional().nullable(),
  currentPassword: z.string().optional().nullable(),
  newPassword: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập" } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        initials: true,
        avatar: true,
        address: true,
        hometown: true,
        achievements: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error: any) {
    console.error("GET /api/users/profile error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi tải thông tin hồ sơ" } },
      { status: 500 }
    );
  }
}

async function handleUpdateProfile(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Thông tin không hợp lệ" },
        },
        { status: 400 }
      );
    }

    const { name, phone, email, address, hometown, avatar, achievements, currentPassword, newPassword } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy người dùng" } },
        { status: 404 }
      );
    }

    // Kiểm tra xem email mới có bị trùng với tài khoản khác không
    if (normalizedEmail !== dbUser.email.toLowerCase()) {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing && existing.id !== session.userId) {
        return NextResponse.json(
          { success: false, error: { code: "EMAIL_EXISTS", message: "Email này đã được sử dụng bởi người dùng khác" } },
          { status: 400 }
        );
      }
    }

    // Xử lý đổi mật khẩu nếu có nhập newPassword
    let newPasswordHash: string | undefined;
    if (newPassword && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { success: false, error: { code: "WEAK_PASSWORD", message: "Mật khẩu mới phải từ 6 ký tự trở lên" } },
          { status: 400 }
        );
      }
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: { code: "MISSING_CURRENT_PASSWORD", message: "Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu" } },
          { status: 400 }
        );
      }
      const isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: { code: "WRONG_PASSWORD", message: "Mật khẩu hiện tại không chính xác" } },
          { status: 400 }
        );
      }
      newPasswordHash = await bcrypt.hash(newPassword.trim(), 10);
    }

    // Tạo lại initials từ tên mới
    const words = name.trim().split(/\s+/).filter(Boolean);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase() || "TT";

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name,
        phone: phone || null,
        email: normalizedEmail,
        address: address || null,
        hometown: hometown || null,
        avatar: avatar || null,
        achievements: achievements || null,
        initials,
        ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        initials: true,
        avatar: true,
        address: true,
        hometown: true,
        achievements: true,
        updatedAt: true,
      },
    });

    // Cập nhật lại JWT cookie nếu tên / email thay đổi
    const newSessionPayload: UserSession = {
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role as UserSession["role"],
      initials: updatedUser.initials,
    };

    const newToken = signToken(newSessionPayload);

    const response = NextResponse.json({
      success: true,
      message: newPasswordHash
        ? "Đã cập nhật hồ sơ cá nhân và đổi mật khẩu thành công!"
        : "Đã cập nhật thông tin hồ sơ cá nhân thành công!",
      data: { user: updatedUser },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (error: any) {
    console.error("Update /api/users/profile error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Lỗi cập nhật hồ sơ" } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  return handleUpdateProfile(req);
}

export async function POST(req: NextRequest) {
  return handleUpdateProfile(req);
}
