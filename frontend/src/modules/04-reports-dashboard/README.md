# Module 04: Dashboard & Báo cáo Điều hành (`04-reports-dashboard` — Nhóm 4)

## Phạm vi nghiệp vụ
- **Dashboard Tổng quan (`OverviewView.tsx`)**: Hiển thị biểu đồ xu hướng Lead theo thời gian, phễu chuyển đổi 5 trạng thái, tỷ trọng nguồn khách hàng, chiến dịch Marketing thực tế, hiệu suất nhân sự Sales, luồng hoạt động gần đây và hàng đợi việc cần xử lý.
- **Trung tâm Báo cáo (`ReportsView.tsx` + `FormattedReportBody.tsx`)**: Soạn thảo và lưu trữ văn bản báo cáo điều hành giữa Ban Giám Đốc và các phòng ban (`Sales`, `Marketing`, `Ads`, `Design`), đính kèm tài liệu, kết xuất biểu mẫu Markdown chuẩn A4 và xuất báo cáo Excel 4 sheet `.xlsx`.

## Cấu trúc thư mục
- `types.ts`: `ReportItem`, `OverviewStats`, `PromotionItem`.
- `api.ts`: Các hàm gọi `/api/reports`, `/api/reports/[id]/read`, `/api/promotions`.
- `hooks/useReportsModule.ts`: Quản lý danh sách báo cáo phòng ban và trạng thái đã đọc.
- `components/`:
  - `OverviewView.tsx`
  - `ReportsView.tsx`
  - `FormattedReportBody.tsx`
- `index.ts`: Barrel export công khai.
