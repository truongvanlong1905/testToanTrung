# TOÀN TRUNG MARKETING MANAGEMENT – API CONTRACT

Tài liệu đặc tả hợp đồng giao tiếp giữa Frontend và Backend cho hệ thống Quản lý Marketing & Khách hàng tiềm năng của Toàn Trung Telecom JSC.

## 1. Quy chuẩn chung

### 1.1 Base URL
- Môi trường phát triển: `http://localhost:3001/api`
- Content-Type: `application/json` (trừ endpoint upload sử dụng `multipart/form-data`)

### 1.2 Cấu trúc phản hồi chuẩn (Response Envelope)

**Phản hồi thành công:**
```json
{
  "success": true,
  "data": {},
  "message": "Thông báo thân thiện bằng tiếng Việt",
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 8,
    "totalPages": 13
  }
}
```

**Phản hồi lỗi:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | DUPLICATE_WARNING | INTERNAL_ERROR",
    "message": "Thông điệp lỗi chi tiết",
    "details": []
  }
}
```

### 1.3 Cơ chế Xác thực & Phân quyền (Authentication & RBAC)
- **Cơ chế**: Session token lưu trong `HttpOnly Cookie` (tên cookie: `tt_session_token`) hoặc Header `Authorization: Bearer <token>`.
- **Vai trò (Roles)**:
  - `ADMIN`: Toàn quyền xem, sửa, tạo, xóa, phân quyền, xem audit log.
  - `SALES`: Xem lead được phân công và lead chung, cập nhật trạng thái, thêm ghi chú, nhận bàn giao lead.
  - `MARKETING`: Tạo lead mới, xem báo cáo lead theo chiến dịch, upload tài liệu hiện trường.

---

## 2. Danh mục Endpoints

### 2.1 AUTHENTICATION

#### `POST /api/auth/login`
- **Mô tả**: Đăng nhập hệ thống, cấp session cookie.
- **Quyền**: Public
- **Request Body**:
```json
{
  "email": "admin@toantrung.vn",
  "password": "Password123@"
}
```
- **Response Data**:
```json
{
  "user": {
    "id": "usr_01",
    "email": "admin@toantrung.vn",
    "name": "Nguyễn Toàn Trung",
    "role": "ADMIN",
    "phone": "0901234567"
  }
}
```

#### `POST /api/auth/logout`
- **Mô tả**: Đăng xuất và hủy session cookie.
- **Quyền**: Authenticated

#### `GET /api/auth/me`
- **Mô tả**: Lấy thông tin tài khoản hiện tại từ session cookie.
- **Quyền**: Authenticated

---

### 2.2 USERS & SALES

#### `GET /api/users`
- **Mô tả**: Lấy danh sách nhân viên để phục vụ chọn người phụ trách (Sales phụ trách).
- **Quyền**: Authenticated
- **Query params**: `?role=SALES` (tùy chọn)

---

### 2.3 LEADS (QUẢN LÝ KHÁCH HÀNG TIỀM NĂNG)

#### `GET /api/leads`
- **Mô tả**: Tìm kiếm, lọc và phân trang danh sách Lead.
- **Quyền**: Authenticated
- **Query Parameters**:
  - `search` (string): Tìm theo tên, sđt, công ty, mã lead, tên sản phẩm.
  - `status` (string): Lọc trạng thái ("Vừa nhận thông tin", "Đang soạn báo giá", "Đã gửi báo giá", "Chốt thành công", "Thất bại").
  - `source` (string): Lọc nguồn khách ("Hotline", "Facebook Ads", "Google Ads", "Website", "Giới thiệu", "Triển lãm", "Email", "Form").
  - `salesId` (string): Lọc theo ID nhân viên phụ trách.
  - `page` (number, default: 1).
  - `pageSize` (number, default: 8).
- **Response Data**: Mảng danh sách Lead kèm thống kê tóm tắt 4 thẻ (`stats`).

#### `POST /api/leads`
- **Mô tả**: Tiếp nhận Lead mới. Tự sinh mã Lead theo mẫu `TT-LED-YYMM-XXXX`, tự động kiểm tra cảnh báo trùng, ghi lịch sử trạng thái ban đầu và tạo Audit log.
- **Quyền**: Authenticated (ADMIN, MARKETING, SALES)
- **Request Body**:
```json
{
  "customerName": "Nguyễn Văn A",
  "companyName": "Khách sạn Royal",
  "phone": "0912345678",
  "email": "contact@royal.vn",
  "product": "Màn hình LED P2.5 trong nhà Hội trường (30m²)",
  "categoryId": "cat_led_indoor",
  "source": "Hotline",
  "salesPersonId": "usr_sales_01",
  "estimatedValue": "450.000.000 đ",
  "installationAddress": "123 Lê Lợi, Quận 1, TP. HCM",
  "location": "TP. Hồ Chí Minh",
  "notes": "Cần khảo sát mặt bằng trước ngày 15.",
  "attachments": [
    { "fileName": "hien_trang.jpg", "fileUrl": "/uploads/...", "fileType": "IMAGE" }
  ]
}
```

#### `GET /api/leads/[id]`
- **Mô tả**: Xem đầy đủ hồ sơ chi tiết Lead gồm: Thông tin khách hàng, Yêu cầu kỹ thuật, Lịch sử đổi trạng thái (`statusHistory`), Lịch sử phân công (`assignments`), và Danh sách tài liệu đính kèm (`attachments`).
- **Quyền**: Authenticated

#### `PATCH /api/leads/[id]`
- **Mô tả**: Cập nhật thông tin chi tiết Lead.
- **Quyền**: Authenticated (ADMIN, SALES phụ trách)

#### `PATCH /api/leads/[id]/status`
- **Mô tả**: Cập nhật trạng thái Lead. Tự động ghi vào bảng `LeadStatusHistory`.
- **Đặc biệt**: Nếu chuyển sang `Thất bại`, trường `failureReason` là **BẮT BUỘC**.
- **Request Body**:
```json
{
  "status": "Thất bại",
  "reason": "Khách hàng tạm dừng kế hoạch sửa chữa tòa nhà sang năm sau"
}
```

#### `POST /api/leads/[id]/assign`
- **Mô tả**: Bàn giao hoặc chuyển Lead cho nhân viên Sales khác. Ghi nhận vào bảng `LeadAssignments` kèm lý do chuyển giao.
- **Request Body**:
```json
{
  "newSalesPersonId": "usr_sales_02",
  "reason": "Bàn giao do nhân viên cũ đi công tác dự án miền Trung"
}
```

#### `POST /api/leads/check-duplicate`
- **Mô tả**: Kiểm tra trùng lặp dựa trên Số điện thoại, Email, Tên khách hàng hoặc Tên công ty/dự án.
- **Cơ chế**: Cảnh báo nhắc nhở người dùng (không chặn cứng hoặc tự ý gộp dữ liệu).
- **Request Body**:
```json
{
  "phone": "0912345678",
  "email": "contact@royal.vn",
  "customerName": "Nguyễn Văn A",
  "companyName": "Khách sạn Royal"
}
```
- **Response Data**:
```json
{
  "isDuplicate": true,
  "matchedLeads": [
    {
      "id": "lead_01",
      "code": "TT-LED-2401",
      "customerName": "Nguyễn Văn A",
      "companyName": "Khách sạn Royal",
      "phone": "0912345678",
      "salesPersonName": "Trần Minh Tuấn",
      "status": "Đang soạn báo giá"
    }
  ]
}
```

---

### 2.4 FILE UPLOAD

#### `POST /api/upload`
- **Mô tả**: Upload hình ảnh hiện trường, bản vẽ kỹ thuật CAD/PDF hoặc tài liệu đính kèm.
- **Content-Type**: `multipart/form-data`
- **Giới hạn**: File tối đa 15MB, định dạng: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`, `.dwg`.
- **Response**: Trả về `fileName`, `fileUrl`, `fileSize`, `mimeType`.

