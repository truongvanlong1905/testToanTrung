import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const existingReport = await prisma.departmentReport.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existingReport) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy báo cáo / thông báo" } },
        { status: 404 }
      );
    }

    await prisma.departmentReportRead.upsert({
      where: { reportId_userId: { reportId: id, userId: user.userId } },
      create: { reportId: id, userId: user.userId },
      update: { readAt: new Date() },
    });
    return NextResponse.json({ success: true, data: { reportId: id, read: true } });
  } catch (error) {
    console.error("PATCH /api/reports/[id]/read error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Không cập nhật được trạng thái thông báo" } },
      { status: 500 }
    );
  }
}
