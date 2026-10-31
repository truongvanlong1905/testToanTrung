import { NextRequest } from "next/server";
import { createDepartment, listDepartments } from "@/src/core/admin/departments.service";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

export const dynamic = "force-dynamic";
const logger = createLogger("core-admin");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const data = await listDepartments();
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/departments",
      requestId,
      startTime,
      "Không thể tải danh sách phòng ban"
    );
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const result = await createDepartment(user, body);
    return apiSuccess(
      { department: result.department },
      201,
      { message: result.message }
    );
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/departments",
      requestId,
      startTime,
      "Lỗi tạo phòng ban mới"
    );
  }
}
