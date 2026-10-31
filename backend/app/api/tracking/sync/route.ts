import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { AppError, apiSuccess, getRequestId } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import {
  executeSyncAction,
  getSyncOverview,
} from "@/src/modules/02-tracking/service";

const logger = createLogger("02-tracking");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const data = await getSyncOverview(user);
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.errorCode, message: error.message } },
        { status: error.status }
      );
    }
    logger.error({
      requestId,
      action: "GET /api/tracking/sync",
      durationMs: Date.now() - startTime,
      status: 500,
      errorCode: "SYNC_ERROR",
      message: "Không thể tải danh sách kết nối đồng bộ",
    });
    return NextResponse.json(
      { success: false, error: { code: "SYNC_ERROR", message: "Không thể kiểm tra kết nối đồng bộ" } },
      { status: 500 }
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
    const result = await executeSyncAction(user, body);

    return NextResponse.json(
      {
        success: false,
        message: result.errorMessage,
        error: {
          code: result.status,
          message: result.errorMessage,
        },
        data: { job: result.job },
      },
      { status: result.httpStatus }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.errorCode, message: error.message } },
        { status: error.status }
      );
    }
    logger.error({
      requestId,
      action: "POST /api/tracking/sync",
      durationMs: Date.now() - startTime,
      status: 500,
      errorCode: "SYNC_ERROR",
      message: error instanceof Error ? error.message : "Sync error",
    });
    return NextResponse.json(
      {
        success: false,
        error: { code: "SYNC_ERROR", message: "Không thể kiểm tra kết nối đồng bộ" },
      },
      { status: 500 }
    );
  }
}
