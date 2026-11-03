export type LeadStatus =
  | "Vừa nhận thông tin"
  | "Đang soạn báo giá"
  | "Đã gửi báo giá"
  | "Chốt thành công"
  | "Thất bại";

export type LeadSource =
  | "Hotline"
  | "Form"
  | "Zalo"
  | "Email"
  | "Facebook Ads"
  | "Google Ads"
  | "Website"
  | "Giới thiệu"
  | "Triển lãm"
  | "Khác";

export type LeadDemandType = "Mua" | "Thuê" | "Chưa xác định";

export type LeadContactChannel = "Form" | "Zalo" | "Hotline" | "Facebook" | "Khác";

export type ProductGroupCode = "LED_SCREEN" | "ELECTRONIC_BOARD" | "OTHER";

export type UserRole =
  | "ADMIN"
  | "DIRECTOR"
  | "SALES"
  | "MARKETING"
  | "DESIGN"
  | "ADS"
  | string;

export type QuickLeadPreset = "all" | "hot" | "overdue_sla" | "pending_approval";

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
  assignedBy?: string;
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

export type LeadQuoteStatus =
  | "DRAFT"
  | "PENDING_DIRECTOR"
  | "DIRECTOR_APPROVED"
  | "SENT"
  | "ACCEPTED";

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

export interface ProductCatalogOption {
  id?: string;
  code: string;
  name: string;
  group: ProductGroupCode | string;
  sortOrder?: number;
  allowCustomText?: boolean;
}

