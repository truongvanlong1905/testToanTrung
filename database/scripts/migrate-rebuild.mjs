import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/sqlite/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, "..");

if (!process.env.DATABASE_URL) {
  const sqliteFile = path.resolve(dbDir, "data", "source.sqlite").replace(/\\/g, "/");
  process.env.DATABASE_URL = `file:${sqliteFile}`;
}

const prisma = new PrismaClient();

export function normalizeVietnamPhone(raw) {
  if (!raw || typeof raw !== "string") return "";
  const digitsAndPlus = raw.trim().replace(/[\s.\-()]/g, "");
  if (digitsAndPlus.startsWith("+84")) {
    return "0" + digitsAndPlus.slice(3).replace(/\D/g, "");
  }
  if (digitsAndPlus.startsWith("84") && digitsAndPlus.length >= 11) {
    return "0" + digitsAndPlus.slice(2).replace(/\D/g, "");
  }
  const digits = digitsAndPlus.replace(/\D/g, "");
  if (digits.length === 9 && !digits.startsWith("0")) {
    return "0" + digits;
  }
  return digits;
}

const OFFICIAL_PRODUCT_CATALOG = [
  // Nhóm 1: Màn hình LED (LED_SCREEN)
  {
    code: "LED_INDOOR",
    name: "Màn hình LED Indoor",
    description: "Màn hình LED trong nhà cho hội trường, phòng họp, showroom, trung tâm thương mại",
    group: "LED_SCREEN",
    sortOrder: 10,
    allowCustomText: false,
  },
  {
    code: "LED_OUTDOOR",
    name: "Màn hình LED Outdoor",
    description: "Màn hình LED ngoài trời chống nước độ sáng cao cho quảng cáo, mặt tiền tòa nhà",
    group: "LED_SCREEN",
    sortOrder: 11,
    allowCustomText: false,
  },
  {
    code: "LED_CURVED",
    name: "Màn hình LED Cong",
    description: "Màn hình LED thiết kế uốn cong nghệ thuật theo kiến trúc không gian",
    group: "LED_SCREEN",
    sortOrder: 12,
    allowCustomText: false,
  },
  {
    code: "LED_MESH",
    name: "Màn hình LED lưới",
    description: "Màn hình LED lưới xuyên sáng cho mặt dựng kính tòa nhà và sân khấu lớn",
    group: "LED_SCREEN",
    sortOrder: 13,
    allowCustomText: false,
  },
  {
    code: "LED_GOB",
    name: "Màn hình GOB",
    description: "Màn hình LED công nghệ phủ keo GOB chống va đập, chống ẩm và chống bụi",
    group: "LED_SCREEN",
    sortOrder: 14,
    allowCustomText: false,
  },
  {
    code: "LED_COB",
    name: "Màn hình COB",
    description: "Màn hình LED công nghệ COB độ phân giải siêu mịn và góc nhìn rộng",
    group: "LED_SCREEN",
    sortOrder: 15,
    allowCustomText: false,
  },
  {
    code: "LCD_SCREEN",
    name: "Màn hình LCD",
    description: "Màn hình ghép LCD, chân đứng quảng cáo LCD và màn hình tương tác",
    group: "LED_SCREEN",
    sortOrder: 16,
    allowCustomText: false,
  },
  {
    code: "LED_OTHER",
    name: "Màn hình LED - Khác",
    description: "Các dòng màn hình LED khác theo yêu cầu riêng của khách hàng",
    group: "LED_SCREEN",
    sortOrder: 19,
    allowCustomText: true,
  },

  // Nhóm 2: Bảng Điện Tử (ELECTRONIC_BOARD)
  {
    code: "BOARD_PRODUCTIVITY",
    name: "Bảng Năng suất",
    description: "Bảng điện tử theo dõi sản lượng và năng suất chuyền sản xuất nhà máy",
    group: "ELECTRONIC_BOARD",
    sortOrder: 20,
    allowCustomText: false,
  },
  {
    code: "BOARD_SPORTS",
    name: "Bảng thi đấu thể thao",
    description: "Bảng điểm điện tử cho nhà thi đấu đa năng, sân vận động",
    group: "ELECTRONIC_BOARD",
    sortOrder: 21,
    allowCustomText: false,
  },
  {
    code: "BOARD_MARATHON",
    name: "Bảng Marathon",
    description: "Bảng đồng hồ LED tính giờ giải chạy bộ Marathon và sự kiện thể thao",
    group: "ELECTRONIC_BOARD",
    sortOrder: 22,
    allowCustomText: false,
  },
  {
    code: "BOARD_SHOTLOCK",
    name: "Bảng Shotlock",
    description: "Bảng đếm ngược thời gian tấn công bóng rổ / thể thao (Shotlock / Shotclock)",
    group: "ELECTRONIC_BOARD",
    sortOrder: 23,
    allowCustomText: false,
  },
  {
    code: "BOARD_SAFETY",
    name: "Bảng An toàn lao động",
    description: "Bảng điện tử theo dõi số ngày an toàn lao động tại công trường, nhà máy",
    group: "ELECTRONIC_BOARD",
    sortOrder: 24,
    allowCustomText: false,
  },
  {
    code: "BOARD_AIRPORT_BUS",
    name: "Bảng LED xe buýt sân bay",
    description: "Bảng LED lộ trình và thông tin phục vụ xe buýt mặt đất sân bay",
    group: "ELECTRONIC_BOARD",
    sortOrder: 25,
    allowCustomText: false,
  },
  {
    code: "BOARD_MODBUS",
    name: "Bảng LED Modbus",
    description: "Bảng LED công nghiệp giao tiếp chuẩn truyền thông Modbus RS485 / TCP",
    group: "ELECTRONIC_BOARD",
    sortOrder: 26,
    allowCustomText: false,
  },
  {
    code: "BOARD_BUS",
    name: "Bảng LED xe buýt",
    description: "Bảng LED hiển thị số tuyến và lộ trình trên xe buýt công cộng",
    group: "ELECTRONIC_BOARD",
    sortOrder: 27,
    allowCustomText: false,
  },
  {
    code: "BOARD_CLOCK",
    name: "Đồng hồ LED",
    description: "Đồng hồ LED treo tường, đồng hồ đồng bộ thời gian thực NTP",
    group: "ELECTRONIC_BOARD",
    sortOrder: 28,
    allowCustomText: false,
  },
  {
    code: "BOARD_TEMP_HUMIDITY",
    name: "Bảng hiển thị nhiệt độ độ ẩm",
    description: "Bảng điện tử cảm biến giám sát nhiệt độ, độ ẩm kho lạnh, phòng sạch, nhà xưởng",
    group: "ELECTRONIC_BOARD",
    sortOrder: 29,
    allowCustomText: false,
  },
  {
    code: "BOARD_GOLD_PRICE",
    name: "Bảng LED giá vàng",
    description: "Bảng điện tử cập nhật tỷ giá ngoại tệ và giá vàng cho tiệm vàng, ngân hàng",
    group: "ELECTRONIC_BOARD",
    sortOrder: 30,
    allowCustomText: false,
  },
  {
    code: "BOARD_PARKING_FEE",
    name: "Bảng LED thu phí giữ xe",
    description: "Bảng LED hiển thị biển số, số chỗ trống và phí giữ xe trạm thu phí / bãi đỗ",
    group: "ELECTRONIC_BOARD",
    sortOrder: 31,
    allowCustomText: false,
  },
  {
    code: "BOARD_OTHER",
    name: "Bảng Điện Tử - Khác",
    description: "Các dòng bảng điện tử thiết kế theo yêu cầu đặc thù khác",
    group: "ELECTRONIC_BOARD",
    sortOrder: 39,
    allowCustomText: true,
  },

  // Giữ tương thích mã danh mục lịch sử đang có trong DB
  {
    code: "E_BOARD",
    name: "Bảng điện tử chuyên dụng",
    description: "Nhóm bảng điện tử tổng hợp (dữ liệu lịch sử)",
    group: "ELECTRONIC_BOARD",
    sortOrder: 90,
    allowCustomText: false,
    isActive: false,
  },
  {
    code: "SPECIAL",
    name: "Sản phẩm đặc biệt",
    description: "Nhóm sản phẩm đặc biệt (dữ liệu lịch sử)",
    group: "OTHER",
    sortOrder: 91,
    allowCustomText: true,
    isActive: false,
  },
  {
    code: "OTHER",
    name: "Khác",
    description: "Nhu cầu sản phẩm hoặc dịch vụ khác có nhập nội dung chi tiết",
    group: "OTHER",
    sortOrder: 99,
    allowCustomText: true,
    isActive: true,
  },
];

