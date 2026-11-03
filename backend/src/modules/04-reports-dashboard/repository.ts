import { prisma } from "@/src/core/db/prisma";

export async function queryVisibleReports(
  reportFilter: Record<string, unknown>,
  userId: string
) {
  return prisma.departmentReport.findMany({
    where: reportFilter,
    include: {
      createdBy: { select: { name: true, role: true, actorType: true, initials: true } },
      reads: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createDepartmentReportRecord(data: {
  title: string;
  content: string;
  department: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  createdById: string;
}) {
  return prisma.departmentReport.create({
    data: {
      title: data.title,
      content: data.content,
      attachmentName: data.attachmentName || null,
      attachmentUrl: data.attachmentUrl || null,
      department: data.department,
      createdById: data.createdById,
    },
    include: {
      createdBy: { select: { name: true, role: true, initials: true } },
    },
  });
}

export async function findReportById(id: string) {
  return prisma.departmentReport.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, role: true, actorType: true, initials: true },
      },
    },
  });
}

export async function upsertReportReadRecord(reportId: string, userId: string) {
  return prisma.departmentReportRead.upsert({
    where: { reportId_userId: { reportId, userId } },
    create: { reportId, userId },
    update: { readAt: new Date() },
  });
}

export async function findUnreadReportIds(
  reportFilter: Record<string, unknown>,
  userId: string
) {
  return prisma.departmentReport.findMany({
    where: {
      ...reportFilter,
      reads: { none: { userId } },
    },
    select: { id: true },
  });
}

export async function countDepartmentReports(createdAtFilter?: {
  gte?: Date;
  lte?: Date;
}) {
  return prisma.departmentReport.count(
    createdAtFilter ? { where: { createdAt: createdAtFilter } } : undefined
  );
}
