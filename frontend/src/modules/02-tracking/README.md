# Module 02: Tracking & Đồng bộ Đa Kênh (`02-tracking` — Nhóm 2)

## Phạm vi nghiệp vụ
- Theo dõi thời gian thực nguồn khách hàng truy cập hệ thống đa website (`toantrungtelecom.com`, `ledtoantrung.vn`, `manhinhledhoitruong.vn`), bóc tách tham số chiến dịch `utm_source`, `utm_medium`, `utm_campaign`, trang đích sản phẩm LED, thiết bị và vị trí địa lý.
- Quản lý và đồng bộ 2 chiều với Google Ads, Google Analytics 4 (GA4), Google Search Console.
- Hỗ trợ giả lập bắn sự kiện Tracking UTM và xuất báo cáo Excel `.xlsx`.

## Cấu trúc thư mục
- `types.ts`: `TrackingEventItem`, `SyncJobItem`, `TrackingOverviewData`.
- `api.ts`: Các hàm gọi `/api/tracking` và `/api/tracking/sync`.
- `hooks/useTrackingModule.ts`: Quản lý danh sách sự kiện Tracking và trạng thái kết nối API.
- `components/TrackingView.tsx`: Giao diện chính của phân hệ Tracking & Đồng bộ.
- `index.ts`: Barrel export công khai.
