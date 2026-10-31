# Module 02: Tracking & Đồng Bộ Đa Kênh (`02-tracking`)

## Phạm vi nghiệp vụ (Nhóm 2)
- Thu thập sự kiện UTM / Phễu truy cập từ các website vệ tinh (`toantrungtelecom.com`, `ledtoantrung.vn`) với kiểm soát CORS Origin & Rate Limiting.
- Quản lý cấu hình kết nối và lịch sử đồng bộ (`SyncJob`) từ các nền tảng quảng cáo/analytics bên ngoài (`GOOGLE_ADS`, `GA4`, `SEARCH_CONSOLE`).

## Bảng dữ liệu sở hữu (Owned Tables)
- `TrackingEvent` (TrackingSession / Event)
- `SyncJob` (SyncSource / SyncLog)

## HTTP Endpoints
- `OPTIONS /api/tracking` — Preflight CORS cho tracking script.
- `GET /api/tracking` — Tổng quan sự kiện tracking, thống kê theo website và danh sách `syncJobs`.
- `POST /api/tracking` — Ghi nhận sự kiện UTM / truy cập từ website.
- `POST /api/tracking/sync` — Kiểm tra và kích hoạt tác vụ đồng bộ dữ liệu ngoại vi.

## Public Exports (`public.ts`)
- `EXTERNAL_CONNECTOR_SPECS`
- `getExternalConnectorStatus`
- `getTrackingDashboardSnapshot`

## Mã lỗi chuẩn (Error Codes)
- `ORIGIN_NOT_ALLOWED` (403)
- `TOO_MANY_REQUESTS` (429)
- `VALIDATION_ERROR` (400)
- `NOT_CONFIGURED` (400)
- `ERROR` (501 - Adapter đồng bộ trực tiếp chưa triển khai)
