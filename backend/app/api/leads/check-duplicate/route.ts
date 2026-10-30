import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, email, customerName, companyName, currentLeadId } = body;

    const cleanInputPhone = phone ? phone.replace(/[\s.-]/g, "").trim() : "";
    const cleanEmail = email ? email.trim().toLowerCase() : "";
    const cleanCustName = customerName ? customerName.trim().toLowerCase() : "";
    const cleanCompName = companyName ? companyName.trim().toLowerCase() : "";

    if (!cleanInputPhone && !cleanEmail && !cleanCustName && !cleanCompName) {
      return NextResponse.json({
        success: true,
        data: { isDuplicate: false, matchedLeads: [] },
      });
    }

    // Lấy danh sách leads để kiểm tra trùng
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
        salesPerson: {
          select: {
            name: true,
          },
        },
      },
      take: 100,
    });

    const matched = allLeads.filter((l) => {
      // 1. Trùng số điện thoại
      if (cleanInputPhone.length >= 8) {
        const leadPhoneDigits = l.phone.replace(/[\s.-]/g, "");
        if (leadPhoneDigits.includes(cleanInputPhone) || cleanInputPhone.includes(leadPhoneDigits)) {
          return true;
        }
      }

      // 2. Trùng email
      if (cleanEmail.length > 4 && l.email && l.email.toLowerCase() === cleanEmail) {
        return true;
      }

      // 3. Trùng tên khách hàng
      if (cleanCustName.length >= 3 && l.customerName.toLowerCase().includes(cleanCustName)) {
        return true;
      }

      // 4. Trùng tên công ty
      if (cleanCompName.length >= 4 && l.companyName.toLowerCase().includes(cleanCompName)) {
        return true;
      }

      return false;
    });

    return NextResponse.json({
      success: true,
      data: {
        isDuplicate: matched.length > 0,
        matchedLeads: matched.slice(0, 5).map((m) => ({
          id: m.id,
          code: m.code,
          customerName: m.customerName,
          companyName: m.companyName,
          phone: m.phone,
          email: m.email,
          status: m.status,
          salesPersonName: m.salesPerson?.name || "Chưa phân công",
        })),
      },
    });
  } catch (error: any) {
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
