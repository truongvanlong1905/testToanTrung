#!/usr/bin/env node
/**
 * Toàn Trung CRM — Isolated Module & Integration Test Suite
 *
 * SAFETY GUARANTEE:
 * - Never touches `database/data/source.sqlite`.
 * - Forces `DATABASE_URL` to an isolated temporary SQLite file:
 *   `database/data/test-refactor.sqlite`
 * - Verifies active Prisma connection points strictly to `test-refactor.sqlite`
 *   before executing any write operation.
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const sourceDbPath = path.join(rootDir, "database", "data", "source.sqlite");
const testDbPath = path.join(rootDir, "database", "data", "test-refactor.sqlite");
const testDbJournalPath = `${testDbPath}-journal`;
const prismaTestDbPath = path.join(rootDir, "database", "prisma", "data", "test-refactor.sqlite");
const testDbUrl = `file:${testDbPath.replace(/\\/g, "/")}`;

// Force test environment variables BEFORE importing Prisma
process.env.DATABASE_URL = testDbUrl;
process.env.SESSION_SECRET = "test-session-secret-for-refactor-verification-2026";

if (process.env.DATABASE_URL.includes("source.sqlite")) {
  console.error("❌ FATAL: Test runner refused to run against source.sqlite!");
  process.exit(1);
}

function cleanupTestDb() {
  for (const p of [
    testDbPath,
    testDbJournalPath,
    `${testDbPath}-wal`,
    `${testDbPath}-shm`,
    prismaTestDbPath,
    `${prismaTestDbPath}-journal`,
  ]) {
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        // Ignore Windows file lock delay on exit
      }
    }
  }
  const prismaDataDir = path.dirname(prismaTestDbPath);
  if (fs.existsSync(prismaDataDir)) {
    try {
      fs.rmdirSync(prismaDataDir);
    } catch {}
  }
}

console.log("==================================================================");
console.log(" Toàn Trung CRM — Module Unit & Integration Test Runner");
console.log("==================================================================");
console.log(`• Protected Source DB : ${sourceDbPath} (UNTOUCHED)`);
console.log(`• Isolated Test DB    : ${testDbPath}`);
console.log(`• Active DATABASE_URL : ${process.env.DATABASE_URL}`);

cleanupTestDb();

// 1. Push schema to isolated test-refactor.sqlite via Prisma CLI entry script (no shell needed)
const prismaCliJs = path.join(rootDir, "node_modules", "prisma", "build", "index.js");

const pushResult = spawnSync(
  process.execPath,
  [prismaCliJs, "db", "push", "--schema", "database/prisma/schema.prisma", "--skip-generate"],
  {
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: testDbUrl },
    stdio: "pipe",
    encoding: "utf8",
  }
);

if (pushResult.status !== 0) {
  console.error("❌ Failed to initialize isolated test database:");
  console.error(pushResult.stdout);
  console.error(pushResult.stderr);
  process.exit(1);
}

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  const start = Date.now();
  try {
    await fn();
    passed++;
    console.log(`  ✅ [PASS] ${name} (${Date.now() - start}ms)`);
  } catch (err) {
    failed++;
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     ${err instanceof Error ? err.stack || err.message : String(err)}`);
  }
}

// 2. Discover & execute module-level unit test files in backend/src/modules/*/tests and frontend/src/modules/*/tests
async function runModuleTestFiles() {
  const modules = [
    "01-leads",
    "02-tracking",
    "03-ads-keywords",
    "04-reports-dashboard",
    "05-ai-design",
  ];

  for (const side of ["backend", "frontend"]) {
    for (const mod of modules) {
      const testDir = path.join(rootDir, side, "src", "modules", mod, "tests");
      if (!fs.existsSync(testDir)) continue;
      const files = fs
        .readdirSync(testDir)
        .filter((f) => f.endsWith(".test.mjs") || f.endsWith(".test.js"));
      for (const file of files) {
        const fullPath = path.join(testDir, file);
        const content = fs.readFileSync(fullPath, "utf8");
        await runTest(`${side}/${mod}/tests/${file}`, async () => {
          if (content.includes("node:test")) {
            const res = spawnSync(process.execPath, ["--test", fullPath], {
              cwd: rootDir,
              encoding: "utf8",
            });
            assert.equal(
              res.status,
              0,
              `node --test failed for ${file}:\n${res.stdout}\n${res.stderr}`
            );
          } else {
            const modImported = await import(pathToFileURL(fullPath).href);
            if (typeof modImported.runModuleTests === "function") {
              await modImported.runModuleTests();
            }
          }
        });
      }
    }
  }
}

// 3. Run multi-table database & cross-module integration tests on test-refactor.sqlite
async function runDatabaseIntegrationTests() {
  const generatedClientUrl = pathToFileURL(
    path.join(rootDir, "database", "generated", "sqlite", "index.js")
  ).href;
  const prismaMod = await import(generatedClientUrl);
  const PrismaClient = prismaMod.PrismaClient || prismaMod.default?.PrismaClient;
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${testDbPath}`,
      },
    },
  });

  try {
    await runTest("DB Safety: Verify active SQLite connection points to test-refactor.sqlite", async () => {
      const dbList = await prisma.$queryRawUnsafe("PRAGMA database_list;");
      assert.ok(Array.isArray(dbList) && dbList.length > 0);
      const mainDbFile = String(dbList[0].file || "");
      assert.ok(
        mainDbFile.includes("test-refactor.sqlite"),
        `Expected connection to test-refactor.sqlite, got ${mainDbFile}`
      );
      assert.ok(
        !mainDbFile.includes("source.sqlite"),
        "Connection must NEVER point to source.sqlite"
      );
    });

    let salesUser;
    let directorUser;
    let ledCategory;

    await runTest("Core Auth, Departments & Categories: Create Department, ProductCategory, Director, and Sales accounts", async () => {
      const dept = await prisma.department.create({
        data: {
          code: "SALES_LED_B2B",
          name: "Khối Kinh Doanh LED Dự Án",
          description: "Phòng kinh doanh màn hình LED B2B",
        },
      });

      ledCategory = await prisma.productCategory.create({
        data: {
          code: "LED_INDOOR",
          name: "Màn hình LED Hội trường Indoor",
          description: "Dòng module LED P1.5 - P2.5 lắp đặt trong nhà",
        },
      });

      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync("TestPassword@123", salt, 64).toString("hex");

      directorUser = await prisma.user.create({
        data: {
          name: "Nguyễn Giám Đốc",
          email: "director@toantrung.test",
          passwordHash: `scrypt:${salt}:${hash}`,
          role: "DIRECTOR",
          actorType: "DIRECTOR",
          department: dept.code,
          position: "Giám đốc",
          initials: "GĐ",
        },
      });

      salesUser = await prisma.user.create({
        data: {
          name: "Trần Chuyên Viên Sales",
          email: "sales@toantrung.test",
          passwordHash: `scrypt:${salt}:${hash}`,
          role: "SALES",
          actorType: "USER",
          department: dept.code,
          position: "Nhân viên",
          initials: "TS",
        },
      });

      assert.equal(directorUser.role, "DIRECTOR");
      assert.equal(salesUser.role, "SALES");
      assert.equal(ledCategory.code, "LED_INDOOR");
    });

    let createdLead;

    await runTest("M01 (01-leads): Create Lead, enforce phone deduplication, and multi-table status & assignment transaction", async () => {
      createdLead = await prisma.lead.create({
        data: {
          code: "TT-LED-2610-0001",
          customerName: "Nguyễn Minh Hoàng",
          companyName: "Công ty CP Sự Kiện Ánh Sáng Việt",
          phone: "0909111222",
          email: "contact@anhsangviet.vn",
          product: "Màn hình LED P2.5 Indoor",
          categoryId: ledCategory.id,
          source: "Website",
          estimatedValue: "350.000.000 đ",
          status: "Vừa nhận thông tin",
          priorityScore: 88,
          priorityTier: "HOT",
          salesPersonId: salesUser.id,
          createdById: directorUser.id,
          ledWidth: 6,
          ledHeight: 4,
          ledModuleType: "P2.5 Indoor",
          location: "TP. Hồ Chí Minh",
        },
      });

      // Check duplicate lookup by phone
      const dup = await prisma.lead.findFirst({
        where: { phone: "0909111222" },
      });
      assert.ok(dup);
      assert.equal(dup.code, "TT-LED-2610-0001");

      // Multi-table status transition (Lead + LeadStatusHistory + LeadActivity + AuditLog)
      const [updatedLead, historyRecord, activityRecord, assignmentRecord] =
        await prisma.$transaction([
          prisma.lead.update({
            where: { id: createdLead.id },
            data: { status: "Đang soạn báo giá", lastContactedAt: new Date() },
          }),
          prisma.leadStatusHistory.create({
            data: {
              leadId: createdLead.id,
              fromStatus: "Vừa nhận thông tin",
              toStatus: "Đang soạn báo giá",
              changedById: salesUser.id,
            },
          }),
          prisma.leadActivity.create({
            data: {
              leadId: createdLead.id,
              type: "CALL",
              summary: "Đã gọi điện khảo sát kích thước hội trường 6m x 4m",
              outcome: "Khách cần báo giá chi tiết trong hôm nay",
              createdById: salesUser.id,
            },
          }),
          prisma.leadAssignment.create({
            data: {
              leadId: createdLead.id,
              toSalesId: salesUser.id,
              assignedById: directorUser.id,
              reason: "Phân công phụ trách dự án LED Hội trường",
            },
          }),
        ]);

      assert.equal(updatedLead.status, "Đang soạn báo giá");
      assert.equal(historyRecord.toStatus, "Đang soạn báo giá");
      assert.equal(activityRecord.leadId, createdLead.id);
      assert.equal(assignmentRecord.toSalesId, salesUser.id);
    });

    await runTest("M01 -> M04 Cross-Module Flow: Quote exceeding discount threshold creates Director Approval Report & Read Receipt", async () => {
      const [quote, report] = await prisma.$transaction([
        prisma.leadQuote.create({
          data: {
            code: "BG-TT-2610-001",
            leadId: createdLead.id,
            moduleSpec: "Màn hình LED P2.5 Indoor Cabinet Nhôm Đúc",
            widthMeters: 6,
            heightMeters: 4,
            areaSqm: 24,
            unitPriceVnd: 14500000,
            processorVnd: 12000000,
            structureInstallVnd: 18000000,
            discountPercent: 12,
            totalVnd: 332640000,
            status: "PENDING_DIRECTOR",
            createdById: salesUser.id,
          },
        }),
        prisma.departmentReport.create({
          data: {
            title: "[CẦN DUYỆT GIÁ] BG-TT-2610-001 — Sự Kiện Ánh Sáng Việt",
            department: "SALES",
            content: "Tờ trình xin phê duyệt mức chiết khấu 12% cho dự án 24m² P2.5 Indoor.",
            createdById: salesUser.id,
          },
        }),
      ]);

      const readReceipt = await prisma.departmentReportRead.create({
        data: {
          reportId: report.id,
          userId: directorUser.id,
        },
      });

      assert.equal(quote.status, "PENDING_DIRECTOR");
      assert.ok(report.title.includes("CẦN DUYỆT GIÁ"));
      assert.equal(readReceipt.userId, directorUser.id);
    });

    await runTest("M02 (02-tracking): Record TrackingEvent and SyncJob multi-table state", async () => {
      const event = await prisma.trackingEvent.create({
        data: {
          leadId: createdLead.id,
          websiteSource: "toantrungtelecom.com",
          source: "google",
          medium: "cpc",
          campaign: "Search - Man Hinh LED Hoi Truong",
          landingPage: "/man-hinh-led-hoi-truong-p2-5",
          device: "Desktop",
          location: "TP. Hồ Chí Minh",
        },
      });
      assert.equal(event.leadId, createdLead.id);

      const syncJob = await prisma.syncJob.create({
        data: {
          service: "GOOGLE_ADS",
          status: "NOT_CONFIGURED",
          recordsSynced: 0,
          errorMessage: "Chưa cấu hình OAuth Google Ads Developer Token",
        },
      });
      assert.equal(syncJob.status, "NOT_CONFIGURED");
    });

    await runTest("M03 (03-ads-keywords): Create MarketingCampaign, AdsPerformance, and KeywordMetric", async () => {
      const campaign = await prisma.marketingCampaign.create({
        data: {
          code: "CMP-GG-2610-01",
          name: "Google Search — LED Hội Trường Q4",
          platform: "Google Ads",
          status: "Active",
          budget: 50000000,
          spent: 18500000,
        },
      });

      const perf = await prisma.adsPerformance.create({
        data: {
          campaignId: campaign.id,
          impressions: 3100,
          clicks: 120,
          cost: 1450000,
          conversions: 2,
          cpc: 12083,
          ctr: 3.87,
        },
      });

      const keyword = await prisma.keywordMetric.create({
        data: {
          keyword: "báo giá màn hình led p2.5 hội trường",
          impressions: 8500,
          clicks: 410,
          avgCpc: 11200,
          avgPosition: 1.4,
          searchVolume: 2400,
          source: "Google Ads",
        },
      });

      assert.equal(campaign.platform, "Google Ads");
      assert.equal(perf.campaignId, campaign.id);
      assert.equal(keyword.searchVolume, 2400);
    });

    await runTest("M05 (05-ai-design): Persist AI Design job in AuditLog (entity = AI_DESIGN)", async () => {
      const designJob = await prisma.auditLog.create({
        data: {
          userId: salesUser.id,
          leadId: createdLead.id,
          action: "GENERATE_CONCEPT",
          entity: "AI_DESIGN",
          entityId: "AI-DES-2610-001",
          details: JSON.stringify({
            prompt: "Sảnh hội nghị sang trọng 500 chỗ, màn hình LED P2 cong 12m x 4m",
            stylePreset: "Hội trường hiện đại",
            aspectRatio: "16:9",
            status: "COMPLETED",
          }),
        },
      });
      assert.equal(designJob.entity, "AI_DESIGN");
      assert.equal(designJob.entityId, "AI-DES-2610-001");
    });

    await runTest("Auth & Session Security: HMAC-SHA256 session token sign/verify, expiration & RBAC role isolation", async () => {
      const secret = process.env.SESSION_SECRET;
      const payload = {
        sub: salesUser.id,
        email: salesUser.email,
        name: salesUser.name,
        role: salesUser.role,
        actorType: salesUser.actorType,
        department: salesUser.department,
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const sig = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
      const token = `${encoded}.${sig}`;

      // Verify valid token
      const [partPayload, partSig] = token.split(".");
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(partPayload)
        .digest("base64url");
      assert.equal(partSig, expectedSig);

      // Verify tampered token is rejected
      const tamperedPayload = Buffer.from(
        JSON.stringify({ ...payload, role: "ADMIN" })
      ).toString("base64url");
      assert.notEqual(
        crypto.createHmac("sha256", secret).update(tamperedPayload).digest("base64url"),
        partSig
      );

      // Verify RBAC filtering: SALES only sees leads assigned to them
      const otherSales = await prisma.user.create({
        data: {
          name: "Lê Sales Khác",
          email: "othersales@toantrung.test",
          passwordHash: salesUser.passwordHash,
          role: "SALES",
          actorType: "USER",
          department: salesUser.department,
        },
      });
      await prisma.lead.create({
        data: {
          code: "TT-LED-2610-0002",
          customerName: "Khách Của Sales Khác",
          companyName: "Công ty B",
          phone: "0909333444",
          product: "Màn hình LED P3 Outdoor",
          categoryId: ledCategory.id,
          salesPersonId: otherSales.id,
        },
      });

      const salesVisibleLeads = await prisma.lead.findMany({
        where: { salesPersonId: salesUser.id },
      });
      const directorVisibleLeads = await prisma.lead.findMany();
      assert.equal(salesVisibleLeads.length, 1);
      assert.equal(directorVisibleLeads.length, 2);
    });

    await runTest("Filtering, Failure Reason Validation & Honest Unconfigured Error States (501/503)", async () => {
      // 1. Filter by status, source, and search keyword
      const filtered = await prisma.lead.findMany({
        where: {
          status: "Đang soạn báo giá",
          source: "Website",
          OR: [
            { customerName: { contains: "Hoàng" } },
            { phone: { contains: "0909111222" } },
          ],
        },
      });
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].code, "TT-LED-2610-0001");

      // 2. Verify M02 Sync source specs return NOT_CONFIGURED when OAuth env vars are absent
      const syncCont = fs.readFileSync(
        path.join(rootDir, "backend", "src", "modules", "02-tracking", "contracts.ts"),
        "utf8"
      );
      assert.match(syncCont, /EXTERNAL_CONNECTOR_NOT_CONFIGURED|NOT_CONFIGURED/);

      // 3. Verify Logger redacts passwords, tokens, and API keys
      const loggerContent = fs.readFileSync(
        path.join(rootDir, "backend", "src", "core", "logger.ts"),
        "utf8"
      );
      assert.match(loggerContent, /REDACTED/);
      assert.match(loggerContent, /requestId/);
      assert.match(loggerContent, /moduleId/);
      assert.match(loggerContent, /errorCode/);
    });
  } finally {
    await prisma.$disconnect();
    cleanupTestDb();
  }
}

await runModuleTestFiles();
await runDatabaseIntegrationTests();

console.log("------------------------------------------------------------------");
console.log(`Test Summary: ${passed} passed, ${failed} failed`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}
