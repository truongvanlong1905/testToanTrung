# ĐỀ XUẤT GIẢI PHÁP
## Hệ thống Marketing Management — Toàn Trung

**Phiên bản:** Dự thảo 0.1  
**Mục đích:** Tài liệu thảo luận và chốt scope với BA/IT  
**Trạng thái:** Chưa phải baseline phê duyệt  
**Ngày:** 30/10/2026

---

## 1. Tóm tắt

Đề xuất sử dụng một hệ thống tập trung để quản lý Lead xuyên suốt từ tiếp nhận, kiểm tra trùng, phân công Sales, theo dõi tiến độ đến tổng hợp kết quả; đồng thời cung cấp các công cụ quản lý chiến dịch/tracking, báo cáo phòng ban và hỗ trợ AI Design.

Dự án hiện đã có nền tảng Next.js/React/TypeScript, API, Prisma/SQLite, các màn hình và API cho nhiều module nêu trên. Proposal này tập trung xác nhận phạm vi nghiệp vụ, chuẩn hóa luồng xử lý và thống nhất hướng production. Các số liệu về hiệu quả kinh doanh, quy mô người dùng, timeline và ngân sách chưa có dữ liệu xác thực nên không được giả định trong tài liệu.

## 2. Mục tiêu đề xuất

- Tập trung thông tin Lead và lịch sử xử lý trong một nơi.
- Hỗ trợ phối hợp Marketing–Sales với trạng thái, người phụ trách và lịch sử bàn giao rõ ràng.
- Theo dõi nguồn Lead và chiến dịch để hỗ trợ phân tích hiệu quả marketing.
- Chuẩn hóa báo cáo phòng ban và dashboard.
- Hỗ trợ quy trình sáng tạo nội dung với AI khi cấu hình dịch vụ được phê duyệt.
- Tạo nền tảng có thể vận hành production với dữ liệu, file, backup và quyền truy cập được quản trị.

## 3. Phạm vi chức năng dự kiến

1. Đăng nhập, hồ sơ, người dùng và phân quyền.
2. Tiếp nhận, tìm kiếm, lọc, cảnh báo trùng và quản lý vòng đời Lead.
3. Phân công/bàn giao Lead; lưu lịch sử trạng thái, assignment và tệp đính kèm.
4. Dashboard KPI và báo cáo Lead.
5. Theo dõi chiến dịch, từ khóa, tracking UTM và trạng thái đồng bộ.
6. Báo cáo phòng ban và trạng thái đã đọc.
7. AI Design: banner, storyboard và mockup.
8. Quản lý danh mục sản phẩm, cấu hình thương hiệu, tìm kiếm toàn hệ thống và audit.

Chi tiết module, căn cứ hiện trạng và điểm cần xác nhận: [Phạm vi, công nghệ và lưu trữ dữ liệu](./01-scope-and-technology.md).

## 4. Kiến trúc và công nghệ

Kiến trúc hiện tại gồm Frontend Next.js, Backend/API Next.js và workspace Database dùng Prisma với SQLite. Web proxy `/api/*` và `/uploads/*` tới API. Xác thực dùng JWT trong HttpOnly cookie; Gemini được gọi phía API nếu cấu hình.

**Đề xuất:** giữ stack hiện tại cho POC/MVP nếu đáp ứng yêu cầu; trước production, BA/IT đánh giá chuyển database sang PostgreSQL managed và file sang object storage/persistent storage. Quyết định cuối cùng phụ thuộc hạ tầng, chi phí, tải đồng thời, chính sách dữ liệu và vận hành. Cần thiết kế backup/restore, secret management, retention và quyền truy cập trước khi go-live.

## 5. Quy trình và sơ đồ

Bộ sơ đồ kèm theo gồm:

- Sơ đồ ngữ cảnh hệ thống.
- BPMN dự thảo cho quy trình hiện tại (As-Is giả định) và quy trình đề xuất (To-Be).
- DFD Level 0 và Level 1.
- Use Case.
- Sequence tạo Lead, kiểm tra trùng và bàn giao.
- Activity vòng đời Lead.

