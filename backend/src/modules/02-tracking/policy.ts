import { canAccessAllLeads, type UserSession } from "@/src/core/auth/auth";
import { AppError } from "@/src/core/http";

export function canUserAccessTracking(user: UserSession): boolean {
  return (
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR" ||
    user.role === "ADMIN" ||
    user.role === "DIRECTOR" ||
    user.role === "MARKETING" ||
    user.department === "MARKETING" ||
    user.role === "ADS" ||
    user.department === "ADS"
  );
}

export function assertCanViewTracking(user: UserSession): void {
  if (!canUserAccessTracking(user)) {
    throw new AppError(
      403,
      "Tài khoản của bạn không có quyền truy cập dữ liệu Tracking / Analytics",
      "FORBIDDEN"
    );
  }
}

export function assertCanTriggerSync(user: UserSession): void {
  if (!canUserAccessTracking(user)) {
    throw new AppError(
      403,
      "Chỉ nhân sự Marketing, Quảng cáo, Giám đốc hoặc Admin mới có quyền đồng bộ Tracking",
      "FORBIDDEN"
    );
  }
}

export function canViewTrackingLeadPhone(user: UserSession): boolean {
  return canAccessAllLeads(user);
}
