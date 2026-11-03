import type { UserSession } from "@/src/core/auth/auth";
import { AppError } from "@/src/core/http";

export function isBoardOrAdminUser(user: {
  role: string;
  actorType?: string;
}): boolean {
  return (
    user.role === "ADMIN" ||
    user.role === "DIRECTOR" ||
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR"
  );
}

export function buildReportVisibilityFilter(user: UserSession) {
  if (isBoardOrAdminUser(user)) {
    return {};
  }

  return {
    OR: [
      { createdBy: { role: { in: ["ADMIN", "DIRECTOR"] } } },
      { createdBy: { actorType: { in: ["ADMIN", "DIRECTOR"] } } },
      { createdById: user.userId },
    ],
  };
}

export function canUserAccessReportRecord(
  user: UserSession,
  report: {
    createdById: string;
    createdBy?: { role?: string; actorType?: string } | null;
  }
): boolean {
  if (isBoardOrAdminUser(user)) return true;
  if (report.createdById === user.userId) return true;
  const authorRole = report.createdBy?.role || "";
  const authorActor = report.createdBy?.actorType || "";
  if (
    authorRole === "ADMIN" ||
    authorRole === "DIRECTOR" ||
    authorActor === "ADMIN" ||
    authorActor === "DIRECTOR"
  ) {
    return true;
  }
  return false;
}

export function assertCanAccessReportRecord(
  user: UserSession,
  report: {
    createdById: string;
    createdBy?: { role?: string; actorType?: string } | null;
  }
): void {
  if (!canUserAccessReportRecord(user, report)) {
    throw new AppError(
      403,
      "Bạn không có quyền xem hoặc thao tác trên báo cáo của nhân sự khác.",
      "FORBIDDEN"
    );
  }
}
