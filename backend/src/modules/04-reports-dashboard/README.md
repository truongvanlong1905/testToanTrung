# Module 04: Dashboard & Báo Cáo (`04-reports-dashboard`)

## Phạm vi nghiệp vụ (Nhóm 4)
- Quản lý thông báo điều hành của Ban Giám Đốc / Quản trị và báo cáo từ các phòng ban (`DepartmentReport`, `DepartmentReportRead`).
- Tổng hợp số liệu Dashboard thông qua các public interface (`@/src/modules/01-leads/public`, `@/src/modules/02-tracking/public`, `@/src/modules/03-ads-keywords/public`).

## Bảng dữ liệu sở hữu (Owned Tables)
- `DepartmentReport` (`Report`)
- `DepartmentReportRead`

## HTTP Endpoints
- `GET /api/reports` — Danh sách thông báo & báo cáo theo phân quyền hiển thị + số lượng chưa đọc.
- `POST /api/reports` — Gửi báo cáo phòng ban hoặc phát thông báo toàn hệ thống.
- `PATCH /api/reports` — Đánh dấu đã đọc toàn bộ thông báo.
- `PATCH /api/reports/[id]/read` — Đánh dấu đã đọc một thông báo cụ thể.

## Public Exports (`public.ts`)
- `createSystemReportNotification`
- `getReportsDashboardSnapshot`

## Mã lỗi chuẩn (Error Codes)
- `UNAUTHORIZED` (401)
- `VALIDATION_ERROR` (400)
- `NOT_FOUND` (404)
