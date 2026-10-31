# Module 03: Quảng cáo & Phân tích Từ khóa (`03-ads-keywords` — Nhóm 3)

## Phạm vi nghiệp vụ
- Quản lý danh sách chiến dịch quảng cáo đa kênh (`Google Ads`, `Facebook Ads`, `TikTok Ads`, `Zalo Ads`, `SEO`), ngân sách cấp phát, chi tiêu thực tế và tỷ lệ giải ngân.
- Phân tích hiệu suất từ khóa (`Keyword Performance`): lượt hiển thị, lượt nhấp, CTR, CPC trung bình, vị trí trung bình và cảnh báo từ khóa CPC cao cần tối ưu.
- Hỗ trợ xuất báo cáo Excel 3 sheet `.xlsx`.

## Cấu trúc thư mục
- `types.ts`: `CampaignItem`, `KeywordItem`, `AdsStatsSummary`.
- `api.ts`: Các hàm gọi `/api/campaigns`.
- `hooks/useAdsModule.ts`: Quản lý state chiến dịch, từ khóa và bộ lọc.
- `components/AdsView.tsx`: Giao diện chính của phân hệ Quảng cáo & Từ khóa.
- `index.ts`: Barrel export công khai.
