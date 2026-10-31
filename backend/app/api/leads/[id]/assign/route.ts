import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import { assignLeadSalesPerson } from "@/src/modules/01-leads/lead-assignment.service";

const logger = createLogger("01-leads");

export async function POST(
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
    const result = await assignLeadSalesPerson(user, id, body);
    return apiSuccess(
      { lead: result.lead, assignment: result.assignment },
      200,
      { message: result.message }
    );
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/leads/[id]/assign",
      requestId,
      startTime,
      "Lỗi chuyển bàn giao Lead"
    );
  }
}