async function getColumns(tableName) {
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("${tableName}");`);
  return new Set(rows.map((r) => r.name));
}

async function addColumnIfMissing(tableName, colName, colDefSql) {
  const cols = await getColumns(tableName);
  if (!cols.has(colName)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${colName}" ${colDefSql};`);
    console.log(`  + Added column ${tableName}.${colName}`);
  }
}

export async function runRebuildMigration() {
  console.log("🚀 Bắt đầu chạy non-destructive migration cho Mini CRM Toàn Trung...");

  // 1. Add missing columns on ProductCategory
  await addColumnIfMissing("ProductCategory", "group", `TEXT NOT NULL DEFAULT 'LED_SCREEN'`);
  await addColumnIfMissing("ProductCategory", "sortOrder", `INTEGER NOT NULL DEFAULT 100`);
  await addColumnIfMissing("ProductCategory", "allowCustomText", `BOOLEAN NOT NULL DEFAULT 0`);
  await addColumnIfMissing("ProductCategory", "isActive", `BOOLEAN NOT NULL DEFAULT 1`);

  // 2. Add missing columns on Lead
  await addColumnIfMissing("Lead", "normalizedPhone", `TEXT`);
  await addColumnIfMissing("Lead", "productCustomText", `TEXT`);
  await addColumnIfMissing("Lead", "demandType", `TEXT`);
  await addColumnIfMissing("Lead", "contactChannel", `TEXT`);
  await addColumnIfMissing("Lead", "quoteSentAt", `DATETIME`);
  await addColumnIfMissing("Lead", "customerRespondedAt", `DATETIME`);
  await addColumnIfMissing("Lead", "customerResponseNote", `TEXT`);

  // 3. Add missing columns on TrackingEvent
  await addColumnIfMissing("TrackingEvent", "eventKey", `TEXT`);
  await addColumnIfMissing("TrackingEvent", "contactChannel", `TEXT`);

  // 4. Create NotificationRead table if missing
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "NotificationRead" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "notificationKey" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  // 5. Create indexes idempotently
  const indexSqlList = [
    `CREATE INDEX IF NOT EXISTS "ProductCategory_group_idx" ON "ProductCategory"("group");`,
    `CREATE INDEX IF NOT EXISTS "ProductCategory_sortOrder_idx" ON "ProductCategory"("sortOrder");`,
    `CREATE INDEX IF NOT EXISTS "Lead_normalizedPhone_idx" ON "Lead"("normalizedPhone");`,
    `CREATE INDEX IF NOT EXISTS "Lead_demandType_idx" ON "Lead"("demandType");`,
    `CREATE INDEX IF NOT EXISTS "Lead_quoteSentAt_idx" ON "Lead"("quoteSentAt");`,
    `CREATE INDEX IF NOT EXISTS "Lead_customerRespondedAt_idx" ON "Lead"("customerRespondedAt");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "TrackingEvent_eventKey_key" ON "TrackingEvent"("eventKey");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "NotificationRead_notificationKey_userId_key" ON "NotificationRead"("notificationKey", "userId");`,
    `CREATE INDEX IF NOT EXISTS "NotificationRead_userId_idx" ON "NotificationRead"("userId");`,
  ];

  for (const sql of indexSqlList) {
    await prisma.$executeRawUnsafe(sql);
  }

  // 6. Upsert official ProductCatalog without deleting any existing category
  for (const item of OFFICIAL_PRODUCT_CATALOG) {
    const existingByCode = await prisma.productCategory.findUnique({
      where: { code: item.code },
    });
    if (existingByCode) {
      await prisma.productCategory.update({
        where: { id: existingByCode.id },
        data: {
          name: item.name,
          description: item.description,
          group: item.group,
          sortOrder: item.sortOrder,
          allowCustomText: item.allowCustomText,
          isActive: item.isActive ?? true,
        },
      });
    } else {
      const existingByName = await prisma.productCategory.findUnique({
        where: { name: item.name },
      });
      if (existingByName) {
        await prisma.productCategory.update({
          where: { id: existingByName.id },
          data: {
            description: item.description,
            group: item.group,
            sortOrder: item.sortOrder,
            allowCustomText: item.allowCustomText,
            isActive: item.isActive ?? true,
          },
        });
      } else {
        await prisma.productCategory.create({
          data: {
            code: item.code,
            name: item.name,
            description: item.description,
            group: item.group,
            sortOrder: item.sortOrder,
            allowCustomText: item.allowCustomText,
            isActive: item.isActive ?? true,
          },
        });
      }
    }
  }

  // 7. Backfill existing Leads safely
  const leads = await prisma.lead.findMany({
    include: {
      statusHistory: {
        orderBy: { createdAt: "asc" },
      },
      quotes: {
        orderBy: { createdAt: "asc" },
      },
      activities: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  for (const lead of leads) {
    const normalizedPhone = normalizeVietnamPhone(lead.phone);
    const contactChannel =
      lead.contactChannel ||
      (lead.source === "Hotline"
        ? "Hotline"
        : lead.source === "Email"
          ? "Email"
          : lead.source === "Form" || lead.source === "Website"
            ? "Điền form"
            : lead.source.includes("Facebook")
              ? "Facebook"
              : lead.source.includes("Google")
                ? "Điền form"
                : "Hotline");

    let quoteSentAt = lead.quoteSentAt;
    if (!quoteSentAt) {
      const quoteHistory = lead.statusHistory.find((h) => h.toStatus === "Đã gửi báo giá");
      if (quoteHistory) {
        quoteSentAt = quoteHistory.createdAt;
      } else if (lead.quotes.length > 0) {
        quoteSentAt = lead.quotes[0].createdAt;
      } else if (lead.status === "Đã gửi báo giá" || lead.status === "Chốt thành công") {
        quoteSentAt = lead.updatedAt || lead.createdAt;
      }
    }

    let customerRespondedAt = lead.customerRespondedAt;
    let customerResponseNote = lead.customerResponseNote;
    if (!customerRespondedAt && (lead.status === "Chốt thành công" || lead.status === "Thất bại") && quoteSentAt) {
      const terminalHistory = [...lead.statusHistory]
        .reverse()
        .find((h) => h.toStatus === "Chốt thành công" || h.toStatus === "Thất bại");
      customerRespondedAt = terminalHistory ? terminalHistory.createdAt : lead.updatedAt;
      customerResponseNote =
        lead.status === "Chốt thành công"
          ? "Khách hàng đã đồng ý phương án và chốt hợp đồng"
          : lead.failureReason || "Khách hàng phản hồi tạm dừng / chưa triển khai";
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        normalizedPhone,
        contactChannel,
        quoteSentAt,
        customerRespondedAt,
        customerResponseNote,
      },
    });
  }

  // 8. Ensure ADS department and active ADS account exist for role testing (AC-02)
  const adsDept = await prisma.department.findUnique({ where: { code: "ADS" } });
  if (!adsDept) {
    await prisma.department.create({
      data: {
        code: "ADS",
        name: "Phòng Quảng Cáo (Ads)",
        description: "Chuyên trách vận hành chiến dịch Google Ads, Facebook Ads và tối ưu chuyển đổi",
        isActive: true,
      },
    });
  }

  const adsUser = await prisma.user.findUnique({ where: { email: "ads@toantrung.vn" } });
  if (!adsUser) {
    const passwordHash = await bcrypt.hash("Password123@", 10);
    await prisma.user.create({
      data: {
        email: "ads@toantrung.vn",
        passwordHash,
        name: "Phạm Quốc Hưng (Chuyên viên Ads)",
        phone: "0909334455",
        role: "ADS",
        actorType: "USER",
        department: "ADS",
        position: "Nhân viên",
        initials: "QH",
        isActive: true,
      },
    });
    console.log("  + Đã bổ sung tài khoản kiểm thử vai trò ADS: ads@toantrung.vn");
  }

  const categoryCount = await prisma.productCategory.count();
  const leadCount = await prisma.lead.count();
  const userCount = await prisma.user.count();

  console.log(
    `✅ Hoàn tất non-destructive migration! Hiện có: ${userCount} Users, ${categoryCount} ProductCategories, ${leadCount} Leads.`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runRebuildMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Lỗi migration:", err);
      process.exit(1);
    });
}
