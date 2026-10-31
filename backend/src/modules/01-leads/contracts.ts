import { z } from "zod";

export const WON_STATUS = "Chốt thành công";

export function maskPhoneIfRestricted(phone: string, allowFull: boolean): string {
  if (allowFull || !phone) return phone;
  const digits = phone.trim();
  if (digits.length <= 6) return "***";
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

export const CreateLeadSchema = z
  .object({
    customerName: z.string().trim().min(2, "Tên khách hàng phải có ít nhất 2 ký tự"),
    companyName: z.string().trim().optional().default("Khách hàng cá nhân"),
    phone: z.string().trim().min(8, "Số điện thoại không hợp lệ"),
    email: z.string().trim().email("Email không hợp lệ").optional().or(z.literal("")),
    installationAddress: z.string().trim().optional(),
    location: z.string().trim().optional().default("TP. Hồ Chí Minh"),
    product: z.string().trim().min(2, "Vui lòng nhập sản phẩm / nhu cầu hiển thị LED"),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    source: z.string().default("Hotline"),
    status: z.string().default("Vừa nhận thông tin"),
    failureReason: z.string().trim().optional().nullable(),
    salesPersonId: z.string().optional(),
    estimatedValue: z.string().optional().default("Đang khảo sát"),
    notes: z.string().optional().default(""),
    ledWidth: z.number().positive().max(200).optional().nullable(),
    ledHeight: z.number().positive().max(200).optional().nullable(),
    ledModuleType: z.string().max(200).optional().nullable(),
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
  );

export const UpdateLeadSchema = z.object({
  customerName: z.string().trim().min(2, "Tên khách hàng tối thiểu 2 ký tự").optional(),
  companyName: z.string().trim().min(1, "Tên công ty không được để trống").optional(),
  phone: z.string().trim().min(8, "Số điện thoại không hợp lệ").optional(),
  email: z.string().trim().email("Email không hợp lệ").optional().nullable().or(z.literal("")),
  installationAddress: z.string().trim().optional().nullable(),
  location: z.string().trim().min(2).optional(),
  product: z.string().trim().min(2, "Vui lòng nhập sản phẩm / nhu cầu LED").optional(),
  estimatedValue: z.string().trim().optional(),
  notes: z.string().optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
  nextActionNote: z.string().optional().nullable(),
});

export const CreateActivitySchema = z.object({
  type: z.enum(["CALL", "ZALO", "SURVEY", "MEETING", "NOTE"]).default("CALL"),
  summary: z.string().trim().min(3, "Nội dung trao đổi tối thiểu 3 ký tự").max(2000),
  outcome: z.string().trim().max(500).optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
  nextActionNote: z.string().trim().max(300).optional().nullable(),
});

export const CreateQuoteSchema = z.object({
  moduleSpec: z.string().trim().min(3, "Vui lòng chọn dòng module màn hình LED"),
  widthMeters: z.number().min(0.2, "Chiều ngang tối thiểu 0.2m").max(200),
  heightMeters: z.number().min(0.2, "Chiều cao tối thiểu 0.2m").max(200),
  unitPriceVnd: z.number().min(100_000, "Đơn giá / m² không hợp lệ"),
  processorVnd: z.number().min(0).default(0),
  structureInstallVnd: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(50).default(0),
  warrantyMonths: z.number().min(6).max(60).default(24),
  notes: z.string().trim().max(2000).optional().nullable(),
  requestDirectorApproval: z.boolean().optional().default(false),
});

export const DirectorApproveQuoteSchema = z.object({
  quoteId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(1000).optional().nullable(),
});

export const ImportItemSchema = z.object({
  customerName: z.string().trim().min(2),
  companyName: z.string().trim().optional().default("Khách hàng doanh nghiệp"),
  phone: z.string().trim().min(8),
  email: z.string().trim().optional().nullable(),
  product: z.string().trim().min(2).default("Tư vấn màn hình LED Toàn Trung"),
  source: z.string().trim().optional().default("Website"),
  location: z.string().trim().optional().default("TP. Hồ Chí Minh"),
  estimatedValue: z.string().trim().optional().default("Đang khảo sát"),
  notes: z.string().trim().optional().default(""),
});

export const BulkImportSchema = z.object({
  items: z
    .array(ImportItemSchema)
    .min(1, "Danh sách import trống")
    .max(200, "Tối đa 200 dòng mỗi lần import"),
  autoAssignRoundRobin: z.boolean().default(true),
});

export const AiAssistSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("PARSE_RAW_TEXT"),
    rawText: z.string().trim().min(3, "Vui lòng nhập thông tin khách hàng").max(6000),
  }),
  z.object({
    action: z.literal("QUICK_CREATE"),
    rawText: z.string().trim().min(3, "Vui lòng nhập thông tin khách hàng").max(6000),
    salesPersonId: z.string().optional(),
  }),
  z.object({
    action: z.literal("SALES_COPILOT"),
    leadId: z.string().trim().min(1),
  }),
]);

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
