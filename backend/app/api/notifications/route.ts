import { NextRequest } from "next/server";
import {
  listUserNotifications,
  markNotificationsRead,
} from "@/src/core/admin/notifications.service";
import { getCurrentUser } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

const logger = createLogger("core-notifications");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    const data = await listUserNotifications(user);
    logger.info({
      requestId,
      action: "GET /api/notifications",
      durationMs: Date.now() - startTime,
      status: 200,
    });
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/notifications",
      requestId,
      startTime,
      "Không thể tải danh sách thông báo"
    );
  }
}

export async function PATCH(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    const body = await req.json().catch(() => ({}));
    const data = await markNotificationsRead(user, {
      notificationKey: body?.notificationKey,
      markAll: Boolean(body?.markAll),
    });
    logger.info({
      requestId,
      action: "PATCH /api/notifications",
      durationMs: Date.now() - startTime,
      status: 200,
    });
    return apiSuccess(data, 200, {
      message: "Đã cập nhật trạng thái thông báo",
    });
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "PATCH /api/notifications",
      requestId,
      startTime,
      "Không thể cập nhật trạng thái thông báo"
    );
  }
}
