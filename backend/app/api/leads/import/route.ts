import { NextRequest } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/src/core/auth/auth";
import { apiSuccess, getRequestId, handleRouteError } from "@/src/core/http";
import { createLogger } from "@/src/core/logger";
import { bulkImportLeadsWithRoundRobin } from "@/src/modules/01-leads/lead-assignment.service";

const logger = createLogger("01-leads");

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const result = await bulkImportLeadsWithRoundRobin(user, body);
    return apiSuccess(
      {
        importedCount: result.importedCount,
        skippedDuplicates: result.skippedDuplicates,
        assignmentSummary: result.assignmentSummary,
      },
      200,
      { message: result.message }
    );
  } catch (error) {
    return handleRouteError(
      error,
      logger,
      "POST /api/leads/import",
      requestId,
      startTime,
      "Lỗi xử lý import danh sách Lead"
    );
  }
}
