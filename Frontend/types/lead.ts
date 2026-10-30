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
  statusHistory?: StatusHistoryItem[];
  assignments?: AssignmentItem[];
  attachments?: AttachmentItem[];
  attachmentsCount?: number;
}
