import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessAllLeads, unauthorizedResponse } from "@/lib/auth";

function maskPhone(phone: string, allowFull: boolean): string {
  if (allowFull || !phone) return phone;
  const digits = phone.trim();
  if (digits.length <= 6) return "***";
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const { phone, email, customerName, companyName, currentLeadId } = body;

    const cleanInputPhone = phone ? String(phone).replace(/[\s.-]/g, "").trim() : "";
    const cleanEmail = email ? String(email).trim().toLowerCase() : "";
    const cleanCustName = customerName ? String(customerName).trim().toLowerCase() : "";
    const cleanCompName = companyName ? String(companyName).trim().toLowerCase() : "";

    if (!cleanInputPhone && !cleanEmail && !cleanCustName && !cleanCompName) {
      return NextResponse.json({
        success: true,
        data: { isDuplicate: false, matchedLeads: [] },
      });
    }

    const allLeads = await prisma.lead.findMany({
      where: currentLeadId ? { id: { not: currentLeadId } } : undefined,
      select: {
        id: true,
        code: true,
        customerName: true,
        companyName: true,
        phone: true,
        email: true,
        status: true,
        salesPersonId: true,
        createdById: true,
        salesPerson: {
          select: {
            name: true,
          },
        },
      },
      take: 100,
    });

    const matched = allLeads.filter((l) => {
      if (cleanInputPhone.length >= 8) {
        const leadPhoneDigits = l.phone.replace(/[\s.-]/g, "");
        if (leadPhoneDigits.includes(cleanInputPhone) || cleanInputPhone.includes(leadPhoneDigits)) {
          return true;
        }
      }

      if (cleanEmail.length > 4 && l.email && l.email.toLowerCase() === cleanEmail) {
        return true;
      }

      if (cleanCustName.length >= 3 && l.customerName.toLowerCase().includes(cleanCustName)) {
        return true;
      }

      if (cleanCompName.length >= 4 && l.companyName.toLowerCase().includes(cleanCompName)) {
        return true;
      }

      return false;
    });

    const hasFullLeadAccess = canAccessAllLeads(user);

    return NextResponse.json({
      success: true,
      data: {
        isDuplicate: matched.length > 0,
        matchedLeads: matched.slice(0, 5).map((m) => {
          const isOwner =
            hasFullLeadAccess ||
            !m.salesPersonId ||
            m.salesPersonId === user.userId ||
            m.createdById === user.userId;
          return {
            id: m.id,
            code: m.code,
            customerName: m.customerName,
            companyName: m.companyName,
            phone: maskPhone(m.phone, isOwner),
            email: isOwner ? m.email : m.email ? "***@***" : null,
            status: m.status,
            salesPersonName: m.salesPerson?.name || "Chưa phân công",
          };
        }),
      },
    });
  } catch (error) {
    console.error("Duplicate check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi kiểm tra trùng lặp" },
      },
      { status: 500 }
    );
  }
}
