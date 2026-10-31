# Quyền Sở Hữu Bảng Dữ Liệu (`DATABASE_OWNERSHIP.md`)

Hệ thống **Toàn Trung CRM** sử dụng một schema Prisma tập trung tại [`database/prisma/schema.prisma`](file:///d:/HKDN/diua_login_fix_source/diua/database/prisma/schema.prisma) gồm **19 bảng (models)**. Để đảm bảo tính toàn vẹn dữ liệu và phân định rõ trách nhiệm giữa 5 nhóm phát triển, mỗi bảng dữ liệu chỉ có **duy nhất một Module hoặc Core làm chủ sở hữu ghi (Write Owner)**.

- **Chủ sở hữu Core & Database Schema**: `@truongvanlong1905`

---

## 1. Bảng Phân Quyền Sở Hữu Toàn Bộ 19 Model Trong `schema.prisma`

| STT | Tên Model (`schema.prisma`) | Module sở hữu chính (Write Owner) | Nhóm phụ trách | Các Module khác được phép đọc (Read Access) | Giao diện đọc/ghi liên module (`public.ts`) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `Lead` | **M01 — `01-leads`** | Nhóm 1 | M04 (`04-reports-dashboard`), Core Search | `getLeadsDashboardSnapshot()`, `searchLeadsPublic()` trong `backend/src/modules/01-leads/public.ts` |
| 2 | `LeadStatusHistory` | **M01 — `01-leads`** | Nhóm 1 | Chỉ nội bộ M01 | Ghi tự động trong transaction khi đổi trạng thái hoặc phân công Lead |
| 3 | `LeadAssignment` | **M01 — `01-leads`** | Nhóm 1 | Chỉ nội bộ M01 | Ghi tự động trong transaction khi chia Lead thủ công hoặc Round-Robin |
| 4 | `LeadAttachment` | **M01 — `01-leads`** | Nhóm 1 | Core Storage (`upload.service.ts`) | Core Storage gọi `attachUploadedFileToLead()` trong `backend/src/modules/01-leads/public.ts` |
| 5 | `LeadActivity` | **M01 — `01-leads`** | Nhóm 1 | M04 (`04-reports-dashboard`) | Chỉ truy cập qua `01-leads` |
| 6 | `LeadQuote` | **M01 — `01-leads`** | Nhóm 1 | M04 (`04-reports-dashboard`) | Chỉ truy cập qua `01-leads` |
| 7 | `TrackingEvent` | **M02 — `02-tracking`** | Nhóm 2 | M01 (`01-leads`), M04 (`04-reports-dashboard`) | `getTrackingDashboardSnapshot()` trong `backend/src/modules/02-tracking/public.ts` |
| 8 | `SyncJob` | **M02 — `02-tracking`** | Nhóm 2 | M03 (`03-ads-keywords`), M04 (`04-reports-dashboard`) | `getExternalConnectorStatus()` trong `backend/src/modules/02-tracking/public.ts` |
| 9 | `MarketingCampaign` | **M03 — `03-ads-keywords`** | Nhóm 3 | M04 (`04-reports-dashboard`), Core Search | `getAdsDashboardSnapshot()`, `searchAdsPublic()` trong `backend/src/modules/03-ads-keywords/public.ts` |
| 10 | `AdsPerformance` | **M03 — `03-ads-keywords`** | Nhóm 3 | M04 (`04-reports-dashboard`) | Tổng hợp qua `03-ads-keywords` |
| 11 | `KeywordMetric` | **M03 — `03-ads-keywords`** | Nhóm 3 | M04 (`04-reports-dashboard`), Core Search | `searchAdsPublic()` trong `backend/src/modules/03-ads-keywords/public.ts` |
| 12 | `DepartmentReport` | **M04 — `04-reports-dashboard`** | Nhóm 4 | M01 (`01-leads`), Core Admin (`promotions.service.ts`) | M01 & Core Admin tạo thông báo tờ trình qua `createSystemReportNotification()` trong `backend/src/modules/04-reports-dashboard/public.ts` |
| 13 | `DepartmentReportRead` | **M04 — `04-reports-dashboard`** | Nhóm 4 | Chỉ nội bộ M04 | Ghi khi nhân sự đánh dấu đã đọc báo cáo (`PATCH /api/reports/[id]/read`) |
| 14 | `AuditLog` | **Core & M05 (`05-ai-design`)** | Core Team & Nhóm 5 | M01 (`01-leads`), M05 (`05-ai-design` dùng `entity = "AI_DESIGN"` để lưu lịch sử thiết kế AI mà không cần phá vỡ schema) | M05 quản lý các bản ghi `AuditLog` có `entity = "AI_DESIGN"`; M01 & Core ghi nhật ký kiểm toán hệ thống |
| 15 | `User` | **Core — `src/core/auth` & `src/core/admin`** | Core Team | M01 – M05 (tra cứu thông tin nhân sự/Sales) | Quản lý tại `backend/src/core/admin/users.service.ts` |
| 16 | `Department` | **Core — `src/core/admin`** | Core Team | M01 – M05 (hiển thị phòng ban) | Quản lý tại `backend/src/core/admin/departments.service.ts` |
| 17 | `PromotionDecision` | **Core — `src/core/admin`** | Core Team | M04 (`04-reports-dashboard`) | Quản lý tại `backend/src/core/admin/promotions.service.ts` |
| 18 | `ProductCategory` | **Core — `src/core/admin`** | Core Team | M01 (`01-leads`), M05 (`05-ai-design`) | Quản lý tại `backend/src/core/admin/categories.service.ts` |
| 19 | `BrandSetting` | **Core — `src/core/admin`** | Core Team | Toàn bộ Frontend Layout & Modules | Quản lý tại `backend/src/core/admin/brand.service.ts` |

---

## 2. Quy Tắc Toàn Vẹn Dữ Liệu & Giao Dịch Nhiều Bảng (Multi-Table Transactions)

1. **Chuyển trạng thái Lead (`M01 - lead-status.service.ts`)**:
   - Thực hiện trong `prisma.$transaction`: cập nhật `Lead.status` (và `failureReason` nếu thất bại) + ghi `LeadStatusHistory` + ghi `AuditLog`.
2. **Phân công & Import Lead (`M01 - lead-assignment.service.ts`)**:
   - Thực hiện trong `prisma.$transaction`: cập nhật `Lead.salesPersonId` + ghi `LeadAssignment` + ghi `AuditLog`.
3. **Lập báo giá & Trình duyệt Giám đốc (`M01 - lead-quote.service.ts`)**:
   - Thực hiện trong `prisma.$transaction`: tạo `LeadQuote` + tạo `LeadActivity` + cập nhật `Lead.status` / `directorApprovalStatus`, sau đó gọi `createSystemReportNotification` của `M04` nếu mức chiết khấu vượt trần cần Giám đốc phê duyệt.
4. **Thực thi đồng bộ nguồn (`M02 - service.ts`)**:
   - Cập nhật `SyncJob` (`status`, `lastSyncTime`, `recordsSynced`) và ghi `AuditLog`.
5. **Quyết định bổ nhiệm nhân sự (`Core - promotions.service.ts`)**:
   - Thực hiện trong `prisma.$transaction`: tạo `PromotionDecision` + cập nhật `User.position` / `User.department` + gửi thông báo qua `M04/public`.
