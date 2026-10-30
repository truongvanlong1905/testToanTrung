import { PrismaClient } from "../generated/sqlite/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seed data is disabled in production. Provision production users and data separately.");
  }

  console.log("🌱 Bắt đầu khởi tạo Seed Data toàn diện cho TOÀN TRUNG...");

  const defaultPassword = "Password123@";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed Users (Admin, Sales, Marketing, Design)
  const usersData = [
    {
      id: "usr_admin_01",
      email: "admin@toantrung.vn",
      passwordHash,
      name: "Nguyễn Toàn Trung",
      phone: "0909.123.456",
      role: "ADMIN",
      initials: "TT",
    },
    {
      id: "usr_sales_01",
      email: "tuan.tm@toantrung.vn",
      passwordHash,
      name: "Trần Minh Tuấn",
      phone: "0912.334.556",
      role: "SALES",
      initials: "MT",
    },
    {
      id: "usr_sales_02",
      email: "cuong.lh@toantrung.vn",
      passwordHash,
      name: "Lê Hoàng Cường",
      phone: "0933.445.667",
      role: "SALES",
      initials: "HC",
    },
    {
      id: "usr_sales_03",
      email: "trang.pt@toantrung.vn",
      passwordHash,
      name: "Phạm Thùy Trang",
      phone: "0977.889.900",
      role: "SALES",
      initials: "TT",
    },
    {
      id: "usr_sales_04",
      email: "ngoc.nb@toantrung.vn",
      passwordHash,
      name: "Nguyễn Bảo Ngọc",
      phone: "0944.556.778",
      role: "SALES",
      initials: "BN",
    },
    {
      id: "usr_mkt_01",
      email: "marketing@toantrung.vn",
      passwordHash,
      name: "Lê Thu Hà",
      phone: "0966.778.899",
      role: "MARKETING",
      initials: "TH",
    },
    {
      id: "usr_design_01",
      email: "design@toantrung.vn",
      passwordHash,
      name: "Đặng Mỹ Linh",
      phone: "0988.112.233",
      role: "DESIGN",
      initials: "ML",
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: u.passwordHash,
        name: u.name,
        role: u.role,
        initials: u.initials,
      },
      create: u,
    });
  }
  console.log("✅ Đã cập nhật 7 Users (Admin, Sales, Marketing, Design)");

  // 2. Seed Categories
  const categoriesData = [
    {
      id: "cat_led_indoor",
      code: "LED_INDOOR",
      name: "LED trong nhà",
      description: "Màn hình LED P1.86, P2.0, P2.5 hội trường, phòng họp",
    },
    {
      id: "cat_led_outdoor",
      code: "LED_OUTDOOR",
      name: "LED ngoài trời",
      description: "Màn hình LED P3, P4, P5 chống nước ngoài trời tòa nhà",
    },
    {
      id: "cat_electronic_board",
      code: "E_BOARD",
      name: "Bảng điện tử",
      description: "Bảng ma trận chữ chạy 3 màu, bảng tỷ giá ngân hàng, số thứ tự bệnh viện",
    },
    {
      id: "cat_special",
      code: "SPECIAL",
      name: "Màn hình cong / đặc thù",
      description: "Màn hình LED cong, LED trong suốt, màn hình sàn sân khấu",
    },
    {
      id: "cat_other",
      code: "OTHER",
      name: "Khác",
      description: "Phụ kiện cabin, card điều khiển Nova, video processor",
    },
  ];

  for (const c of categoriesData) {
    await prisma.productCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }

  // 3. Seed Marketing Campaigns
  const campaigns = [
    {
      id: "cmp_01",
      code: "CMP_GG_INDOOR_26",
      name: "Google Ads - Màn hình LED P2.5 Hội trường & Phòng họp",
      platform: "Google Ads",
      status: "Active",
      budget: 25000000,
      spent: 18450000,
    },
    {
      id: "cmp_02",
      code: "CMP_GG_OUTDOOR_26",
      name: "Google Ads - Màn hình LED P3/P4 Ngoài trời Quảng cáo",
      platform: "Google Ads",
      status: "Active",
      budget: 30000000,
      spent: 24200000,
    },
    {
      id: "cmp_03",
      code: "CMP_FB_EVENT_26",
      name: "Facebook Ads - Giải pháp hiển thị Trung tâm Hội nghị & Tiệc cưới",
      platform: "Facebook Ads",
      status: "Active",
      budget: 15000000,
      spent: 9800000,
    },
    {
      id: "cmp_04",
      code: "CMP_SEO_BOARD_26",
      name: "SEO Tổng lực - Bảng điện tử ma trận & Tỷ giá Ngân hàng",
      platform: "SEO",
      status: "Active",
      budget: 10000000,
      spent: 8500000,
    },
  ];

  for (const cmp of campaigns) {
    await prisma.marketingCampaign.upsert({
      where: { code: cmp.code },
      update: cmp,
      create: cmp,
    });
  }

  // 4. Seed Keywords
  const keywords = [
    {
      keyword: "màn hình led p2.5 trong nhà",
      impressions: 14200,
      clicks: 1280,
      avgCpc: 12400,
      avgPosition: 1.4,
      searchVolume: 8800,
      source: "Google Ads",
    },
    {
      keyword: "báo giá màn hình led ngoài trời p3",
      impressions: 19500,
      clicks: 1650,
      avgCpc: 15800,
      avgPosition: 1.2,
      searchVolume: 12400,
      source: "Google Ads",
    },
    {
      keyword: "bảng điện tử led ma trận 3 màu",
      impressions: 8900,
      clicks: 720,
      avgCpc: 8900,
      avgPosition: 2.1,
      searchVolume: 5600,
      source: "Google Ads",
    },
    {
      keyword: "màn hình led cong phòng họp vip",
      impressions: 6400,
      clicks: 580,
      avgCpc: 18200,
      avgPosition: 1.8,
      searchVolume: 3200,
      source: "Google Search Console",
    },
    {
      keyword: "toàn trung telecom màn hình led",
      impressions: 5200,
      clicks: 940,
      avgCpc: 4500,
      avgPosition: 1.0,
      searchVolume: 2400,
      source: "Google Search Console",
    },
  ];

  await prisma.keywordMetric.deleteMany();
  for (const kw of keywords) {
    await prisma.keywordMetric.create({ data: kw });
  }

  // 5. Seed Tracking Events
  const trackingData = [
    {
      websiteSource: "toantrungtelecom.com",
      source: "google",
      medium: "cpc",
      campaign: "LED_Indoor_Hall_P2.5",
      landingPage: "/du-an/man-hinh-led-p2.5-hoi-truong",
      device: "Desktop",
      ipAddress: "14.232.180.45",
      location: "TP. Hồ Chí Minh",
    },
    {
      websiteSource: "ledtoantrung.vn",
      source: "facebook",
      medium: "cpc",
      campaign: "LED_Outdoor_P4_Building",
      landingPage: "/san-pham/led-ngoai-troi-p4",
      device: "Mobile",
      ipAddress: "113.161.74.88",
      location: "Hà Nội",
    },
    {
      websiteSource: "toantrungtelecom.com",
      source: "google",
      medium: "organic",
      campaign: "SEO_Bang_Dien_Tu",
      landingPage: "/bang-dien-tu-ngan-hang",
      device: "Desktop",
      ipAddress: "27.72.60.12",
      location: "Đà Nẵng",
    },
    {
      websiteSource: "toantrungtelecom.com",
      source: "direct",
      medium: "none",
      campaign: "Trực tiếp",
      landingPage: "/lien-he-bao-gia",
      device: "Mobile",
      ipAddress: "171.244.12.90",
      location: "Bình Dương",
    },
  ];

  await prisma.trackingEvent.deleteMany();
  for (const tr of trackingData) {
    await prisma.trackingEvent.create({ data: tr });
  }

  // 6. Seed Sync Jobs
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

  await prisma.syncJob.deleteMany();
  for (const sj of syncJobs) {
    await prisma.syncJob.create({ data: sj });
  }

  // 7. Seed Brand Setting
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

  console.log("🚀 Seed data toàn diện (Users, Campaigns, Keywords, Tracking, Brand) thành công!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi nạp seed data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
