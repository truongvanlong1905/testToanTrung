import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import {
  createLeadActivity,
  listLeadActivities,
} from "@/src/modules/01-leads/service";

const logger = createLogger("01-leads");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const data = await listLeadActivities(id);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/leads/[id]/activities",
      requestId,
      startTime,
      "Lỗi tải nhật ký chăm sóc"
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await req.json();
    const result = await createLeadActivity(user, id, body);
    return apiSuccess(result.data, 201, { message: result.message });
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/leads/[id]/activities",
      requestId,
      startTime,
      "Lỗi lưu nhật ký chăm sóc"
    );
  }
}
