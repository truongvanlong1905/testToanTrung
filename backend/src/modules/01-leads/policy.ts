import {
  canAccessAllLeadRecords,
  canAccessLeadsModule,
  canUserAccessLeadRecord,
  type UserSession,
} from "@/src/core/auth/auth";
import { AppError } from "@/src/core/http";

export function assertCanAccessLeadsModule(user: UserSession): void {
  if (!canAccessLeadsModule(user)) {
    throw new AppError(
      403,
      "Vai trò của bạn không có quyền truy cập phân hệ Quản lý Lead",
      "FORBIDDEN"
    );
  }
}

export function isLeadOwnerOrPrivileged(
  user: UserSession,
  lead: { salesPersonId?: string | null; createdById?: string | null }
): boolean {
  return canUserAccessLeadRecord(user, lead);
}

export function canAssignLead(
  user: UserSession,
  lead: { salesPersonId?: string | null; createdById?: string | null }
): boolean {
  return canUserAccessLeadRecord(user, lead);
}

export function assertCanViewLead(
  user: UserSession,
  lead: { salesPersonId?: string | null; createdById?: string | null }
): void {
  assertCanAccessLeadsModule(user);
  if (!canUserAccessLeadRecord(user, lead)) {
    throw new AppError(
      403,
      "Bạn không có quyền xem hồ sơ Lead của nhân sự kinh doanh khác",
      "FORBIDDEN"
    );
  }
}

export function assertCanModifyLead(
  user: UserSession,
  lead: { salesPersonId?: string | null; createdById?: string | null },
  forbiddenMessage: string
): void {
  assertCanAccessLeadsModule(user);
  if (!canUserAccessLeadRecord(user, lead)) {
    throw new AppError(403, forbiddenMessage, "FORBIDDEN");
  }
}

export function assertCanAssignLead(
  user: UserSession,
  lead: { salesPersonId?: string | null; createdById?: string | null },
  forbiddenMessage: string
): void {
  assertCanAccessLeadsModule(user);
  if (!canUserAccessLeadRecord(user, lead)) {
    throw new AppError(403, forbiddenMessage, "FORBIDDEN");
  }
}

export function assertCanApproveQuote(_user: UserSession): void {
  throw new AppError(
    403,
    "Hệ thống Mini CRM chỉ theo dõi trạng thái tiến độ báo giá, không sử dụng chức năng duyệt giá.",
    "PRICING_ENGINE_DISABLED"
  );
}

export function assertCanImportLeads(user: UserSession): void {
  assertCanAccessLeadsModule(user);
  if (
    !canAccessAllLeadRecords(user) &&
    user.role !== "SALES" &&
    user.role !== "MARKETING"
  ) {
    throw new AppError(
      403,
      "Chỉ nhân sự Kinh doanh, Marketing, Trưởng phòng, Giám đốc hoặc Admin mới được import dữ liệu Lead",
      "FORBIDDEN"
    );
  }
}

export function canUserSearchLeads(user: UserSession): boolean {
  return canAccessLeadsModule(user);
}
