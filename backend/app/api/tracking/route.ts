import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { AppError, apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import {
  getTrackingOverview,
  recordTrackingEvent,
  validateTrackingOriginOrThrow,
} from "@/src/modules/02-tracking/service";

export const dynamic = "force-dynamic";
const logger = createLogger("02-tracking");

export async function OPTIONS(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const origin = validateTrackingOriginOrThrow(req.headers.get("origin"));
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "OPTIONS /api/tracking",
      requestId,
      startTime,
      "Website chưa được phép gửi tracking."
    );
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const data = await getTrackingOverview(user);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/tracking",
      requestId,
      startTime,
      "Lỗi tải dữ liệu Tracking"
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  let corsHeaders: HeadersInit | undefined;
  try {
    const origin = validateTrackingOriginOrThrow(req.headers.get("origin"));
    corsHeaders = { "Access-Control-Allow-Origin": origin, Vary: "Origin" };

    const ip =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const forwardedIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    const body = await req.json();
    const result = await recordTrackingEvent({
      originHeader: origin,
      ip,
      forwardedIp,
      body,
    });

    if (result.rateLimited) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Đã vượt giới hạn ghi nhận tracking. Vui lòng thử lại sau.",
          },
        },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Retry-After": String(result.retryAfter),
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Ghi nhận Tracking Event thành công",
        data: { event: result.event },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return handleRouteError(
        error,
        logger,
        "POST /api/tracking",
        requestId,
        startTime,
        "Lỗi ghi nhận Tracking",
        corsHeaders
      );
    }
    return handleRouteError(
      error,
      logger,
      "POST /api/tracking",
      requestId,
      startTime,
      "Lỗi ghi nhận Tracking",
      corsHeaders
    );
  }
}
