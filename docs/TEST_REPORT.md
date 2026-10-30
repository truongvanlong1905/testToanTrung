# Báo cáo kiểm tra chạy ứng dụng

## Môi trường và trạng thái dữ liệu

- Frontend: Next.js, cổng `3001`.
- Backend API: Next.js, cổng `3002`.
- Database: SQLite tại `Database/data/source.sqlite`, được giữ nguyên; không chạy
  migration hoặc seed trong lần kiểm tra này.
- Database có 15 bảng; hiện có 7 user, 5 danh mục, 4 chiến dịch và 4 tracking event.
  Bảng Lead hiện không có bản ghi, vì vậy danh sách Lead rỗng là trạng thái dữ liệu,
  không phải lỗi tải trang.

## Kết quả đã xác minh

| Kiểm tra | Kết quả |
|---|---|
| Cài đặt dependency và tạo Prisma client | PASS |
| `npm run build:web` | PASS |
| `npm run build:api` | PASS |
| `npm audit` | 0 lỗ hổng đã biết |
| API `/api/health` và kết nối SQLite | HTTP 200 |
| Web proxy `/api/health` | HTTP 200 |
| Đăng nhập qua web proxy | HTTP 200 |
| `/api/auth/me` với cookie phiên | HTTP 200 |
| GET danh sách Lead qua web proxy | HTTP 200, 0 bản ghi |
| Trang dashboard sau đăng nhập | HTTP 200 |

Đăng nhập smoke test ghi audit log theo hành vi bình thường của ứng dụng. Không có
Lead nào được tạo, sửa hoặc xóa trong quá trình kiểm tra. Không đưa dữ liệu nhạy cảm
hoặc secret vào báo cáo này.

## Chạy local

```powershell
npm ci
npm run db:generate
npm run dev
```

Mở `http://localhost:3001`. Không chạy `npm run db:push` hoặc `npm run db:seed` trên
file SQLite hiện có. Xem [DEPLOYMENT.md](./DEPLOYMENT.md) để biết cấu hình môi trường.
