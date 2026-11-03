# Nghiệp vụ và phân quyền Toàn Trung

> Bản tóm tắt dành cho nhân viên, quản lý và nhóm triển khai. Quyền vào module theo vai trò; quyền xem/sửa từng dữ liệu phải được kiểm tra thêm ở API.

## 1. Quy trình nghiệp vụ

1. **Tiếp nhận khách hàng tiềm năng (Lead):** Lead đến từ website, quảng cáo hoặc nhân viên nhập; lưu thông tin khách, nhu cầu và nguồn.
2. **Kinh doanh chăm sóc:** Sales nhận Lead, liên hệ, cập nhật tiến độ/báo giá và kết quả. Khách quay lại thì tra cứu lịch sử trước khi tạo yêu cầu mới.
3. **Marketing và Ads đo lường:** Tracking ghi nhận nguồn, chiến dịch và từ khóa; Ads đối chiếu chi phí với Lead và kết quả bán hàng.
4. **Design hỗ trợ bán hàng:** Nhận brief cùng tài liệu cần thiết, thực hiện thiết kế/phối cảnh và lưu kết quả liên quan đến Lead.
5. **Theo dõi kết quả:** Dashboard tổng hợp Lead, hoạt động Marketing/Ads, kết quả Sales và tiến độ Design theo kỳ báo cáo.

**Luồng dữ liệu:** Nguồn/chiến dịch → Lead → chăm sóc và báo giá → kết quả bán hàng; yêu cầu Design và kết quả được nối với Lead; báo cáo lấy số liệu từ các bước trên.

## 2. Vai trò

| Vai trò | Trách nhiệm chính |
|---|---|
| `SALES` | Tiếp nhận và chăm sóc Lead được giao; cập nhật tiến độ, báo giá và kết quả. |
| `MARKETING` | Theo dõi nguồn Lead, chiến dịch, Ads và hiệu quả Marketing. |
| `ADS` | Theo dõi dữ liệu quảng cáo, chi phí và từ khóa. |
| `DESIGN` | Xử lý yêu cầu thiết kế được giao và cập nhật kết quả. |
| `DIRECTOR` | Theo dõi hoạt động và báo cáo toàn công ty; truy cập chức năng quản lý người dùng. |
| `ADMIN` | Quản trị người dùng, danh mục và cấu hình hệ thống. |

## 3. Quyền truy cập theo module

| Module / chức năng | SALES | MARKETING | ADS | DESIGN | DIRECTOR | ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Tổng quan | Có | Có | Có | Có | Có | Có |
| Lead | Có | Có | — | — | Có | Có |
| Tracking | — | Có | Có | — | Có | Có |
| Ads & từ khóa | — | Có | Có | — | Có | Có |
| Báo cáo | Có | Có | Có | Có | Có | Có |
| AI hỗ trợ Design | — | Có | — | Có | Có | Có |
| Người dùng | — | — | — | — | Có | Có |
| Danh mục & cài đặt | — | — | — | — | — | Có |
| Hồ sơ cá nhân & thông báo | Có | Có | Có | Có | Có | Có |

**“Có” chỉ có nghĩa là được vào module**, không đồng nghĩa được xem hoặc sửa mọi dữ liệu trong đó.

## 4. Quy tắc cần nhớ

- **Đúng phạm vi công việc:** Sales xem Lead được giao; quyền quản lý Lead rộng hơn theo vai trò/chức vụ. Marketing, Ads và Design chỉ dùng dữ liệu cần cho nhiệm vụ của mình.
- **Chỉ cấp quyền cần thiết:** Không chia sẻ thông tin liên hệ, tệp khách hàng hay dữ liệu nhạy cảm nếu công việc không cần.
- **Thay đổi phải có lịch sử:** Ghi nhận người thực hiện và thời điểm khi chuyển người phụ trách hoặc cập nhật kết quả quan trọng.
- **Không tự cấp quyền quản trị:** Người dùng chỉ sửa hồ sơ cá nhân; Admin quản lý quyền và cấu hình.
- **Bảo vệ ở cả giao diện và API:** Ẩn menu không đủ; API, chi tiết bản ghi và tệp xuất cũng phải áp dụng cùng phạm vi quyền.

## 5. Tài liệu chi tiết

Ma trận nghiệp vụ/API và các trường hợp kiểm tra quyền xem tại [`docs/rebuild/PERMISSIONS.md`](../docs/rebuild/PERMISSIONS.md). Khi có khác biệt, cần xác nhận quy tắc nghiệp vụ và kiểm tra quyền thực tế ở backend trước khi nghiệm thu.
