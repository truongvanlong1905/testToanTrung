# Kiến trúc và ranh giới chỉnh sửa

```text
frontend/                       Giao diện Next.js, cổng 3001
  app/                           Các trang
  components/                    UI theo layout, lead, views
  proxy.ts                       Bảo vệ trang/session
backend/                         API Next.js, cổng 3002
  app/api/                       HTTP handlers
  backend/services/              Logic nghiệp vụ phía server
  proxy.ts                       Bảo vệ API
  public/uploads/                Tệp upload; production cần storage bền vững
database/                        Schema SQLite, Prisma client và file dữ liệu
  prisma/schema.prisma           SQLite schema
  data/source.sqlite             Local database
  src/index.ts                   Prisma client dùng chung
```

## Sửa ở đâu?

- Giao diện/layout: `frontend/components/` và `frontend/app/`.
- Hợp đồng HTTP, status code, cookie: `backend/app/api/<module>/route.ts`.
- Logic nghiệp vụ tái sử dụng: `backend/backend/services/<module>/`.
- Schema, client và thao tác dữ liệu: `database/`.
- Proxy web tới API: `frontend/next.config.mjs`.

Web proxy `/api/*` và `/uploads/*` server-side tới API. Trình duyệt chỉ giao tiếp với
web origin nên giữ được session cookie cùng origin. Có thể deploy web và API riêng:
đặt `API_BASE_URL` ở web trỏ tới API. Chỉ API giữ `DATABASE_URL`, Gemini key và bí mật
server. Không import `@toantrung/database` vào frontend.
