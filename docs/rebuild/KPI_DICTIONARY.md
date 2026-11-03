# Từ Điển Chỉ Số KPI & Báo Cáo (KPI Dictionary) — Mini CRM Toàn Trung

Tài liệu này định nghĩa chính xác nguồn dữ liệu, công thức tính và phạm vi lọc cho toàn bộ thẻ KPI Dashboard, chỉ số Module Ads và 10 báo cáo chuẩn trong Module `04-reports-dashboard`.

---

## 1. Thẻ KPI Tổng Quan (Dashboard Overview Cards)

Nguồn xử lý: [`backend/src/modules/04-reports-dashboard/service.ts`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/04-reports-dashboard/service.ts) & [`frontend/src/modules/04-reports-dashboard/components/OverviewView.tsx`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/04-reports-dashboard/components/OverviewView.tsx).

| Tên chỉ số hiển thị | Trường API | Công thức & Điều kiện lọc | Ghi chú phạm vi |
|---|---|---|---|
| **Tổng Lead** | `leadCount` | `COUNT(Lead)` theo bộ lọc thời gian (`from`, `to`) và phạm vi quyền của vai trò | `SALES` chỉ tính các Lead có `assignedToId == actor.id`; các vai trò quản lý tính toàn hệ thống |
| **Đã chốt thành công** | `closedCount` | `COUNT(Lead)` có `status == 'Chốt thành công'` trong tập Lead hợp lệ | Không quy đổi ra doanh thu hay giá trị tiền tệ (`VNĐ`) |
| **Chưa phân công** | `unassignedCount` | `COUNT(Lead)` có `assignedToId IS NULL` và `status != 'Thất bại'` | Cảnh báo cho `ADMIN`, `DIRECTOR`, `MARKETING` để điều phối kịp thời |
| **Phản hồi TB (phút)** | `avgResponseMinutes` | Trung bình cộng `(firstContactAt - COALESCE(assignedAt, createdAt))` tính bằng phút cho các Lead đã có `firstContactAt` | Dùng cho SLA phản hồi của đội ngũ Sales |

> **Lưu ý tuân thủ QD-01:** Toàn bộ thẻ `"Doanh thu chốt"`, `"Doanh thu dự kiến"`, `"Tổng giá trị báo giá"`, và thẻ `"Đang báo giá"` đã được gỡ bỏ hoàn toàn khỏi Dashboard.

---

## 2. Chỉ Số Module Ads & Từ Khóa (`03-ads-keywords`)

Nguồn xử lý: [`backend/src/modules/03-ads-keywords/service.ts`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/03-ads-keywords/service.ts) & [`frontend/src/modules/03-ads-keywords/components/AdsView.tsx`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/03-ads-keywords/components/AdsView.tsx).

| Tên chỉ số | Trường dữ liệu | Định nghĩa & Công thức | Phân biệt nghiệp vụ (QD-02) |
|---|---|---|---|
| **Chuyển đổi nền tảng Ads** | `platformConversions` (hoặc `conversions` từ `AdMetric`) | Tổng lượt chuyển đổi do nền tảng quảng cáo (Google Ads / Meta Ads / TikTok Ads) báo cáo trên các chiến dịch/từ khóa | Phản ánh tín hiệu sự kiện trên trình quản lý quảng cáo (click nút gọi, gửi form, nhắn Zalo...) |
| **Lead thực tế ghi nhận CRM** | `crmLeadsFromAds` | `COUNT(Lead)` thực tế lưu trong bảng `Lead` có nguồn thuộc kênh Ads hoặc gắn `utmCampaign` / `gclid` | Phản ánh số khách hàng tiềm năng thực sự đi vào quy trình chăm sóc của Sales |
| **Chi phí quảng cáo** | `spend` (`totalSpend`) | `SUM(AdMetric.spend)` trong kỳ lọc | Chỉ hiển thị trong phạm vi Module Ads & Báo cáo Marketing |
| **Lượt hiển thị (Impressions)** | `impressions` | `SUM(AdMetric.impressions)` | Đánh giá độ phủ chiến dịch |
| **Lượt nhấp (Clicks) & CTR** | `clicks`, `ctr` | `CTR = (SUM(clicks) / SUM(impressions)) * 100` | Đánh giá mức độ hấp dẫn của mẫu quảng cáo/từ khóa |
| **CPC trung bình** | `cpc` | `SUM(spend) / SUM(clicks)` | Chi phí trung bình trên mỗi lượt nhấp |
| **CPL (Chi phí / Lead CRM)** | `cpl` | `SUM(spend) / crmLeadsFromAds` (nếu `crmLeadsFromAds > 0`) | Đo hiệu quả thực tế theo số Lead vào CRM |

---

## 3. Danh Mục 10 Báo Cáo Chuẩn (`04-reports-dashboard`)

