# Module 03: Ads & Phân Tích Từ Khóa (`03-ads-keywords`)

## Phạm vi nghiệp vụ (Nhóm 3)
- Quản lý danh sách chiến dịch quảng cáo đa nền tảng (`Google Ads`, `Facebook Ads`, `TikTok Ads`, `Zalo Ads`, `SEO`).
- Theo dõi hiệu quả ngân sách, chi phí đã tiêu, CTR, CPC và danh sách từ khóa chuyển đổi (`KeywordMetric`).
- Tái sử dụng trạng thái kết nối từ `02-tracking/public` (`getExternalConnectorStatus`).

## Bảng dữ liệu sở hữu (Owned Tables)
- `MarketingCampaign` (`AdCampaign` / `AdMetric`)
- `KeywordMetric` (`Keyword`)

## HTTP Endpoints
- `GET /api/campaigns` — Danh sách chiến dịch, từ khóa và tổng hợp chỉ số hiệu quả.
- `POST /api/campaigns` — Khởi tạo chiến dịch quảng cáo mới (RBAC: `ADS`, `DIRECTOR`, `ADMIN`).
- `PATCH /api/campaigns` — Cập nhật ngân sách hoặc trạng thái chiến dịch.

## Public Exports (`public.ts`)
- `searchAdsPublic`
- `getAdsDashboardSnapshot`

## Mã lỗi chuẩn (Error Codes)
- `FORBIDDEN` (403)
- `VALIDATION_ERROR` (400)
- `DUPLICATE_CAMPAIGN_CODE` (409)