**Điều kiện:** BPMN As-Is cần phỏng vấn BA/Marketing/Sales để thay thế giả định bằng quy trình thực tế; To-Be cần được nghiệp vụ duyệt trước khi dùng làm đặc tả triển khai.

## 6. Giao diện mẫu

Wireframe kèm theo bao gồm Dashboard, danh sách/tạo Lead, chi tiết Lead, Ads analytics, tracking, báo cáo phòng ban và AI Design. Đây là mẫu low-fidelity để xác nhận thông tin cần hiển thị và thao tác; chưa phải thiết kế visual final.

## 7. Rủi ro và phụ thuộc

| Rủi ro / phụ thuộc | Ảnh hưởng | Hướng xử lý |
|---|---|---|
| Quy trình As-Is chưa được xác nhận | Sai scope hoặc thiếu bước nghiệp vụ | Workshop BA với người dùng thực tế; ký xác nhận BPMN |
| Role trong tài liệu và schema chưa thống nhất | Lộ dữ liệu hoặc chặn nhầm thao tác | Phê duyệt ma trận role/permission và kiểm thử |
| SQLite/file local chưa được xác nhận phù hợp production | Mất dữ liệu, giới hạn vận hành khi triển khai | Chốt kiến trúc production, backup/restore và migration |
| Trạng thái tích hợp Ads/Analytics chưa rõ | Dashboard có thể thiếu hoặc sai số liệu | Xác minh credentials, API, quota, mapping và nguồn dữ liệu |
| Gemini phụ thuộc dịch vụ/chi phí bên ngoài | Tính năng có thể không khả dụng hoặc phát sinh phí | Phê duyệt use case, budget, giới hạn và cơ chế lỗi |
| Thiếu tải, SLA, retention và RPO/RTO | Không thể chốt cấu hình hạ tầng | IT/Business xác định tiêu chí phi chức năng |

## 8. Kế hoạch đề xuất

| Giai đoạn | Kết quả | Điều kiện bắt đầu |
|---|---|---|
| 1. Workshop & xác nhận scope | Biên bản BA/IT, BPMN được duyệt, role matrix, tiêu chí nghiệm thu | Có BA, IT và đại diện Marketing/Sales |
| 2. Gap analysis | Danh sách chênh lệch giữa baseline hiện có và scope được duyệt | Scope được chốt |
| 3. Hoàn thiện MVP | Phát triển các gap ưu tiên, xử lý migration/integration theo quyết định | Có ưu tiên, môi trường và dữ liệu kiểm thử |
| 4. UAT & readiness | Biên bản UAT, kiểm tra bảo mật/backup/restore, runbook | Tính năng và môi trường staging sẵn sàng |
| 5. Go-live có kiểm soát | Vận hành, giám sát, hỗ trợ và đánh giá sau triển khai | Business Owner/IT phê duyệt go-live |

Timeline, ngân sách và nhân sự cần được lập sau khi chốt scope, tích hợp và hạ tầng.

## 9. Quyết định cần phê duyệt

1. Module nào thuộc MVP, module nào để giai đoạn sau?
2. BPMN As-Is và To-Be có đúng quy trình thực tế không?
3. Role chính thức và phạm vi dữ liệu của từng phòng ban?
4. Nguồn dữ liệu Ads/GA4/Search Console nào sẽ tích hợp, tần suất và chủ sở hữu?
5. Database, file storage, backup, retention, RPO/RTO và nơi lưu dữ liệu production?
6. Phạm vi AI Design, ngân sách Gemini và quyền sử dụng dữ liệu đầu vào/đầu ra?
7. KPI, tiêu chí nghiệm thu, timeline, ngân sách và người phê duyệt?

## 10. Tài liệu trong bộ Proposal

- [Phạm vi, công nghệ và phương án lưu trữ](./01-scope-and-technology.md)
- [Bộ sơ đồ](./02-diagrams.md)
- [Giao diện mẫu](./03-ui-mockups.md)

**Đề nghị:** tổ chức workshop BA–IT–Marketing–Sales để xác nhận các mục ở phần 9. Sau khi xác nhận, cập nhật phiên bản và trình Business Owner duyệt làm baseline triển khai.

