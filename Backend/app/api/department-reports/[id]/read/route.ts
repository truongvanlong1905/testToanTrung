import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập" } },
      { status: 401 }
    );
  }

  try {
    await prisma.departmentReportRead.upsert({
      where: { reportId_userId: { reportId: id, userId: user.userId } },
      create: { reportId: id, userId: user.userId },
      update: { readAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/department-reports/[id]/read error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Không cập nhật được trạng thái thông báo" } },
      { status: 500 }
    );
  }
}
