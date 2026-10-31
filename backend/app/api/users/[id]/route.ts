import { NextRequest } from "next/server";
import { updateUserByAdmin } from "@/src/core/admin/users.service";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";

const logger = createLogger("core-admin");

async function handleAdminUpdateUser(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const session = await getCurrentUser(req);
    if (!session) return unauthorizedResponse();

    const { id } = await params;
    const body = await req.json();
    const result = await updateUserByAdmin(session, id, body);

    return apiSuccess({ user: result.user }, 200, { message: result.message });
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "PATCH /api/users/[id]",
      requestId,
      startTime,
      error instanceof Error ? error.message : "Lỗi cập nhật tài khoản"
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleAdminUpdateUser(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleAdminUpdateUser(req, context);
}
