import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  invalidateUserSessionCache,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/auth";
import { extractMaxCodeSuffix } from "@/lib/lead-scoring";

export const dynamic = "force-dynamic";

const SignPromotionSchema = z.object({
  action: z.literal("SIGN_NOTICE"),
  targetUserId: z.string().min(1, "Vui lòng chọn nhân sự được bổ nhiệm"),
  targetDepartment: z.string().min(2, "Vui lòng chọn phòng ban"),
  newPosition: z.enum(["Trưởng phòng", "Trưởng ban", "Phó phòng", "Trưởng nhóm", "Nhân viên"]),
  title: z.string().trim().min(5, "Tiêu đề thông báo tối thiểu 5 ký tự").max(200),
  content: z.string().trim().min(10, "Nội dung thông báo chúc mừng tối thiểu 10 ký tự").max(5000),
});

const ApplyPromotionSchema = z.object({
  action: z.literal("APPLY_PERMISSION"),
  decisionId: z.string().min(1, "Vui lòng chọn quyết định bổ nhiệm đã được Giám đốc ký"),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const decisions = await prisma.promotionDecision.findMany({
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            position: true,
            initials: true,
          },
        },
        signedBy: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
        appliedByAdmin: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: { decisions },
    });
  } catch (error) {
    console.error("GET /api/promotions error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi tải danh sách thông báo bổ nhiệm" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();

    if (body?.action === "SIGN_NOTICE") {
      if (
        user.actorType !== "DIRECTOR" &&
        user.actorType !== "ADMIN" &&
        user.role !== "DIRECTOR" &&
        user.role !== "ADMIN"
      ) {
        return forbiddenResponse("Chỉ Tác nhân GIÁM ĐỐC mới có thẩm quyền ký ban hành Thông báo chúc mừng bổ nhiệm");
      }

      const parsed = SignPromotionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: parsed.error.issues[0]?.message || "Thông tin quyết định bổ nhiệm không hợp lệ",
            },
          },
          { status: 400 }
        );
      }

      const { targetUserId, targetDepartment, newPosition, title, content } = parsed.data;
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: { code: "USER_NOT_FOUND", message: "Nhân sự được bổ nhiệm không tồn tại" } },
          { status: 404 }
        );
      }

      const now = new Date();
      const ym = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const existingDecisions = await prisma.promotionDecision.findMany({
        select: { code: true },
      });
      const maxSeq = extractMaxCodeSuffix(existingDecisions, existingDecisions.length);
      const code = `QD-BGD-${ym}-${String(maxSeq + 1).padStart(3, "0")}`;

      const decision = await prisma.promotionDecision.create({
        data: {
          code,
          title,
          content,
          targetUserId,
          targetDepartment: targetDepartment.toUpperCase(),
          newPosition,
          signedById: user.userId,
          signedByName: user.name,
          status: "SIGNED_BY_DIRECTOR",
        },
        include: {
          targetUser: {
            select: { id: true, name: true, email: true, department: true, position: true, initials: true },
          },
        },
      });

      await prisma.departmentReport.create({
        data: {
          title: `🎉 [${code}] ${title}`,
          content: `${content}\n\n— Quyết định số: ${code} | Ký duyệt bởi Giám đốc: ${user.name} (${now.toLocaleDateString("vi-VN")}). Đề nghị Quản trị viên (ADMIN) thực hiện cấp quyền chức vụ "${newPosition}" tại phòng "${targetDepartment}".`,
          department: "BAN GIÁM ĐỐC",
          createdById: user.userId,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "DIRECTOR_SIGN_PROMOTION",
          entity: "USER",
          entityId: targetUserId,
          details: JSON.stringify({
            code,
            targetUser: targetUser.name,
            targetDepartment,
            newPosition,
            signedBy: user.name,
          }),
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: `Giám đốc đã ký ban hành Thông báo chúc mừng [${code}] cho ${targetUser.name}. Admin hiện có thể thực thi cấp quyền!`,
          data: { decision },
        },
        { status: 201 }
      );
    }

    if (body?.action === "APPLY_PERMISSION") {
      if (user.actorType !== "ADMIN" && user.role !== "ADMIN") {
        return forbiddenResponse(
          "Chỉ Tác nhân ADMIN mới có quyền thực thi cấp quyền hệ thống dựa trên quyết định của Giám đốc"
        );
      }

      const parsed = ApplyPromotionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: parsed.error.issues[0]?.message || "Mã quyết định không hợp lệ",
            },
          },
          { status: 400 }
        );
      }

      const decision = await prisma.promotionDecision.findUnique({
        where: { id: parsed.data.decisionId },
        include: { targetUser: true },
      });

      if (!decision) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy quyết định bổ nhiệm của Giám đốc" } },
          { status: 404 }
        );
      }

      if (decision.status !== "SIGNED_BY_DIRECTOR") {
        return NextResponse.json(
          {
            success: false,
            error: { code: "ALREADY_APPLIED", message: "Quyết định này đã được cấp quyền hoặc đã thu hồi trước đó" },
          },
          { status: 400 }
        );
      }

      const deptUpper = decision.targetDepartment.toUpperCase();
      const mappedRole = ["SALES", "MARKETING", "DESIGN", "ADS"].includes(deptUpper)
        ? deptUpper
        : decision.targetUser.role === "ADMIN" || decision.targetUser.role === "DIRECTOR"
          ? "SALES"
          : decision.targetUser.role;

      const [updatedUser, updatedDecision] = await prisma.$transaction([
        prisma.user.update({
          where: { id: decision.targetUserId },
          data: {
            actorType: "USER",
            department: deptUpper,
            role: mappedRole,
            position: decision.newPosition,
            appointedDecisionCode: decision.code,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            actorType: true,
            department: true,
            position: true,
            appointedDecisionCode: true,
            initials: true,
            avatar: true,
            isActive: true,
            updatedAt: true,
          },
        }),
        prisma.promotionDecision.update({
          where: { id: decision.id },
          data: {
            status: "APPLIED_BY_ADMIN",
            appliedByAdminId: user.userId,
            appliedAt: new Date(),
          },
        }),
      ]);

      await prisma.auditLog.create({
        data: {
          userId: user.userId,
          action: "ADMIN_GRANT_POSITION",
          entity: "USER",
          entityId: updatedUser.id,
          details: JSON.stringify({
            decisionCode: decision.code,
            signedByDirector: decision.signedByName,
            newPosition: decision.newPosition,
            department: deptUpper,
          }),
        },
      });

      invalidateUserSessionCache(updatedUser.id);

      return NextResponse.json({
        success: true,
        message: `Admin đã cấp quyền "${decision.newPosition}" (${deptUpper}) cho ${updatedUser.name} theo Quyết định [${decision.code}] của Giám đốc!`,
        data: { user: updatedUser, decision: updatedDecision },
      });
    }

    return NextResponse.json(
      { success: false, error: { code: "INVALID_ACTION", message: "Hành động không hợp lệ" } },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/promotions error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Lỗi xử lý quyết định bổ nhiệm" } },
      { status: 500 }
    );
  }
}
