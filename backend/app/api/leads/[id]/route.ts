import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessAllLeads, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { computeLeadScore, computeLeadSla } from "@/lib/lead-scoring";

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

    const existing = await prisma.lead.findUnique({ where: { id } });
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

    const parsedNextFollowUp =
      body.nextFollowUpAt === null
        ? null
        : body.nextFollowUpAt && !Number.isNaN(new Date(body.nextFollowUpAt).getTime())
          ? new Date(body.nextFollowUpAt)
          : existing.nextFollowUpAt;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        customerName: body.customerName ?? existing.customerName,
        companyName: body.companyName ?? existing.companyName,
        phone: body.phone ?? existing.phone,
        email: body.email ?? existing.email,
        installationAddress: body.installationAddress ?? existing.installationAddress,
        location: body.location ?? existing.location,
        product: body.product ?? existing.product,
        estimatedValue: body.estimatedValue ?? existing.estimatedValue,
        notes: body.notes ?? existing.notes,
        nextFollowUpAt: parsedNextFollowUp,
        nextActionNote: body.nextActionNote !== undefined ? body.nextActionNote : existing.nextActionNote,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        leadId: id,
        action: "UPDATE_LEAD",
        entity: "LEAD",
        entityId: id,
        details: JSON.stringify(body),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin hồ sơ Lead thành công",
      data: { lead: updated },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi cập nhật thông tin Lead" },
      },
      { status: 500 }
    );
  }
}
