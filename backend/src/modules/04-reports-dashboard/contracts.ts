import { z } from "zod";

export const CreateReportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Tiêu đề tối thiểu 3 ký tự")
    .max(200, "Tiêu đề tối đa 200 ký tự"),
  content: z
    .string()
    .trim()
    .min(5, "Nội dung thông báo / báo cáo tối thiểu 5 ký tự")
    .max(50000, "Nội dung tối đa 50.000 ký tự"),
  attachmentName: z.string().max(255).optional().nullable(),
  attachmentUrl: z.string().optional().nullable(),
});

export type CreateReportInput = z.infer<typeof CreateReportSchema>;
