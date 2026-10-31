import type { UserSession } from "@/src/core/auth/auth";
import { AppError } from "@/src/core/http";

export function canUserViewAds(user: UserSession): boolean {
  return (
    user.role === "ADS" ||
    user.department === "ADS" ||
    user.role === "MARKETING" ||
    user.department === "MARKETING" ||
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR" ||
    user.role === "ADMIN" ||
    user.role === "DIRECTOR"
  );
}

export function canUserManageAds(user: UserSession): boolean {
  return (
    user.role === "ADS" ||
    user.department === "ADS" ||
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR" ||
    user.role === "ADMIN" ||
    user.role === "DIRECTOR"
  );
}

export function assertCanViewAds(user: UserSession): void {
  if (!canUserViewAds(user)) {
    throw new AppError(
      403,
      "Quyền bị từ chối: Tài khoản thuộc bộ phận khác không được truy cập API dữ liệu phòng Quảng cáo (ADS)",
      "FORBIDDEN"
    );
  }
}

export function assertCanManageAds(user: UserSession): void {
  if (!canUserManageAds(user)) {
    throw new AppError(
      403,
      "Quyền bị từ chối: Chỉ nhân sự bộ phận ADS hoặc Ban Giám Đốc mới có quyền tạo và chỉnh sửa chiến dịch quảng cáo.",
      "FORBIDDEN"
    );
  }
}
