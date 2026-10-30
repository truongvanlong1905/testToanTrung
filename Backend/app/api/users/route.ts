import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const CreateUserSchema = z.object({
  name: z.string().min(2, "Tên nhân viên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  role: z.enum(["ADMIN", "SALES", "MARKETING", "DESIGN", "ADS"]),
  phone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");

    const whereClause: any = { isActive: true };
    if (role) {
      whereClause.role = role;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        initials: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { users },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi tải danh sách nhân viên" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập" } },
        { status: 401 }
      );
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Chỉ Admin mới có thể tạo tài khoản" } },
        { status: 403 }
      );
    }
    const body = await req.json();

    const validation = CreateUserSchema.safeParse(body);
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

    const data = validation.data;

    // Kiểm tra email tồn tại
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "EMAIL_EXISTS", message: "Email này đã được sử dụng" },
        },
        { status: 400 }
      );
    }

    // Hash mật khẩu
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Tính initials
    const words = data.name.trim().split(/\s+/);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : data.name.substring(0, 2).toUpperCase();

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        phone: data.phone || null,
        initials,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        initials: true,
        createdAt: true,
      },
    });

    // Ghi AuditLog
    await prisma.auditLog.create({
      data: {
        userId: session?.userId,
        action: "CREATE_USER",
        entity: "USER",
        entityId: newUser.id,
        details: JSON.stringify({ email: newUser.email, role: newUser.role }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã tạo tài khoản cho ${newUser.name} (${newUser.role}) thành công`,
      data: { user: newUser },
    });
  } catch (error: any) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi tạo tài khoản nhân viên" } },
      { status: 500 }
    );
  }
}
