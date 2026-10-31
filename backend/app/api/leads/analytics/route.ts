import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import { getLeadAnalytics } from "@/src/modules/01-leads/service";

export const dynamic = "force-dynamic";
const logger = createLogger("01-leads");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const data = await getLeadAnalytics(user, {
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/leads/analytics",
      requestId,
      startTime,
      "Không thể tổng hợp số liệu Lead"
    );
  }
}
