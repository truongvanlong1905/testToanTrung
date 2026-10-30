export type LeadStatus =
  | "Vừa nhận thông tin"
  | "Đang soạn báo giá"
  | "Đã gửi báo giá"
  | "Chốt thành công"
  | "Thất bại";

export type LeadSource =
  | "Hotline"
  | "Form"
  | "Email"
  | "Facebook Ads"
  | "Google Ads"
  | "Website"
  | "Giới thiệu"
  | "Triển lãm";

export interface StatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedBy: string;
  createdAt: string;
}

export interface AssignmentItem {
  id: string;
  fromSales: string | null;
  toSales: string;
  reason: string | null;
  assignedBy: string;
  createdAt: string;
}

export interface AttachmentItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType: string;
  uploadedBy?: string;
  createdAt: string;
}

export type LeadActivityType = "CALL" | "ZALO" | "SURVEY" | "QUOTATION" | "MEETING" | "NOTE";

export interface LeadActivityItem {
  id: string;
  type: LeadActivityType | string;
  summary: string;
  outcome?: string | null;
  nextFollowUpAt?: string | null;
  createdBy: string;
  createdByInitials?: string;
  createdAt: string;
}

export type LeadQuoteStatus = "DRAFT" | "PENDING_DIRECTOR" | "DIRECTOR_APPROVED" | "SENT" | "ACCEPTED";

export interface LeadQuoteItem {
  id: string;
  code: string;
  moduleSpec: string;
  widthMeters: number;
  heightMeters: number;
  areaSqm: number;
  unitPriceVnd: number;
  processorVnd: number;
  structureInstallVnd: number;
  discountPercent: number;
  totalVnd: number;
  warrantyMonths: number;
  notes?: string | null;
  status: LeadQuoteStatus | string;
  approvedByName?: string | null;
  createdBy: string;
  createdAt: string;
}

export type LeadPriorityTier = "HOT" | "WARM" | "COLD";
export type LeadSlaStatus = "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "COMPLETED";

export interface Lead {
  id: string;
  code: string;
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  product: string;
  category: "LED trong nhà" | "LED ngoài trời" | "Bảng điện tử" | "Màn hình cong / đặc thù" | "Khác" | string;
  categoryId?: string;
  source: LeadSource | string;
  status: LeadStatus;
  failureReason?: string | null;
  salesPerson: {
    id?: string;
    name: string;
    avatar?: string;
    initials: string;
    email?: string;
  };
  salesPersonId?: string;
  estimatedValue: string;
  installationAddress?: string;
  location: string;
  notes: string;
  createdAt: string;
  priorityScore?: number;
  priorityTier?: LeadPriorityTier | string;
  slaStatus?: LeadSlaStatus | string;
  slaLabel?: string;
  nextFollowUpAt?: string | null;
  nextActionNote?: string | null;
  ledWidth?: number | null;
  ledHeight?: number | null;
  ledModuleType?: string | null;
  discountPercent?: number;
  directorApprovalStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | string;
  directorApprovedByName?: string | null;
  directorApprovalNote?: string | null;
  activitiesCount?: number;
  quotesCount?: number;
  statusHistory?: StatusHistoryItem[];
  assignments?: AssignmentItem[];
  attachments?: AttachmentItem[];
  attachmentsCount?: number;
  activities?: LeadActivityItem[];
  quotes?: LeadQuoteItem[];
}
