import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, resolveActorAndDept } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser(req);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Chưa đăng nhập hoặc phiên làm việc đã hết hạn",
          },
        },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        actorType: true,
        department: true,
        position: true,
        appointedDecisionCode: true,
        initials: true,
        phone: true,
        avatar: true,
        address: true,
        hometown: true,
        achievements: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "Tài khoản không tồn tại hoặc đã bị khóa" },
        },
        { status: 401 }
      );
    }

    const resolved = resolveActorAndDept(user);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          role: resolved.effectiveRole,
          actorType: resolved.actorType,
          department: resolved.department,
          position: resolved.position,
        },
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi kiểm tra phiên đăng nhập" },
      },
      { status: 500 }
    );
  }
}
