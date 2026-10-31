import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, "..");

export function getCloudEnv() {
  const dataDir = path.resolve(rootDir, "database", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqliteFile = path.resolve(dataDir, "source.sqlite").replace(/\\/g, "/");
  const defaultDbUrl = `file:${sqliteFile}`;

  const jwtSecret =
    process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
      ? process.env.JWT_SECRET
      : "toantrung-crm-cloud-jwt-secret-key-2026-production-ready";

  return {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL || defaultDbUrl,
    JWT_SECRET: jwtSecret,
    API_BASE_URL: process.env.API_BASE_URL || "http://127.0.0.1:3002",
    ALLOW_DEMO_SEED: process.env.ALLOW_DEMO_SEED || "true",
    SEED_DEMO_DATA: process.env.SEED_DEMO_DATA || "true",
    sqliteFilePath: sqliteFile,
  };
}

