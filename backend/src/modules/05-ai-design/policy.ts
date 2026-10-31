import type { UserSession } from "@/src/core/auth/auth";
import { AppError } from "@/src/core/http";

export function assertCanUseAiDesign(user: UserSession | null): UserSession {
  if (!user) {
    throw new AppError(
      401,
      "Vui lòng đăng nhập để thực hiện thao tác này",
      "UNAUTHORIZED"
    );
  }
  return user;
}
