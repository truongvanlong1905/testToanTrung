import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, "Họ và tên tối thiểu 2 ký tự").max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email("Email không hợp lệ"),
  address: z.string().trim().max(300).optional().nullable(),
  hometown: z.string().trim().max(200).optional().nullable(),
  avatar: z.string().trim().optional().nullable(),
  achievements: z.string().trim().max(5000).optional().nullable(),
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

export async function PATCH(req: NextRequest) {
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

    const { name, phone, email, address, hometown, avatar, achievements } = parsed.data;

    // Kiểm tra xem email mới có bị trùng với tài khoản khác không
    if (email !== session.email) {
      const existing = await prisma.user.findUnique({
        where: { email },
      });
      if (existing && existing.id !== session.userId) {
        return NextResponse.json(
          { success: false, error: { code: "EMAIL_EXISTS", message: "Email này đã được sử dụng bởi người dùng khác" } },
          { status: 400 }
        );
      }
    }

    // Tạo lại initials từ tên mới
    const initials =
      name
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "TT";

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name,
        phone: phone || null,
        email,
        address: address || null,
        hometown: hometown || null,
        avatar: avatar || null,
        achievements: achievements || null,
        initials,
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

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin cá nhân thành công!",
      data: { user: updatedUser },
    });
  } catch (error: any) {
    console.error("PATCH /api/users/profile error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Lỗi cập nhật hồ sơ" } },
      { status: 500 }
    );
  }
}

