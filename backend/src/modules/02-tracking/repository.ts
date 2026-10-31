import { prisma } from "@/src/core/db/prisma";

export async function queryTrackingOverviewData(includeFullLeadPhone: boolean) {
  const [events, syncJobs, siteStats, totalEvents] = await Promise.all([
    prisma.trackingEvent.findMany({
      include: {
        lead: {
          select: {
            id: true,
            code: true,
            customerName: true,
            phone: includeFullLeadPhone,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.syncJob.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.trackingEvent.groupBy({
      by: ["websiteSource"],
      _count: { _all: true },
    }),
    prisma.trackingEvent.count(),
  ]);

  return { events, syncJobs, siteStats, totalEvents };
}

export async function createTrackingEventRecord(data: {
  websiteSource: string;
  source: string;
  medium: string;
  campaign: string | null;
  landingPage: string;
  device: string;
  utmParams: string;
  leadId: string | null;
  ipAddress: string | null;
}) {
  return prisma.trackingEvent.create({ data });
}

export async function createSyncJobRecord(data: {
  service: string;
  status: string;
  errorMessage: string;
}) {
  return prisma.syncJob.create({ data });
}

export async function listSyncJobRecords() {
  return prisma.syncJob.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function countTrackingEvents(createdAtFilter?: { gte?: Date; lte?: Date }) {
  return prisma.trackingEvent.count(
    createdAtFilter ? { where: { createdAt: createdAtFilter } } : undefined
  );
}
