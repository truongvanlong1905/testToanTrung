import type { UserSession } from "@/src/core/auth/auth";
import {
  callGeminiMultimodal,
  getGeminiConfigStatus,
} from "@/src/core/ai/gemini.adapter";
import { getGeminiApiKey } from "@/src/core/env";
import { AppError } from "@/src/core/http";
import { DesignRequestSchema } from "./contracts";
import { assertCanUseAiDesign } from "./policy";
import { countDesignAuditActions } from "./repository";

export async function listDesignOrders(user: UserSession | null) {
  assertCanUseAiDesign(user);
  return getGeminiConfigStatus();
}

export async function generateDesignOrder(
  user: UserSession | null,
  formData: FormData
) {
  assertCanUseAiDesign(user);

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new AppError(
      503,
      "Chưa cấu hình GEMINI_API_KEY trong môi trường máy chủ.",
      "AI_NOT_CONFIGURED"
    );
  }

  const parsed = DesignRequestSchema.safeParse({
    mode: formData.get("mode"),
    prompt: formData.get("prompt"),
    aspectRatio: formData.get("aspectRatio") || undefined,
    widthMeters: formData.get("widthMeters") || undefined,
    heightMeters: formData.get("heightMeters") || undefined,
    mockupType: formData.get("mockupType") || undefined,
  });

  if (!parsed.success) {
    throw new AppError(
      400,
      parsed.error.issues[0]?.message || "Yêu cầu thiết kế không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const { mode, prompt, aspectRatio, widthMeters, heightMeters, mockupType } =
    parsed.data;
  const image = formData.get("image");
  let inputImage: { mimeType: string; data: string } | null = null;

  if (mode === "mockup") {
    if (
      !(image instanceof File) ||
      !["image/jpeg", "image/png", "image/webp"].includes(image.type)
    ) {
      throw new AppError(
        400,
        "Vui lòng tải ảnh hiện trạng định dạng JPG, PNG hoặc WebP.",
        "IMAGE_REQUIRED"
      );
    }
    if (image.size > 10 * 1024 * 1024) {
      throw new AppError(
        400,
        "Ảnh hiện trạng tối đa 10 MB.",
        "IMAGE_TOO_LARGE"
      );
    }
    inputImage = {
      mimeType: image.type,
      data: Buffer.from(await image.arrayBuffer()).toString("base64"),
    };
  }

  const instruction =
    mode === "storyboard"
      ? `Bạn là chuyên gia quảng cáo màn hình LED của Công ty Toàn Trung Telecom. Viết storyboard tiếng Việt cho video 15 giây với 4-6 cảnh quảng bá thương hiệu/sản phẩm LED Toàn Trung. Mỗi cảnh một dòng, nêu thời lượng, hình ảnh/chuyển động và chữ hiển thị trên màn hình. Tỷ lệ ${aspectRatio || "16:9"}. Ý tưởng: ${prompt}`
      : mode === "mockup"
        ? `Dùng ảnh công trình đính kèm làm ảnh gốc và tạo ảnh phối cảnh thực tế, giữ nguyên bố cục kiến trúc, thêm ${mockupType || "màn hình LED Toàn Trung"} tại vị trí hợp lý. Yêu cầu: ${prompt}`
        : `Tạo một ảnh thiết kế quảng cáo màn hình LED chất lượng cao của Toàn Trung Telecom. Nội dung: ${prompt}. Tỷ lệ ${aspectRatio || "16:9"}, kích thước thực tế ${widthMeters || "8"}m x ${heightMeters || "4.5"}m. Ưu tiên chữ tiếng Việt rõ nét, độ tương phản cao phù hợp hiển thị bảng điện tử LED.`;

  const imageMode = mode !== "storyboard";

  const result = await callGeminiMultimodal({
    instruction,
    imageMode,
    inputImage,
    timeoutMs: 90_000,
  });

  if (!result.ok) {
    if (result.errorType === "TIMEOUT") {
      throw new AppError(
        502,
        "Gemini phản hồi quá lâu. Vui lòng thử lại.",
        "AI_REQUEST_FAILED"
      );
    }
    throw new AppError(
      502,
      `Google AI không xử lý được yêu cầu (${result.lastError || "Lỗi kết nối"}). Vui lòng kiểm tra lại hạn mức tài khoản Google AI Studio.`,
      "AI_PROVIDER_ERROR"
    );
  }

  if (imageMode && !result.imageDataUrl) {
    return {
      text: result.text || "Đã tạo ý tưởng market thành công",
      imageDataUrl: null,
      model: result.usedModel,
      note: "Model trả về nội dung tư vấn thiết kế do chưa bật quyền Image Gen trên tài khoản.",
    };
  }

  if (mode === "storyboard" && !result.text) {
    throw new AppError(
      502,
      "Gemini không trả về nội dung. Vui lòng thử lại.",
      "AI_RESPONSE_EMPTY"
    );
  }

  return {
    text: result.text,
    imageDataUrl: result.imageDataUrl,
    model: result.usedModel,
  };
}

export async function getDesignOrdersCountSnapshot(): Promise<{
  designOrdersCount: number;
}> {
  const designOrdersCount = await countDesignAuditActions();
  return { designOrdersCount };
}
