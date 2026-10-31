import { NextRequest } from "next/server";
import { globalSearch } from "@/src/core/admin/search.service";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

const logger = createLogger("core-admin");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const rawQuery = req.nextUrl.searchParams.get("q") || "";
    const data = await globalSearch(user, rawQuery);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/search",
      requestId,
      startTime,
      "Tìm kiếm không thành công"
    );
  }
}
