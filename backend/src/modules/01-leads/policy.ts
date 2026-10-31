import { canAccessAllLeads, type UserSession } from "@/src/core/auth/auth";
import { AppError } from "@/src/core/http";

export function isLeadOwnerOrPrivileged(
  user: UserSession,
  lead: { salesPersonId?: string | null; createdById?: string | null }
): boolean {
  return (
    canAccessAllLeads(user) ||
    !lead.salesPersonId ||
    lead.salesPersonId === user.userId ||
    lead.createdById === user.userId
  );
}

export function canAssignLead(
  user: UserSession,
  lead: { salesPersonId?: string | null }
): boolean {
  return (
    canAccessAllLeads(user) ||
    !lead.salesPersonId ||
    lead.salesPersonId === user.userId
  );
}

export function assertCanModifyLead(
  user: UserSession,
  lead: { salesPersonId?: string | null; createdById?: string | null },
  forbiddenMessage: string
): void {
  if (!isLeadOwnerOrPrivileged(user, lead)) {
    throw new AppError(403, forbiddenMessage, "FORBIDDEN");
  }
}

export function assertCanAssignLead(
  user: UserSession,
  lead: { salesPersonId?: string | null },
  forbiddenMessage: string
): void {
  if (!canAssignLead(user, lead)) {
    throw new AppError(403, forbiddenMessage, "FORBIDDEN");
  }
}

export function assertCanApproveQuote(user: UserSession): void {
  const isDirectorOrAdmin =
    user.actorType === "DIRECTOR" ||
    user.actorType === "ADMIN" ||
    user.role === "DIRECTOR" ||
    user.role === "ADMIN";

  if (!isDirectorOrAdmin) {
    throw new AppError(
      403,
      "Chỉ Tác nhân GIÁM ĐỐC (hoặc Admin) mới có thẩm quyền phê duyệt báo giá & chiết khấu vượt khung",
      "FORBIDDEN"
    );
  }
}

export function assertCanImportLeads(user: UserSession): void {
  if (
    !canAccessAllLeads(user) &&
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
  return (
    canAccessAllLeads(user) ||
    user.role === "SALES" ||
    user.department === "SALES"
  );
}
