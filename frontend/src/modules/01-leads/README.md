# Module 01: Quản lý Lead (`01-leads` — Nhóm 1)

## Phạm vi nghiệp vụ
- Tiếp nhận, phân loại và quản lý vòng đời khách hàng tiềm năng (Lead) theo 5 trạng thái chuẩn:
  1. `Vừa nhận thông tin`
  2. `Đang soạn báo giá`
  3. `Đã gửi báo giá`
  4. `Chốt thành công`
  5. `Thất bại`
- Hỗ trợ bóc tách Lead nhanh bằng AI (`AiQuickLeadBar`), kiểm tra trùng lặp SĐT/Công ty, lập báo giá kỹ thuật LED (`LeadDetailModal` + `printable-quote.ts`), nhật ký chăm sóc/khảo sát, lịch sử kiểm toán (`LeadDetailAuditTab`), import Excel/CSV chia Sales tự động (`ImportLeadsModal`) và xuất báo cáo Excel `.xlsx`.

## Cấu trúc thư mục
- `types.ts`: Định nghĩa `Lead`, `LeadStatus`, `LeadQuoteItem`, `LeadActivityItem`, `PIPELINE_STAGES`, `PRODUCT_CATEGORIES`, `LEAD_SOURCES`, `SALES_REPS`.
- `api.ts`: Các hàm gọi API `/api/leads`, `/api/leads/[id]`, `/api/leads/[id]/status`, `/api/leads/[id]/assign`, `/api/leads/[id]/activities`, `/api/leads/[id]/quotes`, `/api/leads/import`, `/api/leads/ai-assist`, `/api/leads/check-duplicate`.
- `hooks/useLeadsWorkspace.ts`: Quản lý state danh sách Lead, bộ lọc kết hợp, tìm kiếm debounce `300ms`, hủy request cũ qua `AbortController`, và các thao tác CRUD/Export.
- `components/`:
  - `LeadsWorkspaceView.tsx`, `StatsCards.tsx`, `LeadFilters.tsx`, `LeadTable.tsx`, `AiQuickLeadBar.tsx`, `NewLeadModal.tsx`, `ImportLeadsModal.tsx`
  - `LeadDetailModal.tsx`, `LeadDetailAuditTab.tsx`, `lead-detail-constants.ts`, `printable-quote.ts`
- `index.ts`: Barrel export công khai cho `app/page.tsx` và các module khác.
