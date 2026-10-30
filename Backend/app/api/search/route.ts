import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const SearchQuery = z.string().trim().min(2).max(80);

export async function GET(req: NextRequest) {
  const parsed = SearchQuery.safeParse(req.nextUrl.searchParams.get("q") || "");
  if (!parsed.success) {
    return NextResponse.json({ success: true, data: { results: [] } });
  }

  const query = parsed.data;
  try {
    const user = await getCurrentUser(req);
    const [leads, campaigns, keywords, users] = await Promise.all([
      prisma.lead.findMany({
        where: {
          OR: [
            { code: { contains: query } },
            { customerName: { contains: query } },
            { companyName: { contains: query } },
            { phone: { contains: query } },
            { product: { contains: query } },
          ],
        },
        select: { id: true, code: true, customerName: true, companyName: true, status: true },
        take: 5,
      }),
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
      user?.role === "ADMIN" ? prisma.user.findMany({
        where: {
          isActive: true,
          OR: [{ name: { contains: query } }, { email: { contains: query } }],
        },
        select: { id: true, name: true, email: true, role: true },
        take: 4,
      }) : Promise.resolve([]),
    ]);

    const results = [
      ...leads.map((lead) => ({
        id: lead.id,
        type: "lead",
        title: lead.customerName,
        subtitle: `${lead.code} · ${lead.companyName} · ${lead.status}`,
        tab: "leads",
      })),
      ...campaigns.map((campaign) => ({
        id: campaign.id,
        type: "campaign",
        title: campaign.name,
        subtitle: `Chiến dịch · ${campaign.platform}`,
        tab: "ads",
      })),
      ...keywords.map((keyword) => ({
        id: keyword.id,
        type: "keyword",
        title: keyword.keyword,
        subtitle: `Từ khóa · ${keyword.source}`,
        tab: "ads",
      })),
      ...users.map((user) => ({
        id: user.id,
        type: "user",
        title: user.name,
        subtitle: `${user.email} · ${user.role}`,
        tab: "users",
      })),
    ];

    return NextResponse.json({ success: true, data: { results } });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Tìm kiếm không thành công" } },
      { status: 500 }
    );
  }
}
