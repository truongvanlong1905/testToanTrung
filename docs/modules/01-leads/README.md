# Module M01: Quản Lý Lead (`01-leads`) — Nhóm 1

## 1. Phạm Vi Chức Năng
Module **M01 (`01-leads`)** chịu trách nhiệm toàn bộ vòng đời khách hàng tiềm năng (Lead) mảng Màn hình LED & Bảng điện tử B2B của Toàn Trung:
- Tiếp nhận hồ sơ Lead thủ công, qua Excel/CSV import (kèm chia tự động Round-Robin hoặc chỉ định Sales), hoặc qua thanh **AI Quick Lead Bar** (bóc tách thông tin từ tin nhắn Zalo/Email/Cuộc gọi).
- Chống trùng số điện thoại (`phone` chuẩn hóa 10–11 chữ số), cảnh báo hồ sơ trùng và cho phép bỏ lọc trùng khi cần đối soát.
- Chấm điểm tiềm năng tự động (`score`: `HOT` / `WARM` / `COLD`) dựa trên diện tích lắp đặt, giá trị dự kiến, địa bàn và thông tin doanh nghiệp.
- Quản lý quy trình 7 bước Pipeline (`Lead mới` → `Đã liên hệ` → `Đang tư vấn` → `Đang soạn báo giá` → `Đã gửi báo giá` → `Thành công` / `Thất bại`).
- Nhật ký chăm sóc khách hàng (`Activity`), lập báo giá kỹ thuật LED (`Quote` + kiểm tra ngưỡng chiết khấu trình Giám đốc duyệt), đính kèm tệp khảo sát/bản vẽ (`Attachment`), và lịch sử kiểm toán (`LeadHistory`, `AssignmentLog`).

## 2. Đường Dẫn Mã Nguồn
- **Frontend**: [`frontend/src/modules/01-leads/`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/01-leads)
  - `components/`: `LeadsWorkspaceView.tsx`, `StatsCards.tsx`, `LeadFilters.tsx`, `LeadTable.tsx`, `AiQuickLeadBar.tsx`, `NewLeadModal.tsx`, `ImportLeadsModal.tsx`, `LeadDetailModal.tsx`, `LeadDetailAuditTab.tsx`, `lead-detail-constants.ts`, `printable-quote.ts`
  - `hooks/`: `useLeadsWorkspace.ts`
  - `api.ts`, `types.ts`, `index.ts`, `tests/`
- **Backend**: [`backend/src/modules/01-leads/`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/01-leads)
  - `service.ts`, `lead-scoring.service.ts`, `lead-status.service.ts`, `lead-assignment.service.ts`, `lead-quote.service.ts`, `lead-ai.service.ts`
  - `repository.ts`, `policy.ts`, `contracts.ts`, `public.ts`, `tests/`

## 3. Phân Quyền Truy Cập (RBAC Policy)
| Vai trò | Xem danh sách & Chi tiết | Tạo / Sửa / Chăm sóc / Báo giá | Chia Sales (`/assign`, `/import`) | Xóa Lead (`DELETE /api/leads/[id]`) |
| :--- | :--- | :--- | :--- | :--- |
| `ADMIN` / `DIRECTOR` | Toàn bộ Lead | Toàn bộ Lead | Được phép | Chỉ `ADMIN` và `DIRECTOR` |
| `MANAGER` | Toàn bộ Lead | Toàn bộ Lead | Được phép | Không được phép (`403`) |
| `SALES` | Chỉ Lead được giao (`assignedToId = user.id`) | Chỉ Lead được giao cho mình | Không được phép (`403`) | Không được phép (`403`) |
| `MARKETING` / `DESIGNER` | Không có quyền truy cập kho Lead (`403`) | Không được phép (`403`) | Không được phép (`403`) | Không được phép (`403`) |

## 4. Hợp Đồng Kết Nối Công Khai (`public.ts`)
Các module khác và `core` chỉ được gọi M01 thông qua `backend/src/modules/01-leads/public.ts`:
- `attachUploadedFileToLead(params)`: Được `core/storage/upload.service.ts` gọi khi tải tệp kèm `leadId`.
- `searchLeadsPublic(query, user)`: Được `core/admin/search.service.ts` gọi khi tìm kiếm toàn cục (`Ctrl+K`).
- `getLeadsDashboardSnapshot(user)`: Được `04-reports-dashboard` sử dụng để tổng hợp số liệu Lead.
- `calculateLeadScore`, `parseVndString`, `formatVndNumber`, `extractMaxCodeSuffix`: Hàm tiện ích tính điểm & định dạng mã/tiền tệ.

## 5. Cách Kiểm Tra & Lỗi Thường Gặp
- **Chạy kiểm thử module**: `node scripts/run-tests.mjs`
- **Các mã lỗi nghiệp vụ (`errorCode`)**:
  - `DUPLICATE_PHONE` (`409`): Số điện thoại khách hàng đã tồn tại trong hệ thống (trả kèm `duplicateLead` để UI hiển thị hồ sơ gốc).
  - `LOST_REASON_REQUIRED` (`400`): Chuyển trạng thái sang `Thất bại` nhưng chưa nhập lý do thất bại (`lostReason`).
  - `LEAD_ACCESS_DENIED` (`403`): Nhân viên Sales cố gắng xem hoặc sửa hồ sơ Lead của Sales khác.
  - `AI_PROVIDER_MISSING_KEY` (`503`): Chưa cấu hình `GEMINI_API_KEY` khi dùng tính năng AI bóc tách Lead.

