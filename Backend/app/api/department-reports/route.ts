import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CreateReportSchema = z.object({
  title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự").max(200, "Tiêu đề tối đa 200 ký tự"),
  content: z.string().trim().min(5, "Nội dung báo cáo tối thiểu 5 ký tự").max(50000, "Nội dung báo cáo tối đa 50.000 ký tự"),
  attachmentName: z.string().max(255).optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập" } },
      { status: 401 }
    );
  }

  try {
    // Phân quyền hiển thị báo cáo:
    // - ADMIN: Xem được tất cả báo cáo của toàn bộ các phòng ban
    // - MKT, SALES, DESIGN, ADS,...: Chỉ thấy báo cáo của ADMIN (toàn hệ thống) + báo cáo do chính mình viết
    const reportFilter = user.role === "ADMIN"
      ? {}
      : {
          OR: [
            { createdBy: { role: "ADMIN" } },
            { createdById: user.userId },
          ],
        };

    const [reports, unreadCount] = await Promise.all([
      prisma.departmentReport.findMany({
        where: reportFilter,
        include: {
          createdBy: { select: { name: true, role: true, initials: true } },
          reads: { where: { userId: user.userId }, select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.departmentReport.count({
        where: {
          ...reportFilter,
          reads: { none: { userId: user.userId } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reports: reports.map(({ reads, ...report }) => ({
          ...report,
          isRead: reads.length > 0,
        })),
        unreadCount,
        currentUserRole: user.role,
        currentUserId: user.userId,
      },
    });
  } catch (error) {
    console.error("GET /api/department-reports error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Không tải được danh sách báo cáo" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập" } },
      { status: 401 }
    );
  }

  try {
    const validation = CreateReportSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: validation.error.issues[0]?.message || "Thông tin báo cáo không hợp lệ" } },
        { status: 400 }
      );
    }

    const report = await prisma.departmentReport.create({
      data: {
        title: validation.data.title,
        content: validation.data.content,
        attachmentName: validation.data.attachmentName || null,
        attachmentUrl: validation.data.attachmentUrl || null,
        department: user.role,
        createdById: user.userId,
      },
      include: { createdBy: { select: { name: true, role: true, initials: true } } },
    });

    const isBroadcast = user.role === "ADMIN";

    return NextResponse.json(
      {
        success: true,
        message: isBroadcast
          ? "Đã phát báo cáo / thông báo của Ban Giám Đốc tới toàn hệ thống"
          : "Đã gửi báo cáo phòng ban lên Ban Giám Đốc thành công",
        data: { report },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/department-reports error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Không gửi được báo cáo" } },
      { status: 500 }
    );
  }
}
