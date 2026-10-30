export type SystemActorType = "ADMIN" | "DIRECTOR" | "USER";

export type LegacyRoleType =
  | "ADMIN"
  | "DIRECTOR"
  | "SALES"
  | "MARKETING"
  | "DESIGN"
  | "ADS";

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: LegacyRoleType;
  actorType?: SystemActorType;
  department?: string;
  position?: string;
  initials: string;
}
