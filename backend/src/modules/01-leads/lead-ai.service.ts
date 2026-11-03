import type { UserSession } from "@/src/core/auth/auth";
import { AppError } from "@/src/core/http";

export async function handleLeadAiAssist(
  _user: UserSession | null,
  _body: unknown
): Promise<never> {
  throw new AppError(
    403,
    "Theo quy định nghiệp vụ: không sử dụng AI cho phân hệ Quản lý Lead. Nhân viên nhập và kiểm tra thông tin khách hàng trực tiếp.",
    "AI_LEAD_DISABLED"
  );
}
