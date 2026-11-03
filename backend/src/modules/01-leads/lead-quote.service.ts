import type { UserSession } from "@/src/core/auth/auth";
import { AppError } from "@/src/core/http";

export async function listLeadQuotes(_leadId: string) {
  return { quotes: [] };
}

export async function createLeadQuote(
  _user: UserSession,
  _leadId: string,
  _body: unknown
): Promise<never> {
  throw new AppError(
    403,
    "Hệ thống Mini CRM chỉ theo dõi trạng thái tiến độ báo giá, không sử dụng bộ tính tiền hoặc phê duyệt giá.",
    "PRICING_ENGINE_DISABLED"
  );
}

export async function approveOrRejectLeadQuote(
  _user: UserSession,
  _leadId: string,
  _body: unknown
): Promise<never> {
  throw new AppError(
    403,
    "Hệ thống Mini CRM chỉ theo dõi trạng thái tiến độ báo giá, không sử dụng chức năng phê duyệt giá.",
    "PRICING_ENGINE_DISABLED"
  );
}
