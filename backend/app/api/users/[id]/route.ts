import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const AdminUpdateUserSchema = z.object({
  name: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự").max(100),
  email: z.string().trim().email("Email không hợp lệ"),
  role: z.enum(["ADMIN", "SALES", "MARKETING", "DESIGN", "ADS"]),
  phone: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  hometown: z.string().trim().max(200).optional().nullable(),
  achievements: z.string().trim().max(5000).optional().nullable(),
  avatar: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
  newPassword: z.string().optional().nullable(),
});

async function handleAdminUpdateUser(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentUser(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Chỉ ADMIN hoặc chính chủ tài khoản mới được chỉnh sửa
    if (session.role !== "ADMIN" && session.userId !== id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Chỉ Ban Giám Đốc (Admin) mới có quyền chỉnh sửa tài khoản nhân viên" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = AdminUpdateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.issues[0]?.message || "Thông tin tài khoản không hợp lệ",
          },
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const normalizedEmail = data.email.toLowerCase();

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Tài khoản không tồn tại" } },
        { status: 404 }
      );
    }

    // Kiểm tra trùng email với người khác
    if (normalizedEmail !== targetUser.email.toLowerCase()) {
      const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingEmail && existingEmail.id !== id) {
        return NextResponse.json(
          { success: false, error: { code: "EMAIL_EXISTS", message: "Email này đã thuộc về tài khoản khác" } },
          { status: 400 }
        );
      }
    }

    // Nếu không phải ADMIN tự sửa mình thì không cho tự nâng quyền lên ADMIN
    const finalRole = session.role === "ADMIN" ? data.role : targetUser.role;

    // Mã hóa mật khẩu mới nếu Admin đặt lại mật khẩu
    let newPasswordHash: string | undefined;
    if (data.newPassword && data.newPassword.trim().length > 0) {
      if (data.newPassword.trim().length < 6) {
        return NextResponse.json(
          { success: false, error: { code: "WEAK_PASSWORD", message: "Mật khẩu mới phải từ 6 ký tự trở lên" } },
          { status: 400 }
        );
      }
      newPasswordHash = await bcrypt.hash(data.newPassword.trim(), 10);
    }

    const words = data.name.trim().split(/\s+/).filter(Boolean);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : data.name.substring(0, 2).toUpperCase() || "TT";

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: normalizedEmail,
        role: finalRole,
        phone: data.phone || null,
        address: data.address || null,
        hometown: data.hometown || null,
        achievements: data.achievements || null,
        avatar: data.avatar || null,
        initials,
        ...(typeof data.isActive === "boolean" && session.role === "ADMIN" ? { isActive: data.isActive } : {}),
        ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        hometown: true,
        achievements: true,
        avatar: true,
        initials: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "UPDATE_USER",
        entity: "USER",
        entityId: updatedUser.id,
        details: JSON.stringify({
          email: updatedUser.email,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          passwordReset: Boolean(newPasswordHash),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thông tin tài khoản "${updatedUser.name}" thành công!`,
      data: { user: updatedUser },
    });
  } catch (error: any) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Lỗi cập nhật tài khoản" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleAdminUpdateUser(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleAdminUpdateUser(req, context);
}

