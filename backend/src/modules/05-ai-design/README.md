# Module 05: AI Hỗ Trợ Design (`05-ai-design`)

## Phạm vi nghiệp vụ (Nhóm 5)
- AI Design Studio hỗ trợ đội ngũ Thiết kế & Marketing Toàn Trung Telecom tạo nhanh:
  - `banner`: Maquette quảng cáo màn hình LED theo kích thước thực tế (m × m).
  - `storyboard`: Kịch bản phân cảnh TVC LED 15s tiếng Việt.
  - `mockup`: Phối cảnh 3D lắp đặt màn hình LED trực tiếp trên ảnh công trình thực tế.
- Sử dụng adapter kỹ thuật dùng chung `@/src/core/ai/gemini.adapter`.

## Bảng dữ liệu sở hữu (Owned Tables)
- `DesignOrder` (quản lý trạng thái tác vụ AI Design)

## HTTP Endpoints
- `GET /api/ai/design` — Kiểm tra trạng thái cấu hình model Gemini Text & Image.
- `POST /api/ai/design` — Sinh thiết kế / storyboard / phối cảnh mockup bằng Gemini Multimodal.

## Public Exports (`public.ts`)
- `getDesignOrdersCountSnapshot`

## Mã lỗi chuẩn (Error Codes)
- `AI_NOT_CONFIGURED` (503)
- `VALIDATION_ERROR` (400)
- `IMAGE_REQUIRED` (400)
- `IMAGE_TOO_LARGE` (400)
- `AI_PROVIDER_ERROR` (502)
- `AI_RESPONSE_EMPTY` (502)
- `AI_REQUEST_FAILED` (502)
