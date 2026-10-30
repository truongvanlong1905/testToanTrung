import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, unauthorizedResponse } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const validServices = ["GOOGLE_ADS", "GA4", "SEARCH_CONSOLE"];
    if (!validServices.includes(body.service)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Dịch vụ đồng bộ không hợp lệ" } },
        { status: 400 }
      );
    }

    const credentials: Record<string, string[]> = {
      GOOGLE_ADS: ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_REFRESH_TOKEN"],
      GA4: ["GA4_PROPERTY_ID", "GOOGLE_APPLICATION_CREDENTIALS"],
      SEARCH_CONSOLE: ["SEARCH_CONSOLE_SITE_URL", "GOOGLE_APPLICATION_CREDENTIALS"],
    };
    const service = body.service as keyof typeof credentials;
    const missing = credentials[service].filter((key) => !process.env[key]);
    const status = missing.length ? "NOT_CONFIGURED" : "ERROR";
    const errorMessage = missing.length
      ? `Thiếu cấu hình: ${missing.join(", ")}`
      : "Thông tin kết nối đã có nhưng adapter đồng bộ trực tiếp chưa được triển khai.";
    const job = await prisma.syncJob.create({
      data: {
        service,
        status,
        errorMessage,
      },
    });

    return NextResponse.json({
      success: false,
      message: errorMessage,
      data: { job },
    }, { status: missing.length ? 400 : 501 });
  } catch (error) {
    console.error("POST /api/tracking/sync error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SYNC_ERROR", message: "Không thể kiểm tra kết nối đồng bộ" } },
      { status: 500 }
    );
  }
}
