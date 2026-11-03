# Hồ Sơ Quyết Định Nghiệp Vụ & Điểm Chờ BA Xác Nhận (`DECISIONS.md`)

Tài liệu này ghi nhận đầy đủ các quyết định xử lý xung đột nghiệp vụ (`QD-01`, `QD-02`, `QD-03`, `QD-04`) và các điểm dữ liệu chờ BA xác nhận theo đúng **Mục 1, Mục 2 và Mục 7.1** của tài liệu đặc tả **`Prompt_Antigravity_Mini_CRM.md`** (*Prompt cho Antigravity viết lại Mini CRM Toàn Trung*).

---

## 1. Ghi Nhận Trung Thực Về Nguồn Tài Liệu Gốc (Mục 1)

- Khi khảo sát thực tế workspace `d:\HKDN\diua_login_fix_source`, hai tệp gốc `Feebback giao diện.docx` và `FILE BRIEF MINI CRM.docx` **không có mặt trên ổ đĩa workspace**.
- Tuân thủ đúng quy định tại Mục 1 của `Prompt_Antigravity_Mini_CRM.md` (*"Nếu một file chưa có trong workspace, báo đúng file thiếu và tiếp tục khảo sát mã nguồn; không tuyên bố đã đối chiếu nguồn đó"*):
  - Ghi nhận trung thực hai file `.docx` chưa có trong thư mục repo.
  - Triển khai dựa trên toàn bộ nội dung đặc tả đã được tổng hợp chi tiết trong `Prompt_Antigravity_Mini_CRM.md` kết hợp đối chiếu trực tiếp với mã nguồn và cơ sở dữ liệu thực tế (`database/data/source.sqlite`).

---

## 2. Các Quyết Định Xử Lý Xung Đột Nghiệp Vụ (`QD-01` .. `QD-04`)

### `QD-01` — Theo dõi tiến độ báo giá khác với xây chức năng tính giá (Mục 2.1)
- **Nguồn xung đột:** Feedback yêu cầu bỏ giá, báo giá, dự toán, chiết khấu, bảo hành, bỏ cột `"Giá trị & Duyệt giá"`, dự toán `m²`, doanh số chốt và thẻ `"Đang báo giá"`. Trong khi đó, Brief yêu cầu giữ hai trạng thái `"Đang soạn báo giá"`, `"Đã gửi báo giá"` và Báo cáo #5 (*khách đã gửi báo giá nhưng chưa phản hồi*).
- **Cách hiểu tạm thời & Triển khai thực tế:**
  1. **Giữ đúng 5 trạng thái bán hàng chuẩn Brief:** `Vừa nhận thông tin`, `Đang soạn báo giá`, `Đã gửi báo giá`, `Chốt thành công`, `Thất bại`.
  2. **Chỉ ghi nhận sự kiện tiến độ:** Khi nhân viên chuyển sang `Đã gửi báo giá`, hệ thống tự động ghi nhận thời điểm `quoteSentAt` (và cho phép cập nhật trạng thái khách đã phản hồi `customerRespondedAt` / `customerResponseNote`) để phục vụ Báo cáo #5, hoàn toàn không yêu cầu nhập số tiền hay tạo bảng tính giá.
  3. **Khóa và gỡ bỏ toàn bộ bộ tính giá / tiền tệ trên CRM:** Gỡ công cụ tính giá `m²`, chiết khấu %, bảo hành, duyệt giá Giám đốc, cột tiền trên bảng Lead, thẻ `"Đang báo giá"` và các thẻ doanh thu trên Dashboard; khóa API `/api/leads/[id]/quotes` (`403 PRICING_ENGINE_DISABLED`).
  4. **Bảo toàn dữ liệu lịch sử:** Các cột/bảng lịch sử trong SQLite (`LeadQuote`, `value`, `unitPrice`...) được giữ nguyên trong DB qua migration không phá hủy, không xuất ra màn hình/API/Export của CRM.
- **Nội dung cần BA xác nhận:** Xác nhận giữ tên 2 trạng thái `"Đang soạn báo giá"` và `"Đã gửi báo giá"` như sự kiện theo dõi tiến độ thuần túy.

### `QD-02` — Chi phí quảng cáo và CPC trong Module Ads (`03-ads-keywords`) (Mục 2.2)
- **Nguồn xung đột:** Ảnh minh họa Marketing có chi phí quảng cáo và CPC, trong khi Feedback yêu cầu không hiển thị tiền/doanh thu trên CRM bán hàng.
- **Cách hiểu tạm thời & Triển khai thực tế:**
  1. **Loại bỏ hoàn toàn tiền tệ khỏi Dashboard bán hàng (`OverviewView`) và Quản lý Lead (`01-leads`):** Không hiển thị doanh thu chốt, dự toán hay chi phí trên màn hình chung.
  2. **Bảo toàn dữ liệu Ads & Tách bạch chỉ số chuyển đổi:** Giữ nguyên kết nối và dữ liệu `03-ads-keywords` cho bộ phận Marketing/Ads, đồng thời tách rõ 2 chỉ số: **`Chuyển đổi nền tảng Ads` (`platformConversions`)** và **`Lead thực tế ghi nhận CRM` (`crmLeadsFromAds`)** để không gán 2 con số là một.
