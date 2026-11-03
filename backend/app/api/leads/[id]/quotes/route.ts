import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import {
  approveOrRejectLeadQuote,
  createLeadQuote,
  listLeadQuotes,
} from "@/src/modules/01-leads/lead-quote.service";

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
    const data = await listLeadQuotes(id);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/leads/[id]/quotes",
      requestId,
      startTime,
      "Lỗi tải danh sách báo giá LED"
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
    const body = await req.json().catch(() => ({}));
    return await createLeadQuote(user, id, body);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/leads/[id]/quotes",
      requestId,
      startTime,
      "Lỗi khởi tạo báo giá LED"
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    return await approveOrRejectLeadQuote(user, id, body);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "PATCH /api/leads/[id]/quotes",
      requestId,
      startTime,
      "Lỗi phê duyệt báo giá"
    );
  }
}
