# DATABASE OWNERSHIP BY MODULE

Tài liệu phân định quyền sở hữu các bảng dữ liệu (Prisma Models) trong `Database/prisma/schema.prisma` theo 5 Module nghiệp vụ và phần Dùng chung (Shared).

---

## Module 1 – Lead Management
- `Lead` → Module 1
- `ProductCategory` → Module 1
- `LeadStatusHistory` → Module 1
- `LeadAssignment` → Module 1
- `LeadAttachment` → Module 1

## Module 2 – Tracking
- `TrackingEvent` → Module 2
- `SyncJob` → Module 2

## Module 3 – Ads & Keywords
- `MarketingCampaign` → Module 3
- `AdsPerformance` → Module 3
- `KeywordMetric` → Module 3

## Module 4 – Dashboard & Reports
- `DepartmentReport` → Module 4
- `DepartmentReportRead` → Module 4

## Module 5 – Design / AI
- *(Chưa có bảng riêng trong schema hiện tại; dự kiến mở rộng `DesignJob` cho Module 5 khi cần lưu lịch sử thiết kế AI)* → Module 5

## Shared / Core System (Dùng chung toàn hệ thống)
- `User` → Shared (Auth, RBAC, Hồ sơ nhân sự)
- `BrandSetting` → Shared (Cấu hình nhận diện thương hiệu)
- `AuditLog` → Shared (Nhật ký hệ thống)

