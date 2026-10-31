import { NextRequest } from "next/server";
import {
  getUserOwnProfile,
  updateUserOwnProfile,
} from "@/src/core/admin/users.service";
import { getCurrentUser } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

const logger = createLogger("core-admin");

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const session = await getCurrentUser(req);
    const data = await getUserOwnProfile(session);
    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "GET /api/users/profile",
      requestId,
      startTime,
      "Lỗi tải thông tin hồ sơ"
    );
  }
}

async function handleUpdateProfile(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const session = await getCurrentUser(req);
    const body = await req.json();
    const result = await updateUserOwnProfile(session, body);

    const response = apiSuccess(
      { user: result.user },
      200,
      { message: result.message }
    );
    response.cookies.set(result.cookieOptions);
    return response;
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "PATCH /api/users/profile",
      requestId,
      startTime,
      "Lỗi cập nhật hồ sơ cá nhân"
    );
  }
}

export async function PATCH(req: NextRequest) {
  return handleUpdateProfile(req);
}

export async function POST(req: NextRequest) {
  return handleUpdateProfile(req);
}