- **Nội dung cần BA xác nhận:** Xác nhận phạm vi hiển thị cột chi phí/CPC bên trong tab chuyên biệt `Quảng cáo & Từ khóa` (`03-ads-keywords`) dành riêng cho vai trò `MARKETING`/`ADS`/`DIRECTOR`.

### `QD-03` — Loại bỏ hoàn toàn AI khỏi luồng Quản lý Lead (Mục 2.3)
- **Quyết định thực thi (Đã khóa theo đặc tả):**
  - Gỡ bỏ hoàn toàn trợ lý AI đọc nhanh (`AiQuickLeadBar`), tự điền (`AiSmartPasteSection`), AI Copilot và mọi lời gọi LLM trong Module `01-leads`.
  - Khóa endpoint `POST /api/leads/ai-assist` (`403 AI_LEAD_DISABLED`).
  - Việc kiểm tra trùng và phân loại báo cáo được thực hiện 100% bằng quy tắc dữ liệu xác định (deterministic rules) trên server.

### `QD-04` — Giữ ranh giới Module `05-ai-design` chờ khảo sát nghiệp vụ riêng (Mục 2.4)
- **Quyết định thực thi (Đã khóa theo đặc tả):**
  - Không tự mở rộng hay thiết kế lại luồng tạo phối cảnh LED phức tạp (cong, góc vuông, góc tròn, trụ, tam giác, lưới...) khi BA và team AI chưa khảo sát xong.
  - Giữ nguyên ranh giới module `05-ai-design`, chuẩn hóa phân quyền (`DESIGN`, `MARKETING`, `ADMIN`, `DIRECTOR` được phép; `SALES` bị chặn `403`), Việt hóa 100% giao diện và loại bỏ hoàn toàn các thông báo lộ tên biến kỹ thuật (`GEMINI_API_KEY`, `.env`, tên model).

---

## 3. Các Điểm Dữ Liệu & Quy Tắc Chờ BA Cung Cấp / Xác Nhận Thêm (Mục 2.5 & Mục 7.1)

| Mã điểm | Nguồn trong đặc tả | Cách xử lý hiện tại trong hệ thống | Nội dung chờ BA xác nhận / cung cấp |
|---|---|---|---|
| **BA-01** | **Mục 7.1** — Nguồn tự động chỉ có Email mà chưa có Số điện thoại | Form tạo Lead thủ công của nhân viên bắt buộc cả **Tên khách hàng** và **Số điện thoại**. Với luồng đồng bộ tự động (`02-tracking` / webhook) khi chỉ có Email mà chưa có SĐT: hệ thống ghi nhận sự kiện vào `TrackingEvent` ở trạng thái chờ đối soát/bổ sung, **không tự bịa số điện thoại giả** và không làm mất dữ liệu nguồn. | BA xác nhận có cho phép tạo bản ghi nháp trong bảng `Lead` khi nguồn webhook chỉ gửi Email hay giữ tại danh sách chờ đối soát của `02-tracking`. |
| **BA-02** | **Mục 2.5 & 7.2** — Tên sản phẩm `"Bảng Shotlock"` và danh mục mở rộng | Giữ nguyên chính xác tên `"Bảng Shotlock"` trong nhóm `Bảng Điện Tử` đúng theo tài liệu nguồn; lưu danh mục trong bảng `Category` có cấu trúc (`code`, `group`, `displayOrder`) kèm tùy chọn `"Khác"` (có ô nhập `productCustomText`) để dễ dàng cập nhật. | BA xác nhận giữ nguyên cách viết `"Bảng Shotlock"` hay đổi sang `"Bảng Shotclock"` (đồng hồ 24 giây thi đấu) và cung cấp danh mục bổ sung nếu có. |
| **BA-03** | **Mục 2.5 & 7.1** — Danh mục địa bàn TP.HCM sau sáp nhập | Không tự hardcode danh sách quận/phường cũ gắn nhãn mới; trường `installationAddress` và `location` cho phép chọn khu vực (`TP. Hồ Chí Minh`, `Miền Nam`, `Miền Trung`, `Miền Bắc`, tỉnh/thành) kết hợp nhập địa chỉ lắp đặt chi tiết. | BA cung cấp danh mục hành chính TP.HCM sau sáp nhập chính thức để nạp vào bảng danh mục dùng chung. |
| **BA-04** | **Mục 2.5 & Mục 5** — Ma trận phân quyền chi tiết giữa các vai trò | Đã áp dụng kiểm tra quyền chặt chẽ ở cả UI và API theo 6 vai trò thực tế của repo (`ADMIN`, `DIRECTOR`, `MARKETING`, `ADS`, `SALES`, `DESIGN`), đảm bảo `SALES` không thấy Tracking/Ads/AI Design và chỉ xem/sửa Lead trong phạm vi được giao. | BA rà soát bảng ma trận chi tiết tại [`docs/rebuild/PERMISSIONS.md`](file:///d:/HKDN/diua_login_fix_source/diua/docs/rebuild/PERMISSIONS.md) để chốt chính thức quyền xem báo cáo liên phòng ban của `ADMIN` và Trưởng bộ phận. |
