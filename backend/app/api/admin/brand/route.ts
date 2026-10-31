import { NextRequest } from "next/server";
import { getBrandSettings, updateBrandSettings } from "@/src/core/admin/brand.service";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

export const dynamic = "force-dynamic";
const logger = createLogger("core-admin");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const data = await getBrandSettings();
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/admin/brand",
      requestId,
      startTime,
      "Lỗi tải cấu hình thương hiệu"
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
    const result = await updateBrandSettings(user, body);
    return apiSuccess(
      { setting: result.setting },
      200,
      { message: result.message }
    );
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "PATCH /api/admin/brand",
      requestId,
      startTime,
      "Lỗi lưu cấu hình thương hiệu"
    );
  }
}
