import { prisma } from "@/src/core/db/prisma";

export async function createLeadAttachmentRecord(data: {
  leadId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedById: string;
}) {
  return prisma.leadAttachment.create({ data });
}

export async function findLeadById(id: string) {
  return prisma.lead.findUnique({ where: { id } });
}

export async function findLeadWithCountsById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: { _count: { select: { activities: true, quotes: true } } },
  });
}

export async function findLeadFullDetailsById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      category: true,
      salesPerson: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          initials: true,
        },
      },
      statusHistory: {
        include: {
          changedBy: {
            select: { id: true, name: true, initials: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      assignments: {
        include: {
          fromSales: {
            select: { id: true, name: true, initials: true },
          },
          toSales: {
            select: { id: true, name: true, initials: true },
          },
          assignedBy: {
            select: { id: true, name: true, initials: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      attachments: {
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        include: {
          createdBy: {
            select: { id: true, name: true, initials: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      quotes: {
        include: {
          createdBy: {
            select: { id: true, name: true, initials: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function logLeadAudit(data: {
  userId?: string;
  leadId?: string;
  action: string;
  details: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: data.userId,
      leadId: data.leadId,
      action: data.action,
      entity: "LEAD",
      entityId: data.leadId,
      details: data.details,
    },
  });
}
