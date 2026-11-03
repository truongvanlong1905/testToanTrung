import type { UserSession } from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { AppError } from "@/src/core/http";
import { OFFICIAL_LEAD_STATUSES } from "./contracts";
import { assertCanModifyLead } from "./policy";
import { findLeadById, logLeadAudit } from "./repository";

export async function changeLeadStatus(
  user: UserSession,
  leadId: string,
  body: {
    status?: string;
    reason?: string;
    customerResponded?: boolean;
    customerResponseNote?: string;
  }
) {
  const { status, reason, customerResponded, customerResponseNote } = body || {};

  if (!status) {
    throw new AppError(400, "Vui lòng chọn trạng thái mới", "VALIDATION_ERROR");
  }

  if (
    !OFFICIAL_LEAD_STATUSES.includes(
      status as (typeof OFFICIAL_LEAD_STATUSES)[number]
    )
  ) {
    throw new AppError(
      400,
      `Trạng thái không hợp lệ. Chỉ chấp nhận 5 trạng thái chuẩn: ${OFFICIAL_LEAD_STATUSES.join(", ")}`,
      "INVALID_STATUS"
    );
  }

  const isFailureStatus = status === "Thất bại";

  if (isFailureStatus && (!reason || reason.trim().length === 0)) {
    throw new AppError(
      400,
      "Khi chuyển sang trạng thái Thất bại, bắt buộc phải nhập lý do thất bại",
      "REASON_REQUIRED"
    );
  }

  const existing = await findLeadById(leadId);
  if (!existing) {
    throw new AppError(404, "Không tìm thấy hồ sơ Lead", "NOT_FOUND");
  }

  assertCanModifyLead(
    user,
    existing,
    "Chỉ nhân sự phụ trách Lead này hoặc cấp quản lý mới được đổi trạng thái"
  );

  const fromStatus = existing.status;
  const now = new Date();

  let nextQuoteSentAt = existing.quoteSentAt;
  if (
    (status === "Đã gửi báo giá" || status === "Chốt thành công") &&
    !nextQuoteSentAt
  ) {
    nextQuoteSentAt = now;
  }

  let nextCustomerRespondedAt = existing.customerRespondedAt;
  let nextCustomerResponseNote = existing.customerResponseNote;

  if (customerResponded === true) {
    nextCustomerRespondedAt = nextCustomerRespondedAt || now;
    if (customerResponseNote !== undefined) {
      nextCustomerResponseNote = customerResponseNote.trim() || null;
    }
  } else if (customerResponded === false) {
    nextCustomerRespondedAt = null;
    nextCustomerResponseNote = null;
  } else if (
    (status === "Chốt thành công" || status === "Thất bại") &&
    nextQuoteSentAt &&
    !nextCustomerRespondedAt
  ) {
    nextCustomerRespondedAt = now;
    nextCustomerResponseNote =
      status === "Chốt thành công"
        ? reason?.trim() || "Khách hàng đã phản hồi đồng ý chốt đơn"
        : reason?.trim() || "Khách hàng phản hồi từ chối / tạm dừng";
  }

  const [updated, history] = await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        status,
        failureReason: status === "Thất bại" ? reason?.trim() || null : null,
        quoteSentAt: nextQuoteSentAt,
        customerRespondedAt: nextCustomerRespondedAt,
        customerResponseNote: nextCustomerResponseNote,
      },
    }),
    prisma.leadStatusHistory.create({
      data: {
        leadId,
        fromStatus,
        toStatus: status,
        reason:
          reason?.trim() || `Chuyển trạng thái từ "${fromStatus}" sang "${status}"`,
        changedById: user.userId,
      },
    }),
  ]);

  await logLeadAudit({
    userId: user.userId,
    leadId,
    action: "CHANGE_STATUS",
    details: JSON.stringify({
      fromStatus,
      toStatus: status,
      reason: reason?.trim() || null,
      quoteSentAt: nextQuoteSentAt?.toISOString() || null,
      customerRespondedAt: nextCustomerRespondedAt?.toISOString() || null,
    }),
  });

  return {
    message: `Đã cập nhật trạng thái sang "${status}" thành công`,
    lead: updated,
    history,
  };
}
