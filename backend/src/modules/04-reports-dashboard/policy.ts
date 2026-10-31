import type { UserSession } from "@/src/core/auth/auth";

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
