import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/core/auth/auth";
import { logoutUser } from "@/src/core/auth/auth.service";
import { getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

const logger = createLogger("core-auth");

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    const result = await logoutUser(user, {
      ip: req.headers.get("x-forwarded-for") || "localhost",
      userAgent: req.headers.get("user-agent"),
    });

    const response = NextResponse.json({
      success: true,
      message: "Đăng xuất thành công",
    });
    response.cookies.set(result.cookieOptions);

    logger.info({
      requestId,
      action: "POST /api/auth/logout",
      durationMs: Date.now() - startTime,
      status: 200,
    });
    return response;
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/auth/logout",
      requestId,
      startTime,
      "Lỗi đăng xuất"
    );
  }
}
