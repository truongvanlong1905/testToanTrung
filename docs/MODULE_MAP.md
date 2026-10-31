# Bản Đồ 5 Module Nghiệp Vụ & Phân Công Nhóm (`MODULE_MAP.md`)

Tài liệu này cung cấp cái nhìn toàn cảnh về 5 module nghiệp vụ chính (`M01` – `M05`) và lớp hạ tầng `core` của dự án **Toàn Trung CRM**, giúp 5 nhóm phát triển làm việc độc lập, dễ tìm lỗi và không giẫm chân lên nhau.

---

## 1. Bảng Tổng Quan 5 Module Nghiệp Vụ

| Mã | Tên Module | Nhóm phụ trách | Đường dẫn Frontend (`frontend/src/modules/`) | Đường dẫn Backend (`backend/src/modules/`) | Các Endpoint API sở hữu | Bảng dữ liệu sở hữu (`schema.prisma`) | Phụ thuộc công khai (`public.ts` / `index.ts`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M01** | **Quản lý Lead** | **Nhóm 1** | [`01-leads/`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/01-leads) | [`01-leads/`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/01-leads) | `GET/POST /api/leads`<br>`GET/PATCH/DELETE /api/leads/[id]`<br>`PATCH /api/leads/[id]/status`<br>`POST /api/leads/[id]/assign`<br>`POST /api/leads/[id]/activities`<br>`POST /api/leads/[id]/quotes`<br>`GET /api/leads/check-duplicate`<br>`POST /api/leads/import`<br>`GET /api/leads/analytics`<br>`POST /api/leads/ai-assist` | `Lead`<br>`LeadStatusHistory`<br>`LeadAssignment`<br>`LeadAttachment`<br>`LeadActivity`<br>`LeadQuote` | - Gọi `M04/public` (`createSystemReportNotification`) khi báo giá vượt ngưỡng giảm giá cần Giám đốc duyệt.<br>- Đọc snapshot từ `M02/public` & `M03/public` cho `/api/leads/analytics`.<br>- Dùng `core/ai/gemini.adapter` cho AI nhập nhanh Lead & tư vấn Sales. |
| **M02** | **Tracking & đồng bộ đa kênh** | **Nhóm 2** | [`02-tracking/`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/02-tracking) | [`02-tracking/`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/02-tracking) | `GET/POST /api/tracking`<br>`GET/POST /api/tracking/sync` | `TrackingEvent`<br>`SyncJob` | - Không phụ thuộc module nghiệp vụ khác.<br>- Cung cấp `EXTERNAL_CONNECTOR_SPECS` & `getExternalConnectorStatus` qua `02-tracking/public` cho M03. |
| **M03** | **Ads & phân tích từ khóa** | **Nhóm 3** | [`03-ads-keywords/`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/03-ads-keywords) | [`03-ads-keywords/`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/03-ads-keywords) | `GET/POST/PATCH /api/campaigns` | `MarketingCampaign`<br>`AdsPerformance`<br>`KeywordMetric` | - Gọi `M02/public` (`getExternalConnectorStatus`) để thống nhất đầu mối kiểm tra kết nối nguồn quảng cáo (Google Ads, GA4, Search Console). |
| **M04** | **Dashboard & báo cáo** | **Nhóm 4** | [`04-reports-dashboard/`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/04-reports-dashboard) | [`04-reports-dashboard/`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/04-reports-dashboard) | `GET/POST /api/reports`<br>`PATCH /api/reports/[id]/read` | `DepartmentReport`<br>`DepartmentReportRead` | - Đọc dữ liệu tổng hợp qua `M01/public`, `M02/public`, `M03/public`.<br>- Cung cấp `createSystemReportNotification` qua `M04/public`. |
| **M05** | **AI hỗ trợ Design** | **Nhóm 5** | [`05-ai-design/`](file:///d:/HKDN/diua_login_fix_source/diua/frontend/src/modules/05-ai-design) | [`05-ai-design/`](file:///d:/HKDN/diua_login_fix_source/diua/backend/src/modules/05-ai-design) | `GET/POST /api/ai/design` | `AuditLog` (`entity = "AI_DESIGN"`) | - Dùng `core/ai/gemini.adapter` để gọi mô hình sinh ảnh & gợi ý kỹ thuật LED. |

---

## 2. Bảng Phân Công Hạ Tầng Dùng Chung (`core` & `database`)

| Thành phần | Đường dẫn | Chủ sở hữu | Endpoint API liên quan | Bảng dữ liệu sở hữu (`schema.prisma`) |
| :--- | :--- | :--- | :--- | :--- |
| **Core Auth & Session** | `frontend/src/core/auth/`<br>`backend/src/core/auth/` | Core Team (`@truongvanlong1905`) | `POST /api/auth/login`<br>`POST /api/auth/logout`<br>`GET /api/auth/me`<br>`POST /api/auth/register` | `User` (xác thực phiên & mật khẩu), `AuditLog` (`entity = "AUTH"`) |
| **Core System & Admin** | `frontend/src/core/system/`<br>`backend/src/core/admin/` | Core Team (`@truongvanlong1905`) | `GET/POST /api/users`<br>`PATCH/DELETE /api/users/[id]`<br>`PATCH /api/users/profile`<br>`GET/POST/PATCH/DELETE /api/departments`<br>`GET/POST /api/promotions`<br>`GET/PUT /api/admin/brand`<br>`GET /api/categories`<br>`GET /api/search`<br>`GET /api/health` | `User`<br>`Department`<br>`PromotionDecision`<br>`BrandSetting`<br>`ProductCategory`<br>`AuditLog` |
| **Core Storage & AI Adapter** | `backend/src/core/storage/`<br>`backend/src/core/ai/` | Core Team (`@truongvanlong1905`) | `POST /api/upload` (ủy quyền lưu bản ghi `LeadAttachment` sang `M01/public`) | Lưu file vật lý tại `public/uploads/` |
| **Database & Prisma** | `database/prisma/schema.prisma` | Database Owner (`@truongvanlong1905`) | N/A | Quản lý schema chung 19 bảng & migrations |

---

## 3. Hướng Dẫn Thêm Một Tính Năng Mới Theo Mẫu Module

Khi một nhóm (ví dụ **Nhóm 1 - M01 Leads**) cần bổ sung một tính năng mới (ví dụ: *Đánh dấu hồ sơ Lead ưu tiên VIP*):

1. **Bước 1 — Khai báo hợp đồng dữ liệu (`contracts.ts` & `types.ts`)**:
   - Cập nhật kiểu dữ liệu và hàm kiểm tra đầu vào tại `backend/src/modules/01-leads/contracts.ts`.
   - Cập nhật kiểu dữ liệu phía giao diện tại `frontend/src/modules/01-leads/types.ts`.
2. **Bước 2 — Kiểm tra phân quyền (`policy.ts`)**:
   - Thêm hàm kiểm tra quyền (ví dụ `canToggleVipLead(user, lead)`) tại `backend/src/modules/01-leads/policy.ts`.
3. **Bước 3 — Truy vấn dữ liệu (`repository.ts`)**:
   - Viết hàm truy vấn Prisma vào bảng thuộc quyền sở hữu của module tại `backend/src/modules/01-leads/repository.ts`.
4. **Bước 4 — Xử lý nghiệp vụ (`service.ts`)**:
   - Viết logic nghiệp vụ, ghi log qua `createLogger("M01-LEADS")` tại `backend/src/modules/01-leads/service.ts`.
   - Nếu tính năng cần được module khác gọi, chỉ xuất hàm cần thiết tại `backend/src/modules/01-leads/public.ts`.
5. **Bước 5 — Nối vào Route Handler mỏng (`backend/app/api/.../route.ts`)**:
   - Route handler chỉ nhận request, gọi `service.ts` và trả kết quả qua `apiSuccess` / `handleRouteError`.
6. **Bước 6 — Cập nhật Giao diện (`frontend/src/modules/01-leads/`)**:
   - Thêm hàm gọi API trong `api.ts`, cập nhật state/action trong `hooks/useLeadsWorkspace.ts`, và hiển thị trong `components/`.
   - Xuất thành phần cần thiết qua `index.ts`.
7. **Bước 7 — Viết kiểm thử & Chạy kiểm tra ranh giới**:
   - Bổ sung test trong `backend/src/modules/01-leads/tests/` và `frontend/src/modules/01-leads/tests/`.
   - Chạy `node scripts/check-architecture.mjs` và `node scripts/run-tests.mjs` để đảm bảo không vi phạm ranh giới module.
