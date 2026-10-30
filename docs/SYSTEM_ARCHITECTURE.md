# KIẾN TRÚC HỆ THỐNG TOÀN TRUNG – MARKETING MANAGEMENT
*Đơn vị chủ quản: Công ty Cổ phần Điện tử Viễn thông Toàn Trung*

---

## 1. Tổng quan kiến trúc

Mã nguồn được tách thành ba workspace. Frontend và Backend chạy Next.js độc lập;
Backend dùng Prisma để truy cập trực tiếp SQLite trong workspace Database.

```mermaid
graph TD
    Client["Trình duyệt"] -->|HTTP / JSON / Cookie| Frontend["Frontend :3001"]
    Frontend -->|Proxy /api và /uploads| Backend["Backend :3002"]
    
    subgraph "Backend"
        Backend --> Proxy["Proxy xác thực (JWT / Cookie)"]
        Proxy --> Routes["Route handlers (/api/...)"]
        Routes --> Services["Dịch vụ nghiệp vụ"]
        Routes --> Prisma["Prisma Client"]
    end
    
    subgraph "Data & External Layer"
        Prisma --> SQLite["database/data/source.sqlite"]
        Routes --> Uploads["backend/public/uploads"]
    end
```

---

## 2. Cấu trúc thư mục

```
diua/
├── frontend/              # Giao diện và proxy cùng origin
├── backend/               # API, xác thực, nghiệp vụ và upload
├── database/              # Prisma schema/client và SQLite local
├── docs/
└── PROJECT_HANDOFF.md
```
