import { NextResponse } from "next/server";
import { checkSystemHealth } from "@/src/core/admin/health.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await checkSystemHealth();
  return NextResponse.json(result.payload, { status: result.status });
}
