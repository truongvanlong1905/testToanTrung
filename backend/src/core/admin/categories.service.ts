import { prisma } from "@/src/core/db/prisma";

export const OFFICIAL_DEMAND_TYPES = [
  "Hỏi sửa chữa",
  "Không cung cấp thông tin",
  "Hỏi sản phẩm đặc biệt",
  "Hỏi thuê",
  "Không đúng nhu cầu",
] as const;

export const OFFICIAL_CONTACT_CHANNELS = [
  "Hotline",
  "Điền form",
  "Email",
  "Zalo",
  "Facebook",
  "Giới thiệu",
  "Triển lãm",
] as const;

export async function listProductCategories() {
  const allCategories = await prisma.productCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const activeCategories = allCategories.filter((c) => c.isActive !== false);

  const grouped = {
    LED_SCREEN: activeCategories.filter((c) => c.group === "LED_SCREEN"),
    ELECTRONIC_BOARD: activeCategories.filter((c) => c.group === "ELECTRONIC_BOARD"),
    OTHER: activeCategories.filter((c) => c.group === "OTHER"),
  };

  return {
    categories: activeCategories,
    allCategories,
    grouped,
    demandTypes: [...OFFICIAL_DEMAND_TYPES],
    contactChannels: [...OFFICIAL_CONTACT_CHANNELS],
  };
}
