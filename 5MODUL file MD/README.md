# Bộ tài liệu định hướng 5 Module – Toàn Trung CRM

Bộ tài liệu này dùng để **thống nhất hướng phát triển trước khi giao cho 5 nhóm đánh giá và triển khai**.
Nguồn yêu cầu gồm 2 phần:

1. **Bảng yêu cầu 5 module** (yêu cầu nghiên cứu, mục đích cuối cùng, đầu ra cần có).
2. **Yêu cầu trực tiếp từ team BA – bộ phận Marketing Toàn Trung** (Module 1, 4, 5).

## Danh sách tài liệu

| STT | File | Nội dung | Mức chi tiết |
| :---: | :--- | :--- | :---: |
| 0 | [00_TONG_QUAN_VA_LIEN_KET.md](./00_TONG_QUAN_VA_LIEN_KET.md) | Tổng quan, liên kết giữa 5 module, dữ liệu dùng chung, lộ trình chung | ⭐⭐⭐ |
| 0.1 | [01_MOI_LIEN_KET_5_MODULE.md](./01_MOI_LIEN_KET_5_MODULE.md) | **Mối liên kết 5 module – bản tóm tắt dễ xem** (sơ đồ, giải thích mũi tên, bảng ai cần gì của ai) | ⭐⭐⭐ Đọc đầu tiên |
| 1 | [M01_QUAN_LY_LEAD.md](./M01_QUAN_LY_LEAD.md) | Quản lý Lead – chống trùng, khách quay lại, phân loại tiềm năng | ⭐⭐⭐ Trọng tâm |
| 2 | [M02_TRACKING_DONG_BO.md](./M02_TRACKING_DONG_BO.md) | Tracking nguồn Lead & đồng bộ đa kênh | ⭐⭐ |
| 3 | [M03_ADS_TU_KHOA.md](./M03_ADS_TU_KHOA.md) | Ads & phân tích từ khóa – nối chi phí quảng cáo với Lead/doanh thu thật | ⭐⭐⭐ Trọng tâm |
| 4 | [M04_DASHBOARD_BAO_CAO.md](./M04_DASHBOARD_BAO_CAO.md) | Dashboard & báo cáo theo ngày/tuần/tháng/năm, theo dòng sản phẩm | ⭐⭐ |
| 5 | [M05_AI_DESIGN.md](./M05_AI_DESIGN.md) | AI hỗ trợ Design – quy trình Design & phối cảnh LED đúng tỉ lệ thật | ⭐⭐⭐ Trọng tâm |
| 6 | [06_GOP_Y_VA_CAU_HOI_CAN_CHOT.md](./06_GOP_Y_VA_CAU_HOI_CAN_CHOT.md) | Góp ý bổ sung, câu hỏi cần chốt với MKT/BA, mẫu phiếu đánh giá cho các nhóm | ⭐⭐ |
| 7 | [07_HUONG_PHAT_TRIEN_DU_AN_LON.md](./07_HUONG_PHAT_TRIEN_DU_AN_LON.md) | Hướng phát triển từng module (M01–M05) cho dự án lớn, liên kết bằng sự kiện nghiệp vụ, lộ trình theo giai đoạn | ⭐⭐⭐ |
| 8 | [08_SO_DO_LIEN_KET_HE_THONG.md](./08_SO_DO_LIEN_KET_HE_THONG.md) | 7 sơ đồ liên kết hệ thống: toàn cảnh, người dùng, dòng dữ liệu, vòng đời dự án, module gọi nhau, dữ liệu, kết nối ngoài | ⭐⭐⭐ Đọc đầu tiên |

## Cách dùng bộ tài liệu

1. Đọc `00_TONG_QUAN_VA_LIEN_KET.md` trước để nắm bức tranh chung và các điểm nối giữa module.
2. Mỗi nhóm đọc file module của mình, **tập trung các mục "Hiện trạng", "Hướng phát triển" và "Câu hỏi cần chốt"**.
3. Các nhóm phản hồi theo **mẫu phiếu đánh giá** trong `06_GOP_Y_VA_CAU_HOI_CAN_CHOT.md`.
4. Sau khi chốt, cập nhật lại tài liệu kỹ thuật chính thức trong `docs/modules/<module>/README.md`.

## Quy ước

- **Bắt buộc (Must)** – phải có trong bản triển khai đầu tiên.
- **Nên có (Should)** – làm ngay sau khi bản đầu ổn định.
- **Mở rộng (Could)** – làm khi có thời gian/ngân sách.
- Mọi số liệu, ví dụ trong tài liệu là **đề xuất**, cần MKT/BA xác nhận lại trước khi triển khai.