export interface Lead {
  id: string;
  code: string;
  customerName: string;
  companyName: string;
  phone: string;
  normalizedPhone?: string | null;
  email: string;
  product: string;
  productCustomText?: string | null;
  demandType?: LeadDemandType | string | null;
  contactChannel?: LeadContactChannel | string | null;
  category: string;
  categoryCode?: string;
  productGroup?: ProductGroupCode | string;
  allowCustomProductText?: boolean;
  categoryId?: string;
  source: LeadSource | string;
  status: LeadStatus;
  failureReason?: string | null;
  quoteSentAt?: string | null;
  quoteSentAtDisplay?: string | null;
  customerResponded?: boolean;
  customerRespondedAt?: string | null;
  customerResponseNote?: string | null;
  isDuplicate?: boolean;
  isDuplicatePhone?: boolean;
  duplicateCount?: number;
  duplicateCodes?: string[];
  salesPerson: {
    id?: string;
    name: string;
    avatar?: string;
    initials: string;
    email?: string;
  };
  salesPersonId?: string;
  estimatedValue?: string;
  installationAddress?: string;
  location: string;
  notes: string;
  createdAt: string;
  createdAtTime?: string;
  createdAtIso?: string;
  createdAtISO?: string;
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

export interface LeadStatsSummary {
  total: number;
  newLeads: number;
  quotingLeads: number;
  quoteSentLeads?: number;
  awaitingResponseLeads?: number;
  wonLeads: number;
  lostLeads: number;
  salesLeaderboard: { id?: string; name: string; initials: string; count: number; wonCount?: number }[];
}

export function parseLeadCreatedAt(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const d = new Date(
      parseInt(parts[2], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[0], 10)
    );
    if (!Number.isNaN(d.getTime())) return d;
  }
  const iso = new Date(dateStr);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

export const SALES_LIST = [
  { name: "Trần Minh Tuấn", initials: "MT" },
  { name: "Lê Hoàng Cường", initials: "HC" },
  { name: "Phạm Thùy Trang", initials: "TT" },
  { name: "Nguyễn Bảo Ngọc", initials: "BN" },
];

export const SALES_REPS = SALES_LIST;

export const STATUS_LIST: Lead["status"][] = [
  "Vừa nhận thông tin",
  "Đang soạn báo giá",
  "Đã gửi báo giá",
  "Chốt thành công",
  "Thất bại",
];

export const PIPELINE_STAGES = STATUS_LIST;

export const OFFICIAL_PRODUCT_GROUPS: Array<{ id: ProductGroupCode; label: string }> = [
  { id: "LED_SCREEN", label: "Màn hình LED" },
  { id: "ELECTRONIC_BOARD", label: "Bảng Điện Tử" },
];

export const OFFICIAL_CATALOG_FALLBACK: ProductCatalogOption[] = [
  // Màn hình LED (8 items)
  { code: "LED_INDOOR", name: "Màn hình LED Trong nhà", group: "LED_SCREEN", sortOrder: 10, allowCustomText: false },
  { code: "LED_OUTDOOR", name: "Màn hình LED Ngoài trời", group: "LED_SCREEN", sortOrder: 20, allowCustomText: false },
  { code: "LED_HALL", name: "Màn hình LED Hội trường", group: "LED_SCREEN", sortOrder: 30, allowCustomText: false },
  { code: "LED_MEETING", name: "Màn hình LED Phòng họp", group: "LED_SCREEN", sortOrder: 40, allowCustomText: false },
  { code: "LED_STAGE", name: "Màn hình LED Sân khấu", group: "LED_SCREEN", sortOrder: 50, allowCustomText: false },
  { code: "LED_PARTY_CAFE", name: "Màn hình LED Nhà hàng tiệc cưới / Quán Cafe", group: "LED_SCREEN", sortOrder: 60, allowCustomText: false },
  { code: "LED_OOH", name: "Màn hình LED Quảng cáo ngoài trời (OOH)", group: "LED_SCREEN", sortOrder: 70, allowCustomText: false },
  { code: "LED_OTHER", name: "Màn hình LED - Khác", group: "LED_SCREEN", sortOrder: 80, allowCustomText: true },
  // Bảng Điện Tử (13 items)
  { code: "BOARD_STOCK", name: "Bảng Điện Tử Chứng Khoán", group: "ELECTRONIC_BOARD", sortOrder: 110, allowCustomText: false },
  { code: "BOARD_WELCOME", name: "Bảng Điện Tử Chào Mừng", group: "ELECTRONIC_BOARD", sortOrder: 120, allowCustomText: false },
  { code: "BOARD_HV_CLOCK", name: "Bảng Đồng Hồ Điện Tử HV", group: "ELECTRONIC_BOARD", sortOrder: 130, allowCustomText: false },
  { code: "BOARD_SAFETY", name: "Bảng Thông Tin An Toàn Lao Động", group: "ELECTRONIC_BOARD", sortOrder: 140, allowCustomText: false },
  { code: "BOARD_PRODUCTION", name: "Bảng Theo Dõi Sản Xuất", group: "ELECTRONIC_BOARD", sortOrder: 150, allowCustomText: false },
  { code: "BOARD_TRAFFIC", name: "Bảng Điện Tử Giao Thông", group: "ELECTRONIC_BOARD", sortOrder: 160, allowCustomText: false },
  { code: "BOARD_BANK_EXCHANGE", name: "Bảng Tỷ Giá Ngân Hàng", group: "ELECTRONIC_BOARD", sortOrder: 170, allowCustomText: false },
  { code: "BOARD_QUEUE", name: "Hệ Thống Xếp Hàng Tự Động", group: "ELECTRONIC_BOARD", sortOrder: 180, allowCustomText: false },
  { code: "BOARD_PARKING", name: "Hệ Thống Giữ Xe Tự Động", group: "ELECTRONIC_BOARD", sortOrder: 190, allowCustomText: false },
  { code: "BOARD_OUTDOOR_INFO", name: "Bảng Thông Tin Ngoài Trời", group: "ELECTRONIC_BOARD", sortOrder: 200, allowCustomText: false },
  { code: "BOARD_SHOTLOCK", name: "Bảng Shotlock", group: "ELECTRONIC_BOARD", sortOrder: 210, allowCustomText: false },
  { code: "BOARD_SPORT_SCORE", name: "Bảng Điểm Thể Thao", group: "ELECTRONIC_BOARD", sortOrder: 220, allowCustomText: false },
  { code: "BOARD_OTHER", name: "Bảng Điện Tử - Khác", group: "ELECTRONIC_BOARD", sortOrder: 230, allowCustomText: true },
];

export const OFFICIAL_DEMAND_TYPES: LeadDemandType[] = ["Mua", "Thuê", "Chưa xác định"];

export const OFFICIAL_CONTACT_CHANNELS: LeadContactChannel[] = [
  "Form",
  "Zalo",
  "Hotline",
  "Facebook",
  "Khác",
];

export const PRODUCT_CATEGORIES = [
  "Màn hình LED",
  "Bảng Điện Tử",
  "Màn hình LED Trong nhà",
  "Màn hình LED Ngoài trời",
  "Màn hình LED Hội trường",
  "Màn hình LED Phòng họp",
  "Màn hình LED Sân khấu",
  "Bảng Tỷ Giá Ngân Hàng",
  "Bảng Theo Dõi Sản Xuất",
  "Khác",
] as const;

export const SOURCE_LIST: Lead["source"][] = [
  "Google Ads",
  "Facebook Ads",
  "Website",
  "Hotline",
  "Zalo",
  "Form",
  "Giới thiệu",
  "Triển lãm",
];

export const LEAD_SOURCES = SOURCE_LIST;

export const INITIAL_LEADS: Lead[] = [];
