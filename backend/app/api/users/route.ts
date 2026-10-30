import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  resolveActorAndDept,
  isManagerialPosition,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth";

const CreateUserSchema = z.object({
  name: z.string().trim().min(2, "Tên nhân viên tối thiểu 2 ký tự").max(100),
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(100),
  actorType: z.enum(["ADMIN", "DIRECTOR", "USER"]).optional(),
  department: z.string().trim().min(2).max(40).optional(),
  position: z.string().trim().max(80).optional(),
  role: z.string().trim().optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  hometown: z.string().optional().nullable(),
  achievements: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);
    if (!session) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const actorType = searchParams.get("actorType");
    const includeAll = searchParams.get("all") === "true";

    const isPrivileged =
      session.actorType === "ADMIN" ||
      session.actorType === "DIRECTOR" ||
      session.role === "ADMIN" ||
      session.role === "DIRECTOR";

    const whereClause: Record<string, unknown> = includeAll && isPrivileged ? {} : { isActive: true };
    if (role) {
      whereClause.role = role;
    }
    if (actorType) {
      whereClause.actorType = actorType;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: isPrivileged,
        role: true,
        actorType: true,
        department: true,
        position: true,
        appointedDecisionCode: true,
        initials: true,
        avatar: true,
        address: isPrivileged,
        hometown: isPrivileged,
        achievements: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error("GET /api/users error:", error);
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
      return unauthorizedResponse();
    }
    if (session.actorType !== "ADMIN" && session.role !== "ADMIN") {
      return forbiddenResponse("Chỉ Tác nhân ADMIN mới có quyền tạo tài khoản hệ thống");
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
    const normalizedEmail = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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

    const resolved = resolveActorAndDept({
      role: data.role,
      actorType: data.actorType,
      department: data.department,
      position: data.position,
    });

    // Quy tắc ATTT: Tác nhân USER khởi tạo ban đầu là Nhân viên; muốn lên Trưởng phòng/Trưởng ban phải có Quyết định của Giám đốc ký
    if (resolved.actorType === "USER" && isManagerialPosition(resolved.position)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DIRECTOR_SIGNATURE_REQUIRED",
            message:
              "Theo chuẩn ATTT: Tài khoản USER mới khởi tạo ở cấp 'Nhân viên'. Để cấp quyền Trưởng phòng / Trưởng ban, cần căn cứ vào Thông báo chúc mừng do Giám đốc ký duyệt!",
          },
        },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const words = data.name.trim().split(/\s+/);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
        : data.name.substring(0, 2).toUpperCase();

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        passwordHash,
        role: resolved.effectiveRole,
        actorType: resolved.actorType,
        department: resolved.department,
        position: resolved.position,
        phone: data.phone || null,
        address: data.address || null,
        hometown: data.hometown || null,
        achievements: data.achievements || null,
        avatar: data.avatar || null,
        initials,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        actorType: true,
        department: true,
        position: true,
        appointedDecisionCode: true,
        phone: true,
        address: true,
        hometown: true,
        achievements: true,
        avatar: true,
        initials: true,
        isActive: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_USER",
        entity: "USER",
        entityId: newUser.id,
        details: JSON.stringify({
          email: newUser.email,
          actorType: newUser.actorType,
          department: newUser.department,
          position: newUser.position,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã tạo tài khoản ${newUser.name} [Tác nhân: ${newUser.actorType} · Phòng: ${newUser.department}] thành công`,
      data: { user: newUser },
    });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi tạo tài khoản nhân viên" } },
      { status: 500 }
    );
  }
}
