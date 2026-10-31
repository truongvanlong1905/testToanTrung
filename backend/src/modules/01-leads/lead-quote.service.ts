import type { UserSession } from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { AppError } from "@/src/core/http";
import { createSystemReportNotification } from "@/src/modules/04-reports-dashboard/public";
import { CreateQuoteSchema, DirectorApproveQuoteSchema } from "./contracts";
import {
  computeLeadScore,
  extractMaxCodeSuffix,
  formatVndNumber,
} from "./lead-scoring.service";
import { assertCanApproveQuote, assertCanModifyLead } from "./policy";
import { findLeadWithCountsById } from "./repository";

export async function listLeadQuotes(leadId: string) {
  const quotes = await prisma.leadQuote.findMany({
    where: { leadId },
    include: {
      createdBy: { select: { name: true, initials: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    quotes: quotes.map((q) => ({
      ...q,
      createdBy: q.createdBy?.name || "Hệ thống",
      createdAt: q.createdAt.toLocaleString("vi-VN"),
    })),
  };
}

export async function createLeadQuote(
  user: UserSession,
  leadId: string,
  body: unknown
) {
  const lead = await findLeadWithCountsById(leadId);
  if (!lead) {
    throw new AppError(404, "Không tìm thấy hồ sơ Lead", "NOT_FOUND");
  }

  assertCanModifyLead(
    user,
    lead,
    "Chỉ nhân sự phụ trách Lead hoặc cấp quản lý mới được lập báo giá"
  );

  const parsed = CreateQuoteSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message || "Thông số báo giá không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const d = parsed.data;
  const areaSqm = Number((d.widthMeters * d.heightMeters).toFixed(2));
  const subtotal =
    areaSqm * d.unitPriceVnd + d.processorVnd + d.structureInstallVnd;
  const discountAmount = subtotal * (d.discountPercent / 100);
  const totalVnd = Math.round(subtotal - discountAmount);

  const needsDirector =
    d.requestDirectorApproval || d.discountPercent > 8 || totalVnd >= 200_000_000;

  const now = new Date();
  const ym = `${String(now.getFullYear()).slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  const existingQuoteCodes = await prisma.leadQuote.findMany({
    select: { code: true },
  });
  const maxQuoteSeq = extractMaxCodeSuffix(
    existingQuoteCodes,
    existingQuoteCodes.length
  );
  const quoteCode = `BG-TT-${ym}-${String(maxQuoteSeq + 1).padStart(3, "0")}`;

  const quoteStatus = needsDirector ? "PENDING_DIRECTOR" : "SENT";

  const quote = await prisma.leadQuote.create({
    data: {
      code: quoteCode,
      leadId,
      moduleSpec: d.moduleSpec,
      widthMeters: d.widthMeters,
      heightMeters: d.heightMeters,
      areaSqm,
      unitPriceVnd: d.unitPriceVnd,
      processorVnd: d.processorVnd,
      structureInstallVnd: d.structureInstallVnd,
      discountPercent: d.discountPercent,
      totalVnd,
      warrantyMonths: d.warrantyMonths,
      notes: d.notes || null,
      status: quoteStatus,
      createdById: user.userId,
    },
    include: {
      createdBy: { select: { name: true } },
    },
  });

  const formattedTotal = formatVndNumber(totalVnd);
  const nextLeadStatus =
    lead.status === "Vừa nhận thông tin"
      ? needsDirector
        ? "Đang soạn báo giá"
        : "Đã gửi báo giá"
      : lead.status;

  const scored = computeLeadScore({
    status: nextLeadStatus,
    estimatedValue: formattedTotal,
    installationAddress: lead.installationAddress,
    email: lead.email,
    source: lead.source,
    ledWidth: d.widthMeters,
    ledHeight: d.heightMeters,
    activitiesCount: lead._count.activities + 1,
    quotesCount: lead._count.quotes + 1,
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      estimatedValue: formattedTotal,
      ledWidth: d.widthMeters,
      ledHeight: d.heightMeters,
      ledModuleType: d.moduleSpec,
      discountPercent: d.discountPercent,
      directorApprovalStatus: needsDirector
        ? "PENDING"
        : lead.directorApprovalStatus,
      status: nextLeadStatus,
      lastContactedAt: now,
      priorityScore: scored.score,
      priorityTier: scored.tier,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: "QUOTATION",
      summary: `Lập báo giá [${quoteCode}] — ${d.moduleSpec} (${d.widthMeters}m × ${d.heightMeters}m = ${areaSqm}m²) · Tổng: ${formattedTotal}${
        d.discountPercent > 0 ? ` (CK ${d.discountPercent}%)` : ""
      }`,
      outcome: needsDirector
        ? "Đang trình Giám đốc phê duyệt giá/chiết khấu"
        : "Đã hoàn tất báo giá chuẩn",
      createdById: user.userId,
    },
  });

  if (needsDirector) {
    await createSystemReportNotification({
      title: `📋 [Trình Giám đốc duyệt giá] ${quoteCode} — KH: ${lead.customerName}`,
      content: `Nhân sự ${user.name} trình Ban Giám Đốc phê duyệt báo giá dự án ${d.moduleSpec} (${areaSqm}m²), tổng giá trị ${formattedTotal} (Chiết khấu: ${d.discountPercent}%) cho khách hàng ${lead.customerName} (${lead.companyName} - Mã Lead: ${lead.code}).`,
      department: "PHÒNG KINH DOANH",
      createdById: user.userId,
    });
  }

  return {
    message: needsDirector
      ? `Đã lập báo giá [${quoteCode}] (${formattedTotal}) và gửi trình Giám đốc phê duyệt chiết khấu/dự án lớn!`
      : `Đã lập báo giá [${quoteCode}] (${formattedTotal}) và đồng bộ vào hồ sơ Lead!`,
    quote: {
      ...quote,
      createdBy: quote.createdBy?.name || user.name,
      createdAt: quote.createdAt.toLocaleString("vi-VN"),
    },
  };
}

export async function approveOrRejectLeadQuote(
  user: UserSession,
  leadId: string,
  body: unknown
) {
  assertCanApproveQuote(user);

  const parsed = DirectorApproveQuoteSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(
      400,
      "Dữ liệu phê duyệt không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const { quoteId, decision, note } = parsed.data;
  const quote = await prisma.leadQuote.findFirst({
    where: { id: quoteId, leadId },
  });

  if (!quote) {
    throw new AppError(404, "Không tìm thấy bản báo giá", "NOT_FOUND");
  }

  const updatedQuote = await prisma.leadQuote.update({
    where: { id: quoteId },
    data: {
      status: decision === "APPROVED" ? "DIRECTOR_APPROVED" : "DRAFT",
      approvedByName: user.name,
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      directorApprovalStatus: decision,
      directorApprovedByName: user.name,
      directorApprovalNote: note || null,
      ...(decision === "APPROVED" ? { status: "Đã gửi báo giá" } : {}),
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type: "QUOTATION",
      summary:
        decision === "APPROVED"
          ? `Giám đốc (${user.name}) ĐÃ PHÊ DUYỆT báo giá [${quote.code}] — Cho phép gửi khách hàng`
          : `Giám đốc (${user.name}) YÊU CẦU ĐIỀU CHỈNH LẠI báo giá [${quote.code}]`,
      outcome: note || null,
      createdById: user.userId,
    },
  });

  return {
    message:
      decision === "APPROVED"
        ? `Giám đốc đã ký duyệt báo giá [${quote.code}]! Trạng thái Lead đã chuyển sang "Đã gửi báo giá".`
        : `Đã từ chối / yêu cầu điều chỉnh lại báo giá [${quote.code}].`,
    quote: updatedQuote,
  };
}
