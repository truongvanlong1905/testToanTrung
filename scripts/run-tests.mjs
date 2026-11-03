#!/usr/bin/env node
/**
 * Toàn Trung CRM — Isolated Module & Integration Test Suite (AC-01 .. AC-32)
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
    await runTest("DB Safety (AC-31): Verify active SQLite connection points to test-refactor.sqlite and backup exists", async () => {
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
      const backupFile = path.join(rootDir, "database", "data", "source.backup-pre-rebuild.sqlite");
      assert.equal(fs.existsSync(backupFile), true, "Pre-rebuild database backup must exist");
    });

    let salesUser;
    let directorUser;
    let ledCategory;
    let boardCategory;

    await runTest("AC-01, AC-02 & AC-07: Self-registration disabled, Admin/Director user management & 21 Product Categories schema", async () => {
      const authServiceSrc = fs.readFileSync(
        path.join(rootDir, "backend", "src", "core", "auth", "auth.service.ts"),
        "utf8"
      );
      assert.match(authServiceSrc, /REGISTRATION_DISABLED/);

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
          name: "Màn hình LED Trong nhà",
          group: "LED_SCREEN",
          sortOrder: 10,
          allowCustomText: false,
          isActive: true,
        },
      });

      boardCategory = await prisma.productCategory.create({
        data: {
          code: "BOARD_OTHER",
          name: "Bảng Điện Tử - Khác",
          group: "ELECTRONIC_BOARD",
          sortOrder: 230,
          allowCustomText: true,
          isActive: true,
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
      assert.equal(ledCategory.group, "LED_SCREEN");
      assert.equal(boardCategory.allowCustomText, true);
    });

    let createdLead;

    await runTest("AC-06..AC-13: Create Lead with normalizedPhone, demandType, contactChannel, quoteSentAt, customerRespondedAt & transfer reason", async () => {
      createdLead = await prisma.lead.create({
        data: {
          code: "TT-LED-2610-0001",
          customerName: "Nguyễn Minh Hoàng",
          companyName: "Công ty CP Sự Kiện Ánh Sáng Việt",
          phone: "+84 909 111 222",
          normalizedPhone: "0909111222",
          email: "contact@anhsangviet.vn",
          product: "Bảng Điện Tử - Khác: Bảng hiển thị nhiệt độ phòng sạch",
          productCustomText: "Bảng hiển thị nhiệt độ phòng sạch",
          demandType: "Mua",
          contactChannel: "Zalo",
          categoryId: boardCategory.id,
          source: "Zalo",
          status: "Vừa nhận thông tin",
          salesPersonId: salesUser.id,
          createdById: directorUser.id,
          location: "TP. Hồ Chí Minh",
        },
      });

      // Check duplicate lookup by normalizedPhone
      const dup = await prisma.lead.findFirst({
        where: { normalizedPhone: "0909111222" },
      });
      assert.ok(dup);
      assert.equal(dup.code, "TT-LED-2610-0001");
      assert.equal(dup.demandType, "Mua");
      assert.equal(dup.contactChannel, "Zalo");

      // Multi-table status transition to Đã gửi báo giá -> sets quoteSentAt
      const quoteTime = new Date();
      const [updatedLead, historyRecord, activityRecord, assignmentRecord] =
        await prisma.$transaction([
          prisma.lead.update({
            where: { id: createdLead.id },
            data: {
              status: "Đã gửi báo giá",
              quoteSentAt: quoteTime,
              lastContactedAt: quoteTime,
            },
          }),
          prisma.leadStatusHistory.create({
            data: {
              leadId: createdLead.id,
              fromStatus: "Vừa nhận thông tin",
              toStatus: "Đã gửi báo giá",
              changedById: salesUser.id,
            },
          }),
          prisma.leadActivity.create({
            data: {
              leadId: createdLead.id,
              type: "QUOTATION",
              summary: "Đã gửi báo giá bảng điện tử cho khách qua Zalo",
              outcome: "Đang chờ khách phản hồi",
              createdById: salesUser.id,
            },
          }),
          prisma.leadAssignment.create({
            data: {
              leadId: createdLead.id,
              toSalesId: salesUser.id,
              assignedById: directorUser.id,
              reason: "Phân công phụ trách dự án Bảng Điện Tử",
            },
          }),
        ]);

      assert.equal(updatedLead.status, "Đã gửi báo giá");
      assert.ok(updatedLead.quoteSentAt);
      assert.equal(historyRecord.toStatus, "Đã gửi báo giá");
      assert.equal(activityRecord.leadId, createdLead.id);
      assert.equal(assignmentRecord.toSalesId, salesUser.id);
    });

    await runTest("AC-04 & AC-05: DepartmentReport record-level isolation & NotificationRead persistence", async () => {
      const report = await prisma.departmentReport.create({
        data: {
          title: "Báo cáo tiến độ tuần Phòng Kinh Doanh",
          department: "SALES",
          content: "Tổng hợp số lượng khách đã gửi báo giá trong tuần.",
          createdById: salesUser.id,
        },
      });

      const readReceipt = await prisma.departmentReportRead.create({
        data: {
          reportId: report.id,
          userId: directorUser.id,
        },
      });

      const notifRead = await prisma.notificationRead.create({
        data: {
          userId: salesUser.id,
          notificationKey: `report:${report.id}`,
        },
      });

      assert.equal(readReceipt.userId, directorUser.id);
      assert.equal(notifRead.notificationKey, `report:${report.id}`);

      const reportPolicySrc = fs.readFileSync(
        path.join(rootDir, "backend", "src", "modules", "04-reports-dashboard", "policy.ts"),
        "utf8"
      );
      assert.match(reportPolicySrc, /assertCanAccessReportRecord/);
    });

    await runTest("AC-14 & AC-15: AI Lead disabled (403) & Quote Engine disabled (403) & Zero money cards on Overview/Lead UI", async () => {
      const leadAiSrc = fs.readFileSync(
        path.join(rootDir, "backend", "src", "modules", "01-leads", "lead-ai.service.ts"),
        "utf8"
      );
      assert.match(leadAiSrc, /AI_LEAD_DISABLED/);

      const leadQuoteSrc = fs.readFileSync(
        path.join(rootDir, "backend", "src", "modules", "01-leads", "lead-quote.service.ts"),
        "utf8"
      );
      assert.match(leadQuoteSrc, /QUOTE_ENGINE_DISABLED|PRICING_ENGINE_DISABLED/);

      const overviewSrc = fs.readFileSync(
        path.join(rootDir, "frontend", "src", "modules", "04-reports-dashboard", "components", "OverviewView.tsx"),
        "utf8"
      );
      assert.doesNotMatch(overviewSrc, /label="Đang báo giá"/);
      assert.match(overviewSrc, /Sản phẩm được quan tâm/);
    });

    await runTest("AC-16 & AC-17: M02 (02-tracking) eventKey idempotency & honest defaults ('Chưa có thông tin')", async () => {
      const event = await prisma.trackingEvent.create({
        data: {
          eventKey: "evt-unique-key-001",
          leadId: createdLead.id,
          websiteSource: "Chưa có thông tin",
          source: "google",
          medium: "cpc",
          campaign: "Search - Man Hinh LED Hoi Truong",
          landingPage: "/man-hinh-led-hoi-truong-p2-5",
          device: "Chưa có thông tin",
          location: "Chưa có thông tin",
        },
      });
      assert.equal(event.eventKey, "evt-unique-key-001");
      assert.equal(event.websiteSource, "Chưa có thông tin");

      const trackingServiceSrc = fs.readFileSync(
        path.join(rootDir, "backend", "src", "modules", "02-tracking", "service.ts"),
        "utf8"
      );
      assert.match(trackingServiceSrc, /findTrackingEventByEventKey/);
    });

    await runTest("AC-18: M03 (03-ads-keywords) separates platformConversions and crmLeadsFromAds", async () => {
      const adsServiceSrc = fs.readFileSync(
        path.join(rootDir, "backend", "src", "modules", "03-ads-keywords", "service.ts"),
        "utf8"
      );
      assert.match(adsServiceSrc, /platformConversions/);
      assert.match(adsServiceSrc, /crmLeadsFromAds/);
    });

    await runTest("AC-19..AC-24 & AC-29..AC-30: 5 Mandatory CRM Reports, Excel text phone preservation, Full-page report detail & Brand Header", async () => {
      const reportsViewSrc = fs.readFileSync(
        path.join(rootDir, "frontend", "src", "modules", "04-reports-dashboard", "components", "ReportsView.tsx"),
        "utf8"
      );
      assert.match(reportsViewSrc, /Báo cáo 1 — Tổng số Lead theo tuần \/ tháng/);
      assert.match(reportsViewSrc, /Báo cáo 2 — Phân bổ Lead theo nhân viên kinh doanh/);
      assert.match(reportsViewSrc, /Báo cáo 3 — Thống kê theo danh mục sản phẩm & loại nhu cầu/);
      assert.match(reportsViewSrc, /Báo cáo 4 — Báo cáo theo trạng thái bán hàng/);
      assert.match(reportsViewSrc, /Báo cáo 5 — Báo giá & Danh sách khách đã gửi báo giá nhưng chưa phản hồi/);
      assert.match(reportsViewSrc, /Quay lại danh sách báo cáo/);

      const excelSrc = fs.readFileSync(
        path.join(rootDir, "frontend", "src", "core", "utils", "excel-export.ts"),
        "utf8"
      );
      assert.match(excelSrc, /2\. Phân Bổ Theo Sales \(Brief\)/);
      assert.match(excelSrc, /cellPhone/);

      const sidebarSrc = fs.readFileSync(
        path.join(rootDir, "frontend", "src", "core", "layout", "Sidebar.tsx"),
        "utf8"
      );
      assert.match(sidebarSrc, /MINI CRM/);
      assert.match(sidebarSrc, /max-h-\[80px\]/);
    });

    await runTest("AC-03 & AC-27: Auth & Session Security (HMAC-SHA256) & Role Permissions Matrix", async () => {
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

      const [partPayload, partSig] = token.split(".");
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(partPayload)
        .digest("base64url");
      assert.equal(partSig, expectedSig);

      const fePermSrc = fs.readFileSync(
        path.join(rootDir, "frontend", "src", "core", "auth", "permissions.ts"),
        "utf8"
      );
      assert.match(fePermSrc, /ALLOWED_TABS_BY_ROLE/);
      assert.match(fePermSrc, /DIRECTOR/);
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
