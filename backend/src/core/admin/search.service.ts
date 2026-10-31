import { z } from "zod";
import type { UserSession } from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { searchLeadsPublic } from "@/src/modules/01-leads/public";
import { searchAdsPublic } from "@/src/modules/03-ads-keywords/public";

const SearchQuery = z.string().trim().min(2).max(80);

export async function globalSearch(user: UserSession, rawQuery: string) {
  const parsed = SearchQuery.safeParse(rawQuery);
  if (!parsed.success) {
    return { results: [] };
  }

  const query = parsed.data;
  const isPrivileged =
    user.actorType === "ADMIN" ||
    user.actorType === "DIRECTOR" ||
    user.role === "ADMIN" ||
    user.role === "DIRECTOR";

  const [leadResults, adsResults, users] = await Promise.all([
    searchLeadsPublic(user, query),
    searchAdsPublic(user, query),
    isPrivileged
      ? prisma.user.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: query } },
              { email: { contains: query } },
            ],
          },
          select: { id: true, name: true, email: true, role: true },
          take: 4,
        })
      : Promise.resolve([]),
  ]);

  const results = [
    ...leadResults,
    ...adsResults,
    ...users.map((u) => ({
      id: u.id,
      type: "user",
      title: u.name,
      subtitle: `${u.email} · ${u.role}`,
      tab: "users",
    })),
  ];

  return { results };
}
