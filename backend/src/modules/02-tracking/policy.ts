import { canAccessAllLeads, type UserSession } from "@/src/core/auth/auth";
import { canAccessTrackingModule } from "@/src/core/auth/permissions";
import { AppError } from "@/src/core/http";

export function canUserAccessTracking(user: UserSession): boolean {
  return canAccessTrackingModule(user);
}

export function assertCanViewTracking(user: UserSession): void {
  if (!canUserAccessTracking(user)) {
    throw new AppError(
      403,
      "Tài khoản của bạn không có quyền truy cập dữ liệu Tracking.",
      "FORBIDDEN"
    );
  }
}

export function assertCanTriggerSync(user: UserSession): void {
  if (!canUserAccessTracking(user)) {
    throw new AppError(
      403,
      "Chỉ nhân sự Marketing, Quảng cáo, Giám đốc hoặc Quản trị viên mới có quyền đồng bộ Tracking.",
      "FORBIDDEN"
    );
  }
}

export function canViewTrackingLeadPhone(user: UserSession): boolean {
  return canAccessAllLeads(user);
}
