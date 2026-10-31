# Module M05: AI Hỗ Trợ Design (`05-ai-design`) — Nhóm 5

## 1. Phạm Vi Chức Năng
Module **M05 (`05-ai-design`)** cung cấp công cụ **AI Visual Studio** hỗ trợ đội ngũ Thiết kế, Kỹ thuật và Sales tạo nhanh phối cảnh 3D & thông số kỹ thuật lắp đặt màn hình LED / Bảng điện tử cho khách hàng B2B:
- Chọn dòng sản phẩm LED (`ProductCategory`), phong cách không gian (`STYLE_PRESETS`), tỷ lệ khung hình (`ASPECT_RATIOS`: `16:9`, `21:9`, `9:16`, `1:1`) và gợi ý kịch bản (`PROMPT_SUGGESTIONS`).
- Kết nối với Google Gemini qua adapter dùng chung `@/src/core/ai/gemini.adapter` để sinh hình ảnh phối cảnh thực tế (`gemini-2.5-flash-image` / `imagen-3.0-generate-002`) kèm bản thuyết minh kỹ thuật (`gemini-2.5-flash`).
- Lưu trữ lịch sử lệnh thiết kế (`DesignOrder`) và cho phép xem lại, tải ảnh phối cảnh hoặc sao chép thông số kỹ thuật.

## 2. Đường Dẫn Mã Nguồn
- **Frontend**: [`frontend/src/modules/05-ai-design/`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/05-ai-design)
  - `components/`: `AiDesignView.tsx`, `AiDesignRecentJobsTable.tsx`, `ai-design-presets.ts`
  - `hooks/useAiDesignModule.ts`, `api.ts`, `types.ts`, `index.ts`, `tests/`
- **Backend**: [`backend/src/modules/05-ai-design/`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/05-ai-design)
  - `service.ts`, `repository.ts`, `policy.ts`, `contracts.ts`, `public.ts`, `tests/`

## 3. Phân Quyền Truy Cập (RBAC Policy)
- **Xem danh sách & Tạo thiết kế AI (`GET`, `POST /api/ai/design`)**: Cho phép nhân sự nội bộ đã xác thực (`ADMIN`, `DIRECTOR`, `MANAGER`, `DESIGNER`, `MARKETING`, `SALES`).

## 4. Hợp Đồng Kết Nối Công Khai (`public.ts`)
- `getDesignOrdersCountSnapshot()`: Cung cấp số lượng yêu cầu thiết kế cho thống kê hệ thống.
- Sử dụng `@/src/core/ai/gemini.adapter` làm cầu nối kỹ thuật tới Gemini API; toàn bộ prompt kỹ thuật LED và lưu trữ `DesignOrder` nằm gọn trong M05.

## 5. Cách Kiểm Tra & Lỗi Thường Gặp
- **Chạy kiểm thử**: `node scripts/run-tests.mjs`
- **Lỗi thường gặp (`errorCode`)**:
  - `AI_PROVIDER_MISSING_KEY` (`503`): Máy chủ chưa cấu hình `GEMINI_API_KEY`.
  - `DESIGN_PROMPT_REQUIRED` (`400`): Yêu cầu tạo thiết kế thiếu mô tả `prompt` hoặc tên khách hàng `customerName`.
  - `AI_PROVIDER_QUOTA_OR_TIMEOUT` (`502` / `504`): Gemini API hết hạn mức hoặc phản hồi quá thời gian chờ.

