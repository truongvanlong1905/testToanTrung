import type { UserSession } from "@/src/core/auth/auth";
import { canAccessAiDesignModule } from "@/src/core/auth/permissions";
import { AppError } from "@/src/core/http";

export function assertCanUseAiDesign(user: UserSession | null): UserSession {
  if (!user) {
    throw new AppError(
      401,
      "Vui lòng đăng nhập để thực hiện thao tác này",
      "UNAUTHORIZED"
    );
  }
  if (!canAccessAiDesignModule(user)) {
    throw new AppError(
      403,
      "Tài khoản của bạn không có quyền truy cập phân hệ Hỗ trợ Thiết kế",
      "FORBIDDEN"
    );
  }
  return user;
}
