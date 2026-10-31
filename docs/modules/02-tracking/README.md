# Module M02: Tracking & Đồng Bộ Đa Kênh (`02-tracking`) — Nhóm 2

## 1. Phạm Vi Chức Năng
Module **M02 (`02-tracking`)** quản lý việc thu thập phiên truy cập đa kênh (UTM, nguồn chiến dịch, hành trình trang đích, thiết bị) và đồng bộ dữ liệu từ các nền tảng quảng cáo/nhắn tin bên ngoài:
- Ghi nhận phiên truy cập và hành trình khách hàng (`TrackingSession`).
- Quản lý danh sách nguồn kết nối đồng bộ (`SyncSource`: Google Ads, Meta Lead Ads, Zalo OA, TikTok Business, Website Webhook) và nhật ký đồng bộ (`SyncLog`).
- **Đầu mối thống nhất kết nối nguồn dữ liệu (`EXTERNAL_CONNECTOR_SPECS`)**: M02 định nghĩa trạng thái cấu hình OAuth/Token cho các kênh quảng cáo và cung cấp qua `02-tracking/public.ts` để M03 (`03-ads-keywords`) sử dụng chung, tránh triển khai trùng adapter.
- Phản hồi trung thực (`501 EXTERNAL_CONNECTOR_NOT_CONFIGURED`) khi người dùng bấm kết nối các kênh bên ngoài chưa cấu hình OAuth thật trên máy chủ.

## 2. Đường Dẫn Mã Nguồn
- **Frontend**: [`frontend/src/modules/02-tracking/`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/02-tracking)
  - `components/TrackingView.tsx`, `hooks/useTrackingModule.ts`, `api.ts`, `types.ts`, `index.ts`, `tests/`
- **Backend**: [`backend/src/modules/02-tracking/`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/02-tracking)
  - `service.ts`, `repository.ts`, `policy.ts`, `contracts.ts`, `public.ts`, `tests/`

## 3. Phân Quyền Truy Cập (RBAC Policy)
- **Xem dữ liệu Tracking & Đồng bộ (`GET /api/tracking`, `GET /api/tracking/sync`)**: `ADMIN`, `DIRECTOR`, `MANAGER`, `MARKETING`.
- **Thao tác đồng bộ / Bật tắt kết nối (`POST /api/tracking/sync`)**: `ADMIN`, `DIRECTOR`, `MANAGER`, `MARKETING`.
- **Ghi nhận sự kiện Tracking (`POST /api/tracking`)**: Cho phép phiên đăng nhập hợp lệ hoặc webhook/script có `x-tracking-key` khớp `TRACKING_INGEST_KEY`.

## 4. Hợp Đồng Kết Nối Công Khai (`public.ts`)
- `EXTERNAL_CONNECTOR_SPECS` & `getExternalConnectorStatus(sourceName)`: Cung cấp thông tin cấu hình nguồn dữ liệu cho M03 (`03-ads-keywords`).
- `getTrackingDashboardSnapshot()`: Cung cấp số liệu phiên truy cập và nguồn đồng bộ cho M04 (`04-reports-dashboard`).

## 5. Cách Kiểm Tra & Lỗi Thường Gặp
- **Chạy kiểm thử**: `node scripts/run-tests.mjs`
- **Lỗi thường gặp (`errorCode`)**:
  - `EXTERNAL_CONNECTOR_NOT_CONFIGURED` (`501`): Nguồn đồng bộ bên ngoài (Google Ads / Meta / Zalo / TikTok) chưa được cấu hình biến môi trường OAuth thực tế. Hệ thống giữ nguyên thông báo chưa cấu hình, tuyệt đối không trả kết quả thành công giả.
  - `TRACKING_UNAUTHORIZED` (`401`): Gửi sự kiện tracking không có phiên đăng nhập hoặc thiếu `x-tracking-key`.

