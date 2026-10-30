# TOÀN TRUNG – MARKETING MANAGEMENT

Repository được tổ chức thành ba workspace có thể chạy/build/triển khai riêng:

| Workspace | Trách nhiệm | Địa chỉ local |
|---|---|---|
| `Frontend` | Giao diện Next.js | `http://localhost:3001` |
| `Backend` | API, xác thực và upload | `http://localhost:3002` |
| `Database` | Schema SQLite/Prisma dùng chung cho local | `Database/data/source.sqlite` |

Web proxy `/api/*` và `/uploads/*` tới API để trình duyệt tiếp tục dùng cùng origin,
giữ nguyên xác thực bằng HttpOnly cookie. Xem [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
và [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) trước khi cấu hình.

## Cài đặt local

1. Cài Node.js 20.9 trở lên (khuyến nghị Node.js 22 LTS).
2. Tạo file môi trường riêng từ mẫu:
   - `Frontend/.env.example` → `Frontend/.env.local`
   - `Backend/.env.example` → `Backend/.env.local`
   - `Database/.env.example` → `Database/.env`
3. Đặt `API_BASE_URL` trong `Frontend/.env.local`; đặt cùng một `JWT_SECRET` ngẫu nhiên
   dài tối thiểu 32 ký tự trong cấu hình web/API. SQLite ở `Database/data/source.sqlite`
   được dùng trực tiếp.
   Không commit file môi trường hoặc gửi credentials trong chat.
4. Chạy `npm ci` và `npm run db:generate`. Không chạy `db:push` trên file dữ liệu nguồn.
5. Khởi chạy cả frontend và backend trong một terminal:

   ```powershell
   npm run dev
   ```

SQLite được dùng trực tiếp tại `Database/data/source.sqlite`; không cần server database
riêng để chạy local. Không chạy seed demo lên file này vì seed có thể thay dữ liệu.

## Lệnh workspace

- `npm run build:web` / `npm run build:api`
- `npm run db:generate`
- `npm run db:push` (chỉ dùng với database SQLite mới/trống)

Các phân hệ hiện có gồm quản lý Lead, phân tích, tracking, báo cáo, AI Design và quản trị.
Gemini API key chỉ cấu hình ở môi trường của API.
