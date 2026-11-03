import { writeFile, mkdir } from "fs/promises";
import crypto from "crypto";
import path from "path";
import {
  canUserAccessLeadRecord,
  type UserSession,
} from "@/src/core/auth/auth";
import { prisma } from "@/src/core/db/prisma";
import { getUploadMaxBytes } from "@/src/core/env";
import { AppError } from "@/src/core/http";
import { attachUploadedFileToLead } from "@/src/modules/01-leads/public";

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".dwg",
  ".dxf",
  ".cad",
  ".zip",
  ".rar",
];

/**
 * Kiểm tra chữ ký byte thật (Magic Bytes) để ngăn tải lên mã độc giả danh file ảnh/PDF
 */
export function hasValidFileSignature(ext: string, buf: Buffer): boolean {
  if (buf.length < 4) return false;
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case ".png":
      return (
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47
      );
    case ".gif":
      return (
        buf[0] === 0x47 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x38
      );
    case ".webp":
      return (
        buf.length >= 12 &&
        buf.toString("ascii", 0, 4) === "RIFF" &&
        buf.toString("ascii", 8, 12) === "WEBP"
      );
    case ".pdf":
      return buf.toString("ascii", 0, 4) === "%PDF";
    case ".zip":
    case ".docx":
    case ".xlsx":
      return buf[0] === 0x50 && buf[1] === 0x4b;
    default:
      if (buf[0] === 0x4d && buf[1] === 0x5a) return false;
      const headText = buf
        .subarray(0, Math.min(buf.length, 512))
        .toString("utf8")
        .toLowerCase();
      if (
        headText.includes("<script") ||
        headText.includes("<?php") ||
        headText.includes("<html")
      ) {
        return false;
      }
      return true;
  }
}

export async function verifyAttachmentAccess(
  user: UserSession | null,
  params: { attachmentId?: string | null; fileUrl?: string | null }
) {
  if (!user) {
    throw new AppError(401, "Yêu cầu đăng nhập để xem tệp đính kèm", "UNAUTHORIZED");
  }

  const attachment = await prisma.leadAttachment.findFirst({
    where: params.attachmentId
      ? { id: params.attachmentId }
      : params.fileUrl
        ? { fileUrl: params.fileUrl }
        : { id: "__none__" },
    include: {
      lead: {
        select: {
          id: true,
          code: true,
          salesPersonId: true,
          createdById: true,
        },
      },
    },
  });

  if (!attachment) {
    throw new AppError(404, "Không tìm thấy tệp đính kèm", "NOT_FOUND");
  }

  if (
    !canUserAccessLeadRecord(user, {
      salesPersonId: attachment.lead.salesPersonId,
      createdById: attachment.lead.createdById,
    })
  ) {
    throw new AppError(
      403,
      "Bạn không có quyền truy cập tệp đính kèm của hồ sơ Lead này",
      "FORBIDDEN"
    );
  }

  return {
    attachment: {
      id: attachment.id,
      leadId: attachment.leadId,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileSize: attachment.fileSize,
      fileType: attachment.fileType,
      createdAt: attachment.createdAt.toISOString(),
    },
  };
}

export async function handleFileUpload(
  user: UserSession | null,
  formData: FormData
) {
  if (!user) {
    throw new AppError(401, "Yêu cầu đăng nhập để tải tệp lên", "UNAUTHORIZED");
  }

  const file = formData.get("file") as File | null;
  const leadId = formData.get("leadId") as string | null;

  if (!file) {
    throw new AppError(400, "Vui lòng chọn file tải lên", "NO_FILE");
  }

  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, salesPersonId: true, createdById: true },
    });
    if (!lead) {
      throw new AppError(404, "Không tìm thấy hồ sơ Lead cần đính kèm tệp", "NOT_FOUND");
    }
    if (!canUserAccessLeadRecord(user, lead)) {
      throw new AppError(
        403,
        "Bạn không có quyền đính kèm tệp vào hồ sơ Lead của nhân sự khác",
        "FORBIDDEN"
      );
    }
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new AppError(
      400,
      `Định dạng tệp không được phép (${ext}). Chỉ chấp nhận hình ảnh, PDF, tài liệu Office, bản vẽ CAD (.dwg/.dxf) và tệp nén.`,
      "INVALID_FILE_TYPE"
    );
  }

  const maxBytes = getUploadMaxBytes();
  if (file.size > maxBytes) {
    throw new AppError(400, "Kích thước file tối đa 15MB", "FILE_TOO_LARGE");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!hasValidFileSignature(ext, buffer)) {
    throw new AppError(
      400,
      "Nội dung tệp không khớp với định dạng khai báo hoặc chứa mã không an toàn.",
      "FILE_SIGNATURE_MISMATCH"
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const baseName = path
    .basename(file.name, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 50);
  const randomSuffix = crypto.randomBytes(6).toString("hex");
  const uniqueFileName = `${Date.now()}_${randomSuffix}_${baseName}${ext}`;
  const filePath = path.join(uploadDir, uniqueFileName);

  await writeFile(filePath, buffer);

  const fileUrl = `/uploads/${uniqueFileName}`;

  let fileType = "DOCUMENT";
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) {
    fileType = "IMAGE";
  } else if ([".dwg", ".dxf", ".cad"].includes(ext)) {
    fileType = "DRAWING";
  }

  let attachment = null;
  if (leadId) {
    attachment = await attachUploadedFileToLead({
      leadId,
      fileName: file.name,
      fileUrl,
      fileSize: file.size,
      fileType,
      uploadedById: user.userId,
    });
  }

  return {
    message: "Tải file thành công",
    data: {
      fileName: file.name,
      fileUrl,
      fileSize: file.size,
      fileType,
      attachmentId: attachment?.id,
    },
  };
}
