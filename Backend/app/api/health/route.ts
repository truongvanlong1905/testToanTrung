import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ success: true, service: "api", database: "connected" });
  } catch (error) {
    console.error("GET /api/health database check failed:", error);
    return NextResponse.json(
      { success: false, service: "api", database: "unavailable" },
      { status: 503 }
    );
  }
}
