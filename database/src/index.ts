import fs from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "../generated/sqlite";

function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();
  if (raw && !raw.includes("test-login.db")) {
    return raw;
  }
  const candidates = [
    path.resolve(process.cwd(), "database", "data", "source.sqlite"),
    path.resolve(process.cwd(), "..", "database", "data", "source.sqlite"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.dirname(candidate))) {
      return `file:${candidate.replace(/\\/g, "/")}`;
    }
  }
  return raw;
}

const SCHEMA_SIGNATURE = [
  ...Object.keys(Prisma.ModelName ?? {}),
  ...Object.keys(Prisma.UserScalarFieldEnum ?? {}),
  ...Object.keys(Prisma.LeadScalarFieldEnum ?? {}),
].join(",");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaSignature: string | undefined;
};

if (
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaSignature !== SCHEMA_SIGNATURE
) {
  void globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
}

const resolvedDbUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(resolvedDbUrl ? { datasources: { db: { url: resolvedDbUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaSignature = SCHEMA_SIGNATURE;
}

export type { Prisma, PrismaClient } from "../generated/sqlite";
