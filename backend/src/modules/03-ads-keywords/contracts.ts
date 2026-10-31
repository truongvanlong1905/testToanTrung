import { z } from "zod";

export const CreateCampaignSchema = z.object({
  name: z.string().trim().min(3, "Tên chiến dịch tối thiểu 3 ký tự"),
  code: z.string().trim().optional(),
  platform: z.enum(["Google Ads", "Facebook Ads", "TikTok Ads", "Zalo Ads", "SEO"]),
  status: z.enum(["Active", "Paused", "Completed"]).default("Active"),
  budget: z.number().min(0, "Ngân sách không âm"),
  spent: z.number().min(0, "Chi phí đã tiêu không âm").default(0),
});

export const UpdateCampaignSchema = z.object({
  id: z.string().trim().min(1, "Vui lòng chọn chiến dịch"),
  status: z.enum(["Active", "Paused", "Completed"]).optional(),
  budget: z.number().min(0, "Ngân sách không âm").optional(),
  spent: z.number().min(0, "Chi phí đã tiêu không âm").optional(),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>;
