import type { LegacyRoleType, UserSession } from "./auth-types";

export type WorkspaceTabId =
  | "overview"
  | "leads"
  | "tracking"
  | "ads"
  | "reports"
  | "ai-design"
  | "notifications"
  | "profile"
  | "users"
  | "brand"
  | "settings";

export const ALLOWED_TABS_BY_ROLE: Record<LegacyRoleType, WorkspaceTabId[]> = {
  SALES: ["overview", "leads", "reports", "notifications", "profile"],
  MARKETING: [
    "overview",
    "leads",
    "tracking",
    "ads",
    "reports",
    "ai-design",
    "notifications",
    "profile",
  ],
  ADS: ["overview", "tracking", "ads", "reports", "notifications", "profile"],
  DESIGN: ["overview", "ai-design", "reports", "notifications", "profile"],
  DIRECTOR: [
    "overview",
    "leads",
    "tracking",
    "ads",
    "reports",
    "ai-design",
    "notifications",
    "profile",
    "users",
  ],
  ADMIN: [
    "overview",
    "leads",
    "tracking",
    "ads",
    "reports",
    "ai-design",
    "notifications",
    "profile",
    "users",
    "brand",
    "settings",
  ],
};

export function isSalesManager(user: Pick<UserSession, "role" | "department" | "position">): boolean {
  if (user.role !== "SALES" && user.department !== "SALES") return false;
  if (!user.position) return false;
  const normalized = user.position.trim().toLowerCase();
  return (
    normalized.includes("trưởng phòng") ||
    normalized.includes("trưởng ban") ||
    normalized.includes("phó phòng") ||
    normalized.includes("trưởng nhóm") ||
    normalized.includes("giám đốc")
  );
}

export function canAccessLeadsModule(user: UserSession): boolean {
  return (
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR" ||
    user.role === "ADMIN" ||
    user.role === "DIRECTOR" ||
    user.role === "MARKETING" ||
    user.role === "SALES"
  );
}

export function canAccessAllLeadRecords(user: UserSession): boolean {
  if (!canAccessLeadsModule(user)) return false;
  return (
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR" ||
    user.role === "ADMIN" ||
    user.role === "DIRECTOR" ||
    user.role === "MARKETING" ||
    isSalesManager(user)
  );
}

export function canUserAccessLeadRecord(
  user: UserSession,
  lead: { salesPersonId?: string | null; createdById?: string | null }
): boolean {
  if (!canAccessLeadsModule(user)) return false;
  if (canAccessAllLeadRecords(user)) return true;
  // Regular SALES user: only leads currently assigned to them, or unassigned leads they just created
  if (lead.salesPersonId === user.userId) return true;
  if (!lead.salesPersonId && lead.createdById === user.userId) return true;
  return false;
}

export function canAccessTrackingModule(user: UserSession): boolean {
  return (
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR" ||
    user.role === "ADMIN" ||
    user.role === "DIRECTOR" ||
    user.role === "MARKETING" ||
    user.role === "ADS"
  );
}

export function canAccessAdsModule(user: UserSession): boolean {
  return (
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR" ||
    user.role === "ADMIN" ||
    user.role === "DIRECTOR" ||
    user.role === "MARKETING" ||
    user.role === "ADS"
  );
}

export function canAccessAiDesignModule(user: UserSession): boolean {
  return (
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR" ||
    user.role === "ADMIN" ||
    user.role === "DIRECTOR" ||
    user.role === "MARKETING" ||
    user.role === "DESIGN"
  );
}

export function canAccessTab(user: UserSession, tab: WorkspaceTabId): boolean {
  const allowed = ALLOWED_TABS_BY_ROLE[user.role] || ALLOWED_TABS_BY_ROLE.SALES;
  return allowed.includes(tab);
}
