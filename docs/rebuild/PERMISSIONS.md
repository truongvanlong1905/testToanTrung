# Ma Trận Phân Quyền Vai Trò & Bản Ghi (Permissions Matrix)

## 1. Các vai trò chuẩn trong hệ thống
Hệ thống chuẩn hóa 6 vai trò nghiệp vụ trong [`backend/src/core/auth/permissions.ts`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/core/auth/permissions.ts) và [`frontend/src/core/auth/permissions.ts`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/core/auth/permissions.ts):

1. `SALES` — Nhân viên Kinh doanh
2. `MARKETING` — Nhân viên Marketing
3. `ADS` — Chuyên viên Quảng cáo (Ads)
4. `DESIGN` — Nhân viên Thiết kế (Design)
5. `DIRECTOR` — Ban Giám Đốc
6. `ADMIN` — Quản trị viên hệ thống

---

## 2. Ma trận phân quyền truy cập màn hình & API theo Module

| Phân hệ / Chức năng | `SALES` | `MARKETING` | `ADS` | `DESIGN` | `DIRECTOR` | `ADMIN` |
|---|---|---|---|---|---|---|
| **Dashboard (`overview`)** | Xem (Phạm vi cá nhân) | Xem (Tổng hợp) | Xem (Tổng hợp) | Xem (Tổng hợp) | Toàn quyền xem | Toàn quyền xem |
| **Quản lý Lead (`01-leads`)** | Xem / Tạo / Sửa / Chăm sóc **Lead của mình** | **Chỉ xem danh sách** (Ẩn SĐT/Email nhạy cảm, không sửa/xóa) | Không truy cập (`403`) | Không truy cập (`403`) | Toàn quyền tất cả Lead | Toàn quyền tất cả Lead |
| **Tracking & UTM (`02-tracking`)** | Không truy cập (`403`) | Xem & Đồng bộ | Xem & Đồng bộ | Không truy cập (`403`) | Toàn quyền | Toàn quyền |
| **Quảng cáo & Từ khóa (`03-ads-keywords`)** | Không truy cập (`403`) | Toàn quyền | Toàn quyền | Không truy cập (`403`) | Toàn quyền | Toàn quyền |
| **Báo cáo & Thống kê (`04-reports-dashboard`)** | Xem 5 báo cáo (phạm vi cá nhân) + Báo cáo phòng `SALES` | Xem 5 báo cáo + Báo cáo phòng `MARKETING` | Xem 5 báo cáo + Báo cáo phòng `ADS` | Xem 5 báo cáo + Báo cáo phòng `DESIGN` | Xem toàn bộ 5 báo cáo & mọi phòng ban | Xem toàn bộ 5 báo cáo & mọi phòng ban |
| **Hỗ trợ Thiết kế (`05-ai-design`)** | Không truy cập (`403`) | Được truy cập | Không truy cập (`403`) | Được truy cập | Toàn quyền | Toàn quyền |
| **Quản lý Tài khoản (`users`)** | Không truy cập (`403`) | Không truy cập (`403`) | Không truy cập (`403`) | Không truy cập (`403`) | Toàn quyền cấp/khóa tài khoản | Toàn quyền cấp/khóa tài khoản |
| **Danh mục & Cấu hình (`brand`, `settings`)** | Không truy cập (`403`) | Không truy cập (`403`) | Không truy cập (`403`) | Không truy cập (`403`) | Xem | Toàn quyền cấu hình |
| **Hồ sơ cá nhân (`profile`)** | Tự cập nhật & đổi mật khẩu | Tự cập nhật & đổi mật khẩu | Tự cập nhật & đổi mật khẩu | Tự cập nhật & đổi mật khẩu | Tự cập nhật & đổi mật khẩu | Tự cập nhật & đổi mật khẩu |

---

## 3. Quy tắc bảo vệ mức bản ghi (Record-Level Security)
- **Hồ sơ Lead (`Lead`):**
  - Nhân viên `SALES` chỉ truy vấn, xem chi tiết và cập nhật được các Lead có `salesPersonId === user.userId` hoặc Lead do chính mình tạo khi chưa phân công (`salesPersonId === null && createdById === user.userId`).
  - Khi chuyển giao Lead sang một nhân viên `SALES` khác (`Chuyển kinh doanh khác`), quyền sở hữu bản ghi chuyển sang người nhận mới kèm lịch sử `LeadAssignment`.
  - Vai trò `MARKETING` khi gọi `GET /api/leads` chỉ nhận số điện thoại đã che (`0909***222`) và bị chặn gọi `GET /api/leads/[id]`, `POST /api/leads`, `PATCH /api/leads/[id]`, `DELETE /api/leads/[id]`.
- **Báo cáo phòng ban (`DepartmentReport`):**
  - Các nhân sự không phải `ADMIN` / `DIRECTOR` chỉ được đọc các báo cáo do chính mình gửi (`createdById === user.userId`), báo cáo thuộc phòng ban của mình (`department === user.role`), hoặc thông báo chung từ Ban Giám Đốc (`ADMIN` / `DIRECTOR`).
  - Endpoint `GET /api/reports/[id]` và `PATCH /api/reports/[id]` kiểm tra trực tiếp điều kiện này bằng `assertCanAccessReportRecord`.
