import { prisma } from "@/src/core/db/prisma";

export async function queryCampaignsAndKeywords() {
  const [campaigns, keywords] = await Promise.all([
    prisma.marketingCampaign.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.keywordMetric.findMany({
      orderBy: { clicks: "desc" },
    }),
  ]);
  return { campaigns, keywords };
}

export async function findCampaignByCode(code: string) {
  return prisma.marketingCampaign.findUnique({
    where: { code },
  });
}

export async function createCampaignRecord(data: {
  code: string;
  name: string;
  platform: string;
  status: string;
  budget: number;
  spent: number;
}) {
  return prisma.marketingCampaign.create({ data });
}

export async function updateCampaignRecord(
  id: string,
  data: { status?: string; budget?: number; spent?: number }
) {
  return prisma.marketingCampaign.update({
    where: { id },
    data,
  });
}

export async function logCampaignAudit(data: {
  userId: string;
  action: string;
  entityId: string;
  details: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      entity: "CAMPAIGN",
      entityId: data.entityId,
      details: data.details,
    },
  });
}

export async function searchCampaignsAndKeywords(query: string) {
  const [campaigns, keywords] = await Promise.all([
    prisma.marketingCampaign.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { code: { contains: query } },
          { platform: { contains: query } },
        ],
      },
      select: { id: true, name: true, platform: true },
      take: 4,
    }),
    prisma.keywordMetric.findMany({
      where: { keyword: { contains: query } },
      select: { id: true, keyword: true, source: true },
      take: 4,
    }),
  ]);

  return { campaigns, keywords };
}

export async function countCampaigns() {
  return prisma.marketingCampaign.count();
}
