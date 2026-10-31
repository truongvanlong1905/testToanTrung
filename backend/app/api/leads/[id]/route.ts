import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import { getLeadDetails, updateLead } from "@/src/modules/01-leads/service";

const logger = createLogger("01-leads");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const data = await getLeadDetails(user, id);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/leads/[id]",
      requestId,
      startTime,
      "Lỗi tải chi tiết Lead"
    );
  }
}

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
    const result = await updateLead(user, id, body);
    return apiSuccess({ lead: result.lead }, 200, { message: result.message });
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "PATCH /api/leads/[id]",
      requestId,
      startTime,
      "Lỗi cập nhật thông tin Lead"
    );
  }
}
