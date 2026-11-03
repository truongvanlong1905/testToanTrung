import React from "react";
import { Box, Image as ImageIcon, Video } from "lucide-react";
import type { DesignMode } from "../types";

export const MODE_OPTIONS: Array<{
  id: DesignMode;
  label: string;
  icon: React.ElementType;
  hint: string;
}> = [
  {
    id: "banner",
    label: "Banner LED",
    icon: ImageIcon,
    hint: "Thiết kế maquette hình ảnh theo tỷ lệ màn hình thực tế",
  },
  {
    id: "video",
    label: "Kịch bản phân cảnh",
    icon: Video,
    hint: "Phân cảnh kịch bản video quảng cáo LED 15 giây",
  },
  {
    id: "mockup",
    label: "Phối cảnh công trình",
    icon: Box,
    hint: "Ghép phối cảnh màn hình LED lên ảnh hiện trạng tòa nhà",
  },
];

export const STYLE_PRESETS = [
  "Hiện đại Sang trọng",
  "Sự kiện Gala & Ánh sáng Sân khấu",
  "3D Đô thị",
  "Bảng điện tử Thông tin Tối giản",
] as const;

export const ASPECT_RATIOS = ["16:9", "21:9", "4:3", "9:16", "1:1"] as const;

export const PROMPT_SUGGESTIONS = [
  "Thiết kế banner màn hình LED P2.5 hội nghị tri ân khách hàng kỷ niệm 15 năm thành lập, phong cách hiện đại sang trọng, tông xanh đậm và điểm nhấn ánh sáng tinh tế",
  "Video hiệu ứng 3D khối lập phương chuyển động trên màn hình LED cong góc ngã tư, giới thiệu dòng xe điện đô thị",
  "Phối cảnh màn hình LED ngoài trời P4 lắp đặt tại mặt tiền sảnh trung tâm thương mại ban đêm",
] as const;

export function parsePromptMetadata(rawPrompt: string): {
  summary: string;
  detectedModule?: string;
} {
  const clean = (rawPrompt || "").trim();
  const match = clean.match(/\bP\d+(?:\.\d+)?\b/i);
  return {
    summary: clean.slice(0, 140),
    detectedModule: match ? match[0].toUpperCase() : undefined,
  };
}
