import { PrismaClient } from "../generated/sqlite/index.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Demo seed data is disabled in production. Provision production users and data separately.");
  }

  console.log("🌱 Bắt đầu khởi tạo Seed Data toàn diện cho TOÀN TRUNG...");

  const defaultPassword = "Password123@";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Seed Users theo chuẩn 3 Tác nhân ATTT: ADMIN - DIRECTOR - USER (kèm Phòng ban & Chức vụ)
  const usersData = [
    {
      id: "usr_admin_01",
      email: "admin@toantrung.vn",
      passwordHash,
      name: "Nguyễn Toàn Trung (Admin)",
      phone: "0909.123.456",
      role: "ADMIN",
      actorType: "ADMIN",
      department: "ADMIN_SYS",
      position: "Quản trị hệ thống",
      initials: "TT",
    },
    {
      id: "usr_director_01",
      email: "giamdoc@toantrung.vn",
      passwordHash,
      name: "Nguyễn Toàn Trung (Giám Đốc)",
      phone: "0909.888.999",
      role: "DIRECTOR",
      actorType: "DIRECTOR",
      department: "BOARD",
      position: "Giám đốc",
      initials: "GĐ",
    },
    {
      id: "usr_sales_01",
      email: "tuan.tm@toantrung.vn",
      passwordHash,
      name: "Trần Minh Tuấn",
      phone: "0912.334.556",
      role: "SALES",
      actorType: "USER",
      department: "SALES",
      position: "Trưởng phòng",
      appointedDecisionCode: "QD-BGD-2610-001",
      initials: "MT",
    },
    {
      id: "usr_sales_02",
      email: "cuong.lh@toantrung.vn",
      passwordHash,
      name: "Lê Hoàng Cường",
      phone: "0933.445.667",
      role: "SALES",
      actorType: "USER",
      department: "SALES",
      position: "Nhân viên",
      initials: "HC",
    },
    {
      id: "usr_sales_03",
      email: "trang.pt@toantrung.vn",
      passwordHash,
      name: "Phạm Thùy Trang",
      phone: "0977.889.900",
      role: "SALES",
      actorType: "USER",
      department: "SALES",
      position: "Nhân viên",
      initials: "TT",
    },
    {
      id: "usr_sales_04",
      email: "ngoc.nb@toantrung.vn",
      passwordHash,
      name: "Nguyễn Bảo Ngọc",
      phone: "0944.556.778",
      role: "SALES",
      actorType: "USER",
      department: "SALES",
      position: "Nhân viên",
      initials: "BN",
    },
    {
      id: "usr_mkt_01",
      email: "marketing@toantrung.vn",
      passwordHash,
      name: "Lê Thu Hà",
      phone: "0966.778.899",
      role: "MARKETING",
      actorType: "USER",
      department: "MARKETING",
      position: "Trưởng ban",
      appointedDecisionCode: "QD-BGD-2610-002",
      initials: "TH",
    },
    {
      id: "usr_design_01",
      email: "design@toantrung.vn",
      passwordHash,
      name: "Đặng Mỹ Linh",
      phone: "0988.112.233",
      role: "DESIGN",
      actorType: "USER",
      department: "DESIGN",
      position: "Nhân viên",
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
        actorType: u.actorType,
        department: u.department,
        position: u.position,
        appointedDecisionCode: u.appointedDecisionCode || null,
        initials: u.initials,
      },
      create: u,
    });
  }

  // 1b. Seed Departments (do Admin quản lý)
  const defaultDepartments = [
    {
      code: "SALES",
      name: "Phòng Kinh Doanh (Sales)",
      description: "Tiếp nhận Lead, khảo sát công trình LED và lập báo giá dự án",
    },
    {
      code: "MARKETING",
      name: "Phòng Marketing",
      description: "Quản lý chiến dịch truyền thông, nội dung và đo lường UTM Tracking",
    },
    {
      code: "DESIGN",
      name: "Phòng Thiết Kế (Design)",
      description: "Thiết kế maquette màn hình LED, bản vẽ kỹ thuật và AI Design Studio",
    },
    {
      code: "ADS",
      name: "Bộ Phận Quảng Cáo (Ads)",
      description: "Tối ưu ngân sách Google Ads, Facebook Ads và bộ từ khóa chuyển đổi",
    },
  ];

  for (const dept of defaultDepartments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description },
      create: dept,
    });
  }

  const seedDemoData = process.env.SEED_DEMO_DATA === "true";

  // 1c. Chỉ tạo dữ liệu mẫu (Quyết định, Chiến dịch, Từ khóa, Tracking, Lead mẫu) khi bật SEED_DEMO_DATA=true
  if (seedDemoData) {
    await prisma.promotionDecision.upsert({
      where: { code: "QD-BGD-2610-001" },
      update: {},
      create: {
        code: "QD-BGD-2610-001",
        title: "Thông báo chúc mừng bổ nhiệm Trưởng Phòng Kinh Doanh LED",
        content:
          "Ban Giám Đốc Công ty Toàn Trung trân trọng chúc mừng nhân sự Trần Minh Tuấn chính thức được bổ nhiệm giữ chức vụ Trưởng phòng tại Phòng Kinh Doanh (SALES) nhờ thành tích xuất sắc trong công tác phát triển dự án màn hình LED hội trường & tòa nhà.",
        targetUserId: "usr_sales_01",
        targetDepartment: "SALES",
        newPosition: "Trưởng phòng",
        signedById: "usr_director_01",
        signedByName: "Nguyễn Toàn Trung (Giám Đốc)",
        status: "APPLIED_BY_ADMIN",
        appliedByAdminId: "usr_admin_01",
        appliedAt: new Date(),
      },
    });

    await prisma.promotionDecision.upsert({
      where: { code: "QD-BGD-2610-002" },
      update: {},
      create: {
        code: "QD-BGD-2610-002",
        title: "Thông báo chúc mừng bổ nhiệm Trưởng Ban Marketing & Truyền Thông",
        content:
          "Ban Giám Đốc Công ty Toàn Trung chúc mừng nhân sự Lê Thu Hà được bổ nhiệm giữ chức vụ Trưởng ban tại Phòng Marketing (MARKETING).",
        targetUserId: "usr_mkt_01",
        targetDepartment: "MARKETING",
        newPosition: "Trưởng ban",
        signedById: "usr_director_01",
        signedByName: "Nguyễn Toàn Trung (Giám Đốc)",
        status: "APPLIED_BY_ADMIN",
        appliedByAdminId: "usr_admin_01",
        appliedAt: new Date(),
      },
    });
  }

  console.log("✅ Đã cập nhật mô hình 3 Tác nhân (ADMIN - DIRECTOR - USER) & Phòng ban");

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

  if (seedDemoData) {
    // 3. Seed Marketing Campaigns (chỉ khi SEED_DEMO_DATA=true)
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

    if ((await prisma.keywordMetric.count()) === 0) {
      for (const kw of keywords) {
        await prisma.keywordMetric.create({ data: kw });
      }
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
    ];

    if ((await prisma.trackingEvent.count()) === 0) {
      for (const tr of trackingData) {
        await prisma.trackingEvent.create({ data: tr });
      }
    }
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

  if ((await prisma.syncJob.count()) === 0) {
    for (const sj of syncJobs) {
      await prisma.syncJob.create({ data: sj });
    }
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

  if (seedDemoData) {
    // 8. Seed Initial Leads (chỉ khi SEED_DEMO_DATA=true và DB chưa có Lead nào)
    if ((await prisma.lead.count()) === 0) {
      const initialLeads = [
        {
          code: "TT-LED-2610-0001",
          customerName: "Nguyễn Hoàng Bách",
          companyName: "Tập đoàn Xây dựng Hòa Bình",
          phone: "0908123888",
          email: "bach.nh@hoabinhcorp.vn",
          installationAddress: "235 Võ Thị Sáu, Quận 3, TP.HCM",
          location: "TP. Hồ Chí Minh",
          product: "Màn hình LED P1.86 Phòng họp Hội đồng Quản trị",
          categoryId: "cat_led_indoor",
          source: "Website",
          status: "Đang soạn báo giá",
          failureReason: null,
          estimatedValue: "294.120.000 đ",
          notes: "Yêu cầu tần số quét 3840Hz, thi công ngoài giờ hành chính cuối tuần.",
          salesPersonId: "usr_sales_01",
          createdById: "usr_admin_01",
          priorityScore: 88,
          priorityTier: "HOT",
          ledWidth: 4.8,
          ledHeight: 2.5,
          ledModuleType: "LED P1.86 Indoor Phòng họp VIP (Cabinet nhôm đúc)",
          discountPercent: 10,
          directorApprovalStatus: "PENDING",
          nextFollowUpAt: new Date(Date.now() + 3 * 3600 * 1000),
          nextActionNote: "Chờ Giám đốc duyệt chiết khấu 10% để gửi bản PDF chốt hợp đồng",
        },
        {
          code: "TT-LED-2610-0002",
          customerName: "Trần Thanh Tùng",
          companyName: "Trung tâm Hội nghị White Palace",
          phone: "0913889977",
          email: "tung.tt@whitepalace.com.vn",
          installationAddress: "194 Hoàng Văn Thụ, Phú Nhuận, TP.HCM",
          location: "TP. Hồ Chí Minh",
          product: "Màn hình LED P2.5 Hội trường Sảnh Đại Yến",
          categoryId: "cat_led_indoor",
          source: "Hotline",
          status: "Đã gửi báo giá",
          failureReason: null,
          estimatedValue: "182.500.000 đ",
          notes: "Khách đã chốt mặt bằng, cần tiến độ bàn giao trong 7 ngày.",
          salesPersonId: "usr_sales_02",
          createdById: "usr_admin_01",
          priorityScore: 82,
          priorityTier: "HOT",
          ledWidth: 4.0,
          ledHeight: 2.5,
          ledModuleType: "LED P2.5 Indoor Hội trường & Tiệc cưới",
          discountPercent: 0,
          directorApprovalStatus: "NONE",
          nextFollowUpAt: new Date(Date.now() + 18 * 3600 * 1000),
          nextActionNote: "Gọi xác nhận lịch ký hợp đồng & tạm ứng đợt 1 (50%)",
        },
      ];
      for (const lead of initialLeads) {
        await prisma.lead.create({ data: lead });
      }
    }

    // 9. Seed Báo giá LED m² & Nhật ký CSKH doanh nghiệp mẫu (chỉ khi SEED_DEMO_DATA=true)
    if ((await prisma.leadQuote.count()) === 0) {
      const firstLead = await prisma.lead.findFirst({ orderBy: { createdAt: "asc" } });
      if (firstLead) {
        await prisma.leadQuote.create({
          data: {
            code: "BG-TT-2610-001",
            leadId: firstLead.id,
            moduleSpec: "LED P1.86 Indoor Phòng họp VIP (Cabinet nhôm đúc)",
            widthMeters: 4.8,
            heightMeters: 2.5,
            areaSqm: 12.0,
            unitPriceVnd: 24000000,
            processorVnd: 16500000,
            structureInstallVnd: 22300000,
            discountPercent: 10,
            totalVnd: 294120000,
            warrantyMonths: 36,
            notes: "Bao gồm hệ khung nhôm định hình CNC siêu mỏng & Bộ xử lý Novastar VX600.",
            status: "PENDING_DIRECTOR",
            createdById: "usr_sales_01",
          },
        });

        await prisma.leadActivity.create({
          data: {
            leadId: firstLead.id,
            type: "SURVEY",
            summary:
              "Đã khảo sát thực tế mặt bằng phòng họp VIP: vách bê tông chịu lực tốt, kích thước chuẩn 4.8m × 2.5m (12m²), tủ điện 3 pha cách 8m.",
            outcome: "Khách đề nghị mức chiết khấu dự án 10% — Đã lập báo giá trình Giám đốc phê duyệt.",
            nextFollowUpAt: new Date(Date.now() + 4 * 3600 * 1000),
            createdById: "usr_sales_01",
          },
        });
      }
    }
  }

  console.log(
    seedDemoData
      ? "🚀 Seed data kèm dữ liệu mẫu (SEED_DEMO_DATA=true) thành công!"
      : "🚀 Đã khởi tạo tài khoản nền tảng, phòng ban & danh mục sản phẩm (không tạo dữ liệu kinh doanh giả lập)!"
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
