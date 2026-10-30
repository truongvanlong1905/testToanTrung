export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "SALES" | "MARKETING" | "DESIGN" | "ADS";
  initials: string;
}
