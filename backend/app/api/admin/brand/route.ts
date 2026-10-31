import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

let cachedBrandSetting: { data: unknown; expiresAt: number } | null = null;
const BRAND_CACHE_TTL_MS = 30_000;

const UpdateBrandSchema = z.object({
  brandName: z.string().trim().min(2, "Tên thương hiệu tối thiểu 2 ký tự").max(120).optional(),
  slogan: z.string().trim().max(300).optional(),
  primaryColor: z.string().trim().max(30).optional(),
  supportHotline: z.string().trim().max(40).optional(),
  logoUrl: z.string().trim().max(1000).optional().nullable(),
  faviconUrl: z.string().trim().max(1000).optional().nullable(),
  loginWelcomeTitle: z.string().trim().max(200).optional().nullable(),
  loginWelcomeDesc: z.string().trim().max(500).optional().nullable(),
  loginBgUrl: z.string().trim().max(1000).optional().nullable(),
});

export async function GET() {
  try {
    const now = Date.now();
    if (cachedBrandSetting && now < cachedBrandSetting.expiresAt) {
      return NextResponse.json({ success: true, data: { setting: cachedBrandSetting.data } });
    }

    let setting = await prisma.brandSetting.findUnique({
      where: { id: "default_brand" },
    });

    if (!setting) {
      setting = await prisma.brandSetting.create({
        data: {
          id: "default_brand",
          brandName: "TOÀN TRUNG",
          slogan: "Giải pháp hiển thị màn hình LED & Viễn thông chuyên nghiệp",
          primaryColor: "#2563EB",
          supportHotline: "0909.123.456",
        },
      });
    }

    cachedBrandSetting = { data: setting, expiresAt: now + BRAND_CACHE_TTL_MS };
    return NextResponse.json({ success: true, data: { setting } });
  } catch (error) {
    console.error("GET /api/admin/brand error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi tải cấu hình thương hiệu" } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return unauthorizedResponse();
    }
    if (user.role !== "ADMIN" && user.actorType !== "ADMIN") {
      return forbiddenResponse("Chỉ Admin mới có thể thay đổi nhận diện thương hiệu");
    }

    const body = await req.json();
    const parsed = UpdateBrandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Thông tin thương hiệu không hợp lệ",
          },
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updated = await prisma.brandSetting.upsert({
      where: { id: "default_brand" },
      update: {
        ...(data.brandName !== undefined ? { brandName: data.brandName } : {}),
        ...(data.slogan !== undefined ? { slogan: data.slogan } : {}),
        ...(data.primaryColor !== undefined ? { primaryColor: data.primaryColor } : {}),
        ...(data.supportHotline !== undefined ? { supportHotline: data.supportHotline } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || "" } : {}),
        ...(data.faviconUrl !== undefined ? { faviconUrl: data.faviconUrl || "" } : {}),
        ...(data.loginWelcomeTitle !== undefined ? { loginWelcomeTitle: data.loginWelcomeTitle || "" } : {}),
        ...(data.loginWelcomeDesc !== undefined ? { loginWelcomeDesc: data.loginWelcomeDesc || "" } : {}),
        ...(data.loginBgUrl !== undefined ? { loginBgUrl: data.loginBgUrl || "" } : {}),
      },
      create: {
        id: "default_brand",
        brandName: data.brandName || "TOÀN TRUNG",
        slogan: data.slogan || "Giải pháp hiển thị màn hình LED & Viễn thông chuyên nghiệp",
        primaryColor: data.primaryColor || "#2563EB",
        supportHotline: data.supportHotline || "0909.123.456",
        loginWelcomeTitle: data.loginWelcomeTitle || "Chào mừng trở lại",
        loginWelcomeDesc: data.loginWelcomeDesc || "",
        loginBgUrl: data.loginBgUrl || "",
      },
    });

    cachedBrandSetting = { data: updated, expiresAt: Date.now() + BRAND_CACHE_TTL_MS };

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "BRAND_UPDATE",
        entity: "BRAND",
        entityId: "default_brand",
        details: JSON.stringify(data),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật cấu hình thương hiệu thành công",
      data: { setting: updated },
    });
  } catch (error) {
    console.error("PATCH /api/admin/brand error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi lưu cấu hình thương hiệu" } },
      { status: 500 }
    );
  }
}
