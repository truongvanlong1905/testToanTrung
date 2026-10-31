# Module M04: Dashboard & Báo Cáo (`04-reports-dashboard`) — Nhóm 4

## 1. Phạm Vi Chức Năng
Module **M04 (`04-reports-dashboard`)** đảm nhận hai vai trò chính:
1. **Executive Dashboard (`OverviewView.tsx`)**: Tổng hợp bức tranh điều hành toàn diện từ các module qua giao diện đọc thống nhất (tỷ lệ chuyển đổi phễu Lead, doanh thu dự kiến/chốt, hiệu suất đội ngũ Sales, hiệu quả nguồn Marketing).
2. **Hệ thống Báo cáo & Tờ trình điều hành (`ReportsView.tsx`)**:
   - Soạn thảo, gửi và lưu trữ báo cáo công việc định kỳ (`Tuần`, `Tháng`, `Quý`, `Chiến dịch`, `Tờ trình duyệt giá`).
   - Hiển thị nội dung báo cáo có định dạng cấu trúc (`FormattedReportBody.tsx`) và trạng thái đã đọc/chưa đọc (`PATCH /api/reports/[id]/read`).
   - Nhận thông báo tờ trình tự động từ M01 (khi báo giá vượt trần chiết khấu cần Giám đốc duyệt) và từ Core Admin (khi có quyết định bổ nhiệm nhân sự mới).

## 2. Đường Dẫn Mã Nguồn
- **Frontend**: [`frontend/src/modules/04-reports-dashboard/`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/04-reports-dashboard)
  - `components/`: `OverviewView.tsx`, `ReportsView.tsx`, `FormattedReportBody.tsx`
  - `hooks/useReportsModule.ts`, `api.ts`, `types.ts`, `index.ts`, `tests/`
- **Backend**: [`backend/src/modules/04-reports-dashboard/`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/04-reports-dashboard)
  - `service.ts`, `repository.ts`, `policy.ts`, `contracts.ts`, `public.ts`, `tests/`

## 3. Phân Quyền Truy Cập (RBAC Policy)
- **Xem báo cáo (`GET /api/reports`)**:
  - `ADMIN`, `DIRECTOR`, `MANAGER`: Xem toàn bộ báo cáo hệ thống.
  - Các vai trò khác (`SALES`, `MARKETING`, `DESIGNER`): Chỉ xem báo cáo do chính mình gửi (`author` khớp tên hoặc tài khoản) và các thông báo chung toàn công ty.
- **Gửi báo cáo mới (`POST /api/reports`)**: Mọi nhân sự đã đăng nhập.
- **Đánh dấu đã đọc (`PATCH /api/reports/[id]/read`)**: Người dùng có quyền xem báo cáo đó.

## 4. Hợp Đồng Kết Nối Công Khai (`public.ts`)
- `createSystemReportNotification(input)`: Giao diện công khai duy nhất để M01 (`01-leads`) và `core/admin/promotions.service.ts` tạo bản ghi thông báo/tờ trình trong bảng `Report` mà không truy cập trực tiếp Prisma model `Report`.
- `getReportsDashboardSnapshot()`: Trả về thống kê số lượng báo cáo chưa đọc và báo cáo mới nhất.

## 5. Cách Kiểm Tra & Lỗi Thường Gặp
- **Chạy kiểm thử**: `node scripts/run-tests.mjs`
- **Lỗi thường gặp (`errorCode`)**:
  - `REPORT_REQUIRED_FIELDS` (`400`): Thiếu tiêu đề hoặc nội dung báo cáo.
  - `REPORT_ACCESS_DENIED` (`403`): Cố gắng đánh dấu đã đọc báo cáo nội bộ của nhân sự khác.

