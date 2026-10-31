import { prisma } from "@/src/core/db/prisma";

export async function checkSystemHealth(): Promise<{
  ok: boolean;
  status: number;
  payload: { success: boolean; service: "api"; database: "connected" | "unavailable" };
}> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      status: 200,
      payload: { success: true, service: "api", database: "connected" },
    };
  } catch (error) {
    console.error("GET /api/health database check failed:", error);
    return {
      ok: false,
      status: 503,
      payload: { success: false, service: "api", database: "unavailable" },
    };
  }
}
