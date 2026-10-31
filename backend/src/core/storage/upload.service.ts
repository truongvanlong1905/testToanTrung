import { writeFile, mkdir } from "fs/promises";
import crypto from "crypto";
import path from "path";
import type { UserSession } from "@/src/core/auth/auth";
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
