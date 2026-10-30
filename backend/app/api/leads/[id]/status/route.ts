import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessAllLeads, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await req.json();
    const { status, reason } = body;

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Vui lòng chọn trạng thái mới" },
        },
        { status: 400 }
      );
    }

    // YÊU CẦU 10: Khi chọn Thất bại, BẮT BUỘC nhập lý do
    const isFailureStatus =
      status === "Thất bại" ||
      status.toLowerCase().includes("thất bại") ||
      status.toLowerCase().includes("that bai") ||
      status.toLowerCase().includes("th?t b?i");

    if (isFailureStatus && (!reason || reason.trim().length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REASON_REQUIRED",
            message: "Khi chuyển sang trạng thái Thất bại, bắt buộc phải nhập lý do thất bại",
          },
        },
        { status: 400 }
      );
    }

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Không tìm thấy khách hàng" },
        },
        { status: 404 }
      );
    }

    const canChangeStatus =
      canAccessAllLeads(user) ||
      !existing.salesPersonId ||
      existing.salesPersonId === user.userId ||
      existing.createdById === user.userId;

    if (!canChangeStatus) {
      return forbiddenResponse(
        "Chỉ nhân sự phụ trách Lead này hoặc cấp Trưởng phòng / Trưởng ban / Giám đốc / Admin mới được đổi trạng thái"
      );
    }

    const fromStatus = existing.status;

    // Cập nhật Lead trong database
    const updated = await prisma.lead.update({
      where: { id },
      data: {
        status,
        failureReason: status === "Thất bại" ? reason : null,
      },
    });

    // Tạo lịch sử thay đổi trạng thái
    const history = await prisma.leadStatusHistory.create({
      data: {
        leadId: id,
        fromStatus,
        toStatus: status,
        reason: reason || `Chuyển trạng thái từ ${fromStatus} sang ${status}`,
        changedById: user?.userId,
      },
    });

    // Ghi AuditLog
    await prisma.auditLog.create({
      data: {
        userId: user?.userId,
        leadId: id,
        action: "CHANGE_STATUS",
        entity: "LEAD",
        entityId: id,
        details: JSON.stringify({
          fromStatus,
          toStatus: status,
          reason,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật trạng thái sang "${status}" thành công`,
      data: {
        lead: updated,
        history,
      },
    });
  } catch (error: any) {
    console.error("PATCH /api/leads/[id]/status error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi cập nhật trạng thái Lead" },
      },
      { status: 500 }
    );
  }
}
