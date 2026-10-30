# TOÀN TRUNG – MARKETING MANAGEMENT

Repository được tổ chức thành ba workspace có thể chạy/build/triển khai riêng:

| Workspace | Trách nhiệm | Địa chỉ local |
|---|---|---|
| `frontend` | Giao diện Next.js | `http://localhost:3001` |
| `backend` | API, xác thực và upload | `http://localhost:3002` |
| `database` | Schema SQLite/Prisma dùng chung cho local | `database/data/source.sqlite` |

Web proxy `/api/*` và `/uploads/*` tới API để trình duyệt tiếp tục dùng cùng origin,
giữ nguyên xác thực bằng HttpOnly cookie. Xem [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
và [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) trước khi cấu hình.

## Cài đặt local

1. Cài Node.js 20.9 trở lên (khuyến nghị Node.js 22 LTS).
2. Tạo file môi trường riêng từ mẫu:
   - `frontend/.env.example` → `frontend/.env.local`
   - `backend/.env.example` → `backend/.env.local`
   - `database/.env.example` → `database/.env`
3. Đặt `API_BASE_URL` trong `frontend/.env.local`; đặt cùng một `JWT_SECRET` ngẫu nhiên
   dài tối thiểu 32 ký tự trong cấu hình web/API. SQLite ở `database/data/source.sqlite`
   được dùng trực tiếp.
   Không commit file môi trường hoặc gửi credentials trong chat.
4. Chạy `npm ci` một lần để cài dependencies. Không chạy `db:push` trên file dữ liệu nguồn.
5. Từ thư mục `diua`, khởi chạy toàn bộ bằng một lệnh:

   ```powershell
   npm run dev
   ```

Lệnh này tự tạo Prisma client, sau đó chạy API và frontend cùng lúc. Mở
`http://localhost:3001`; API chạy tại `http://localhost:3002`.

SQLite được dùng trực tiếp tại `database/data/source.sqlite`; không cần server database
riêng để chạy local. Không chạy seed demo lên file này vì seed có thể thay dữ liệu.

## Lệnh workspace

- `npm run build:web` / `npm run build:api`
- `npm run db:generate`
- `npm run db:push` (chỉ dùng với database SQLite mới/trống)

Các phân hệ hiện có gồm quản lý Lead, phân tích, tracking, báo cáo, AI Design và quản trị.
Gemini API key chỉ cấu hình ở môi trường của API.
