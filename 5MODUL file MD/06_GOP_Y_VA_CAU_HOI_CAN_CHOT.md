# 06 – Góp ý bổ sung, câu hỏi cần chốt & mẫu đánh giá cho các nhóm

## 1. Góp ý bổ sung để phát triển tốt hơn

| # | Góp ý | Lý do |
| :---: | :--- | :--- |
| 1 | **Chốt dữ liệu dùng chung trước khi các nhóm code** (dòng LED, nguồn Lead, trạng thái, lý do thất bại, định nghĩa "Lead đạt chuẩn") | Nếu mỗi nhóm tự đặt, M03/M04 sẽ ra số liệu lệch nhau |
| 2 | **Ưu tiên M01 và M02 trước M03, M04** | Báo cáo và phân tích Ads chỉ đúng khi Lead sạch và có nguồn |
| 3 | **Tách "Khách hàng" và "Lead/Yêu cầu"** trong M01 | Giải quyết đúng yêu cầu khách hỏi lại sau 1–3–6–12 tháng |
| 4 | **Mỗi module cam kết 3–5 KPI đo được** | Đánh giá được hiệu quả sau triển khai, không chỉ "đã làm xong tính năng" |
| 5 | **Thử nghiệm thực tế (pilot) 2–4 tuần với 2–3 Sales và 1 Designer** trước khi áp dụng toàn công ty | Phát hiện vướng mắc thực tế sớm, ít tốn chi phí sửa |
| 6 | **Quy tắc giữ khách phải có văn bản** do lãnh đạo Kinh doanh ký | Tránh tranh cãi khi hệ thống tự chuyển khách |
| 7 | **Bảo vệ dữ liệu cá nhân** theo Nghị định 13/2023/NĐ-CP: ẩn một phần SĐT với người không phụ trách, ghi log xem/xuất dữ liệu | Rủi ro pháp lý và rò rỉ khách sang đối thủ |
| 8 | **Đăng ký sớm quyền API** (Google Ads Developer Token, GA4, Search Console, Zalo OA) | Google duyệt Developer Token mất thời gian |
| 9 | **Không hiển thị số liệu mẫu như số thật** | Giữ niềm tin của lãnh đạo vào báo cáo |
| 10 | **Đào tạo ngắn + hướng dẫn ngay trong ứng dụng** (chụp ảnh khảo sát, nhập Lead) | Chất lượng đầu vào quyết định chất lượng đầu ra |

## 2. Tổng hợp câu hỏi cần chốt với MKT/BA

| Module | Câu hỏi | Người chốt |
| :--- | :--- | :--- |
| Chung | Danh sách dòng LED chính thức (pitch, cabinet, đơn giá)? | Kinh doanh + Kỹ thuật |
| Chung | Danh sách nguồn Lead chuẩn? | Marketing |
| M01 | Thời hạn giữ khách? Tính từ khi tạo hay lần tương tác cuối? | Trưởng phòng Kinh doanh |
| M01 | Có thu thập Mã số thuế không? "Trùng dự án" hiểu thế nào? | MKT/BA |
| M01 | Lịch chăm sóc lại 1–3–6–12 tháng áp dụng cho lý do nào? | MKT/BA |
| M02 | Website chạy nền tảng gì, ai gắn script? Có tài khoản Google Ads MCC, GA4, GSC? | Marketing |
| M03 | Định nghĩa "Lead đạt chuẩn"? Doanh thu tính theo báo giá chốt hay thực thu? | MKT + Kế toán |
| M03 | Ngưỡng cảnh báo từ khóa "đốt tiền"? | Marketing |
| M04 | Nhập Excel cho loại dữ liệu nào? Mẫu báo cáo lãnh đạo đang dùng? | MKT/BA |
| M05 | Ai được tạo phối cảnh? Ngân sách AI/tháng? Có đóng logo lên ảnh không? | MKT + Design |

## 3. Mẫu phiếu đánh giá cho các nhóm

> Mỗi nhóm sao chép mẫu này, điền và gửi lại trước buổi họp chốt.

```markdown
# Phiếu đánh giá – Module: ______  – Nhóm: ______

## 1. Mức độ đồng ý với hướng phát triển (1–5): __
## 2. Chức năng đồng ý giữ / đề nghị bỏ / đề nghị thêm
| Chức năng | Giữ / Bỏ / Thêm | Lý do |
| --- | --- | --- |

## 3. Ước lượng công sức
| Hạng mục | Số ngày công | Người phụ trách |
| --- | --- | --- |

## 4. Phụ thuộc vào module khác (cần gì, từ ai, khi nào)
## 5. Rủi ro nhóm thấy được
## 6. Câu hỏi cần MKT/BA trả lời
## 7. KPI nhóm cam kết đo sau triển khai
```

## 4. Đề xuất lịch làm việc
| Tuần | Hoạt động |
| :---: | :--- |
| 1 | Gửi bộ tài liệu cho 5 nhóm + MKT/BA; các nhóm điền phiếu đánh giá |
| 1 | Họp chốt master data và câu hỏi mục 2 |
| 2 | Các nhóm chốt thiết kế chi tiết (API, dữ liệu, giao diện) trong `docs/modules/<module>/README.md` |
| 3–6 | Triển khai Giai đoạn 1 (M01, M02, M05 trước) |
| 7–8 | Pilot với nhóm Sales/Design nhỏ, đo KPI, điều chỉnh |
