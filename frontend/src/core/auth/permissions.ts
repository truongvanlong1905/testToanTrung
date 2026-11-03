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

export type AppTabId = WorkspaceTabId;

export const ALLOWED_TABS_BY_ROLE: Record<string, WorkspaceTabId[]> = {
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

export function canRoleAccessTab(role: string | undefined | null, tab: string): boolean {
  const normalizedRole = (role || "SALES").toUpperCase();
  const allowed = ALLOWED_TABS_BY_ROLE[normalizedRole] || ALLOWED_TABS_BY_ROLE.SALES;
  return allowed.includes(tab as WorkspaceTabId);
}
