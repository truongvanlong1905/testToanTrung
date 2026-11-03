import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import { getReportById } from "@/src/modules/04-reports-dashboard/service";

const logger = createLogger("04-reports-dashboard");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const { id } = await params;
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const data = await getReportById(user, id);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/reports/[id]",
      requestId,
      startTime,
      "Không tải được chi tiết báo cáo"
    );
  }
}
