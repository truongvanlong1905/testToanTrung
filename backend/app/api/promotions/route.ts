import { NextRequest } from "next/server";
import {
  handlePromotionAction,
  listPromotionDecisions,
} from "@/src/core/admin/promotions.service";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

export const dynamic = "force-dynamic";
const logger = createLogger("core-admin");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const data = await listPromotionDecisions();
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/promotions",
      requestId,
      startTime,
      "Lỗi tải danh sách thông báo bổ nhiệm"
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const result = await handlePromotionAction(user, body);
    return apiSuccess(result.data, result.status, { message: result.message });
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/promotions",
      requestId,
      startTime,
      "Lỗi xử lý quyết định bổ nhiệm"
    );
  }
}
