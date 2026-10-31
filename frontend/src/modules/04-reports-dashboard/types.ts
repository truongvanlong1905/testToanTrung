export interface ReportItem {
  id: string;
  title: string;
  content: string;
  department: string;
  attachmentName: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  isRead: boolean;
  createdBy: {
    name: string;
    role: string;
    initials: string;
  };
}

export interface OverviewStats {
  total: number;
  newLeads: number;
  quotingLeads: number;
  wonLeads: number;
  lostLeads: number;
  salesLeaderboard: { name: string; initials: string; count: number }[];
}

export interface PromotionItem {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discountPercent: number;
  validUntil?: string | null;
  isActive: boolean;
  createdAt: string;
}
