import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import { createLead, listLeads } from "@/src/modules/01-leads/service";

const logger = createLogger("01-leads");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const result = await listLeads(user, {
      search: searchParams.get("search"),
      status: searchParams.get("status"),
      source: searchParams.get("source"),
      salesId: searchParams.get("salesId"),
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
    });

    return apiSuccess(result.data, 200, { meta: result.meta });
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/leads",
      requestId,
      startTime,
      "Lỗi tải danh sách Lead"
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const result = await createLead(user, body);

    logger.info({
      requestId,
      action: "POST /api/leads",
      durationMs: Date.now() - startTime,
      status: 201,
    });
    return apiSuccess({ lead: result.lead }, 201, { message: result.message });
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/leads",
      requestId,
      startTime,
      "Lỗi tạo Lead mới"
    );
  }
}
