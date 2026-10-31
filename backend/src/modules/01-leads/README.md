# Module 01: Quản Lý Lead (`01-leads`)

## Phạm vi nghiệp vụ (Nhóm 1)
- Tiếp nhận, phân loại, chấm điểm ưu tiên (`priorityScore`, `priorityTier`), theo dõi SLA 2h và chống trùng lặp Số điện thoại / Email khách hàng màn hình LED B2B.
- Quản lý vòng đời trạng thái Lead (`LeadStatusHistory`), bàn giao Sales thủ công & chia tự động Round-Robin khi Import (`LeadAssignment`).
- Lập báo giá m² màn hình LED (`LeadQuote`), kiểm tra ngưỡng chiết khấu > 8% hoặc dự án ≥ 200 triệu trình Giám đốc ký duyệt và tự động gửi thông báo qua `@/src/modules/04-reports-dashboard/public`.
- Nhật ký chăm sóc khách hàng (`LeadActivity`), đính kèm bản vẽ CAD/hình ảnh công trình (`LeadAttachment`) và Trợ lý AI Phân tách nhanh & Tư vấn cấu hình LED (`lead-ai.service.ts`).

## Bảng dữ liệu sở hữu (Owned Tables)
- `Lead`
- `LeadActivity` (`Activity`)
- `LeadQuote` (`Quote`)
- `LeadAttachment` (`Attachment`)
- `LeadStatusHistory` (`LeadHistory`)
- `LeadAssignment` (`AssignmentLog`)

## Sub-services
- `lead-scoring.service.ts` — Tính điểm Lead (`calculateLeadScore`), SLA (`computeLeadSla`), định dạng VND & sinh mã chống trùng (`extractMaxCodeSuffix`).
- `lead-status.service.ts` — Chuyển trạng thái Lead, kiểm tra bắt buộc `failureReason` khi chọn `Thất bại`.
- `lead-assignment.service.ts` — Bàn giao Sales phụ trách & Import hàng loạt chia đều Round-Robin.
- `lead-quote.service.ts` — Khởi tạo báo giá m² LED & quy trình Giám đốc phê duyệt giá/chiết khấu.
- `lead-ai.service.ts` — AI phân tách nhanh ghi chú tiếng Việt & Sales Copilot.

## HTTP Endpoints
- `GET /api/leads` & `POST /api/leads`
- `GET /api/leads/[id]` & `PATCH /api/leads/[id]`
- `GET /api/leads/[id]/activities` & `POST /api/leads/[id]/activities`
- `POST /api/leads/[id]/assign`
- `GET /api/leads/[id]/quotes`, `POST /api/leads/[id]/quotes` & `PATCH /api/leads/[id]/quotes`
- `PATCH /api/leads/[id]/status`
- `POST /api/leads/ai-assist`
- `GET /api/leads/analytics`
- `POST /api/leads/check-duplicate`
- `POST /api/leads/import`

## Public Exports (`public.ts`)
- `attachUploadedFileToLead`
- `searchLeadsPublic`
- `getLeadsDashboardSnapshot`
- `parseVndString`
- `formatVndNumber`
- `extractMaxCodeSuffix`
- `calculateLeadScore`

## Mã lỗi chuẩn (Error Codes)
- `VALIDATION_ERROR` (400)
- `REASON_REQUIRED` (400)
- `MISSING_PHONE` (422)
- `FORBIDDEN` (403)
- `NOT_FOUND` / `SALES_NOT_FOUND` (404)
