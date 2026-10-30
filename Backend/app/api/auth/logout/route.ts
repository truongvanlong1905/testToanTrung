import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "LOGOUT",
          entity: "AUTH",
          entityId: user.userId,
          ipAddress: req.headers.get("x-forwarded-for") || "localhost",
          userAgent: req.headers.get("user-agent"),
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Đăng xuất thành công",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi đăng xuất" },
      },
      { status: 500 }
    );
  }
}

