import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessAllLeads, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    const body = await req.json();
    const { newSalesPersonId, reason } = body;

    if (!newSalesPersonId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Vui lòng chọn nhân viên Sales mới" },
        },
        { status: 400 }
      );
    }

    const [existingLead, targetSales] = await Promise.all([
      prisma.lead.findUnique({ where: { id } }),
      prisma.user.findUnique({ where: { id: newSalesPersonId } }),
    ]);

    if (!existingLead) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Không tìm thấy khách hàng" },
        },
        { status: 404 }
      );
    }

    const canAssign =
      canAccessAllLeads(user) ||
      !existingLead.salesPersonId ||
      existingLead.salesPersonId === user.userId;

    if (!canAssign) {
      return forbiddenResponse(
        "Chỉ người đang phụ trách hoặc cấp Trưởng phòng / Trưởng ban / Giám đốc / Admin mới được bàn giao Lead"
      );
    }

    if (!targetSales || !targetSales.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SALES_NOT_FOUND", message: "Nhân viên Sales không tồn tại hoặc đã vô hiệu hóa" },
        },
        { status: 404 }
      );
    }

    const fromSalesId = existingLead.salesPersonId;

    // Cập nhật Sales phụ trách trong Lead
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { salesPersonId: newSalesPersonId },
      include: {
        salesPerson: {
          select: { id: true, name: true, initials: true, email: true },
        },
      },
    });

    // Tạo bản ghi LeadAssignment
    const assignment = await prisma.leadAssignment.create({
      data: {
        leadId: id,
        fromSalesId,
        toSalesId: newSalesPersonId,
        reason: reason || "Bàn giao phụ trách khách hàng",
        assignedById: user?.userId,
      },
    });

    // Ghi AuditLog
    await prisma.auditLog.create({
      data: {
        userId: user?.userId,
        leadId: id,
        action: "ASSIGN_SALES",
        entity: "LEAD",
        entityId: id,
        details: JSON.stringify({
          fromSalesId,
          toSalesId: newSalesPersonId,
          reason,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã bàn giao Lead cho nhân viên ${targetSales.name} thành công`,
      data: {
        lead: updatedLead,
        assignment,
      },
    });
  } catch (error: any) {
    console.error("POST /api/leads/[id]/assign error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi chuyển bàn giao Lead" },
      },
      { status: 500 }
    );
  }
}
