import { z } from "zod";
import type { UserSession } from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { AppError } from "@/src/core/http";

let cachedBrandSetting: { data: unknown; expiresAt: number } | null = null;
const BRAND_CACHE_TTL_MS = 30_000;

const UpdateBrandSchema = z.object({
  brandName: z
    .string()
    .trim()
    .min(2, "Tên thương hiệu tối thiểu 2 ký tự")
    .max(120)
    .optional(),
  slogan: z.string().trim().max(300).optional(),
  primaryColor: z.string().trim().max(30).optional(),
  supportHotline: z.string().trim().max(40).optional(),
  logoUrl: z.string().trim().max(1000).optional().nullable(),
  faviconUrl: z.string().trim().max(1000).optional().nullable(),
  loginWelcomeTitle: z.string().trim().max(200).optional().nullable(),
  loginWelcomeDesc: z.string().trim().max(500).optional().nullable(),
  loginBgUrl: z.string().trim().max(1000).optional().nullable(),
});

export async function getBrandSettings() {
  const now = Date.now();
  if (cachedBrandSetting && now < cachedBrandSetting.expiresAt) {
    return { setting: cachedBrandSetting.data };
  }

  let setting = await prisma.brandSetting.findUnique({
    where: { id: "default_brand" },
  });

  if (!setting) {
    setting = await prisma.brandSetting.create({
      data: {
        id: "default_brand",
        brandName: "TOÀN TRUNG",
        slogan:
          "Giải pháp hiển thị màn hình LED & Viễn thông chuyên nghiệp",
        primaryColor: "#2563EB",
        supportHotline: "0909.123.456",
      },
    });
  }

  cachedBrandSetting = { data: setting, expiresAt: now + BRAND_CACHE_TTL_MS };
  return { setting };
}

export async function updateBrandSettings(user: UserSession, body: unknown) {
  if (user.role !== "ADMIN" && user.actorType !== "ADMIN") {
    throw new AppError(
      403,
      "Chỉ Admin mới có thể thay đổi nhận diện thương hiệu",
      "FORBIDDEN"
    );
  }

  const parsed = UpdateBrandSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message || "Thông tin thương hiệu không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const data = parsed.data;
  const updated = await prisma.brandSetting.upsert({
    where: { id: "default_brand" },
    update: {
      ...(data.brandName !== undefined ? { brandName: data.brandName } : {}),
      ...(data.slogan !== undefined ? { slogan: data.slogan } : {}),
      ...(data.primaryColor !== undefined
        ? { primaryColor: data.primaryColor }
        : {}),
      ...(data.supportHotline !== undefined
        ? { supportHotline: data.supportHotline }
        : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || "" } : {}),
      ...(data.faviconUrl !== undefined
        ? { faviconUrl: data.faviconUrl || "" }
        : {}),
      ...(data.loginWelcomeTitle !== undefined
        ? { loginWelcomeTitle: data.loginWelcomeTitle || "" }
        : {}),
      ...(data.loginWelcomeDesc !== undefined
        ? { loginWelcomeDesc: data.loginWelcomeDesc || "" }
        : {}),
      ...(data.loginBgUrl !== undefined
        ? { loginBgUrl: data.loginBgUrl || "" }
        : {}),
    },
    create: {
      id: "default_brand",
      brandName: data.brandName || "TOÀN TRUNG",
      slogan:
        data.slogan ||
        "Giải pháp hiển thị màn hình LED & Viễn thông chuyên nghiệp",
      primaryColor: data.primaryColor || "#2563EB",
      supportHotline: data.supportHotline || "0909.123.456",
      loginWelcomeTitle: data.loginWelcomeTitle || "Chào mừng trở lại",
      loginWelcomeDesc: data.loginWelcomeDesc || "",
      loginBgUrl: data.loginBgUrl || "",
    },
  });

  cachedBrandSetting = {
    data: updated,
    expiresAt: Date.now() + BRAND_CACHE_TTL_MS,
  };

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "BRAND_UPDATE",
      entity: "BRAND",
      entityId: "default_brand",
      details: JSON.stringify(data),
    },
  });

  return {
    message: "Cập nhật cấu hình thương hiệu thành công",
    setting: updated,
  };
}
