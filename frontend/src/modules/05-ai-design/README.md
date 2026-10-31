# Module 05: AI Hỗ trợ Thiết kế (`05-ai-design` — Nhóm 5)

## Phạm vi nghiệp vụ
- **Banner LED**: Tạo maquette hình ảnh màn hình LED theo tỷ lệ thực tế (`16:9`, `21:9`, `4:3`, `9:16`, `1:1`) và kích thước mét ngang/cao thông qua Gemini API.
- **Storyboard Video 15s**: Sinh kịch bản 4 phân cảnh video quảng cáo LED 3D/Hội trường.
- **Mockup Phối cảnh**: Tải ảnh hiện trạng công trình và ghép phối cảnh màn hình LED thực tế.
- **Recent Jobs (`AiDesignRecentJobsTable.tsx`)**: Theo dõi lịch sử tác vụ thiết kế trong phiên làm việc và mở xem lại kết quả.

## Cấu trúc thư mục
- `types.ts`: `DesignMode`, `AiConfigStatus`, `AiModelConfig`, `DesignJobItem`.
- `api.ts`: Các hàm gọi `/api/ai/design`.
- `hooks/useAiDesignModule.ts`: Quản lý trạng thái cấu hình AI và lịch sử tác vụ.
- `components/`:
  - `AiDesignView.tsx`
  - `AiDesignRecentJobsTable.tsx`
  - `ai-design-presets.ts`
- `index.ts`: Barrel export công khai.
