import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import { handleLeadAiAssist } from "@/src/modules/01-leads/lead-ai.service";

export const runtime = "nodejs";
const logger = createLogger("01-leads");

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json().catch(() => ({}));
    return await handleLeadAiAssist(user, body);
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/leads/ai-assist",
      requestId,
      startTime,
      "Lỗi xử lý Trợ lý AI Quản lý Lead"
    );
  }
}
