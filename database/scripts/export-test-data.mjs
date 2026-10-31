import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "../generated/sqlite/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetFile = path.resolve(__dirname, "..", "prisma", "test-data.mjs");
const prisma = new PrismaClient();

async function exportTestData() {
  const [
    users,
    departments,
    categories,
    promotions,
    campaigns,
    keywords,
    tracking,
    leads,
    quotes,
    activities,
    reports,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.department.findMany({ orderBy: { code: "asc" } }),
    prisma.productCategory.findMany({ orderBy: { code: "asc" } }),
    prisma.promotionDecision.findMany({ orderBy: { code: "asc" } }),
    prisma.marketingCampaign.findMany({ orderBy: { code: "asc" } }),
    prisma.keywordMetric.findMany({ orderBy: { id: "asc" } }),
    prisma.trackingEvent.findMany({ orderBy: { id: "asc" } }),
    prisma.lead.findMany({ orderBy: { code: "asc" }, include: { attachments: true } }),
    prisma.leadQuote.findMany({ orderBy: { code: "asc" } }),
    prisma.leadActivity.findMany({ orderBy: { id: "asc" } }),
    prisma.departmentReport.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const cleanUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    actorType: u.actorType,
    department: u.department,
    position: u.position,
    appointedDecisionCode: u.appointedDecisionCode,
    initials: u.initials,
    avatar: u.avatar,
    achievements: u.achievements,
  }));

  const cleanDepts = departments.map((d) => ({
    code: d.code,
    name: d.name,
    description: d.description,
  }));

  const cleanCategories = categories.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    description: c.description,
  }));

  const cleanPromos = promotions.map((p) => ({
    code: p.code,
    title: p.title,
    content: p.content,
    targetUserId: p.targetUserId,
    targetDepartment: p.targetDepartment,
    newPosition: p.newPosition,
    signedById: p.signedById,
    signedByName: p.signedByName,
    status: p.status,
    appliedByAdminId: p.appliedByAdminId,
  }));

  const cleanCampaigns = campaigns.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    platform: c.platform,
    status: c.status,
    budget: c.budget,
    spent: c.spent,
  }));

  const cleanKeywords = keywords.map((k) => ({
    id: k.id,
    keyword: k.keyword,
    impressions: k.impressions,
    clicks: k.clicks,
    avgCpc: k.avgCpc,
    avgPosition: k.avgPosition,
    searchVolume: k.searchVolume,
    source: k.source,
  }));

  const cleanTracking = tracking.map((t) => ({
    id: t.id,
    websiteSource: t.websiteSource,
    source: t.source,
    medium: t.medium,
    campaign: t.campaign,
    landingPage: t.landingPage,
    device: t.device,
    ipAddress: t.ipAddress,
    location: t.location,
  }));

  const cleanLeads = leads.map((l) => ({
    id: l.id,
    code: l.code,
    customerName: l.customerName,
    companyName: l.companyName,
    phone: l.phone,
    email: l.email,
    installationAddress: l.installationAddress,
    location: l.location,
    product: l.product,
    categoryId: l.categoryId,
    source: l.source,
    status: l.status,
    failureReason: l.failureReason,
    estimatedValue: l.estimatedValue,
    notes: l.notes,
    priorityScore: l.priorityScore,
    priorityTier: l.priorityTier,
    nextFollowUpAt: l.nextFollowUpAt ? l.nextFollowUpAt.toISOString() : null,
    nextActionNote: l.nextActionNote,
    ledWidth: l.ledWidth,
    ledHeight: l.ledHeight,
    ledModuleType: l.ledModuleType,
    discountPercent: l.discountPercent,
    directorApprovalStatus: l.directorApprovalStatus,
    salesPersonId: l.salesPersonId,
    createdById: l.createdById,
    createdAt: l.createdAt ? l.createdAt.toISOString() : new Date().toISOString(),
    attachments: (l.attachments || []).map((att) => ({
      id: att.id,
      fileName: att.fileName,
      fileUrl: att.fileUrl,
      fileSize: att.fileSize,
      fileType: att.fileType,
      uploadedById: att.uploadedById,
    })),
  }));

  const cleanQuotes = quotes.map((q) => ({
    id: q.id,
    code: q.code,
    leadId: q.leadId,
    moduleSpec: q.moduleSpec,
    widthMeters: q.widthMeters,
    heightMeters: q.heightMeters,
    areaSqm: q.areaSqm,
    unitPriceVnd: q.unitPriceVnd,
    processorVnd: q.processorVnd,
    structureInstallVnd: q.structureInstallVnd,
    discountPercent: q.discountPercent,
    totalVnd: q.totalVnd,
    warrantyMonths: q.warrantyMonths,
    notes: q.notes,
    status: q.status,
    createdById: q.createdById,
  }));

  const cleanActivities = activities.map((a) => ({
    id: a.id,
    leadId: a.leadId,
    type: a.type,
    summary: a.summary,
    outcome: a.outcome,
    nextFollowUpAt: a.nextFollowUpAt ? a.nextFollowUpAt.toISOString() : null,
    createdById: a.createdById,
  }));

  const cleanReports = reports.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    department: r.department,
    attachmentName: r.attachmentName,
    attachmentUrl: r.attachmentUrl,
    createdById: r.createdById,
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
  }));

  const content = `/**
 * FILE DỮ LIỆU TEST DÙNG CHUNG TOÀN HỆ THỐNG (LOCAL & CLOUD RENDER)
 * Tự động xuất từ Database qua lệnh: npm run db:save-test
 */

export const TEST_USERS = ${JSON.stringify(cleanUsers, null, 2)};

export const TEST_DEPARTMENTS = ${JSON.stringify(cleanDepts, null, 2)};

export const TEST_CATEGORIES = ${JSON.stringify(cleanCategories, null, 2)};

export const TEST_PROMOTION_DECISIONS = ${JSON.stringify(cleanPromos, null, 2)};

export const TEST_CAMPAIGNS = ${JSON.stringify(cleanCampaigns, null, 2)};

export const TEST_KEYWORDS = ${JSON.stringify(cleanKeywords, null, 2)};

export const TEST_TRACKING_EVENTS = ${JSON.stringify(cleanTracking, null, 2)};

export const TEST_LEADS = ${JSON.stringify(cleanLeads, null, 2)};

export const TEST_QUOTES = ${JSON.stringify(cleanQuotes, null, 2)};

export const TEST_ACTIVITIES = ${JSON.stringify(cleanActivities, null, 2)};

export const TEST_REPORTS = ${JSON.stringify(cleanReports, null, 2)};
`;

  fs.writeFileSync(targetFile, content, "utf8");
  console.log(
    `✅ Đã lưu toàn bộ dữ liệu hiện tại vào database/prisma/test-data.mjs (${cleanLeads.length} Lead, ${cleanCampaigns.length} Chiến dịch, ${cleanReports.length} Báo cáo).`
  );
}

exportTestData()
  .catch((err) => {
    console.error("❌ Lỗi xuất dữ liệu test:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
