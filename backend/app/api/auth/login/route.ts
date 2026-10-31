import { NextRequest } from "next/server";
import { loginUser } from "@/src/core/auth/auth.service";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

const logger = createLogger("core-auth");

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const body = await req.json();
    const result = await loginUser(body, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });

    const response = apiSuccess(
      { user: result.user },
      200,
      { message: "Đăng nhập thành công" }
    );
    response.cookies.set(result.cookieOptions);

    logger.info({
      requestId,
      action: "POST /api/auth/login",
      durationMs: Date.now() - startTime,
      status: 200,
    });
    return response;
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/auth/login",
      requestId,
      startTime,
      "Lỗi xử lý đăng nhập từ máy chủ"
    );
  }
}