### 2.5 TÌM KIẾM TOÀN HỆ THỐNG

#### `GET /api/search?q={term}`
- Tìm kiếm tối đa 5 Lead, 4 chiến dịch, 4 từ khóa và 4 nhân viên khớp với từ khóa.
- Yêu cầu đăng nhập; tối thiểu 2 ký tự, tối đa 80 ký tự.

### 2.6 BÁO CÁO PHÒNG BAN & THÔNG BÁO

#### `GET /api/department-reports`
- Trả về 50 báo cáo gần nhất và trạng thái đã đọc riêng cho người dùng hiện tại.

#### `POST /api/department-reports`
- Tạo thông báo báo cáo với `title`, `content`, `department`; tệp đính kèm tùy chọn tải lên trước qua `/api/upload`.

#### `PATCH /api/department-reports/{id}/read`
- Đánh dấu báo cáo đã đọc cho người dùng hiện tại.

### 2.7 AI DESIGN

#### `POST /api/ai/design`
- Nhận multipart form với `mode` (`banner`, `storyboard`, `mockup`), `prompt`, tùy chọn tỷ lệ/kích thước và ảnh đầu vào cho mockup.
- Gọi Google Gemini server-side; cần `GEMINI_API_KEY`. Không trả về kết quả giả khi cấu hình hoặc dịch vụ không khả dụng.

### 2.8 TRACKING EVENT COLLECTOR

#### `POST /api/tracking`
- Endpoint ghi nhận sự kiện từ trang web công ty; không cần session người dùng.
- Chỉ chấp nhận Origin có trong `TRACKING_ALLOWED_ORIGINS` (mặc định cho `toantrungtelecom.com` và `ledtoantrung.vn`) và giới hạn 60 sự kiện/phút/IP.
- Chỉ gửi UTM, website, landing page, thiết bị và `leadId` tùy chọn; không gửi thông tin cá nhân nhạy cảm trong tracking payload.
- `GET /api/tracking` và `/api/tracking/sync` vẫn yêu cầu đăng nhập.
