import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Yêu cầu đăng nhập để tải tệp lên" },
        },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const leadId = formData.get("leadId") as string | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NO_FILE", message: "Vui lòng chọn file tải lên" },
        },
        { status: 400 }
      );
    }

    // Whitelist các định dạng tệp an toàn cho công việc LED & Báo giá
    const ALLOWED_EXTENSIONS = [
      ".jpg", ".jpeg", ".png", ".webp", ".gif",
      ".pdf", ".doc", ".docx", ".xls", ".xlsx",
      ".dwg", ".dxf", ".cad", ".zip", ".rar"
    ];

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FILE_TYPE",
            message: `Định dạng tệp không được phép (${ext}). Chỉ chấp nhận hình ảnh, PDF, tài liệu Office, bản vẽ CAD (.dwg/.dxf) và tệp nén.`,
          },
        },
        { status: 400 }
      );
    }

    // Giới hạn 15MB
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FILE_TOO_LARGE", message: "Kích thước file tối đa 15MB" },
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Thư mục lưu trữ: public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Tên file an toàn kèm timestamp
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueFileName = `${Date.now()}_${baseName}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueFileName}`;

    // Xác định loại file
    let fileType = "DOCUMENT";
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
      fileType = "IMAGE";
    } else if ([".dwg", ".dxf", ".cad"].includes(ext)) {
      fileType = "DRAWING";
    }

    // Nếu có leadId, tạo bản ghi LeadAttachment
    let attachment = null;
    if (leadId) {
      attachment = await prisma.leadAttachment.create({
        data: {
          leadId,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          fileType,
          uploadedById: user?.userId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Tải file thành công",
      data: {
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        fileType,
        attachmentId: attachment?.id,
      },
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "UPLOAD_ERROR", message: "Lỗi tải file lên máy chủ" },
      },
      { status: 500 }
    );
  }
}

