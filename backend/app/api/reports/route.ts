import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import {
  createReport,
  listReports,
  markAllReportsRead,
} from "@/src/modules/04-reports-dashboard/service";

const logger = createLogger("04-reports-dashboard");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse("Vui lòng đăng nhập");

  try {
    const data = await listReports(user);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/reports",
      requestId,
      startTime,
      "Không tải được danh sách thông báo & báo cáo"
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse("Vui lòng đăng nhập");

  try {
    const body = await req.json();
    const result = await createReport(user, body);
    return apiSuccess(
      { report: result.report },
      201,
      { message: result.message }
    );
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/reports",
      requestId,
      startTime,
      "Không gửi được thông báo"
    );
  }
}

export async function PATCH(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse("Vui lòng đăng nhập");

  try {
    const result = await markAllReportsRead(user);
    return apiSuccess(
      { markedCount: result.markedCount },
      200,
      { message: result.message }
    );
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "PATCH /api/reports",
      requestId,
      startTime,
      "Không thể đánh dấu đã đọc toàn bộ"
    );
  }
}
