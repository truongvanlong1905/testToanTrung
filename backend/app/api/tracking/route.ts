import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessAllLeads, unauthorizedResponse } from "@/lib/auth";
import { z } from "zod";

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const REQUEST_LIMIT = 60;
const WINDOW_MS = 60_000;

export const dynamic = "force-dynamic";

const TrackingEventSchema = z.object({
  websiteSource: z.string().trim().min(1).max(255).optional(),
  source: z.string().trim().min(1).max(100).optional(),
  medium: z.string().trim().min(1).max(100).optional(),
  campaign: z.string().trim().max(255).nullable().optional(),
  landingPage: z.string().trim().min(1).max(2048).optional(),
  device: z.string().trim().max(100).optional(),
  utmParams: z.union([z.record(z.string(), z.string()), z.string()]).optional(),
  leadId: z.string().optional(),
});

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  const configuredOrigins = process.env.TRACKING_ALLOWED_ORIGINS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origins = configuredOrigins?.length
    ? configuredOrigins
    : ["https://toantrungtelecom.com", "https://ledtoantrung.vn"];
  if (process.env.NODE_ENV !== "production") origins.push("http://localhost:3001");
  return origins.includes(origin) ? origin : null;
}

function consumeRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  requestCounts.forEach((record, key) => {
    if (now >= record.resetAt) requestCounts.delete(key);
  });
  if (requestCounts.size >= 10_000 && !requestCounts.has(ip)) {
    return { allowed: false, retryAfter: 60 };
  }
  const record = requestCounts.get(ip);
  if (!record || now >= record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (record.count >= REQUEST_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  record.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export async function OPTIONS(req: NextRequest) {
  const origin = allowedOrigin(req.headers.get("origin"));
  if (!origin) {
    return NextResponse.json(
      { success: false, error: { code: "ORIGIN_NOT_ALLOWED", message: "Website chưa được phép gửi tracking." } },
      { status: 403 }
    );
  }
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    const fullAccess = canAccessAllLeads(user);

    const [events, syncJobs, siteStats, totalEvents] = await Promise.all([
      prisma.trackingEvent.findMany({
        include: {
          lead: {
            select: { id: true, code: true, customerName: true, phone: fullAccess },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.syncJob.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.trackingEvent.groupBy({
        by: ["websiteSource"],
        _count: { _all: true },
      }),
      prisma.trackingEvent.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events,
        syncJobs,
        siteStats: Object.fromEntries(siteStats.map((site) => [site.websiteSource, site._count._all])),
        totalEvents,
      },
    });
  } catch (error) {
    console.error("GET /api/tracking error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi tải dữ liệu Tracking" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const origin = allowedOrigin(req.headers.get("origin"));
  if (!origin) {
    return NextResponse.json(
      { success: false, error: { code: "ORIGIN_NOT_ALLOWED", message: "Website chưa được phép gửi tracking." } },
      { status: 403 }
    );
  }

  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = consumeRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: { code: "TOO_MANY_REQUESTS", message: "Đã vượt giới hạn ghi nhận tracking. Vui lòng thử lại sau." } },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Access-Control-Allow-Origin": origin, Vary: "Origin" } }
    );
  }

  try {
    const validation = TrackingEventSchema.safeParse(await req.json());
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: validation.error.issues[0]?.message || "Dữ liệu tracking không hợp lệ" } },
        { status: 400, headers: { "Access-Control-Allow-Origin": origin, Vary: "Origin" } }
      );
    }
    const { websiteSource, source, medium, campaign, landingPage, device, utmParams, leadId } = validation.data;

    const event = await prisma.trackingEvent.create({
      data: {
        websiteSource: websiteSource || "toantrungtelecom.com",
        source: source || "direct",
        medium: medium || "none",
        campaign: campaign || null,
        landingPage: landingPage || "/",
        device: device || "Desktop",
        utmParams: typeof utmParams === "string" ? utmParams : JSON.stringify(utmParams || {}),
        leadId: leadId || null,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ghi nhận Tracking Event thành công",
      data: { event },
    }, { headers: { "Access-Control-Allow-Origin": origin, Vary: "Origin" } });
  } catch (error) {
    console.error("POST /api/tracking error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi ghi nhận Tracking" } },
      { status: 500, headers: { "Access-Control-Allow-Origin": origin, Vary: "Origin" } }
    );
  }
}
