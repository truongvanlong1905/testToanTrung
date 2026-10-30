import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const CreateLeadSchema = z.object({
  customerName: z.string().min(2, "Tên khách hàng phải có ít nhất 2 ký tự"),
  companyName: z.string().optional().default("Khách hàng cá nhân"),
  phone: z.string().min(8, "Số điện thoại không hợp lệ"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  installationAddress: z.string().optional(),
  location: z.string().optional().default("TP. Hồ Chí Minh"),
  product: z.string().min(2, "Vui lòng nhập sản phẩm / nhu cầu hiển thị LED"),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  source: z.string().default("Hotline"),
  status: z.string().default("Vừa nhận thông tin"),
  salesPersonId: z.string().optional(),
  estimatedValue: z.string().optional().default("Đang khảo sát"),
  notes: z.string().optional().default(""),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number().optional(),
        fileType: z.string().default("IMAGE"),
      })
    )
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const source = searchParams.get("source") || "all";
    const salesId = searchParams.get("salesId") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "8"));

    // Build filter
    const where: any = {};

    if (search.trim()) {
      const q = search.trim();
      where.OR = [
        { customerName: { contains: q } },
        { companyName: { contains: q } },
        { phone: { contains: q } },
        { code: { contains: q } },
        { product: { contains: q } },
      ];
    }

    if (status !== "all") {
      where.status = status;
    }

    if (source !== "all") {
      where.source = source;
    }

    if (salesId !== "all") {
      where.salesPersonId = salesId;
    }

    // Counts for stats cards
    const [totalAll, newCount, quotingCount, wonCount, lostCount, salesGroups] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "Vừa nhận thông tin" } }),
      prisma.lead.count({
        where: {
          status: {
            in: ["Đang soạn báo giá", "Đã gửi báo giá"],
          },
        },
      }),
      prisma.lead.count({ where: { status: "Chốt thành công" } }),
      prisma.lead.count({ where: { status: "Thất bại" } }),
      prisma.lead.groupBy({
        by: ["salesPersonId"],
        _count: { _all: true },
        orderBy: { _count: { salesPersonId: "desc" } },
      }),
    ]);
    const salesUsers = await prisma.user.findMany({
      where: { id: { in: salesGroups.map((group) => group.salesPersonId).filter((id): id is string => Boolean(id)) } },
      select: { id: true, name: true, initials: true },
    });
    const salesById = new Map(salesUsers.map((user) => [user.id, user]));
    const salesLeaderboard = salesGroups
      .map((group) => {
        const user = group.salesPersonId ? salesById.get(group.salesPersonId) : undefined;
        return user ? { name: user.name, initials: user.initials, count: group._count._all } : null;
      })
      .filter((entry): entry is { name: string; initials: string; count: number } => entry !== null)
      .sort((a, b) => b.count - a.count);

    const totalFiltered = await prisma.lead.count({ where });

    const leads = await prisma.lead.findMany({
      where,
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
        attachments: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      success: true,
      data: {
        leads: leads.map((l) => ({
          id: l.id,
          code: l.code,
          customerName: l.customerName,
          companyName: l.companyName,
          phone: l.phone,
          email: l.email || "",
          product: l.product,
          category: l.category?.name || "LED trong nhà",
          categoryId: l.categoryId,
          source: l.source,
          status: l.status,
          failureReason: l.failureReason,
          estimatedValue: l.estimatedValue || "Đang khảo sát",
          installationAddress: l.installationAddress || "",
          location: l.location,
          notes: l.notes || "",
          createdAt: l.createdAt.toLocaleDateString("vi-VN"),
          salesPerson: {
            id: l.salesPerson?.id,
            name: l.salesPerson?.name || "Chưa phân công",
            initials: l.salesPerson?.initials || "TT",
          },
          attachmentsCount: l.attachments.length,
        })),
        stats: {
          total: totalAll,
          newLeads: newCount,
          quotingLeads: quotingCount,
          wonLeads: wonCount,
          lostLeads: lostCount,
          salesLeaderboard,
        },
      },
      meta: {
        total: totalFiltered,
        page,
        pageSize,
        totalPages: Math.ceil(totalFiltered / pageSize) || 1,
      },
    });
  } catch (error: any) {
    console.error("GET /api/leads error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi tải danh sách Lead" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const body = await req.json();

    const validation = CreateLeadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.issues[0]?.message || "Dữ liệu không hợp lệ",
          },
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Resolve Category ID
    let categoryId = data.categoryId;
    if (!categoryId && data.categoryName) {
      const cat = await prisma.productCategory.findFirst({
        where: { name: data.categoryName },
      });
      categoryId = cat?.id;
    }

    if (!categoryId) {
      const defaultCat = await prisma.productCategory.findFirst();
      categoryId = defaultCat?.id || "cat_led_indoor";
    }

    // Resolve Sales ID
    let salesPersonId = data.salesPersonId;
    if (!salesPersonId) {
      const defaultSales = await prisma.user.findFirst({
        where: { role: "SALES", isActive: true },
      });
      salesPersonId = defaultSales?.id;
    }

    // Tự sinh mã Lead: TT-LED-YYMM-XXXX
    const now = new Date();
    const yearMonth = `${String(now.getFullYear()).slice(-2)}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    const countTotal = await prisma.lead.count();
    const sequence = String(countTotal + 1).padStart(4, "0");
    const code = `TT-LED-${yearMonth}-${sequence}`;

    // Tạo Lead trong Database
    const newLead = await prisma.lead.create({
      data: {
        code,
        customerName: data.customerName,
        companyName: data.companyName || "Khách hàng cá nhân",
        phone: data.phone,
        email: data.email || null,
        installationAddress: data.installationAddress || null,
        location: data.location || "TP. Hồ Chí Minh",
        product: data.product,
        categoryId,
        source: data.source,
        status: data.status,
        salesPersonId,
        createdById: user?.userId,
        estimatedValue: data.estimatedValue || "Đang khảo sát",
        notes: data.notes || "",
        // Đính kèm attachments nếu có
        attachments: data.attachments && data.attachments.length > 0
          ? {
              create: data.attachments.map((att) => ({
                fileName: att.fileName,
                fileUrl: att.fileUrl,
                fileSize: att.fileSize,
                fileType: att.fileType,
                uploadedById: user?.userId,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        salesPerson: true,
        attachments: true,
      },
    });

    // 1. Tạo bản ghi LeadStatusHistory ban đầu
    await prisma.leadStatusHistory.create({
      data: {
        leadId: newLead.id,
        fromStatus: null,
        toStatus: newLead.status,
        reason: "Tiếp nhận Lead mới vào hệ thống",
        changedById: user?.userId || salesPersonId,
      },
    });

    // 2. Tạo bản ghi LeadAssignment ban đầu
    if (salesPersonId) {
      await prisma.leadAssignment.create({
        data: {
          leadId: newLead.id,
          toSalesId: salesPersonId,
          reason: "Phân công xử lý khi tiếp nhận Lead mới",
          assignedById: user?.userId,
        },
      });
    }

    // 3. Ghi AuditLog
    await prisma.auditLog.create({
      data: {
        userId: user?.userId,
        leadId: newLead.id,
        action: "CREATE_LEAD",
        entity: "LEAD",
        entityId: newLead.id,
        details: JSON.stringify({
          code: newLead.code,
          customerName: newLead.customerName,
          product: newLead.product,
          status: newLead.status,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tiếp nhận Lead mới thành công",
      data: {
        lead: {
          id: newLead.id,
          code: newLead.code,
          customerName: newLead.customerName,
          companyName: newLead.companyName,
          phone: newLead.phone,
          email: newLead.email || "",
          product: newLead.product,
          category: newLead.category?.name || "LED trong nhà",
          categoryId: newLead.categoryId,
          source: newLead.source,
          status: newLead.status,
          failureReason: newLead.failureReason,
          estimatedValue: newLead.estimatedValue || "Đang khảo sát",
          installationAddress: newLead.installationAddress || "",
          location: newLead.location,
          notes: newLead.notes || "",
          createdAt: newLead.createdAt.toLocaleDateString("vi-VN"),
          salesPerson: {
            id: newLead.salesPerson?.id,
            name: newLead.salesPerson?.name || "Chưa phân công",
            initials: newLead.salesPerson?.initials || "TT",
          },
          attachments: newLead.attachments,
        },
      },
    });
  } catch (error: any) {
    console.error("POST /api/leads error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi tạo Lead mới" },
      },
      { status: 500 }
    );
  }
}
