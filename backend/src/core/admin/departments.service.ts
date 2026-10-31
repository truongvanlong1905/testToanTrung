import { z } from "zod";
import type { UserSession } from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { AppError } from "@/src/core/http";

const DEFAULT_DEPARTMENTS = [
  {
    code: "SALES",
    name: "Phòng Kinh Doanh (Sales)",
    description:
      "Tiếp nhận Lead, khảo sát công trình LED và lập báo giá dự án",
  },
  {
    code: "MARKETING",
    name: "Phòng Marketing",
    description:
      "Quản lý chiến dịch truyền thông, nội dung và đo lường UTM Tracking",
  },
  {
    code: "DESIGN",
    name: "Phòng Thiết Kế (Design)",
    description:
      "Thiết kế maquette màn hình LED, bản vẽ kỹ thuật và AI Design Studio",
  },
  {
    code: "ADS",
    name: "Bộ Phận Quảng Cáo (Ads)",
    description:
      "Tối ưu ngân sách Google Ads, Facebook Ads và bộ từ khóa chuyển đổi",
  },
];

const CreateDepartmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Mã phòng ban tối thiểu 2 ký tự")
    .max(30, "Mã phòng ban tối đa 30 ký tự")
    .regex(
      /^[A-Za-z0-9_]+$/,
      "Mã phòng ban chỉ gồm chữ cái không dấu, số và dấu gạch dưới"
    ),
  name: z.string().trim().min(3, "Tên phòng ban tối thiểu 3 ký tự").max(120),
  description: z.string().trim().max(500).optional().nullable(),
});

async function ensureDefaultDepartments() {
  const count = await prisma.department.count();
  if (count === 0) {
    for (const dept of DEFAULT_DEPARTMENTS) {
      await prisma.department.upsert({
        where: { code: dept.code },
        update: { name: dept.name, description: dept.description },
        create: dept,
      });
    }
  }
}

export async function listDepartments() {
  await ensureDefaultDepartments();
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return { departments };
}

export async function createDepartment(user: UserSession, body: unknown) {
  if (user.actorType !== "ADMIN" && user.role !== "ADMIN") {
    throw new AppError(
      403,
      "Chỉ Tác nhân ADMIN (Quản trị hệ thống) mới có quyền khởi tạo phòng ban mới",
      "FORBIDDEN"
    );
  }

  const parsed = CreateDepartmentSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message || "Thông tin phòng ban không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const code = parsed.data.code.toUpperCase();
  const existing = await prisma.department.findFirst({
    where: {
      OR: [{ code }, { name: parsed.data.name }],
    },
  });

  if (existing) {
    throw new AppError(
      400,
      "Mã hoặc tên phòng ban đã tồn tại trong hệ thống",
      "DEPARTMENT_EXISTS"
    );
  }

  const department = await prisma.department.create({
    data: {
      code,
      name: parsed.data.name,
      description: parsed.data.description || null,
      createdById: user.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "CREATE_DEPARTMENT",
      entity: "DEPARTMENT",
      entityId: department.id,
      details: JSON.stringify({ code: department.code, name: department.name }),
    },
  });

  return {
    message: `Đã khởi tạo phòng ban "${department.name}" (${department.code}) thành công`,
    department,
  };
}
