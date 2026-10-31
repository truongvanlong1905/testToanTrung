# Quy chuẩn Hiệu năng Giao diện (UI Performance Rules) — Toàn Trung CRM

Tài liệu này quy định các nguyên tắc bắt buộc khi phát triển **Modal, Drawer/Sheet, Form nhiều trường, Bảng dữ liệu lớn và Animation** trên toàn bộ hệ thống Frontend (`Next.js App Router + React`). Mọi tính năng mới thuộc Module 1–5 bắt buộc phải tuân thủ trước khi merge.

---

## 1. Quy tắc thiết kế Modal / Drawer / Sheet

1. **Sử dụng Shared `<Modal />` (`components/ui/modal.tsx`)**:
   - Mọi popup tiêu chuẩn phải dùng `<Modal />` dùng chung (đã tích hợp `React.memo`, Focus Trap `Tab`/`Shift+Tab`, `Escape` close, reference-counted scroll lock và đo hiệu năng `recordModalOpenMetric`).
   - Nếu xây dựng Slide-over Drawer riêng (như `LeadDetailModal`), bắt buộc dùng `lockBodyScroll()` / `unlockBodyScroll()` từ `@/components/ui/modal` thay vì gán trực tiếp `document.body.classList` để tránh xung đột khi mở chồng 2 modal.
2. **Preload Dynamic Modal Chunks sau khi trang Idle**:
   - Các modal nặng được tách bằng `next/dynamic(..., { ssr: false })` bắt buộc phải được preload trong `requestIdleCallback` (hoặc `setTimeout(..., 600)`) sau khi trang chính mount xong.
   - **Lý do**: Tránh độ trễ 300ms–900ms tải mạng chunk JS ở lần click đầu tiên của người dùng.
3. **Không dùng `backdrop-blur` trên lớp phủ toàn màn hình (`fixed inset-0`)**:
   - **CẤM**: `backdrop-blur-*` trên overlay phủ toàn viewport đang chạy animation `opacity`/`transform`.
   - **CHUẨN**: Dùng `bg-slate-950/60 animate-fade-in` cho backdrop và `.modal-panel` / `.sheet-panel` (`will-change: transform, opacity; transform: translateZ(0)`) cho khung nội dung.
4. **Chống giật bố cục (Layout Shift) khi khóa cuộn trang**:
   - Giữ nguyên `scrollbar-gutter: stable` trên `html` tại `app/globals.css` để khi thêm `body.overflow-locked` (`overflow: hidden`), chiều rộng trang không bị nhảy 15px–17px và không kích hoạt full-page reflow.

---

## 2. Quy tắc cô lập State trong Form (State Isolation)

1. **CẤM đặt state của các trường input trong Modal ở Component trang cha**:
   - **Sai lầm phổ biến**: Đặt `formName`, `formBudget`, `reportContent`, `editUser*` ngay trong `AdsView`, `ReportsView`, `AdminUsersView`, `NotificationsView`. Mỗi lần gõ 1 ký tự (`onChange`) sẽ khiến toàn bộ trang cha, các thẻ KPI và bảng dữ liệu hàng trăm dòng phía sau render lại trên mỗi phím bấm.
   - **Chuẩn bắt buộc**: Tách form của Modal thành một component con độc lập bọc `React.memo` (ví dụ: `<CreateCampaignModal />`, `<ReportComposerModal />`, `<EditUserModal />`, `<ComposeNotificationModal />`). Trang cha chỉ giữ duy nhất state `isOpen: boolean` (hoặc `editingItem: T | null`).
2. **Tách các cụm tương tác tần suất cao trong cùng một Modal lớn**:
   - Với modal có từ 10 trường trở lên kèm công cụ phụ trợ (như khung **AI Smart Paste** trong `NewLeadModal`), phải tách khung AI thành component con bọc `React.memo` (`<AiSmartPasteSection />`). Khi người dùng gõ hoặc dán văn bản dài vào ô AI, 15 trường form bên dưới không bị render lại cho tới khi người dùng bấm **"AI Bóc tách điền vào Form"**.
3. **Sử dụng `useDeferredValue` cho ô nhập/dán dữ liệu hàng loạt**:
   - Với các modal phân tích dữ liệu tức thì từ textarea lớn (như `ImportLeadsModal` bóc tách hàng trăm dòng CSV/Excel hoặc bộ lọc bảng lớn), phải bọc giá trị chuỗi bằng `useDeferredValue(rawText)` trước khi đưa vào `useMemo` parser để giữ tốc độ gõ phím luôn đạt 60fps.

---

## 3. Quy tắc gọi API & Caching khi mở Popup

