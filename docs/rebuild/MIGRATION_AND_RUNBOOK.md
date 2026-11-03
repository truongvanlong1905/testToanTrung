# Hướng Dẫn Migration & Vận Hành (Migration & Runbook) — Mini CRM Toàn Trung

Tài liệu này hướng dẫn quy trình sao lưu, nâng cấp cơ sở dữ liệu SQLite an toàn (không mất dữ liệu), chạy kiểm thử, build và vận hành hệ thống Mini CRM Toàn Trung.

---

## 1. Nguyên Tắc An Toàn Dữ Liệu (Data Safety Rules)

1. **Tuyệt đối không xóa dữ liệu lịch sử:** Không chạy `prisma migrate reset`, không xóa file `database/data/source.sqlite`, không ghi đè DB hiện hữu bằng dữ liệu mẫu.
2. **Bảo toàn cột lịch sử trong DB:** Các bảng/cột lịch sử liên quan đến báo giá cũ (`LeadQuote`, `value`, `unitPrice`, `discountPercent`...) vẫn được giữ nguyên trong schema SQLite để tránh lỗi tương thích ngược, nhưng đã bị khóa/ẩn hoàn toàn ở tầng API và UI theo quyết định **QD-01**.
3. **Bắt buộc sao lưu trước khi migrate:** Luôn tạo bản sao lưu của `database/data/source.sqlite` trước khi thực thi bất kỳ thay đổi schema nào.

---

## 2. Quy Trình Sao Lưu & Migration Cơ Sở Dữ Liệu

### Bước 1: Sao lưu file SQLite hiện tại
Từ thư mục gốc dự án (`d:\HKDN\diua_login_fix_source\diua`), chạy lệnh sao lưu:
```powershell
Copy-Item "database/data/source.sqlite" "database/data/source.backup-pre-rebuild.sqlite" -Force
```

### Bước 2: Chạy script Migration bất biến (Idempotent Non-Destructive Migration)
Script [`database/scripts/migrate-rebuild.mjs`](file:///d:/HKDN/diua_login_fix_source/diua/database/scripts/migrate-rebuild.mjs) tự động kiểm tra thông qua `PRAGMA table_info(...)` và chỉ bổ sung các cột/bảng/chỉ mục còn thiếu mà không làm mất dữ liệu:
- Bổ sung trên bảng `Lead`:
  - `quoteSentAt` (`DATETIME`) — Thời điểm gửi báo giá cho khách (phục vụ Báo cáo #5)
  - `customerRespondedAt` (`DATETIME`) — Thời điểm khách hàng phản hồi sau khi nhận báo giá
  - `customerResponseNote` (`TEXT`) — Ghi chú phản hồi của khách hàng
  - `lossReasonCode` (`TEXT`) — Mã lý do thất bại chuẩn hóa (phục vụ Báo cáo #8)
- Tạo bảng `NotificationRead` (`id`, `notificationId`, `userId`, `readAt`) kèm `UNIQUE(notificationId, userId)` để lưu trạng thái đã đọc thông báo độc lập cho từng nhân sự.
- Đồng bộ danh mục 21 sản phẩm chuẩn của Toàn Trung vào bảng `Category` (`type = 'PRODUCT'`) và gán `displayOrder` từ `1..21` (các danh mục cũ không nằm trong danh sách 21 sản phẩm được chuyển sang `status = 'INACTIVE'` thay vì xóa).

Chạy lệnh:
```powershell
node database/scripts/migrate-rebuild.mjs
```

### Bước 3: Generate Prisma Client
```powershell
npm run db:generate
```

---

## 3. Quy Trình Kiểm Tra Kiến Trúc, Typecheck, Test & Build

Thực thi tuần tự các lệnh sau tại thư mục `d:\HKDN\diua_login_fix_source\diua`:

```powershell
# 1. Kiểm tra ranh giới kiến trúc 5 module + core
npm run check:arch

# 2. Kiểm tra kiểu dữ liệu TypeScript (Backend + Frontend)
npm run typecheck

# 3. Chạy bộ kiểm thử tự động (bao phủ AC-01..AC-32)
npm test

# 4. Build Production cho Backend API (Next.js) và Frontend Web (Vite)
npm run build:api
npm run build:web
```

---

## 4. Khởi Chạy Hệ Thống (Development & Production)

### Chạy môi trường Development (cả Backend + Frontend)
```powershell
npm run dev
```
- **Frontend (Vite):** `http://localhost:5173` (tự động proxy `/api` và `/uploads` sang Backend)
- **Backend API (Next.js):** `http://localhost:3001`

### Cấu hình biến môi trường (`.env`)
- `DATABASE_URL="file:../database/data/source.sqlite"`
- `JWT_SECRET` — Khóa ký phiên đăng nhập
- `GEMINI_API_KEY` — Khóa cấu hình máy chủ cho tính năng tạo ảnh studio trong Module `05-ai-design` (chỉ đọc ở tầng server Backend, tuyệt đối không lộ tên biến hay giá trị lên giao diện người dùng).

---

## 5. Quy Trình Khôi Phục (Rollback) Khi Cần Thiết

Nếu cần khôi phục lại trạng thái trước khi nâng cấp:
1. Dừng tiến trình Backend/Frontend đang chạy.
2. Khôi phục file cơ sở dữ liệu từ bản sao lưu:
   ```powershell
   Copy-Item "database/data/source.backup-pre-rebuild.sqlite" "database/data/source.sqlite" -Force
   ```
3. Chuyển nhánh Git về nhánh trước khi nâng cấp và chạy lại `npm run db:generate`.
