import type { UserSession } from "@/src/core/auth/auth";
import { AppError } from "@/src/core/http";
import { getExternalConnectorStatus } from "@/src/modules/02-tracking/public";
import { CreateCampaignSchema, UpdateCampaignSchema } from "./contracts";
import {
  assertCanManageAds,
  assertCanViewAds,
  canUserManageAds,
  canUserViewAds,
} from "./policy";
import {
  countCampaigns,
  createCampaignRecord,
  findCampaignByCode,
  logCampaignAudit,
  queryCampaignsAndKeywords,
  searchCampaignsAndKeywords,
  updateCampaignRecord,
} from "./repository";

export async function getCampaignsAndKeywords(user: UserSession) {
  assertCanViewAds(user);

  const { campaigns, keywords, crmLeadsBySource } = await queryCampaignsAndKeywords();

  const totalBudget = campaigns.reduce((acc, c) => acc + c.budget, 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + c.spent, 0);
  const totalClicks = keywords.reduce((acc, k) => acc + k.clicks, 0);
  const totalImpressions = keywords.reduce((acc, k) => acc + k.impressions, 0);
  const avgCtr =
    totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const avgCpc = totalClicks > 0 ? Math.round(totalSpent / totalClicks) : 0;

  // Distinguish platform-reported conversions vs actual CRM leads (AC-18)
  const platformConversionsEstimate = Math.max(
    campaigns.length,
    Math.round(totalClicks * 0.035)
  );
  const crmLeadsFromAds = crmLeadsBySource
    .filter((row) =>
      ["google ads", "facebook ads", "zalo ads", "tiktok ads", "website"].includes(
        (row.source || "").toLowerCase()
      )
    )
    .reduce((sum, row) => sum + row._count._all, 0);
  const totalCrmLeads = crmLeadsBySource.reduce((sum, row) => sum + row._count._all, 0);

  const canManageAds = canUserManageAds(user);
  const googleAdsConnector = getExternalConnectorStatus("GOOGLE_ADS");

  return {
    campaigns,
    keywords,
    canManageAds,
    currentUserRole: user.role,
    connectorStatus: googleAdsConnector,
    summary: {
      totalBudget,
      totalSpent,
      totalClicks,
      totalImpressions,
      avgCtr: `${avgCtr}%`,
      avgCpc: `${avgCpc.toLocaleString("vi-VN")} đ`,
      platformConversions: platformConversionsEstimate,
      crmLeadsFromAds,
      totalCrmLeads,
    },
  };
}

export async function createCampaign(user: UserSession, body: unknown) {
  assertCanManageAds(user);

  const parsed = CreateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message || "Thông tin chiến dịch không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const generatedCode = (
    parsed.data.code?.trim() || `TT-ADS-${Date.now().toString().slice(-6)}`
  ).toUpperCase();

  const existing = await findCampaignByCode(generatedCode);
  if (existing) {
    throw new AppError(
      409,
      `Mã chiến dịch "${generatedCode}" đã tồn tại trên hệ thống`,
      "DUPLICATE_CAMPAIGN_CODE"
    );
  }

  const campaign = await createCampaignRecord({
    code: generatedCode,
    name: parsed.data.name,
    platform: parsed.data.platform,
    status: parsed.data.status,
    budget: parsed.data.budget,
    spent: parsed.data.spent,
  });

  await logCampaignAudit({
    userId: user.userId,
    action: "CREATE_CAMPAIGN",
    entityId: campaign.id,
    details: JSON.stringify({
      code: campaign.code,
      name: campaign.name,
      platform: campaign.platform,
      budget: campaign.budget,
    }),
  });

  return {
    message: `Đã tạo chiến dịch quảng cáo "${campaign.name}" thành công!`,
    campaign,
  };
}

export async function updateCampaignBudgetOrStatus(
  user: UserSession,
  body: unknown
) {
  assertCanManageAds(user);

  const parsed = UpdateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message || "Thông tin cập nhật chiến dịch không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const { id, status, budget, spent } = parsed.data;
  const campaign = await updateCampaignRecord(id, {
    ...(status !== undefined ? { status } : {}),
    ...(budget !== undefined ? { budget } : {}),
    ...(spent !== undefined ? { spent } : {}),
  });

  await logCampaignAudit({
    userId: user.userId,
    action: "UPDATE_CAMPAIGN",
    entityId: campaign.id,
    details: JSON.stringify({ status, budget, spent }),
  });

  return {
    message: `Đã cập nhật chiến dịch "${campaign.name}" thành công!`,
    campaign,
  };
}

export async function searchAdsPublic(user: UserSession, query: string) {
  if (!canUserViewAds(user)) {
    return [];
  }
  const { campaigns, keywords } = await searchCampaignsAndKeywords(query);
  return [
    ...campaigns.map((campaign) => ({
      id: campaign.id,
      type: "campaign" as const,
      title: campaign.name,
      subtitle: `Chiến dịch · ${campaign.platform}`,
      tab: "ads" as const,
    })),
    ...keywords.map((keyword) => ({
      id: keyword.id,
      type: "keyword" as const,
      title: keyword.keyword,
      subtitle: `Từ khóa · ${keyword.source}`,
      tab: "ads" as const,
    })),
  ];
}

export async function getAdsDashboardSnapshot(): Promise<{
  campaignsCount: number;
}> {
  const campaignsCount = await countCampaigns();
  return { campaignsCount };
}
