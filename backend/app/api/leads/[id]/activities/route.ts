import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessAllLeads, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { computeLeadScore } from "@/lib/lead-scoring";

const CreateActivitySchema = z.object({
  type: z.enum(["CALL", "ZALO", "SURVEY", "MEETING", "NOTE"]).default("CALL"),
  summary: z.string().trim().min(3, "Nội dung trao đổi tối thiểu 3 ký tự").max(2000),
  outcome: z.string().trim().max(500).optional().nullable(),
  nextFollowUpAt: z.string().optional().nullable(),
  nextActionNote: z.string().trim().max(300).optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const activities = await prisma.leadActivity.findMany({
      where: { leadId: id },
      include: {
        createdBy: { select: { id: true, name: true, initials: true, position: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        activities: activities.map((a) => ({
          id: a.id,
          type: a.type,
          summary: a.summary,
          outcome: a.outcome,
          nextFollowUpAt: a.nextFollowUpAt ? a.nextFollowUpAt.toISOString() : null,
          createdBy: a.createdBy?.name || "Hệ thống",
          createdByInitials: a.createdBy?.initials || "TT",
          createdAt: a.createdAt.toLocaleString("vi-VN"),
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/leads/[id]/activities error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi tải nhật ký chăm sóc" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { _count: { select: { activities: true, quotes: true } } },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy khách hàng" } },
        { status: 404 }
      );
    }

    const canModify =
      canAccessAllLeads(user) ||
      !lead.salesPersonId ||
      lead.salesPersonId === user.userId ||
      lead.createdById === user.userId;

    if (!canModify) {
      return forbiddenResponse("Chỉ nhân sự phụ trách Lead này hoặc cấp quản lý mới được ghi nhật ký chăm sóc");
    }

    const body = await req.json();
    const parsed = CreateActivitySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Thông tin nhật ký không hợp lệ",
          },
        },
        { status: 400 }
      );
    }

    const followUpDate =
      parsed.data.nextFollowUpAt && !Number.isNaN(new Date(parsed.data.nextFollowUpAt).getTime())
        ? new Date(parsed.data.nextFollowUpAt)
        : undefined;

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: id,
        type: parsed.data.type,
        summary: parsed.data.summary,
        outcome: parsed.data.outcome || null,
        nextFollowUpAt: followUpDate || null,
        createdById: user.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, initials: true } },
      },
    });

    const scored = computeLeadScore({
      status: lead.status,
      estimatedValue: lead.estimatedValue,
      installationAddress: lead.installationAddress,
      email: lead.email,
      source: lead.source,
      ledWidth: lead.ledWidth,
      ledHeight: lead.ledHeight,
      activitiesCount: lead._count.activities + 1,
      quotesCount: lead._count.quotes,
    });

    await prisma.lead.update({
      where: { id },
      data: {
        lastContactedAt: new Date(),
        priorityScore: scored.score,
        priorityTier: scored.tier,
        ...(followUpDate !== undefined ? { nextFollowUpAt: followUpDate } : {}),
        ...(parsed.data.nextActionNote !== undefined
          ? { nextActionNote: parsed.data.nextActionNote || null }
          : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        leadId: id,
        action: "LOG_ACTIVITY",
        entity: "LEAD",
        entityId: id,
        details: JSON.stringify({
          type: activity.type,
          summary: activity.summary,
          nextFollowUpAt: followUpDate?.toISOString() || null,
        }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Đã lưu nhật ký chăm sóc & cập nhật lịch hẹn SLA!",
        data: {
          activity: {
            id: activity.id,
            type: activity.type,
            summary: activity.summary,
            outcome: activity.outcome,
            nextFollowUpAt: activity.nextFollowUpAt ? activity.nextFollowUpAt.toISOString() : null,
            createdBy: activity.createdBy?.name || user.name,
            createdByInitials: activity.createdBy?.initials || user.initials,
            createdAt: activity.createdAt.toLocaleString("vi-VN"),
          },
          priorityScore: scored.score,
          priorityTier: scored.tier,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/leads/[id]/activities error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi lưu nhật ký chăm sóc" } },
      { status: 500 }
    );
  }
}
