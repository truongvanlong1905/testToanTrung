import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  invalidateUserSessionCache,
  isManagerialPosition,
  resolveActorAndDept,
  signToken,
  type UserSession,
} from "@/src/core/auth/auth";
import {
  getSessionCookieOptions,
  invalidateMeProfileCache,
} from "@/src/core/auth/auth.service";
import { prisma } from "@/src/core/db/prisma";
import { AppError } from "@/src/core/http";

const CreateUserSchema = z.object({
  name: z.string().trim().min(2, "Tên nhân viên tối thiểu 2 ký tự").max(100),
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự").max(100),
  actorType: z.enum(["ADMIN", "DIRECTOR", "USER"]).optional(),
  department: z.string().trim().min(2).max(40).optional(),
  position: z.string().trim().max(80).optional(),
  role: z.string().trim().optional(),
  phone: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
});

const AdminUpdateUserSchema = z.object({
  name: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự").max(100),
  email: z.string().trim().email("Email không hợp lệ"),
  role: z.string().trim().optional(),
  actorType: z.enum(["ADMIN", "DIRECTOR", "USER"]).optional(),
  department: z.string().trim().max(40).optional(),
  position: z.string().trim().max(80).optional(),
  decisionId: z.string().trim().optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  avatar: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
  newPassword: z.string().optional().nullable(),
});

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, "Họ và tên tối thiểu 2 ký tự").max(100).optional(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email("Email công việc không hợp lệ").optional(),
  avatar: z.string().trim().optional().nullable(),
  currentPassword: z.string().optional().nullable(),
  newPassword: z.string().optional().nullable(),
});

