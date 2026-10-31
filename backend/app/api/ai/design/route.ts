import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/core/auth/auth";
import { AppError, apiSuccess, getRequestId } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import {
  generateDesignOrder,
  listDesignOrders,
} from "@/src/modules/05-ai-design/service";

export const runtime = "nodejs";
const logger = createLogger("05-ai-design");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    const data = await listDesignOrders(user);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.errorCode, message: error.message } },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi kiểm tra cấu hình AI Design" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    const formData = await req.formData();
    const data = await generateDesignOrder(user, formData);

    logger.info({
      requestId,
      action: "POST /api/ai/design",
      durationMs: Date.now() - startTime,
      status: 200,
    });
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.errorCode, message: error.message } },
        { status: error.status }
      );
    }
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Gemini phản hồi quá lâu. Vui lòng thử lại."
        : "Không thể kết nối dịch vụ Gemini.";
    logger.error({
      requestId,
      action: "POST /api/ai/design",
      durationMs: Date.now() - startTime,
      status: 502,
      errorCode: "AI_REQUEST_FAILED",
      message,
    });
    return NextResponse.json(
      { success: false, error: { code: "AI_REQUEST_FAILED", message } },
      { status: 502 }
    );
  }
}
