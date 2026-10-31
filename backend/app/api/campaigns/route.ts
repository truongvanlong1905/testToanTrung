import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import {
  createCampaign,
  getCampaignsAndKeywords,
  updateCampaignBudgetOrStatus,
} from "@/src/modules/03-ads-keywords/service";

export const dynamic = "force-dynamic";
const logger = createLogger("03-ads-keywords");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const data = await getCampaignsAndKeywords(user);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/campaigns",
      requestId,
      startTime,
      "Lỗi tải số liệu phân tích Ads"
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
    const result = await createCampaign(user, body);
    return apiSuccess(
      { campaign: result.campaign },
      201,
      { message: result.message }
    );
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/campaigns",
      requestId,
      startTime,
      "Lỗi tạo chiến dịch quảng cáo"
    );
  }
}

export async function PATCH(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const result = await updateCampaignBudgetOrStatus(user, body);
    return apiSuccess(
      { campaign: result.campaign },
      200,
      { message: result.message }
    );
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "PATCH /api/campaigns",
      requestId,
      startTime,
      "Lỗi cập nhật chiến dịch quảng cáo"
    );
  }
}
