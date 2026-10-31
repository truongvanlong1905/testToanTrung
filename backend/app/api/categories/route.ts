import { NextRequest } from "next/server";
import { listProductCategories } from "@/src/core/admin/categories.service";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

export const dynamic = "force-dynamic";
const logger = createLogger("core-admin");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const data = await listProductCategories();
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/categories",
      requestId,
      startTime,
      "Lỗi tải danh mục sản phẩm"
    );
  }
}
