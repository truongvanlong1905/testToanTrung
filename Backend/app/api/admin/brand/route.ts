import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    return NextResponse.json({ success: true, data: { setting } });
  } catch (error: any) {
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
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập" } },
        { status: 401 }
      );
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Chỉ Admin mới có thể thay đổi nhận diện thương hiệu" } },
        { status: 403 }
      );
    }
    const body = await req.json();

    const updated = await prisma.brandSetting.upsert({
      where: { id: "default_brand" },
      update: {
        brandName: body.brandName,
        slogan: body.slogan,
        primaryColor: body.primaryColor,
        supportHotline: body.supportHotline,
        logoUrl: body.logoUrl,
        faviconUrl: body.faviconUrl,
        loginWelcomeTitle: body.loginWelcomeTitle,
        loginWelcomeDesc: body.loginWelcomeDesc,
        loginBgUrl: body.loginBgUrl,
      },
      create: {
        id: "default_brand",
        brandName: body.brandName || "TOÀN TRUNG",
        slogan: body.slogan || "Giải pháp hiển thị màn hình LED & Viễn thông chuyên nghiệp",
        primaryColor: body.primaryColor || "#2563EB",
        supportHotline: body.supportHotline || "0909.123.456",
        loginWelcomeTitle: body.loginWelcomeTitle || "Chào mừng trở lại",
        loginWelcomeDesc: body.loginWelcomeDesc || "",
        loginBgUrl: body.loginBgUrl || "",
      },
    });

    // Ghi AuditLog
    await prisma.auditLog.create({
      data: {
        userId: user?.userId,
        action: "BRAND_UPDATE",
        entity: "BRAND",
        entityId: "default_brand",
        details: JSON.stringify(body),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật cấu hình thương hiệu thành công",
      data: { setting: updated },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi lưu cấu hình thương hiệu" } },
      { status: 500 }
    );
  }
}
