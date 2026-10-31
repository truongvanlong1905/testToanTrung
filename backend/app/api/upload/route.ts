import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/core/auth/auth";
import { AppError, apiSuccess, getRequestId } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import { handleFileUpload } from "@/src/core/storage/upload.service";

const logger = createLogger("core-storage");

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    const formData = await req.formData();
    const result = await handleFileUpload(user, formData);

    logger.info({
      requestId,
      action: "POST /api/upload",
      durationMs: Date.now() - startTime,
      status: 200,
    });
    return apiSuccess(result.data, 200, { message: result.message });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: error.errorCode, message: error.message },
        },
        { status: error.status }
      );
    }
    logger.error({
      requestId,
      action: "POST /api/upload",
      durationMs: Date.now() - startTime,
      status: 500,
      errorCode: "UPLOAD_ERROR",
      message: error instanceof Error ? error.message : "Upload error",
    });
    return NextResponse.json(
      {
        success: false,
        error: { code: "UPLOAD_ERROR", message: "Lỗi tải file lên máy chủ" },
      },
      { status: 500 }
    );
  }
}
