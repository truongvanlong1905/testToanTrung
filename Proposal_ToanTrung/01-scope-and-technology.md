# Phạm vi, công nghệ và phương án lưu trữ dữ liệu

## 1. Mục tiêu

Đề xuất một workspace tập trung cho Marketing và Kinh doanh Toàn Trung: quản lý khách hàng tiềm năng (Lead), theo dõi hiệu quả marketing, phối hợp báo cáo phòng ban và hỗ trợ tạo nội dung thiết kế. Tài liệu này phản ánh dự án hiện tại và các đề xuất cần được BA/IT xác nhận trước khi coi là scope chính thức.

## 2. Phạm vi module

| Module | Phạm vi chức năng dự kiến | Căn cứ / trạng thái |
|---|---|---|
| Đăng nhập và tài khoản | Đăng nhập/đăng xuất, phiên đăng nhập, hồ sơ người dùng, vai trò | Đã có API auth, profile và quản trị người dùng |
| Quản lý Lead | Tạo, tìm kiếm/lọc, xem chi tiết, cảnh báo trùng, cập nhật trạng thái, phân công/bàn giao, lưu lịch sử và tệp đính kèm | Đã có giao diện, API và các thực thể dữ liệu |
| Tổng quan | KPI Lead, Lead theo trạng thái và thông tin tổng hợp cho dashboard | Đã có màn hình Overview và thống kê Lead |
| Marketing/Ads analytics | Xem chiến dịch, nền tảng, ngân sách/chi phí, từ khóa và số liệu hiệu quả | Có giao diện và API analytics; nguồn dữ liệu/tình trạng kết nối cần xác nhận |
| Tracking | Ghi nhận sự kiện website, UTM, xem tracking và trạng thái đồng bộ | Có API và màn hình; cần xác nhận website, consent, danh mục dữ liệu và tích hợp thực tế |
| Báo cáo phòng ban | Tạo/xem báo cáo, tệp đính kèm, đánh dấu đã đọc, phân tích Lead | Có API, giao diện và schema |
| AI Design | Tạo banner, storyboard và mockup thông qua Google Gemini | Có giao diện/API; phụ thuộc cấu hình Gemini và giới hạn dịch vụ |
| Danh mục sản phẩm | Tra cứu danh mục để gắn vào Lead | Có API categories và ProductCategory |
| Cấu hình thương hiệu | Quản lý cấu hình thương hiệu hiển thị | Có API và màn hình Admin Brand |
| Tìm kiếm toàn hệ thống | Tìm Lead, chiến dịch, từ khóa và nhân viên | Có API search |
| Nhật ký hoạt động | Theo dõi hành động quan trọng và phục vụ truy vết | Có AuditLog trong schema; phạm vi truy cập/báo cáo cần xác nhận |

### Ngoài phạm vi/điểm chưa cam kết

- Không mặc định rằng đồng bộ Google Ads, GA4 hoặc Search Console đang chạy production chỉ vì đã có màn hình/trạng thái SyncJob.
- Không cam kết AI tạo video hoàn chỉnh; chức năng hiện có mô tả storyboard.
- Chưa xác định SLA, quy mô người dùng, khối lượng Lead, thời gian lưu dữ liệu, RPO/RTO, phân loại dữ liệu hoặc lịch triển khai.
- Chưa xác nhận tích hợp CRM/ERP, email, tổng đài, Zalo, Facebook Lead Ads hay quy trình phê duyệt báo giá.
- Việc chuyển cơ sở dữ liệu hoặc nơi lưu file cần dự án/mốc triển khai được phê duyệt, kiểm thử và kế hoạch rollback riêng.

## 3. Vai trò người dùng dự kiến

| Vai trò | Nhu cầu dự kiến |
|---|---|
| Admin/Ban quản trị | Quản lý người dùng, cấu hình, xem dữ liệu và báo cáo theo quyền được duyệt |
| Marketing | Tiếp nhận/khai thác Lead theo nguồn chiến dịch, xem tracking và báo cáo marketing |
| Sales | Xử lý Lead được phân công, cập nhật tiến độ, ghi nhận kết quả và bàn giao |
| Design | Dùng công cụ AI Design và xử lý yêu cầu sáng tạo |
| ADS | Theo dõi chiến dịch và hiệu suất quảng cáo; quyền cụ thể cần BA/IT chốt |

**Cần xác nhận:** tài liệu API hiện mô tả ADMIN, SALES, MARKETING; schema và màn hình báo cáo có thêm DESIGN/ADS. Cần thống nhất role chính thức, ma trận quyền xem/sửa/xóa/xuất dữ liệu, phạm vi dữ liệu theo phòng ban và người chịu trách nhiệm cấp/thu hồi tài khoản.

## 4. Công nghệ hiện có

- **Frontend:** Next.js 16, React 18, TypeScript, Tailwind CSS.
- **Backend/API:** Next.js Route Handlers, TypeScript; web và API là hai workspace triển khai riêng.
- **Cơ sở dữ liệu:** SQLite qua Prisma ORM 5; Prisma schema và client dùng chung trong workspace Database.
- **Xác thực:** JWT trong HttpOnly cookie; mật khẩu hash bằng bcryptjs; kiểm tra dữ liệu bằng Zod.
- **Công cụ:** Node.js 20.9+, npm workspaces, ESLint, PostCSS.
- **AI:** Google Gemini gọi từ phía API khi được cấu hình.
- **Upload hiện tại:** filesystem local của API.

