export function parseVndString(raw?: string | null): number {
  if (!raw) return 0;
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const num = Number(digits);
  return Number.isFinite(num) ? num : 0;
}

export function formatVndNumber(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "Đang khảo sát";
  return `${Math.round(amount).toLocaleString("vi-VN")} đ`;
}

export function computeLeadScore(input: {
  status: string;
  estimatedValue?: string | null;
  installationAddress?: string | null;
  email?: string | null;
  source?: string | null;
  ledWidth?: number | null;
  ledHeight?: number | null;
  activitiesCount?: number;
  quotesCount?: number;
}): { score: number; tier: "HOT" | "WARM" | "COLD" } {
  if (input.status === "Chốt thành công") {
    return { score: 98, tier: "HOT" };
  }
  if (input.status === "Thất bại") {
    return { score: 15, tier: "COLD" };
  }

  let score = 20;
  const vnd = parseVndString(input.estimatedValue);
  if (vnd >= 300_000_000) score += 28;
  else if (vnd >= 100_000_000) score += 22;
  else if (vnd >= 30_000_000) score += 15;
  else if (vnd > 0) score += 8;

  if (input.installationAddress && input.installationAddress.trim().length >= 4) {
    score += 10;
  }
  if (input.email && input.email.includes("@")) {
    score += 5;
  }
  if (input.ledWidth && input.ledHeight && input.ledWidth > 0 && input.ledHeight > 0) {
    score += 14;
  }

  if (input.status === "Đã gửi báo giá") score += 20;
  else if (input.status === "Đang soạn báo giá") score += 14;
  else if (input.status === "Vừa nhận thông tin") score += 8;

  if (["Hotline", "Google Ads", "Giới thiệu", "Triển lãm"].includes(input.source || "")) {
    score += 8;
  }

  if ((input.quotesCount || 0) > 0) score += 8;
  if ((input.activitiesCount || 0) > 0) score += Math.min(10, (input.activitiesCount || 0) * 4);

  const clamped = Math.max(10, Math.min(97, score));
  const tier: "HOT" | "WARM" | "COLD" =
    clamped >= 72 ? "HOT" : clamped >= 45 ? "WARM" : "COLD";

  return { score: clamped, tier };
}

export type SlaStatus = "OVERDUE" | "DUE_SOON" | "ON_TRACK" | "COMPLETED";

export function computeLeadSla(input: {
  status: string;
  createdAt: Date;
  lastContactedAt?: Date | null;
  nextFollowUpAt?: Date | null;
}): { slaStatus: SlaStatus; slaLabel: string } {
  if (input.status === "Chốt thành công" || input.status === "Thất bại") {
    return { slaStatus: "COMPLETED", slaLabel: "Đã đóng hồ sơ" };
  }

  const now = Date.now();

  if (input.nextFollowUpAt) {
    const diffMs = input.nextFollowUpAt.getTime() - now;
    if (diffMs < 0) {
      const overdueHours = Math.max(1, Math.round(Math.abs(diffMs) / 3_600_000));
      return {
        slaStatus: "OVERDUE",
        slaLabel: overdueHours >= 24 ? `Trễ lịch hẹn ${Math.round(overdueHours / 24)} ngày` : `Trễ lịch hẹn ${overdueHours}h`,
      };
    }
    if (diffMs <= 24 * 3_600_000) {
      return { slaStatus: "DUE_SOON", slaLabel: "Đến hạn trong 24h" };
    }
    return {
      slaStatus: "ON_TRACK",
      slaLabel: `Hẹn ${input.nextFollowUpAt.toLocaleDateString("vi-VN")}`,
    };
  }

  // Nếu Lead mới tiếp nhận > 2 giờ mà chưa có tương tác nào -> Quá hạn SLA 2h tiếp nhận
  const ageHours = (now - input.createdAt.getTime()) / 3_600_000;
  if (input.status === "Vừa nhận thông tin" && !input.lastContactedAt && ageHours > 2) {
    return {
      slaStatus: "OVERDUE",
      slaLabel: ageHours >= 24 ? `Chưa gọi (${Math.floor(ageHours / 24)} ngày)` : `Quá hạn SLA tiếp nhận (${Math.floor(ageHours)}h)`,
    };
  }

  return { slaStatus: "ON_TRACK", slaLabel: "Đúng tiến độ SLA" };
}

