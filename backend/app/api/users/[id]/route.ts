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

const AdminUpdateUserSchema = z.object({
  name: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự").max(100),
  email: z.string().trim().email("Email không hợp lệ"),
  role: z.string().trim().optional(),
  actorType: z.enum(["ADMIN", "DIRECTOR", "USER"]).optional(),
  department: z.string().trim().max(40).optional(),
  position: z.string().trim().max(80).optional(),
  decisionId: z.string().trim().optional().nullable(),
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
      return unauthorizedResponse();
    }

    const { id } = await params;
    const isAdmin = session.actorType === "ADMIN" || session.role === "ADMIN";

    if (!isAdmin && session.userId !== id) {
      return forbiddenResponse("Chỉ Tác nhân ADMIN mới có quyền chỉnh sửa và phân quyền tài khoản nhân sự");
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

    if (normalizedEmail !== targetUser.email.toLowerCase()) {
      const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingEmail && existingEmail.id !== id) {
        return NextResponse.json(
          { success: false, error: { code: "EMAIL_EXISTS", message: "Email này đã thuộc về tài khoản khác" } },
          { status: 400 }
        );
      }
    }

    const resolved = isAdmin
      ? resolveActorAndDept({
          role: data.role ?? targetUser.role,
          actorType: data.actorType ?? targetUser.actorType,
          department: data.department ?? targetUser.department,
          position: data.position ?? targetUser.position,
        })
      : resolveActorAndDept(targetUser);

    let appointedDecisionCode = targetUser.appointedDecisionCode;

    // Kiểm tra chuẩn ATTT: Nếu nâng quyền chức vụ cho USER (Trưởng phòng, Trưởng ban, Phó phòng, Trưởng nhóm)
    if (
      isAdmin &&
      resolved.actorType === "USER" &&
      isManagerialPosition(resolved.position) &&
      resolved.position !== targetUser.position
    ) {
      const signedDecision = data.decisionId
        ? await prisma.promotionDecision.findFirst({
            where: { id: data.decisionId, targetUserId: id },
          })
        : await prisma.promotionDecision.findFirst({
            where: {
              targetUserId: id,
              newPosition: resolved.position,
              status: { in: ["SIGNED_BY_DIRECTOR", "APPLIED_BY_ADMIN"] },
            },
            orderBy: { createdAt: "desc" },
          });

      if (!signedDecision) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DIRECTOR_SIGNATURE_REQUIRED",
              message: `Theo quy định ATTT: Không thể tự nâng chức vụ "${resolved.position}" khi chưa có Thông báo chúc mừng / Quyết định bổ nhiệm được Giám đốc ký duyệt!`,
            },
          },
          { status: 403 }
        );
      }

      appointedDecisionCode = signedDecision.code;
      if (signedDecision.status === "SIGNED_BY_DIRECTOR") {
        await prisma.promotionDecision.update({
          where: { id: signedDecision.id },
          data: {
            status: "APPLIED_BY_ADMIN",
            appliedByAdminId: session.userId,
            appliedAt: new Date(),
          },
        });
      }
    }

    if (resolved.actorType === "USER" && !isManagerialPosition(resolved.position)) {
      appointedDecisionCode = null;
    }

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
        role: resolved.effectiveRole,
        actorType: resolved.actorType,
        department: resolved.department,
        position: resolved.position,
        appointedDecisionCode,
        phone: data.phone || null,
        address: data.address || null,
        hometown: data.hometown || null,
        achievements: data.achievements || null,
        avatar: data.avatar || null,
        initials,
        ...(typeof data.isActive === "boolean" && isAdmin ? { isActive: data.isActive } : {}),
        ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
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
          actorType: updatedUser.actorType,
          department: updatedUser.department,
          position: updatedUser.position,
          appointedDecisionCode: updatedUser.appointedDecisionCode,
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
  } catch (error: unknown) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Lỗi cập nhật tài khoản",
        },
      },
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