## 5. Phương án lưu trữ dữ liệu đề xuất

### Giai đoạn phát triển/POC

- Tiếp tục SQLite để chạy local hoặc demo có quy mô nhỏ.
- Dùng dữ liệu hiện có có kiểm soát; sao lưu trước mọi thay đổi schema/data.
- Không chạy seed hoặc thao tác phá hủy lên database đang có dữ liệu nghiệp vụ.

### Production

1. **Cơ sở dữ liệu:** đề xuất đánh giá PostgreSQL managed làm đích production thay cho file SQLite dùng chung, do nhu cầu truy cập đồng thời, quản trị backup, phục hồi và mở rộng. Đây là đề xuất cần xác nhận theo hạ tầng, ngân sách và tải thực tế; không phải kết luận rằng SQLite không thể dùng trong mọi trường hợp.
2. **Tệp đính kèm:** chuyển từ filesystem local sang object storage bền vững (hoặc persistent volume có backup/HA nếu được duyệt). Lưu metadata, quyền truy cập và tham chiếu tệp trong database; không lưu secret trong tệp cấu hình nguồn.
3. **Tracking:** chỉ lưu trường cần thiết cho phân tích nguồn truy cập; áp dụng giới hạn retention và kiểm soát truy cập. Hợp đồng hiện có yêu cầu không gửi thông tin cá nhân nhạy cảm trong tracking payload.
4. **Bảo vệ dữ liệu:** TLS, quản lý secret bằng secret manager, phân quyền tối thiểu, audit log, backup mã hóa, kiểm thử khôi phục và quy trình xóa/ẩn danh dữ liệu theo chính sách được duyệt.
5. **Di chuyển:** cần mapping dữ liệu, xử lý file, kiểm tra toàn vẹn, đối soát số lượng, cửa sổ chuyển đổi, rollback và người phê duyệt. Chưa thực hiện chuyển đổi trong phạm vi tài liệu này.

| Hạng mục | Hiện trạng dự án | Đề xuất production | Quyết định cần có |
|---|---|---|---|
| Database | SQLite local | Đánh giá PostgreSQL managed | Nhà cung cấp, vùng lưu trữ, HA, backup/restore, chi phí |
| File upload | API local filesystem | Object storage/persistent storage | Nhà cung cấp, phân quyền, retention, dung lượng |
| Secret | Biến môi trường | Secret manager của nền tảng | Quy trình cấp, xoay vòng và thu hồi |
| Backup | Cần xác minh vận hành thực tế | Lịch backup + kiểm thử restore | RPO/RTO, người trực, nơi lưu bản backup |
| Tracking | SQLite/schema + API collector | Retention và kiểm soát PII | Consent, retention, quyền truy cập, vùng dữ liệu |

## 6. Nội dung họp BA và IT

### Agenda gợi ý (60–90 phút)

1. Mục tiêu kinh doanh, vấn đề hiện tại và chỉ số thành công.
2. Xác nhận nguồn Lead, quy trình tiếp nhận, chống trùng, phân công, báo giá và kết thúc Lead.
3. Xác nhận module, vai trò, ma trận quyền và các ngoại lệ nghiệp vụ.
4. Xác nhận báo cáo/KPI, định nghĩa chỉ số và nguồn dữ liệu.
5. Xác nhận tích hợp (website, Ads, GA4, Search Console, Gemini và các hệ thống khác).
6. Chốt kiến trúc production, lưu trữ, bảo mật, backup, retention và vận hành.
7. Xác nhận phạm vi MVP, tiêu chí nghiệm thu, phụ thuộc và đầu mối quyết định.

### Biên bản quyết định

| Chủ đề | Quyết định | Người xác nhận | Ngày | Trạng thái |
|---|---|---|---|---|
| Scope MVP | Chưa chốt | BA/Business Owner | TBD | Cần xác nhận |
| BPMN hiện trạng | Dự thảo trong bộ sơ đồ | BA/đại diện Sales & Marketing | TBD | Cần xác nhận |
| Role và permission | Chưa chốt | BA + IT/Security | TBD | Cần xác nhận |
| Database production | Đề xuất đánh giá PostgreSQL managed | IT/Infra | TBD | Cần xác nhận |
| File storage production | Đề xuất object storage hoặc storage bền vững | IT/Infra | TBD | Cần xác nhận |
| Tích hợp Ads/Analytics | Chưa xác nhận trạng thái thực tế | Marketing + IT | TBD | Cần xác nhận |
| Retention và backup | Chưa chốt | Business Owner + IT | TBD | Cần xác nhận |

## 7. Điều kiện nghiệm thu cần BA/IT xác định

- Luồng Lead theo từng nguồn, điều kiện bắt buộc và xử lý cảnh báo trùng.
- Ma trận phân quyền có kiểm thử theo từng role.
- Định nghĩa KPI/báo cáo và kiểm tra đối soát với nguồn dữ liệu.
- Tình huống lỗi upload, đồng bộ, AI, database và khôi phục sau sự cố.
- Tiêu chí phi chức năng: hiệu năng, khả dụng, bảo mật, backup/restore và audit.
- Nghiệm thu UAT bởi đại diện Marketing, Sales, Admin và các nhóm liên quan.

