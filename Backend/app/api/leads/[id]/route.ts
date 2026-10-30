import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    return NextResponse.json({
      success: true,
      data: {
        lead: {
          id: lead.id,
          code: lead.code,
          customerName: lead.customerName,
          companyName: lead.companyName,
          phone: lead.phone,
          email: lead.email || "",
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
            fileSize: att.fileSize,
            fileType: att.fileType,
            uploadedBy: att.uploadedBy?.name || "Người dùng",
            createdAt: att.createdAt.toLocaleString("vi-VN"),
          })),
        },
      },
    });
  } catch (error: any) {
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
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user?.userId,
        leadId: id,
        action: "UPDATE_LEAD",
        entity: "LEAD",
        entityId: id,
        details: JSON.stringify(body),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: { lead: updated },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi cập nhật thông tin Lead" },
      },
      { status: 500 }
    );
  }
}
