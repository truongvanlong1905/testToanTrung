import { prisma } from "@/src/core/db/prisma";

export async function listProductCategories() {
  const categories = await prisma.productCategory.findMany({
    orderBy: { name: "asc" },
  });
  return { categories };
}
