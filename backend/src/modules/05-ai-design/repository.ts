import { prisma } from "@/src/core/db/prisma";

export async function countDesignAuditActions() {
  return prisma.auditLog.count({
    where: { entity: "DESIGN" },
  });
}
