import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import { checkLeadDuplicate } from "@/src/modules/01-leads/service";

const logger = createLogger("01-leads");

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const data = await checkLeadDuplicate(user, body);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/leads/check-duplicate",
      requestId,
      startTime,
      "Lỗi kiểm tra trùng lặp"
    );
  }
}
