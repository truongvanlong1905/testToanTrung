import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CreateCampaignSchema = z.object({
  name: z.string().trim().min(3, "Tên chiến dịch tối thiểu 3 ký tự"),
  code: z.string().trim().optional(),
  platform: z.enum(["Google Ads", "Facebook Ads", "TikTok Ads", "Zalo Ads", "SEO"]),
  status: z.enum(["Active", "Paused", "Completed"]).default("Active"),
  budget: z.number().min(0, "Ngân sách không âm"),
  spent: z.number().min(0, "Chi phí đã tiêu không âm").default(0),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const [campaigns, keywords] = await Promise.all([
      prisma.marketingCampaign.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.keywordMetric.findMany({
        orderBy: { clicks: "desc" },
      }),
    ]);

    // Tính toán tổng số liệu Ads
    const totalBudget = campaigns.reduce((acc, c) => acc + c.budget, 0);
    const totalSpent = campaigns.reduce((acc, c) => acc + c.spent, 0);
    const totalClicks = keywords.reduce((acc, k) => acc + k.clicks, 0);
    const totalImpressions = keywords.reduce((acc, k) => acc + k.impressions, 0);
    const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
    const avgCpc = totalClicks > 0 ? Math.round(totalSpent / totalClicks) : 0;

    // Quyền chỉnh sửa: Chỉ người có role ADS hoặc ADMIN
    const canManageAds = user?.role === "ADS" || user?.role === "ADMIN";

    return NextResponse.json({
      success: true,
      data: {
        campaigns,
        keywords,
        canManageAds,
        currentUserRole: user?.role,
        summary: {
          totalBudget,
          totalSpent,
          totalClicks,
          totalImpressions,
          avgCtr: `${avgCtr}%`,
          avgCpc: `${avgCpc.toLocaleString("vi-VN")} đ`,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi tải số liệu phân tích Ads" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Vui lòng đăng nhập" } },
        { status: 401 }
      );
    }

    // CHỈ 1 MÌNH ADS VÀ ADMIN CÓ QUYỀN UPLOAD / TẠO CHIẾN DỊCH
    if (user.role !== "ADS" && user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Quyền bị từ chối: Chỉ nhân sự bộ phận ADS hoặc Ban Giám Đốc mới có quyền tạo và chỉnh sửa chiến dịch quảng cáo.",
          },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CreateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Thông tin chiến dịch không hợp lệ" } },
        { status: 400 }
      );
    }

    const generatedCode = parsed.data.code?.trim() || `TT-ADS-${Date.now().toString().slice(-6)}`;

    const campaign = await prisma.marketingCampaign.create({
      data: {
        code: generatedCode,
        name: parsed.data.name,
        platform: parsed.data.platform,
        status: parsed.data.status,
        budget: parsed.data.budget,
        spent: parsed.data.spent,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Đã tạo chiến dịch quảng cáo "${campaign.name}" thành công!`,
        data: { campaign },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message || "Lỗi tạo chiến dịch quảng cáo" } },
      { status: 500 }
    );
  }
}
