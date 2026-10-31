import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessAllLeads, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { computeLeadScore, computeLeadSla } from "@/lib/lead-scoring";

const UpdateLeadSchema = z.object({
  customerName: z.string().trim().min(2, "Tên khách hàng tối thiểu 2 ký tự").optional(),
  companyName: z.string().trim().min(1, "Tên công ty không được để trống").optional(),
  phone: z.string().trim().min(8, "Số điện thoại không hợp lệ").optional(),
  email: z.string().trim().email("Email không hợp lệ").optional().nullable().or(z.literal("")),
  installationAddress: z.string().trim().optional().nullable(),
  location: z.string().trim().min(2).optional(),
  product: z.string().trim().min(2, "Vui lòng nhập sản phẩm / nhu cầu LED").optional(),
  estimatedValue: z.string().trim().optional(),
  notes: z.string().optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
  nextActionNote: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;

    const lead = await prisma.lead.findUnique({
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

    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Không tìm thấy khách hàng" },
        },
        { status: 404 }
      );
    }

    const isOwner =
      canAccessAllLeads(user) ||
      !lead.salesPersonId ||
      lead.salesPersonId === user.userId ||
      lead.createdById === user.userId;

    const safePhone =
      isOwner || !lead.phone
        ? lead.phone
        : lead.phone.length > 6
          ? `${lead.phone.slice(0, 4)}***${lead.phone.slice(-3)}`
          : "***";

    const scored = computeLeadScore({
      status: lead.status,
      estimatedValue: lead.estimatedValue,
      installationAddress: lead.installationAddress,
      email: lead.email,
      source: lead.source,
      ledWidth: lead.ledWidth,
      ledHeight: lead.ledHeight,
      activitiesCount: lead.activities.length,
      quotesCount: lead.quotes.length,
    });

    const sla = computeLeadSla({
      status: lead.status,
      createdAt: lead.createdAt,
      lastContactedAt: lead.lastContactedAt,
      nextFollowUpAt: lead.nextFollowUpAt,
    });

    return NextResponse.json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          code: lead.code,
          customerName: lead.customerName,
          companyName: lead.companyName,
          phone: safePhone,
          email: isOwner ? lead.email || "" : lead.email ? "***@***" : "",
          product: lead.product,
          category: lead.category?.name || "LED trong nhà",
          categoryId: lead.categoryId,
          source: lead.source,
          status: lead.status,
          failureReason: lead.failureReason,
          estimatedValue: lead.estimatedValue || "Đang khảo sát",
          installationAddress: lead.installationAddress || "",
          location: lead.location,
          notes: lead.notes || "",
          createdAt: lead.createdAt.toLocaleDateString("vi-VN"),
          priorityScore: scored.score,
          priorityTier: scored.tier,
          slaStatus: sla.slaStatus,
          slaLabel: sla.slaLabel,
          nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString() : null,
          nextActionNote: lead.nextActionNote || null,
          ledWidth: lead.ledWidth,
          ledHeight: lead.ledHeight,
          ledModuleType: lead.ledModuleType,
          discountPercent: lead.discountPercent || 0,
          directorApprovalStatus: lead.directorApprovalStatus || "NONE",
          directorApprovedByName: lead.directorApprovedByName || null,
          directorApprovalNote: lead.directorApprovalNote || null,
          salesPerson: {
            id: lead.salesPerson?.id,
            name: lead.salesPerson?.name || "Chưa phân công",
            initials: lead.salesPerson?.initials || "TT",
          },
          statusHistory: lead.statusHistory.map((h) => ({
            id: h.id,
            fromStatus: h.fromStatus,
            toStatus: h.toStatus,
            reason: h.reason,
            changedBy: h.changedBy?.name || "Hệ thống",
            createdAt: h.createdAt.toLocaleString("vi-VN"),
          })),
          assignments: lead.assignments.map((a) => ({
            id: a.id,
            fromSales: a.fromSales?.name || null,
            toSales: a.toSales.name,
            reason: a.reason,
            assignedBy: a.assignedBy?.name || "Hệ thống",
            createdAt: a.createdAt.toLocaleString("vi-VN"),
          })),
          attachments: lead.attachments.map((att) => ({
            id: att.id,
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileSize: att.fileSize ?? undefined,
            fileType: att.fileType,
            uploadedBy: att.uploadedBy?.name || "Người dùng",
            createdAt: att.createdAt.toLocaleString("vi-VN"),
          })),
          activities: lead.activities.map((act) => ({
            id: act.id,
            type: act.type,
            summary: act.summary,
            outcome: act.outcome,
            nextFollowUpAt: act.nextFollowUpAt ? act.nextFollowUpAt.toISOString() : null,
            createdBy: act.createdBy?.name || "Hệ thống",
            createdByInitials: act.createdBy?.initials || "TT",
            createdAt: act.createdAt.toLocaleString("vi-VN"),
          })),
          quotes: lead.quotes.map((q) => ({
            id: q.id,
            code: q.code,
            moduleSpec: q.moduleSpec,
            widthMeters: q.widthMeters,
            heightMeters: q.heightMeters,
            areaSqm: q.areaSqm,
            unitPriceVnd: q.unitPriceVnd,
            processorVnd: q.processorVnd,
            structureInstallVnd: q.structureInstallVnd,
            discountPercent: q.discountPercent,
            totalVnd: q.totalVnd,
            warrantyMonths: q.warrantyMonths,
            notes: q.notes,
            status: q.status,
            approvedByName: q.approvedByName,
            createdBy: q.createdBy?.name || "Hệ thống",
            createdAt: q.createdAt.toLocaleString("vi-VN"),
          })),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/leads/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi tải chi tiết Lead" },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await req.json();

    const parsedBody = UpdateLeadSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsedBody.error.issues[0]?.message || "Thông tin cập nhật không hợp lệ",
          },
        },
        { status: 400 }
      );
    }

    const existing = await prisma.lead.findUnique({
      where: { id },
      include: { _count: { select: { activities: true, quotes: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Không tìm thấy khách hàng" },
        },
        { status: 404 }
      );
    }

    const canModify =
      canAccessAllLeads(user) ||
      !existing.salesPersonId ||
      existing.salesPersonId === user.userId ||
      existing.createdById === user.userId;

    if (!canModify) {
      return forbiddenResponse(
        "Chỉ nhân sự phụ trách Lead này hoặc cấp Trưởng phòng / Trưởng ban / Giám đốc / Admin mới được chỉnh sửa"
      );
    }

    const data = parsedBody.data;
    const parsedNextFollowUp =
      data.nextFollowUpAt === null
        ? null
        : data.nextFollowUpAt && !Number.isNaN(new Date(data.nextFollowUpAt).getTime())
          ? new Date(data.nextFollowUpAt)
          : existing.nextFollowUpAt;

    const nextEstimatedValue = data.estimatedValue ?? existing.estimatedValue;
    const nextInstallationAddress =
      data.installationAddress !== undefined ? data.installationAddress : existing.installationAddress;
    const nextEmail = data.email !== undefined ? data.email || null : existing.email;

    const rescored = computeLeadScore({
      status: existing.status,
      estimatedValue: nextEstimatedValue,
      installationAddress: nextInstallationAddress,
      email: nextEmail,
      source: existing.source,
      ledWidth: existing.ledWidth,
      ledHeight: existing.ledHeight,
      activitiesCount: existing._count.activities,
      quotesCount: existing._count.quotes,
    });

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        customerName: data.customerName ?? existing.customerName,
        companyName: data.companyName ?? existing.companyName,
        phone: data.phone ?? existing.phone,
        email: nextEmail,
        installationAddress: nextInstallationAddress,
        location: data.location ?? existing.location,
        product: data.product ?? existing.product,
        estimatedValue: nextEstimatedValue,
        notes: data.notes !== undefined ? data.notes || "" : existing.notes,
        nextFollowUpAt: parsedNextFollowUp,
        nextActionNote: data.nextActionNote !== undefined ? data.nextActionNote : existing.nextActionNote,
        priorityScore: rescored.score,
        priorityTier: rescored.tier,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        leadId: id,
        action: "UPDATE_LEAD",
        entity: "LEAD",
        entityId: id,
        details: JSON.stringify(data),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin hồ sơ Lead thành công",
      data: { lead: updated },
    });
  } catch (error) {
    console.error("PATCH /api/leads/[id] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi cập nhật thông tin Lead" },
      },
      { status: 500 }
    );
  }
}
