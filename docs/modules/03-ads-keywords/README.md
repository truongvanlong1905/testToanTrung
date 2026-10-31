# Module M03: Ads & Phân Tích Từ Khóa (`03-ads-keywords`) — Nhóm 3

## 1. Phạm Vi Chức Năng
Module **M03 (`03-ads-keywords`)** quản lý hiệu quả ngân sách chiến dịch quảng cáo (`AdCampaign`), chỉ số hiệu suất theo thời gian (`AdMetric`) và bộ từ khóa tìm kiếm B2B (`Keyword`):
- Theo dõi ngân sách, chi tiêu (`spent`), số lượt hiển thị (`impressions`), lượt nhấp (`clicks`), số Lead thu về (`leadsCount`), doanh thu quy đổi (`revenue`), CPL và ROAS.
- Khởi tạo chiến dịch quảng cáo mới và điều chỉnh ngân sách hoặc tạm dừng/kích hoạt chiến dịch (`PATCH /api/campaigns`).
- Phân tích hiệu quả từ khóa tìm kiếm (Search Volume, CPC, Quality Score, Conversion Rate).
- Liên kết với M02 (`02-tracking/public.ts`) để đọc trạng thái kết nối nguồn quảng cáo thống nhất.

## 2. Đường Dẫn Mã Nguồn
- **Frontend**: [`frontend/src/modules/03-ads-keywords/`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/03-ads-keywords)
  - `components/AdsView.tsx`, `hooks/useAdsModule.ts`, `api.ts`, `types.ts`, `index.ts`, `tests/`
- **Backend**: [`backend/src/modules/03-ads-keywords/`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/03-ads-keywords)
  - `service.ts`, `repository.ts`, `policy.ts`, `contracts.ts`, `public.ts`, `tests/`

## 3. Phân Quyền Truy Cập (RBAC Policy)
- **Xem chiến dịch & từ khóa (`GET /api/campaigns`)**: `ADMIN`, `DIRECTOR`, `MANAGER`, `MARKETING`.
- **Tạo mới hoặc điều chỉnh ngân sách/trạng thái chiến dịch (`POST`, `PATCH /api/campaigns`)**: `ADMIN`, `DIRECTOR`, `MANAGER`, `MARKETING`.

## 4. Hợp Đồng Kết Nối Công Khai (`public.ts`)
- `searchAdsPublic(query)`: Cho phép `core/admin/search.service.ts` tìm kiếm nhanh chiến dịch quảng cáo và từ khóa trên thanh tìm kiếm toàn cục.
- `getAdsDashboardSnapshot()`: Cung cấp tổng ngân sách, chi tiêu và số chiến dịch đang chạy cho M04 (`04-reports-dashboard`).

## 5. Cách Kiểm Tra & Lỗi Thường Gặp
- **Chạy kiểm thử**: `node scripts/run-tests.mjs`
- **Lỗi thường gặp (`errorCode`)**:
  - `INVALID_CAMPAIGN_BUDGET` (`400`): Ngân sách hoặc chi tiêu chiến dịch không hợp lệ (số âm hoặc vượt giới hạn).
  - `CAMPAIGN_NOT_FOUND` (`404`): Không tìm thấy chiến dịch cần cập nhật.