1. **Không gọi `fetch()` trùng lặp không có cache khi mở Modal**:
   - Sử dụng `sharedGetJson<T>(url, ttlMs)` và `peekSharedJson<T>(url, maxAgeMs)` từ `@/lib/shared-fetch`.
   - Ví dụ: Danh sách nhân sự Sales (`/api/users?role=SALES`) dùng chung giữa `AiQuickLeadBar`, `NewLeadModal` và `LeadDetailModal` phải khởi tạo đồng bộ từ `peekSharedJson("/api/users?role=SALES", 60_000)` để hiển thị ngay lập tức ở frame đầu tiên (0ms network wait, 0 re-render giữa chừng khi đang chạy animation mở modal).
   - Khi cập nhật dữ liệu gốc (ví dụ thêm/sửa nhân sự trong `AdminUsersView`), gọi `invalidateSharedJson("/api/users")` để làm mới cache.
2. **Debounce + Minimum Length + `AbortController` cho API kiểm tra tức thì**:
   - Mọi API chạy theo thao tác gõ phím (như `/api/leads/check-duplicate`) bắt buộc phải:
     - Chỉ kích hoạt khi dữ liệu đủ độ dài tối thiểu (VD: SĐT `>= 6` chữ số hoặc tên/công ty `>= 3` ký tự).
     - Debounce tối thiểu `350ms`.
     - Hủy request cũ bằng `AbortController` khi người dùng gõ tiếp hoặc đóng modal.
     - Không cập nhật state thừa (như `isCheckingDuplicate` nếu UI không hiển thị spinner riêng) để tránh nhân đôi số lần render.

---

## 4. Quy tắc Animation & CSS Compositor

1. **Chỉ animate `transform` và `opacity`**:
   - Tuyệt đối không animate `height`, `width`, `top`, `left`, `margin`, `padding`, hoặc `filter`/`backdrop-filter`.
2. **Thời lượng chuẩn**:
   - Mở/đóng Modal & Popover: `140ms – 160ms` (`cubic-bezier(0.16, 1, 0.3, 1)`).
   - Mở/đóng Slide-over Drawer: `180ms` (`cubic-bezier(0.16, 1, 0.3, 1)`).
   - Auto-focus vào ô input đầu tiên trong modal phải đặt trong `requestAnimationFrame` để không chặn frame paint đầu tiên.
3. **Tôn trọng `prefers-reduced-motion`**:
   - Mọi class animation trong `app/globals.css` phải được tắt tự động khi hệ điều hành bật `prefers-reduced-motion: reduce`.

---

## 5. Quy tắc Cleanup & Quản lý Bộ nhớ (Memory Leak Prevention)

1. Mọi `window.addEventListener("keydown" | "mousedown" | "scroll")` chỉ được đăng ký khi `open === true` và phải gỡ bỏ ngay trong hàm cleanup của `useEffect`.
2. Mọi `setTimeout` / `requestAnimationFrame` / `AbortController` trong modal phải được hủy khi component unmount hoặc khi `open` chuyển sang `false`.

---

## 6. Checklist Review bắt buộc cho Module 1 – 5 (PR Checklist)

Trước khi hoàn tất bất kỳ tính năng hay popup mới nào, lập trình viên và QA phải đánh dấu kiểm tra đủ 8 mục sau:

- [ ] **1. State Isolation**: Gõ 1 ký tự vào bất kỳ input/textarea nào trong popup **KHÔNG** làm component trang cha (`LeadPage`, `AdsView`, `ReportsView`, `AdminUsersView`, `NotificationsView`) render lại.
- [ ] **2. Open Latency (< 50ms)**: Thời gian từ lúc click nút mở đến frame hiển thị đầu tiên (`window.__TT_MODAL_PERF__`) đạt `< 50ms` ở lần mở thứ 2 trở đi (và chunk `next/dynamic` đã được preload khi idle).
- [ ] **3. Compositor-Only Animation**: Popup không chứa `backdrop-blur` trên lớp phủ toàn màn hình; sử dụng `.modal-panel` hoặc `.sheet-panel`.
- [ ] **4. Zero Layout Shift**: Mở và đóng popup không làm dịch chuyển ngang thanh cuộn hoặc nội dung bảng phía sau (`scrollbar-gutter: stable` + `lockBodyScroll`).
- [ ] **5. Smart Network & Cache**: Mở popup không bắn lại các API danh mục tĩnh đã có trong `sharedGetJson(url, ttlMs)`. Các API tìm kiếm/kiểm tra trùng có `AbortController` + debounce.
- [ ] **6. Keyboard & Focus Accessibility**: Nhấn `Escape` đóng được popup (có cảnh báo nếu đang nhập dở dữ liệu quan trọng), `Tab`/`Shift+Tab` giữ focus bên trong popup, đóng popup trả focus về nút đã mở.
- [ ] **7. Dark Mode & Responsive Mobile**: Kiểm tra ở cả Light Mode, Dark Mode (`html.dark`) và màn hình điện thoại (`375px`) không bị tràn ngang, không bị dải nền trắng cứng (`via-white`).
- [ ] **8. Build & Type Safety**: Chạy pass `node scripts/predev.mjs`, `tsc --noEmit`, và `npm.cmd run build:web` không phát sinh lỗi.

