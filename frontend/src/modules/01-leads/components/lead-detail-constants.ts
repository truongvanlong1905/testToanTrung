import type { LeadActivityType } from "../types";

export const LED_MODULE_PRESETS = [
  {
    label: "LED P1.86 Indoor Phòng họp VIP (Cabinet nhôm đúc)",
    unitPrice: 24_000_000,
    defaultProcessor: 16_500_000,
  },
  {
    label: "LED P2.0 Indoor Hội trường Trung tâm",
    unitPrice: 19_500_000,
    defaultProcessor: 14_000_000,
  },
  {
    label: "LED P2.5 Indoor Hội trường & Tiệc cưới",
    unitPrice: 15_500_000,
    defaultProcessor: 12_500_000,
  },
  {
    label: "LED P3.0 Outdoor Mặt tiền Tòa nhà (Chống nước IP65)",
    unitPrice: 18_500_000,
    defaultProcessor: 15_000_000,
  },
  {
    label: "LED P4.0 Outdoor Quảng cáo Ngoài trời (IP65)",
    unitPrice: 14_200_000,
    defaultProcessor: 12_500_000,
  },
  {
    label: "Bảng điện tử LED Ma trận / Tỷ giá Ngân hàng",
    unitPrice: 9_500_000,
    defaultProcessor: 4_500_000,
  },
];

export const LED_SPEC_PRESETS = LED_MODULE_PRESETS;

export const ACTIVITY_TYPE_OPTIONS: Array<{ id: LeadActivityType; label: string }> = [
  { id: "CALL", label: "Gọi điện" },
  { id: "ZALO", label: "Zalo / Tin nhắn" },
  { id: "SURVEY", label: "Khảo sát công trình" },
  { id: "MEETING", label: "Họp tư vấn" },
  { id: "NOTE", label: "Ghi chú kỹ thuật" },
];

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")} đ`;
}

export function escapeHtml(raw: string): string {
  return (raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
