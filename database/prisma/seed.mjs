import { PrismaClient } from "../generated/sqlite/index.js";
import bcrypt from "bcryptjs";
import {
  TEST_USERS,
  TEST_DEPARTMENTS,
  TEST_CATEGORIES,
  TEST_PROMOTION_DECISIONS,
  TEST_CAMPAIGNS,
  TEST_KEYWORDS,
  TEST_TRACKING_EVENTS,
  TEST_LEADS,
  TEST_QUOTES,
  TEST_ACTIVITIES,
  TEST_REPORTS,
} from "./test-data.mjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED === "false") {
    throw new Error(
      "Demo seed data is disabled in production. Provision production users and data separately."
    );
  }

  console.log("🌱 Bắt đầu đồng bộ Dữ liệu Test (database/prisma/test-data.mjs) cho TOÀN TRUNG...");

  const defaultPassword = "Password123@";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Đồng bộ Users (3 Tác nhân ATTT: ADMIN - DIRECTOR - USER)
  for (const u of TEST_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        name: u.name,
        role: u.role,
        actorType: u.actorType,
        department: u.department,
        position: u.position,
        appointedDecisionCode: u.appointedDecisionCode || null,
        initials: u.initials,
        achievements: u.achievements || null,
      },
      create: {
        ...u,
        passwordHash,
      },
    });
  }

  // 2. Đồng bộ Phòng ban (Departments)
  for (const dept of TEST_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description },
      create: dept,
    });
  }

  // 3. Đồng bộ Danh mục Sản phẩm LED (Categories)
  for (const c of TEST_CATEGORIES) {
    await prisma.productCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }

  // 4. Đồng bộ Cấu hình Thương hiệu (Brand Setting)
  await prisma.brandSetting.upsert({
    where: { id: "default_brand" },
    update: {
      brandName: "TOÀN TRUNG",
      slogan: "Giải pháp hiển thị màn hình LED & Viễn thông chuyên nghiệp",
      primaryColor: "#2563EB",
      supportHotline: "0909.123.456",
    },
    create: {
      id: "default_brand",
      brandName: "TOÀN TRUNG",
      slogan: "Giải pháp hiển thị màn hình LED & Viễn thông chuyên nghiệp",
      primaryColor: "#2563EB",
      supportHotline: "0909.123.456",
    },
  });

  // 5. Đồng bộ Sync Jobs mặc định
  const syncJobs = [
    {
      service: "GOOGLE_ADS",
      status: "NOT_CONFIGURED",
      errorMessage: "Cần cấu hình Google Ads API trước khi đồng bộ.",
      recordsSynced: 0,
    },
    {
      service: "GA4",
      status: "NOT_CONFIGURED",
      errorMessage: "Cần cấu hình GA4 trước khi đồng bộ.",
      recordsSynced: 0,
    },
    {
      service: "SEARCH_CONSOLE",
      status: "NOT_CONFIGURED",
      errorMessage: "Cần cấu hình Search Console trước khi đồng bộ.",
      recordsSynced: 0,
    },
  ];
  if ((await prisma.syncJob.count()) === 0) {
    for (const sj of syncJobs) {
      await prisma.syncJob.create({ data: sj });
    }
  }

  // Mặc định luôn nạp dữ liệu Test (trừ khi biến môi trường SEED_DEMO_DATA="false")
  const seedDemoData = process.env.SEED_DEMO_DATA !== "false";

  if (seedDemoData) {
    // 6. Đồng bộ Quyết định Bổ nhiệm của Giám đốc
    for (const dec of TEST_PROMOTION_DECISIONS) {
      await prisma.promotionDecision.upsert({
        where: { code: dec.code },
        update: {
          title: dec.title,
          content: dec.content,
          targetDepartment: dec.targetDepartment,
          newPosition: dec.newPosition,
          status: dec.status,
        },
        create: {
          ...dec,
          appliedAt: new Date(),
        },
      });
    }

    // 7. Đồng bộ Chiến dịch Quảng cáo (Marketing Campaigns)
    for (const cmp of TEST_CAMPAIGNS) {
      await prisma.marketingCampaign.upsert({
        where: { code: cmp.code },
        update: cmp,
        create: cmp,
      });
    }

    // 8. Đồng bộ Từ khóa (Keywords)
    for (const kw of TEST_KEYWORDS) {
      await prisma.keywordMetric.upsert({
        where: { id: kw.id },
        update: kw,
        create: kw,
      });
    }

    // 9. Đồng bộ Sự kiện Tracking
    for (const tr of TEST_TRACKING_EVENTS) {
      await prisma.trackingEvent.upsert({
        where: { id: tr.id },
        update: tr,
        create: tr,
      });
    }

    // 10. Đồng bộ Hồ sơ Lead Test (Upsert theo mã `code` để không bao giờ bị thiếu hoặc trùng)
    for (const lead of TEST_LEADS) {
      const payload = {
        ...lead,
        nextFollowUpAt: lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null,
        createdAt: lead.createdAt ? new Date(lead.createdAt) : new Date(),
      };
      await prisma.lead.upsert({
        where: { code: lead.code },
        update: {
          customerName: payload.customerName,
          companyName: payload.companyName,
          phone: payload.phone,
          email: payload.email,
          installationAddress: payload.installationAddress,
          location: payload.location,
          product: payload.product,
          categoryId: payload.categoryId,
          source: payload.source,
          status: payload.status,
          failureReason: payload.failureReason,
          estimatedValue: payload.estimatedValue,
          notes: payload.notes,
          priorityScore: payload.priorityScore,
          priorityTier: payload.priorityTier,
          ledWidth: payload.ledWidth,
          ledHeight: payload.ledHeight,
          ledModuleType: payload.ledModuleType,
          discountPercent: payload.discountPercent,
          directorApprovalStatus: payload.directorApprovalStatus,
          salesPersonId: payload.salesPersonId,
        },
        create: payload,
      });
    }

    // 11. Đồng bộ Báo giá LED m² (Quotes)
    for (const q of TEST_QUOTES) {
      const targetLead = await prisma.lead.findUnique({ where: { id: q.leadId } });
      if (targetLead) {
        await prisma.leadQuote.upsert({
          where: { code: q.code },
          update: q,
          create: q,
        });
      }
    }

    // 12. Đồng bộ Nhật ký CSKH (Activities)
    for (const act of TEST_ACTIVITIES) {
      const targetLead = await prisma.lead.findUnique({ where: { id: act.leadId } });
      if (targetLead) {
        await prisma.leadActivity.upsert({
          where: { id: act.id },
          update: {
            ...act,
            nextFollowUpAt: act.nextFollowUpAt ? new Date(act.nextFollowUpAt) : null,
          },
          create: {
            ...act,
            nextFollowUpAt: act.nextFollowUpAt ? new Date(act.nextFollowUpAt) : null,
          },
        });
      }
    }

    // 13. Đồng bộ Báo cáo Phòng ban & Tờ trình (Reports)
    for (const rep of TEST_REPORTS) {
      await prisma.departmentReport.upsert({
        where: { id: rep.id },
        update: {
          title: rep.title,
          content: rep.content,
          department: rep.department,
          attachmentName: rep.attachmentName,
          attachmentUrl: rep.attachmentUrl,
        },
        create: {
          ...rep,
          createdAt: rep.createdAt ? new Date(rep.createdAt) : new Date(),
        },
      });
    }
  }

  console.log(
    `🚀 Đã đồng bộ thành công file dữ liệu test (test-data.mjs): ${TEST_LEADS.length} Lead, ${TEST_CAMPAIGNS.length} Chiến dịch Ads, ${TEST_KEYWORDS.length} Từ khóa, ${TEST_REPORTS.length} Báo cáo, ${TEST_USERS.length} Tài khoản!`
  );
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi nạp seed data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