export async function listUsers(
  session: UserSession,
  params: {
    role?: string | null;
    actorType?: string | null;
    includeAll?: boolean;
  }
) {
  const isPrivileged =
    session.actorType === "ADMIN" ||
    session.actorType === "DIRECTOR" ||
    session.role === "ADMIN" ||
    session.role === "DIRECTOR";

  const whereClause: Record<string, unknown> =
    params.includeAll && isPrivileged ? {} : { isActive: true };
  if (params.role) {
    whereClause.role = params.role;
  }
  if (params.actorType) {
    whereClause.actorType = params.actorType;
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
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { users };
}

export async function createUserByAdmin(session: UserSession, body: unknown) {
  if (session.actorType !== "ADMIN" && session.role !== "ADMIN") {
    throw new AppError(
      403,
      "Chỉ Quản trị viên (Admin) mới có quyền tạo tài khoản nhân sự",
      "FORBIDDEN"
    );
  }

  const validation = CreateUserSchema.safeParse(body);
  if (!validation.success) {
    throw new AppError(
      400,
      validation.error.issues[0]?.message || "Dữ liệu không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const data = validation.data;
  const normalizedEmail = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new AppError(400, "Email này đã được sử dụng", "EMAIL_EXISTS");
  }

  const resolved = resolveActorAndDept({
    role: data.role,
    actorType: data.actorType,
    department: data.department,
    position: data.position,
  });

  if (
    resolved.actorType === "USER" &&
    isManagerialPosition(resolved.position)
  ) {
    throw new AppError(
      403,
      "Tài khoản nhân sự mới khởi tạo ở cấp 'Nhân viên'. Để cấp quyền Trưởng phòng / Trưởng ban, cần căn cứ vào Quyết định bổ nhiệm do Giám đốc ký duyệt.",
      "DIRECTOR_SIGNATURE_REQUIRED"
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

  return {
    message: `Đã tạo tài khoản ${newUser.name} (${newUser.department}) thành công`,
    user: newUser,
  };
}

export async function updateUserByAdmin(
  session: UserSession,
  targetUserId: string,
  body: unknown
) {
  const isAdmin = session.actorType === "ADMIN" || session.role === "ADMIN";
  if (!isAdmin && session.userId !== targetUserId) {
    throw new AppError(
      403,
      "Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa và phân quyền tài khoản nhân sự",
      "FORBIDDEN"
    );
  }

  const validation = AdminUpdateUserSchema.safeParse(body);
  if (!validation.success) {
    throw new AppError(
      400,
      validation.error.issues[0]?.message ||
        "Thông tin tài khoản không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const data = validation.data;
  const normalizedEmail = data.email.toLowerCase();

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!targetUser) {
    throw new AppError(404, "Tài khoản không tồn tại", "NOT_FOUND");
  }

  if (normalizedEmail !== targetUser.email.toLowerCase()) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail && existingEmail.id !== targetUserId) {
      throw new AppError(
        400,
        "Email này đã thuộc về tài khoản khác",
        "EMAIL_EXISTS"
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

  if (
    isAdmin &&
    resolved.actorType === "USER" &&
    isManagerialPosition(resolved.position) &&
    resolved.position !== targetUser.position
  ) {
    const signedDecision = data.decisionId
      ? await prisma.promotionDecision.findFirst({
          where: { id: data.decisionId, targetUserId },
        })
      : await prisma.promotionDecision.findFirst({
          where: {
            targetUserId,
            newPosition: resolved.position,
            status: { in: ["SIGNED_BY_DIRECTOR", "APPLIED_BY_ADMIN"] },
          },
          orderBy: { createdAt: "desc" },
        });

    if (!signedDecision) {
      throw new AppError(
        403,
        `Không thể nâng chức vụ "${resolved.position}" khi chưa có Quyết định bổ nhiệm được Giám đốc ký duyệt.`,
        "DIRECTOR_SIGNATURE_REQUIRED"
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

  if (
    resolved.actorType === "USER" &&
    !isManagerialPosition(resolved.position)
  ) {
    appointedDecisionCode = null;
  }

  let newPasswordHash: string | undefined;
  if (data.newPassword && data.newPassword.trim().length > 0) {
    if (data.newPassword.trim().length < 6) {
      throw new AppError(
        400,
        "Mật khẩu mới phải từ 6 ký tự trở lên",
        "WEAK_PASSWORD"
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
    where: { id: targetUserId },
    data: {
      name: data.name,
      email: normalizedEmail,
      role: resolved.effectiveRole,
      actorType: resolved.actorType,
      department: resolved.department,
      position: resolved.position,
      appointedDecisionCode,
      phone: data.phone || null,
      avatar: data.avatar !== undefined ? data.avatar || null : targetUser.avatar,
      initials,
      ...(typeof data.isActive === "boolean" && isAdmin
        ? { isActive: data.isActive }
        : {}),
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

  invalidateUserSessionCache(updatedUser.id);
  invalidateMeProfileCache(updatedUser.id);

  return {
    message: `Đã cập nhật thông tin tài khoản "${updatedUser.name}" thành công!`,
    user: updatedUser,
  };
}

export async function getUserOwnProfile(session: UserSession | null) {
  if (!session) {
    throw new AppError(401, "Vui lòng đăng nhập", "UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      actorType: true,
      department: true,
      position: true,
      appointedDecisionCode: true,
      initials: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "Không tìm thấy người dùng", "NOT_FOUND");
  }

  return { user };
}

export async function updateUserOwnProfile(
  session: UserSession | null,
  body: unknown
) {
  if (!session) {
    throw new AppError(401, "Vui lòng đăng nhập", "UNAUTHORIZED");
  }

  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message || "Thông tin không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const {
    name,
    phone,
    email,
    avatar,
    currentPassword,
    newPassword,
  } = parsed.data;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!dbUser) {
    throw new AppError(404, "Không tìm thấy người dùng", "NOT_FOUND");
  }

  const nextName = name ? name.trim() : dbUser.name;
  const normalizedEmail = email ? email.trim().toLowerCase() : dbUser.email.toLowerCase();

  if (normalizedEmail !== dbUser.email.toLowerCase()) {
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing && existing.id !== session.userId) {
      throw new AppError(
        400,
        "Email này đã được sử dụng bởi người dùng khác",
        "EMAIL_EXISTS"
      );
    }
  }

  let newPasswordHash: string | undefined;
  if (newPassword && newPassword.trim().length > 0) {
    if (newPassword.trim().length < 6) {
      throw new AppError(
        400,
        "Mật khẩu mới phải từ 6 ký tự trở lên",
        "WEAK_PASSWORD"
      );
    }
    if (!currentPassword) {
      throw new AppError(
        400,
        "Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu",
        "MISSING_CURRENT_PASSWORD"
      );
    }
    const isMatch = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isMatch) {
      throw new AppError(
        400,
        "Mật khẩu hiện tại không chính xác",
        "WRONG_PASSWORD"
      );
    }
    newPasswordHash = await bcrypt.hash(newPassword.trim(), 10);
  }

  const words = nextName.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
      : nextName.substring(0, 2).toUpperCase() || "TT";

  const updatedUser = await prisma.user.update({
    where: { id: session.userId },
    data: {
      name: nextName,
      phone: phone !== undefined ? phone || null : dbUser.phone,
      email: normalizedEmail,
      avatar: avatar !== undefined ? avatar || null : dbUser.avatar,
      initials,
      ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      actorType: true,
      department: true,
      position: true,
      appointedDecisionCode: true,
      initials: true,
      avatar: true,
      updatedAt: true,
    },
  });

  const newSessionPayload: UserSession = {
    userId: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role as UserSession["role"],
    actorType:
      (updatedUser.actorType as UserSession["actorType"]) || session.actorType,
    department: updatedUser.department || session.department,
    position: updatedUser.position || session.position,
    initials: updatedUser.initials,
  };

  invalidateUserSessionCache(updatedUser.id);
  invalidateMeProfileCache(updatedUser.id);
  const newToken = signToken(newSessionPayload);

  return {
    message: newPasswordHash
      ? "Đã đổi mật khẩu tài khoản thành công!"
      : "Đã cập nhật thông tin cá nhân thành công!",
    user: updatedUser,
    cookieOptions: getSessionCookieOptions(newToken),
  };
}
