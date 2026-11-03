import { z } from "zod";

export const WON_STATUS = "Chốt thành công";

export const OFFICIAL_LEAD_STATUSES = [
  "Vừa nhận thông tin",
  "Đang soạn báo giá",
  "Đã gửi báo giá",
  "Chốt thành công",
  "Thất bại",
] as const;

export const OFFICIAL_DEMAND_TYPES = [
  "Hỏi sửa chữa",
  "Không cung cấp thông tin",
  "Hỏi sản phẩm đặc biệt",
  "Hỏi thuê",
  "Không đúng nhu cầu",
] as const;

export function normalizeVietnamPhone(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  const cleaned = raw.trim().replace(/[\s.\-()]/g, "");
  if (cleaned.startsWith("+84")) {
    return "0" + cleaned.slice(3).replace(/\D/g, "");
  }
  if (cleaned.startsWith("84") && cleaned.length >= 11) {
    return "0" + cleaned.slice(2).replace(/\D/g, "");
  }
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length === 9 && !digits.startsWith("0")) {
    return "0" + digits;
  }
  return digits;
}

export function maskPhoneIfRestricted(phone: string, allowFull: boolean): string {
  if (allowFull || !phone) return phone;
  const digits = phone.trim();
  if (digits.length <= 6) return "***";
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

export const CreateLeadSchema = z
  .object({
    customerName: z.string().trim().min(2, "Vui lòng nhập Tên khách hàng (tối thiểu 2 ký tự)"),
    companyName: z.string().trim().optional().nullable().default(""),
    phone: z
      .string()
      .trim()
      .min(8, "Vui lòng nhập Số điện thoại hợp lệ (tối thiểu 8 chữ số)")
      .refine((val) => normalizeVietnamPhone(val).length >= 8, {
        message: "Số điện thoại không hợp lệ",
      }),
    email: z.string().trim().email("Email không hợp lệ").optional().nullable().or(z.literal("")),
    installationAddress: z.string().trim().optional().nullable(),
    location: z.string().trim().optional().nullable().default(""),
    product: z.string().trim().optional().nullable().default(""),
    productCustomText: z.string().trim().max(1000).optional().nullable(),
    demandType: z.string().trim().max(200).optional().nullable(),
    categoryId: z.string().optional().nullable(),
    categoryName: z.string().optional().nullable(),
    source: z.string().trim().optional().default("Hotline"),
    contactChannel: z.string().trim().optional().nullable(),
    status: z.string().default("Vừa nhận thông tin"),
    failureReason: z.string().trim().optional().nullable(),
    customerResponded: z.boolean().optional(),
    customerResponseNote: z.string().trim().max(1000).optional().nullable(),
    salesPersonId: z.string().optional().nullable(),
    transferToOtherSales: z.boolean().optional().default(false),
    transferReason: z.string().trim().max(500).optional().nullable(),
    notes: z.string().optional().nullable().default(""),
    attachments: z
      .array(
        z.object({
          fileName: z.string(),
          fileUrl: z.string(),
          fileSize: z.number().optional(),
          fileType: z.string().default("IMAGE"),
        })
      )
      .optional(),
  })
  .refine(
    (val) =>
      val.status !== "Thất bại" ||
      (typeof val.failureReason === "string" && val.failureReason.trim().length > 0),
    {
      message: "Bắt buộc phải nhập lý do thất bại khi chọn trạng thái Thất bại",
      path: ["failureReason"],
    }
  )
  .refine(
    (val) =>
      !val.transferToOtherSales ||
      (typeof val.salesPersonId === "string" &&
        val.salesPersonId.trim().length > 0 &&
        typeof val.transferReason === "string" &&
        val.transferReason.trim().length > 0),
    {
      message:
        "Khi chọn 'Chuyển kinh doanh khác', bắt buộc phải chọn nhân viên nhận và nhập lý do chuyển",
      path: ["transferReason"],
    }
  );

export const UpdateLeadSchema = z
  .object({
    customerName: z.string().trim().min(2, "Tên khách hàng tối thiểu 2 ký tự").optional(),
    companyName: z.string().trim().optional().nullable(),
    phone: z
      .string()
      .trim()
      .min(8, "Số điện thoại không hợp lệ")
      .refine((val) => normalizeVietnamPhone(val).length >= 8, {
        message: "Số điện thoại không hợp lệ",
      })
      .optional(),
    email: z.string().trim().email("Email không hợp lệ").optional().nullable().or(z.literal("")),
    installationAddress: z.string().trim().optional().nullable(),
    location: z.string().trim().optional().nullable(),
    product: z.string().trim().optional().nullable(),
    productCustomText: z.string().trim().max(1000).optional().nullable(),
    demandType: z.string().trim().max(200).optional().nullable(),
    categoryId: z.string().optional().nullable(),
    categoryName: z.string().optional().nullable(),
    source: z.string().trim().optional(),
    contactChannel: z.string().trim().optional().nullable(),
    status: z.string().optional(),
    failureReason: z.string().trim().optional().nullable(),
    customerResponded: z.boolean().optional(),
    customerResponseNote: z.string().trim().max(1000).optional().nullable(),
    notes: z.string().optional().nullable(),
    nextFollowUpAt: z.string().optional().nullable(),
    nextActionNote: z.string().optional().nullable(),
    transferToOtherSales: z.boolean().optional(),
    newSalesPersonId: z.string().trim().optional().nullable(),
    transferReason: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (val) =>
      val.status !== "Thất bại" ||
      (typeof val.failureReason === "string" && val.failureReason.trim().length > 0),
    {
      message: "Bắt buộc phải nhập lý do thất bại khi chọn trạng thái Thất bại",
      path: ["failureReason"],
    }
  )
  .refine(
    (val) =>
      !val.transferToOtherSales ||
      (typeof val.newSalesPersonId === "string" &&
        val.newSalesPersonId.trim().length > 0 &&
        typeof val.transferReason === "string" &&
        val.transferReason.trim().length > 0),
    {
      message:
        "Khi chọn 'Chuyển kinh doanh khác', bắt buộc phải chọn nhân viên nhận và nhập lý do chuyển",
      path: ["transferReason"],
    }
  );

export const CreateActivitySchema = z.object({
  type: z.enum(["CALL", "ZALO", "SURVEY", "MEETING", "NOTE"]).default("NOTE"),
  summary: z.string().trim().min(3, "Nội dung trao đổi tối thiểu 3 ký tự").max(2000),
  outcome: z.string().trim().max(500).optional().nullable(),
  customerResponded: z.boolean().optional(),
  nextFollowUpAt: z.string().optional().nullable(),
  nextActionNote: z.string().trim().max(300).optional().nullable(),
});

export const ImportItemSchema = z.object({
  customerName: z.string().trim().min(2),
  companyName: z.string().trim().optional().default(""),
  phone: z.string().trim().min(8),
  email: z.string().trim().optional().nullable(),
  product: z.string().trim().optional().default("Chưa chọn sản phẩm"),
  source: z.string().trim().optional().default("Website"),
  contactChannel: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
});

export const BulkImportSchema = z.object({
  items: z
    .array(ImportItemSchema)
    .min(1, "Danh sách import trống")
    .max(200, "Tối đa 200 dòng mỗi lần import"),
  autoAssignRoundRobin: z.boolean().default(true),
});

// Deprecated schemas kept only for type compatibility with legacy imports
export const CreateQuoteSchema = z.object({
  moduleSpec: z.string().optional(),
});
export const DirectorApproveQuoteSchema = z.object({
  quoteId: z.string().optional(),
});
export const AiAssistSchema = z.object({
  action: z.string().optional(),
});
export interface ParsedAiLead {
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  product: string;
  categoryName: string;
  source: string;
  location: string;
  installationAddress: string;
  estimatedValue: string;
  notes: string;
  ledModuleType: string | null;
  ledWidth: number | null;
  ledHeight: number | null;
  aiSummary: string;
  aiEngine: string;
}
