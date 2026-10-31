import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import { changeLeadStatus } from "@/src/modules/01-leads/lead-status.service";

const logger = createLogger("01-leads");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await req.json();
    const result = await changeLeadStatus(user, id, body);
    return apiSuccess(
      { lead: result.lead, history: result.history },
      200,
      { message: result.message }
    );
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "PATCH /api/leads/[id]/status",
      requestId,
      startTime,
      "Lỗi cập nhật trạng thái Lead"
    );
  }
}
