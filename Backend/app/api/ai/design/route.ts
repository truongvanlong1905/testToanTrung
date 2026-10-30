import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const DesignRequestSchema = z.object({
  mode: z.enum(["banner", "storyboard", "mockup"]),
  prompt: z.string().trim().min(5).max(4000),
  aspectRatio: z.string().max(20).optional(),
  widthMeters: z.string().max(20).optional(),
  heightMeters: z.string().max(20).optional(),
  mockupType: z.string().max(200).optional(),
});

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
};

function getGeminiParts(payload: unknown): GeminiPart[] {
  if (!payload || typeof payload !== "object") return [];
  const candidates = (payload as { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> }).candidates;
  return candidates?.[0]?.content?.parts || [];
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      textModel: process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash",
      imageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image",
    },
  });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: { code: "AI_NOT_CONFIGURED", message: "Chưa cấu hình GEMINI_API_KEY trong môi trường máy chủ." } },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const parsed = DesignRequestSchema.safeParse({
      mode: formData.get("mode"),
      prompt: formData.get("prompt"),
      aspectRatio: formData.get("aspectRatio") || undefined,
      widthMeters: formData.get("widthMeters") || undefined,
      heightMeters: formData.get("heightMeters") || undefined,
      mockupType: formData.get("mockupType") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Yêu cầu thiết kế không hợp lệ" } },
        { status: 400 }
      );
    }

    const { mode, prompt, aspectRatio, widthMeters, heightMeters, mockupType } = parsed.data;
    const image = formData.get("image");
    const parts: Array<Record<string, unknown>> = [];
    if (mode === "mockup") {
      if (!(image instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
        return NextResponse.json(
          { success: false, error: { code: "IMAGE_REQUIRED", message: "Vui lòng tải ảnh hiện trạng định dạng JPG, PNG hoặc WebP." } },
          { status: 400 }
        );
      }
      if (image.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: { code: "IMAGE_TOO_LARGE", message: "Ảnh hiện trạng tối đa 10 MB." } },
          { status: 400 }
        );
      }
      parts.push({
        inlineData: {
          mimeType: image.type,
          data: Buffer.from(await image.arrayBuffer()).toString("base64"),
        },
      });
    }

    const instruction = mode === "storyboard"
      ? `Bạn là chuyên gia quảng cáo màn hình LED của Công ty Toàn Trung Telecom. Viết storyboard tiếng Việt cho video 15 giây với 4-6 cảnh quảng bá thương hiệu/sản phẩm LED Toàn Trung. Mỗi cảnh một dòng, nêu thời lượng, hình ảnh/chuyển động và chữ hiển thị trên màn hình. Tỷ lệ ${aspectRatio || "16:9"}. Ý tưởng: ${prompt}`
      : mode === "mockup"
        ? `Dùng ảnh công trình đính kèm làm ảnh gốc và tạo ảnh phối cảnh thực tế, giữ nguyên bố cục kiến trúc, thêm ${mockupType || "màn hình LED Toàn Trung"} tại vị trí hợp lý. Yêu cầu: ${prompt}`
        : `Tạo một ảnh thiết kế quảng cáo màn hình LED chất lượng cao của Toàn Trung Telecom. Nội dung: ${prompt}. Tỷ lệ ${aspectRatio || "16:9"}, kích thước thực tế ${widthMeters || "8"}m x ${heightMeters || "4.5"}m. Ưu tiên chữ tiếng Việt rõ nét, độ tương phản cao phù hợp hiển thị bảng điện tử LED.`;
    parts.push({ text: instruction });

    const imageMode = mode !== "storyboard";
    const primaryModel = imageMode
      ? (process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image")
      : (process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash");

    // Danh sách model thử nghiệm nếu model chính không sẵn sàng
    const candidateModels = imageMode
      ? [primaryModel, "gemini-2.5-flash-image", "gemini-3-pro-image", "gemini-2.0-flash-preview-image-generation"]
      : [primaryModel, "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];

    let lastError: any = null;
    let payload: unknown = null;
    let usedModel = primaryModel;

    for (const model of candidateModels) {
      try {
        usedModel = model;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              ...(imageMode ? { generationConfig: { responseModalities: ["TEXT", "IMAGE"] } } : {}),
            }),
            signal: AbortSignal.timeout(90_000),
          }
        );

        if (response.ok) {
          payload = await response.json();
          break;
        } else {
          const errBody = await response.json().catch(() => ({}));
          lastError = errBody?.error?.message || `HTTP ${response.status}`;
          console.warn(`Model ${model} failed with ${lastError}, trying next...`);
        }
      } catch (e: any) {
        lastError = e?.message || "Connection error";
      }
    }

    if (!payload) {
      console.error("Gemini all candidates failed:", lastError);
      return NextResponse.json(
        { success: false, error: { code: "AI_PROVIDER_ERROR", message: `Google AI không xử lý được yêu cầu (${lastError || "Lỗi kết nối"}). Vui lòng kiểm tra lại hạn mức tài khoản Google AI Studio.` } },
        { status: 502 }
      );
    }

    const responseParts = getGeminiParts(payload);
    const text = responseParts.map((part) => part.text).filter(Boolean).join("\n");
    const imagePart = responseParts.find((part) => part.inlineData?.data && part.inlineData.mimeType);

    if (imageMode && !imagePart?.inlineData) {
      // Nếu model trả về mô tả text nhưng chưa kèm raw image inline
      return NextResponse.json({
        success: true,
        data: {
          text: text || "Đã tạo ý tưởng market thành công",
          imageDataUrl: null,
          model: usedModel,
          note: "Model trả về nội dung tư vấn thiết kế do chưa bật quyền Image Gen trên tài khoản.",
        },
      });
    }

    if (mode === "storyboard" && !text) {
      return NextResponse.json(
        { success: false, error: { code: "AI_RESPONSE_EMPTY", message: "Gemini không trả về nội dung. Vui lòng thử lại." } },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        text,
        imageDataUrl: imagePart?.inlineData
          ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
          : null,
        model: usedModel,
      },
    });
  } catch (error) {
    console.error("POST /api/ai/design error:", error);
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Gemini phản hồi quá lâu. Vui lòng thử lại."
      : "Không thể kết nối dịch vụ Gemini.";
    return NextResponse.json(
      { success: false, error: { code: "AI_REQUEST_FAILED", message } },
      { status: 502 }
    );
  }
}
