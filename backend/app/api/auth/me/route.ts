import { NextRequest } from "next/server";
import { getCurrentUser } from "@/src/core/auth/auth";
import { getMeProfile } from "@/src/core/auth/auth.service";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

const logger = createLogger("core-auth");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const session = await getCurrentUser(req);
    const data = await getMeProfile(session);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/auth/me",
      requestId,
      startTime,
      "Lỗi kiểm tra phiên đăng nhập"
    );
  }
}
