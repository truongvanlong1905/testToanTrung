import { NextRequest } from "next/server";
import { registerUser } from "@/src/core/auth/auth.service";
import { getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

const logger = createLogger("core-auth");

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const body = await req.json().catch(() => ({}));
    return await registerUser(body, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/auth/register",
      requestId,
      startTime,
      "Lỗi xử lý đăng ký tài khoản từ máy chủ"
    );
  }
}
