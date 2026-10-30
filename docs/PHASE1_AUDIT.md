# TOÀN TRUNG MARKETING MANAGEMENT - SOURCE CODE AUDIT (PHASE 1)

## 1. Thông tin Framework & Môi trường
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **UI Components**: Square UI minimalist design pattern, Lucide Icons, clsx, tailwind-merge
- **Node runtime**: Node.js v26.13.0, npm 11.20.0

## 2. Cấu trúc Source Code hiện hữu
```
D:\HKDN\DIUA
├── app/
│   ├── globals.css         # Base styles & custom scrollbar
│   ├── layout.tsx          # RootLayout with Inter font & metadata
│   └── page.tsx            # Trang Quản lý Lead (Frontend UI + Mock state)
├── components/
│   ├── layout/
│   │   ├── Header.tsx      # Header với thanh tìm kiếm, thông báo, User Profile
│   │   └── Sidebar.tsx     # Sidebar phong cách Square UI (Workspace + Admin)
│   └── leads/
│       ├── LeadDetailModal.tsx   # Modal xem chi tiết Lead & cập nhật trạng thái
│       ├── LeadFilters.tsx       # Bộ lọc tìm kiếm, trạng thái, nguồn khách, sales
│       ├── LeadTable.tsx         # Bảng 8 cột dữ liệu Lead + Pastel Badges + Phân trang
│       ├── NewLeadModal.tsx      # Form tạo Lead mới
│       └── StatsCards.tsx        # 4 Card số liệu: Tổng Lead, Mới, Đang báo giá, Thành công
├── data/
│   └── mockLeads.ts        # 10 mẫu dữ liệu ban đầu chuyên ngành LED & Bảng điện tử
├── lib/
│   └── utils.ts            # Hàm cn() gộp class Tailwind
├── types/
│   └── lead.ts             # Định nghĩa Type Lead, LeadStatus, LeadSource
├── package.json
└── tsconfig.json
```

## 3. Bảng đối chiếu chức năng Hiện có / Cần xây dựng (Phase 1 Checklist)

| Hạng mục | Hiện có (Frontend) | Cần xây dựng (Backend & Database) |
| :--- | :--- | :--- |
| **Giao diện Quản lý Lead** | Đã hoàn thiện (Sidebar, Header, 4 Thẻ, Bảng 8 cột, Pastel Badges, Phân trang) | Giữ nguyên 100%, không thay đổi layout |
| **Dữ liệu Lead** | Mock data lưu tạm trên React state | Lưu trữ vĩnh viễn trong Database (Prisma ORM) |
| **Authentication & Session** | Chưa có (hiển thị tĩnh avatar Toàn Trung Admin) | Đăng nhập/Đăng xuất, JWT Cookie HttpOnly, bcrypt hash mật khẩu |
| **Phân quyền (RBAC)** | Chưa có | ADMIN, SALES, MARKETING với middleware xác thực quyền từ Server |
| **Lưu lịch sử trạng thái** | Chưa có | Bảng `LeadStatusHistory` tự động ghi nhận mỗi lần đổi trạng thái |
| **Lý do khi Thất bại** | Chưa có | Bắt buộc nhập lý do khi chuyển trạng thái sang "Thất bại" |
| **Phân công Sales & Lý do** | Chưa có lưu vết | Bảng `LeadAssignments` ghi nhận người gán, người được gán, lý do |
| **Cảnh báo trùng lặp** | Chưa có | API kiểm tra trùng Phone, Email, Tên khách hoặc Tên công ty/dự án |
| **Upload file / Ảnh hiện trạng** | Chưa có trên UI form | API `/api/upload` lưu file vào `/public/uploads` + Bảng `LeadAttachments` |
| **Audit Logs** | Chưa có | Bảng `AuditLogs` ghi lại hành vi tạo/sửa/xóa của người dùng |
| **API Contract & Endpoints** | Chưa có Route Handler | Xây dựng chuẩn RESTful JSON APIs tại `/api/...` |