Nguồn xử lý: [`backend/src/modules/04-reports-dashboard/service.ts`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/04-reports-dashboard/service.ts) & [`frontend/src/modules/04-reports-dashboard/components/ReportsView.tsx`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/04-reports-dashboard/components/ReportsView.tsx).

| Mã số | Tên báo cáo chuẩn | Đầu vào dữ liệu | Công thức & Chỉ số đầu ra |
|---|---|---|---|
| **BC-01** | **1. Thời gian phản hồi của Sales từ lúc nhận thông tin** | `Lead.createdAt`, `Lead.assignedAt`, `Lead.firstContactAt`, `Lead.assignedToId` | Tính số phút từ `COALESCE(assignedAt, createdAt)` đến `firstContactAt` theo từng Sales và từng Lead; phân loại SLA: `< 15 phút` (Tốt), `15 - 60 phút` (Đạt), `> 60 phút` hoặc chưa liên hệ (Trễ). |
| **BC-02** | **2. Hiệu quả chuyển đổi của từng nhân viên Sales** | `Lead.assignedToId`, `Lead.status` | Theo từng Sales: `Tổng Lead nhận`, `Vừa nhận thông tin`, `Đang soạn báo giá`, `Đã gửi báo giá`, `Chốt thành công`, `Thất bại`, và `Tỷ lệ chốt (%) = (Chốt thành công / Tổng Lead nhận) * 100`. |
| **BC-03** | **3. Nhóm hàng nhận được nhiều thông tin nhất** | `Lead.productCategory` (21 sản phẩm chuẩn) | Thống kê số lượng Lead (`count`), tỷ trọng (`%`), số lượng chốt thành công và tỷ lệ chuyển đổi theo từng danh mục sản phẩm Toàn Trung. |
| **BC-04** | **4. Khu vực phát sinh nhiều khách hàng tiềm năng nhất** | `Lead.region`, `Lead.province` | Thống kê số lượng Lead và tỷ lệ chốt theo từng Tỉnh/Thành phố (`province`) và Vùng miền (`Miền Bắc`, `Miền Trung`, `Miền Nam`, `TP.HCM`). |
| **BC-05** | **5. Thời gian khách phản hồi sau khi nhận báo giá** | `Lead.quoteSentAt`, `Lead.customerRespondedAt`, `Lead.customerResponseNote` | Tính thời gian chờ khách phản hồi `customerRespondedAt - quoteSentAt` (phút/giờ) cho các Lead đã gửi báo giá; liệt kê trạng thái phản hồi và ghi chú phản hồi của khách hàng (không chứa số tiền). |
| **BC-06** | **6. Thời gian trung bình để chốt thành công 1 đơn hàng** | `Lead.createdAt`, `Lead.closedAt`, `Lead.status == 'Chốt thành công'` | Tính chu kỳ chốt đơn `closedAt - createdAt` (theo giờ/ngày) trung bình toàn hệ thống, theo từng Sales và theo từng nhóm sản phẩm. |
| **BC-07** | **7. Tỷ lệ chuyển đổi theo từng nguồn khách hàng** | `Lead.source`, `Lead.status` | Theo từng nguồn (`Google Ads`, `Facebook Ads`, `Zalo OA`, `Website Form`, `Hotline`, `Tự tìm kiếm`, `Giới thiệu`, `Khách cũ`...): Tổng Lead, Đã gửi báo giá, Chốt thành công, Thất bại, Tỷ lệ chốt (`%`). |
| **BC-08** | **8. Thống kê các lý do khách không chốt** | `Lead.status == 'Thất bại'`, `Lead.lossReasonCode`, `Lead.lossReasonNote` | Gom nhóm theo mã lý do chuẩn (`Giá chưa phù hợp`, `Chọn đối thủ khác`, `Tạm hoãn dự án`, `Không liên hệ được`, `Sai nhu cầu / Spam`, `Thời gian giao hàng`, `Khác`) kèm tỷ trọng `%`. |
| **BC-09** | **9. Khung giờ khách hàng tương tác nhiều nhất** | `Lead.createdAt`, `Interaction.createdAt` | Phân bổ mật độ phát sinh Lead và tương tác theo 24 khung giờ trong ngày (`00:00 - 23:59`) và các ca làm việc (`Sáng 07-11h`, `Trưa 11-13h`, `Chiều 13-17h`, `Tối 17-22h`, `Đêm 22-07h`). |
| **BC-10** | **10. Lịch sử tương tác trước đó để nắm bắt hành vi khách** | `Lead`, `Interaction`, `LeadActivity`, `utmSource`, `utmCampaign`, `landingPage` | Chuỗi hành trình khách hàng từ điểm chạm đầu tiên (chiến dịch, trang đích, thiết bị) qua các lần gọi/nhắn Zalo/gửi tài liệu đến trạng thái hiện tại, kèm tổng số điểm chạm (`touchpoints`). |
