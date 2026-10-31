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

export interface Lead {
  id: string;
  code: string;
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  product: string;
  category:
    | "LED trong nhà"
    | "LED ngoài trời"
    | "Bảng điện tử"
    | "Màn hình cong / đặc thù"
    | "Khác"
    | string;
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

export interface LeadStatsSummary {
  total: number;
  newLeads: number;
  quotingLeads: number;
  wonLeads: number;
  lostLeads: number;
  salesLeaderboard: { name: string; initials: string; count: number }[];
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

export const PRODUCT_CATEGORIES = [
  "LED trong nhà",
  "LED ngoài trời",
  "Bảng điện tử",
  "Màn hình cong / đặc thù",
  "Khác",
] as const;

export const SOURCE_LIST: Lead["source"][] = [
  "Facebook Ads",
  "Google Ads",
  "Hotline",
  "Website",
  "Giới thiệu",
  "Triển lãm",
];

export const LEAD_SOURCES = SOURCE_LIST;

export const INITIAL_LEADS: Lead[] = [
  {
    id: "lead-01",
    code: "TT-LED-2401",
    customerName: "Nguyễn Hoàng Nam",
    companyName: "Tập đoàn KS Mường Thanh Grand",
    phone: "0912.834.567",
    email: "nam.nh@muongthanh.vn",
    product: "Màn hình LED P2.5 trong nhà Hội trường (32m²)",
    category: "LED trong nhà",
    source: "Google Ads",
    status: "Đang soạn báo giá",
    salesPerson: {
      name: "Trần Minh Tuấn",
      initials: "MT",
    },
    estimatedValue: "480.000.000 đ",
    location: "TP. Hồ Chí Minh",
    notes: "Khách cần lắp đặt trước ngày 20 tháng sau để kịp sự kiện kỷ niệm thành lập khách sạn.",
    createdAt: "29/10/2026",
  },
  {
    id: "lead-02",
    code: "TT-LED-2402",
    customerName: "Vũ Thị Bích Ngọc",
    companyName: "Trung tâm Tiệc cưới & Sự kiện Capella",
    phone: "0908.452.199",
    email: "ngoc.vt@capellaevent.com",
    product: "Màn hình LED P2.0 sân khấu chính + 2 cánh P3 (48m²)",
    category: "LED trong nhà",
    source: "Facebook Ads",
    status: "Đã gửi báo giá",
    salesPerson: {
      name: "Lê Hoàng Cường",
      initials: "HC",
    },
    estimatedValue: "720.000.000 đ",
    location: "Hà Nội",
    notes: "Đã gửi bản vẽ kết cấu và báo giá chi tiết, hẹn sang tuần họp chốt phương án thi công.",
    createdAt: "28/10/2026",
  },
  {
    id: "lead-03",
    code: "TT-LED-2403",
    customerName: "Đặng Quang Huy",
    companyName: "Công ty CP Bất động sản Novaland",
    phone: "0934.119.882",
    email: "huy.dq@novaland-project.com",
    product: "Màn hình LED ngoài trời P4 outdoor mặt tiền tòa nhà (90m²)",
    category: "LED ngoài trời",
    source: "Giới thiệu",
    status: "Chốt thành công",
    salesPerson: {
      name: "Phạm Thùy Trang",
      initials: "TT",
    },
    estimatedValue: "1.450.000.000 đ",
    location: "Bình Dương",
    notes: "Hợp đồng đã ký kết, đã tạm ứng đợt 1 30%, kỹ thuật đang khảo sát móng khung đỡ.",
    createdAt: "27/10/2026",
  },
  {
    id: "lead-04",
    code: "TT-LED-2404",
    customerName: "Phạm Duy Anh",
    companyName: "Trường Đại học Bách Khoa",
    phone: "0983.567.234",
    email: "duyanh.p@hust.edu.vn",
    product: "Bảng điện tử thông tin ma trận P10 3 màu cổng trường (12m)",
    category: "Bảng điện tử",
    source: "Hotline",
    status: "Vừa nhận thông tin",
    salesPerson: {
      name: "Trần Minh Tuấn",
      initials: "MT",
    },
    estimatedValue: "95.000.000 đ",
    location: "Hà Nội",
    notes: "Khách gọi hotline hỏi tư vấn phần mềm điều khiển từ xa qua mạng LAN/Wifi.",
    createdAt: "29/10/2026",
  },
  {
    id: "lead-05",
    code: "TT-LED-2405",
    customerName: "Lê Thu Thảo",
    companyName: "Ngân hàng TMCP Vietcombank - CN Sài Gòn",
    phone: "0977.889.332",
    email: "thaolt@vietcombank.com.vn",
    product: "Bảng điện tử tỷ giá hối đoái & thông tin lãi suất SMD P3",
    category: "Bảng điện tử",
    source: "Website",
    status: "Đang soạn báo giá",
    salesPerson: {
      name: "Nguyễn Bảo Ngọc",
      initials: "BN",
    },
    estimatedValue: "135.000.000 đ",
    location: "TP. Hồ Chí Minh",
    notes: "Cần tích hợp API tự động cập nhật số liệu tỷ giá từ máy chủ ngân hàng.",
    createdAt: "28/10/2026",
  },
  {
    id: "lead-06",
    code: "TT-LED-2406",
    customerName: "Hoàng Minh Trí",
    companyName: "Công ty TNHH Truyền thông & Quảng cáo RedSun",
    phone: "0918.223.441",
    email: "tri.hoang@redsunmedia.vn",
    product: "Màn hình LED quảng cáo ngoài trời P5 cột trụ ngã tư (60m²)",
    category: "LED ngoài trời",
    source: "Triển lãm",
    status: "Đã gửi báo giá",
    salesPerson: {
      name: "Lê Hoàng Cường",
      initials: "HC",
    },
    estimatedValue: "880.000.000 đ",
    location: "Đà Nẵng",
    notes: "Khách gặp tại gian hàng Triển lãm Vietbuild, yêu cầu độ sáng cao > 6500 nits chống chói.",
    createdAt: "26/10/2026",
  },
  {
    id: "lead-07",
    code: "TT-LED-2407",
    customerName: "Trịnh Đình Khang",
    companyName: "Trung tâm Hội nghị Quốc tế Almaz",
    phone: "0903.678.901",
    email: "khang.td@almaz.vn",
    product: "Màn hình LED cong P1.86 phòng họp VIP cao cấp (18m²)",
    category: "Màn hình cong / đặc thù",
    source: "Google Ads",
    status: "Chốt thành công",
    salesPerson: {
      name: "Phạm Thùy Trang",
      initials: "TT",
    },
    estimatedValue: "560.000.000 đ",
    location: "Hà Nội",
    notes: "Khách yêu cầu cabin nhôm đúc định hình, tỷ lệ làm mới 3840Hz để quay phim không bị gợn sóng.",
    createdAt: "25/10/2026",
  },
  {
    id: "lead-08",
    code: "TT-LED-2408",
    customerName: "Bùi Thanh Tùng",
    companyName: "Bệnh viện Đa khoa Tâm Anh",
    phone: "0945.678.123",
    email: "tungbt@tamanhhospital.vn",
    product: "Hệ thống Bảng LED gọi số thứ tự & chỉ dẫn khoa khám bệnh",
    category: "Bảng điện tử",
    source: "Hotline",
    status: "Vừa nhận thông tin",
    salesPerson: {
      name: "Nguyễn Bảo Ngọc",
      initials: "BN",
    },
    estimatedValue: "185.000.000 đ",
    location: "TP. Hồ Chí Minh",
    notes: "Khách đang yêu cầu gửi catalogue và demo kết nối với hệ thống HIS bệnh viện.",
    createdAt: "29/10/2026",
  },
  {
    id: "lead-09",
    code: "TT-LED-2409",
    customerName: "Ngô Đức Toàn",
    companyName: "Phòng Trà & Lounge Sky View 36",
    phone: "0915.992.338",
    email: "toanngo@skyview36.com",
    product: "Màn hình LED lưới trong suốt P3.91 - 7.82 kính mặt tiền (35m²)",
    category: "Màn hình cong / đặc thù",
    source: "Facebook Ads",
    status: "Thất bại",
    salesPerson: {
      name: "Trần Minh Tuấn",
      initials: "MT",
    },
    estimatedValue: "620.000.000 đ",
    location: "Nha Trang",
    notes: "Chủ đầu tư tạm hoãn dự án mở rộng chi nhánh do điều chỉnh giấy phép xây dựng tòa nhà.",
    createdAt: "23/10/2026",
  },
  {
    id: "lead-10",
    code: "TT-LED-2410",
    customerName: "Trần Đức Mạnh",
    companyName: "Showroom Ô tô VinFast Thăng Long",
    phone: "0936.445.678",
    email: "manh.td@vinfast-thanglong.vn",
    product: "Màn hình LED P2.5 trong nhà chân đứng di động (4 bộ)",
    category: "LED trong nhà",
    source: "Website",
    status: "Đang soạn báo giá",
    salesPerson: {
      name: "Lê Hoàng Cường",
      initials: "HC",
    },
    estimatedValue: "260.000.000 đ",
    location: "Hà Nội",
    notes: "Cần tích hợp hệ thống quản lý nội dung tập trung CMS điều khiển từ xa.",
    createdAt: "28/10/2026",
  },
];
