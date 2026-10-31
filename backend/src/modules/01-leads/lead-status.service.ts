import type { UserSession } from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { AppError } from "@/src/core/http";
import { assertCanModifyLead } from "./policy";
import { findLeadById, logLeadAudit } from "./repository";

export async function changeLeadStatus(
  user: UserSession,
  leadId: string,
  body: { status?: string; reason?: string }
) {
  const { status, reason } = body || {};

  if (!status) {
    throw new AppError(400, "Vui lòng chọn trạng thái mới", "VALIDATION_ERROR");
  }

  const isFailureStatus =
    status === "Thất bại" ||
    status.toLowerCase().includes("thất bại") ||
    status.toLowerCase().includes("that bai") ||
    status.toLowerCase().includes("th?t b?i");

  if (isFailureStatus && (!reason || reason.trim().length === 0)) {
    throw new AppError(
      400,
      "Khi chuyển sang trạng thái Thất bại, bắt buộc phải nhập lý do thất bại",
      "REASON_REQUIRED"
    );
  }

  const existing = await findLeadById(leadId);
  if (!existing) {
    throw new AppError(404, "Không tìm thấy khách hàng", "NOT_FOUND");
  }

  assertCanModifyLead(
    user,
    existing,
    "Chỉ nhân sự phụ trách Lead này hoặc cấp Trưởng phòng / Trưởng ban / Giám đốc / Admin mới được đổi trạng thái"
  );

  const fromStatus = existing.status;

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      status,
      failureReason: status === "Thất bại" ? reason : null,
    },
  });

  const history = await prisma.leadStatusHistory.create({
    data: {
      leadId,
      fromStatus,
      toStatus: status,
      reason: reason || `Chuyển trạng thái từ ${fromStatus} sang ${status}`,
      changedById: user.userId,
    },
  });

  await logLeadAudit({
    userId: user.userId,
    leadId,
    action: "CHANGE_STATUS",
    details: JSON.stringify({
      fromStatus,
      toStatus: status,
      reason,
    }),
  });

  return {
    message: `Đã cập nhật trạng thái sang "${status}" thành công`,
    lead: updated,
    history,
  };
}
