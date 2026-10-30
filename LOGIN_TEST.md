# Kiểm tra đăng nhập

1. Cài dependencies và cấu hình các file môi trường theo
   [DEPLOYMENT.md](./docs/DEPLOYMENT.md).
2. Chạy `npm run db:generate`, sau đó `npm run dev`.
3. Truy cập `http://localhost:3001/login`.
4. Thử đăng nhập với tài khoản đã được provision trong SQLite.
5. Chạy kiểm tra HTTP:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\test-login.ps1
   ```

Các bước login, `/api/auth/me` và `/` cần trả HTTP 200. Không gửi `.env`, cookie,
token hoặc mật khẩu khi báo lỗi. Database SQLite runtime nằm tại
`database/data/source.sqlite`.
