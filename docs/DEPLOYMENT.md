# Cài đặt và bàn giao

## Cấu trúc triển khai

- `frontend`: Next.js frontend, mặc định cổng 3001.
- `backend`: Next.js API, mặc định cổng 3002.
- `database`: Prisma SQLite schema/client và file dữ liệu local.
- Web cần `API_BASE_URL`; cấu hình proxy giúp cookie xác thực tiếp tục cùng origin.
- API dùng SQLite ở local; `JWT_SECRET` là bắt buộc, `GEMINI_API_KEY` tùy chọn.
- Upload hiện lưu trên filesystem của API. Production phải gắn persistent volume hoặc
  chuyển sang object storage trước khi chạy nhiều instance/hosting filesystem tạm.

## Cấu hình môi trường

Tạo file local từ từng mẫu:

```powershell
Copy-Item frontend\.env.example frontend\.env.local
Copy-Item backend\.env.example backend\.env.local
Copy-Item database\.env.example database\.env
```

Tạo secret JWT riêng (không dùng ví dụ cố định):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Đặt cùng `JWT_SECRET` trong web và API, mỗi giá trị dài ít nhất 32 ký tự. Đặt
`API_BASE_URL` trong `frontend/.env.local`. API cần một đường dẫn SQLite tuyệt đối
trỏ tới `database/data/source.sqlite`, ví dụ `DATABASE_URL="file:D:/project/database/data/source.sqlite"`.
Trong `database/.env`, Prisma CLI có thể dùng URL tương đối trong mẫu. Không commit
`.env*`, passwords, tokens hoặc API keys.

## Cài đặt database local

```powershell
npm install
npm run db:generate
```

SQLite hiện có được dùng trực tiếp; file `database/data/source.sqlite` chứa dữ liệu
nghiệp vụ. Không chạy `db:push` hoặc `db:seed` trên file này. Cần backup file trước
khi thay đổi schema hoặc dữ liệu. Có thể lập kế hoạch chuyển PostgreSQL riêng khi
chuẩn bị deploy production.

## Chạy và build

Từ thư mục gốc dự án, chạy API và web trong một terminal. Lệnh tự tạo Prisma client:

```powershell
npm run dev
```

Build riêng:

```powershell
npm run build:api
npm run build:web
```

Sau khi build, có thể chạy cả hai bản production cùng lúc:

```powershell
npm start
```

Deploy độc lập: đặt API sau HTTPS với các biến môi trường server; đặt `API_BASE_URL`
ở web trỏ tới API HTTPS. Web phải public cùng hostname người dùng cuối để proxy API
và session cookie cùng origin. Kiểm tra `/api/health` qua API và qua web proxy sau deploy.

## Demo và dữ liệu production

`npm run db:seed` chỉ dành cho database demo rỗng, không chạy trên file dữ liệu hiện có
hoặc production. Tạo
tài khoản quản trị production qua quy trình bảo mật riêng; không sử dụng thông tin
đăng nhập demo. Cấu hình Gemini ở môi trường API nếu cần dùng AI Design.
