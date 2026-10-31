import { NextRequest } from "next/server";
import { createUserByAdmin, listUsers } from "@/src/core/admin/users.service";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

const logger = createLogger("core-admin");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const session = await getCurrentUser(req);
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const data = await listUsers(session, {
      role: searchParams.get("role"),
      actorType: searchParams.get("actorType"),
      includeAll: searchParams.get("all") === "true",
    });

    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/users",
      requestId,
      startTime,
      "Lỗi tải danh sách nhân viên"
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const session = await getCurrentUser(req);
    if (!session) return unauthorizedResponse();

    const body = await req.json();
    const result = await createUserByAdmin(session, body);

    return apiSuccess({ user: result.user }, 200, { message: result.message });
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/users",
      requestId,
      startTime,
      "Lỗi tạo tài khoản nhân viên"
    );
  }
}
