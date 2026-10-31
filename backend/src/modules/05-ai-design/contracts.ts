import { z } from "zod";

export const DesignRequestSchema = z.object({
  mode: z.enum(["banner", "storyboard", "mockup"]),
  prompt: z.string().trim().min(5).max(4000),
  aspectRatio: z.string().max(20).optional(),
  widthMeters: z.string().max(20).optional(),
  heightMeters: z.string().max(20).optional(),
  mockupType: z.string().max(200).optional(),
});

export type DesignRequestInput = z.infer<typeof DesignRequestSchema>;
