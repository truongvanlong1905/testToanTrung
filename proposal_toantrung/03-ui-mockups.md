# Giao diện mẫu

> Wireframe low-fidelity phục vụ thảo luận BA/IT, không phải bản thiết kế đồ họa đã duyệt. Điều hướng và màn hình được suy luận từ ứng dụng hiện tại.

## 1. Tổng quan

```text
┌──────────────────────┬──────────────────────────────────────────────────────────┐
│ TOÀN TRUNG           │ Tổng quan                         [Tìm kiếm] [Tài khoản] │
│                      ├──────────────────────────────────────────────────────────┤
│  Tổng quan           │  Tổng Lead   Lead mới   Đang báo giá  Chốt thành công     │
│  Lead                │  ┌────────┐  ┌────────┐  ┌──────────┐  ┌──────────────┐  │
│  Tracking            │  │   128  │  │   24   │  │    36    │  │      18      │  │
│  Quảng cáo           │  └────────┘  └────────┘  └──────────┘  └──────────────┘  │
│  Báo cáo             │                                                          │
│  AI Design           │  Lead theo trạng thái         Hiệu quả theo nguồn         │
│  Quản trị            │  ┌────────────────────────┐   ┌───────────────────────┐ │
│                      │  │ Biểu đồ / phân bố      │   │ Website, Ads, Hotline │ │
│                      │  └────────────────────────┘   └───────────────────────┘ │
│                      │  Lead mới gần đây             Hiệu suất Sales             │
│                      │  [Mã] [Khách hàng] [Trạng thái] [Phụ trách] [Xem tất cả] │
└──────────────────────┴──────────────────────────────────────────────────────────┘
```

## 2. Danh sách Lead và tiếp nhận Lead

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ Lead                                          [Tìm theo tên / SĐT / công ty]    │
│ [Trạng thái ▾] [Nguồn ▾] [Sales phụ trách ▾]                [+ Tạo Lead]       │
│ ┌───────────┬──────────────┬──────────────┬──────────────┬──────────┬────────┐ │
│ │ Mã Lead   │ Khách hàng   │ Công ty      │ Trạng thái   │ Sales    │ Thao tác│ │
│ ├───────────┼──────────────┼──────────────┼──────────────┼──────────┼────────┤ │
│ │ TT-LED…   │ Nguyễn Văn A│ Khách sạn…   │ Đang báo giá │ Trần M.  │ Chi tiết│ │
│ └───────────┴──────────────┴──────────────┴──────────────┴──────────┴────────┘ │
└────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── Tạo Lead ──────────────────────────────────────────┐
│ Thông tin liên hệ     [Tên khách hàng*] [Số điện thoại*] [Email]               │
│                       [Công ty / dự án]                                         │
│ Nhu cầu                [Sản phẩm ▾] [Mô tả nhu cầu] [Giá trị dự kiến]           │
│ Tiếp nhận              [Nguồn Lead ▾] [Sales phụ trách ▾]                      │
│                        [Địa chỉ] [Ghi chú] [Tệp đính kèm]                      │
│                                                                                │
│ Cảnh báo trùng         Kiểm tra khi nhập/lưu; nếu có kết quả, hiển thị hồ sơ   │
│                        liên quan và cho người dùng quyết định tiếp tục.        │
│                                                [Hủy] [Lưu Lead]                │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Chi tiết Lead

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ TT-LED-YYMM-XXXX   [Đang soạn báo giá ▾] [Bàn giao]                            │
│ Khách hàng: Nguyễn Văn A        Công ty: Khách sạn Royal                       │
│ Điện thoại: ...                 Email: ...             Nguồn: Website           │
│ Sản phẩm / yêu cầu kỹ thuật: ...                                               │
│ Sales phụ trách: ...             Giá trị dự kiến: ...                           │
│                                                                                │
│ [Thông tin] [Lịch sử trạng thái] [Lịch sử phân công] [Tệp đính kèm]            │
│                                                                                │
│ Cập nhật trạng thái: [Chọn trạng thái ▾] [Lý do nếu thất bại*] [Lưu]           │
│ Ghi chú: [................................................................]    │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 4. Marketing, tracking và báo cáo

```text
┌──────────────────────────── Marketing / Ads ────────────────────────────────────┐
│ [Khoảng thời gian ▾] [Nền tảng ▾] [Chiến dịch ▾]                   [Xuất báo cáo]│
│ Chi phí      Lượt hiển thị      Click      Chuyển đổi      CPC / CTR             │
│ ┌────────────────────────────────────────────────────────────────────────────┐ │
│ │ Biểu đồ theo thời gian / so sánh chiến dịch                                 │ │
│ └────────────────────────────────────────────────────────────────────────────┘ │
│ Danh sách chiến dịch                         Từ khóa                            │
│ [Tên] [Nền tảng] [Ngân sách] [Chi phí]        [Từ khóa] [Click] [CPC]          │
└────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── Tracking ───────────────────────────────────────────┐
│ Tổng sự kiện [..]   Đồng bộ: Google Ads [Trạng thái] GA4 [Trạng thái]           │
│ Tạo link UTM: [URL] [source] [medium] [campaign]                    [Sao chép]   │
│ Sự kiện gần đây: [Thời gian] [Landing page] [Nguồn/UTM] [Thiết bị]              │
└────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────── Báo cáo phòng ban ──────────────────────────────────┐
│ [Tất cả phòng ban ▾] [Tìm báo cáo]                             [+ Tạo báo cáo]  │
│ [Tiêu đề] [Phòng ban] [Người tạo] [Ngày] [Đã đọc/Chưa đọc] [Mở]                │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 5. AI Design

```text
┌──────────────────────────── AI Design ─────────────────────────────────────────┐
│ Trạng thái dịch vụ: [Đã cấu hình / Chưa cấu hình / Không khả dụng]              │
│ [Banner] [Storyboard] [Mockup]                                                  │
│ Mô tả yêu cầu: [.............................................................]  │
│ Tỷ lệ: [16:9 ▾]  Kích thước LED: [Rộng] x [Cao]  Ảnh đầu vào: [Tải lên]       │
│                                      [Tạo bản nháp]                             │
│ Kết quả: [Preview] [Tạo lại] [Tải xuống]                                        │
│ Thông báo rõ lỗi cấu hình, giới hạn dịch vụ hoặc lỗi xử lý; không giả kết quả.  │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 6. Nguyên tắc UI cần xác nhận

- Giao diện ưu tiên tiếng Việt, responsive desktop/mobile.
- Trường bắt buộc, lỗi validation và xác nhận cảnh báo cần nhất quán.
- Hiển thị role và trạng thái quyền; không dựa vào việc ẩn nút để thay thế kiểm tra quyền ở API.
- Tracking không hiển thị/lưu dữ liệu cá nhân không cần thiết.
- Các nút đồng bộ/AI phải thể hiện trạng thái thật, lỗi và thời điểm cập nhật.
- Màu sắc, logo, font và tiêu chuẩn truy cập cần đại diện Toàn Trung duyệt.

