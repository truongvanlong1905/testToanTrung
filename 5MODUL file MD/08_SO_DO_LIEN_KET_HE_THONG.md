# 08 – Sơ đồ liên kết hệ thống 5 Module (Phiên bản Dễ Quan Sát)

Tài liệu này dùng **sơ đồ trực quan** để làm rõ 5 module liên kết với nhau như thế nào trong hệ thống. Để tránh việc 14 mũi tên cắt chéo nhau gây rối mắt, sơ đồ tổng quan dưới đây được **chia thành 4 tầng từ trên xuống** và **tách riêng phần Nền tảng chung (Core)**.

---

## ★ Sơ đồ 00A – Luồng Nghiệp vụ Chính Giữa 5 Module (Chia 4 Tầng Không Cắt Dây)

```mermaid
flowchart TD
    subgraph T1["TẦNG 1: CỬA TIẾP NHẬN & ĐỒNG BỘ DỮ LIỆU"]
        M02["<b>Nhóm 2 (M02): Tracking & Đồng bộ</b><br/>Thu thập Form Web, Zalo, FB, Hotline, UTM/gclid"]
    end

    subgraph T2["TẦNG 2: TRUNG TÂM XỬ LÝ KHÁCH HÀNG & DỰ ÁN"]
        M01["<b>★ Nhóm 1 (M01): Quản lý Lead & Cơ hội Dự án</b><br/>Lọc trùng SĐT • Giao Sales • Chấm Lead nét • Báo giá & Hợp đồng"]
    end

    subgraph T3["TẦNG 3: HAI NHÁNH TỐI ƯU QUẢNG CÁO & AI THIẾT KẾ"]
        M03["<b>★ Nhóm 3 (M03): Ads & Từ khóa</b><br/>Tính CPL, CPQL, ROAS • Báo từ khóa lãng phí"]
        M05["<b>★ Nhóm 5 (M05): AI Hỗ trợ Design</b><br/>Nhận Brief • Ghép phối cảnh LED đúng tỉ lệ W×H"]
    end

    subgraph T4["TẦNG 4: TỔNG HỢP & BÁO CÁO ĐIỀU HÀNH"]
        M04["<b>Nhóm 4 (M04): Dashboard & Báo cáo</b><br/>Báo cáo Ngày/Tuần/Tháng/Năm • Theo Dòng LED • Xuất Excel"]
    end

    M02 -->|"1. Lead thô + Nguồn & Campaign"| M01
    M02 -->|"2. Chi phí Ads & Click chuẩn"| M03

    M01 -->|"3. Kết quả Sales (Lead nét / Doanh thu)"| M03
    M01 -->|"4a. Giao Brief + Ảnh mặt bằng + W×H"| M05
    M05 -.->|"4b. Trả ảnh Phối cảnh LED + Số tấm Cabinet"| M01

    M03 -->|"5. KPI Ads đã thống nhất"| M04
    M01 -->|"6. Tiến độ Lead & Doanh số"| M04
    M05 -->|"7. Trạng thái & SLA Design"| M04

    style M02 fill:#0f2942,stroke:#38bdf8,stroke-width:2px,color:#ffffff
    style M01 fill:#063928,stroke:#34d399,stroke-width:3px,color:#ffffff
    style M03 fill:#3b2506,stroke:#fbbf24,stroke-width:2px,color:#ffffff
    style M05 fill:#2e1045,stroke:#c084fc,stroke-width:2px,color:#ffffff
    style M04 fill:#1e293b,stroke:#94a3b8,stroke-width:2px,color:#ffffff
```

---

## ★ Sơ đồ 00B – Trọng tâm Phối hợp 3 Module Cốt lõi: `M03 (Ads)` ⇄ `M01 (Lead)` ⇄ `M05 (AI Design)`

```mermaid
flowchart LR
    subgraph ADS["NHÓM 3 (M03): ADS & TỪ KHÓA"]
        A1["Chi phí Chiến dịch & Từ khóa"]
        A2["Tính CPQL & ROAS thực tế"]
        A3["Cảnh báo Từ khóa đốt tiền"]
        A1 --> A2 --> A3
    end

    subgraph LEAD["NHÓM 1 (M01): QUẢN LÝ LEAD & DỰ ÁN"]
        L1["Lọc trùng & Khóa Sales sở hữu"]
        L2["Đánh giá Lead Nét & Nhu cầu LED"]
        L3["Báo giá & Chốt Hợp đồng"]
        L1 --> L2 --> L3
    end

    subgraph DESIGN["NHÓM 5 (M05): AI DESIGN PHỐI CẢNH"]
        D1["Nhận Brief & Ảnh khảo sát"]
        D2["Khớp 4 góc tường & Chia Cabinet"]
        D3["Render AI Phối cảnh LED tỉ lệ thật"]
        D1 --> D2 --> D3
    end

    A1 -->|"Gắn mã gclid / UTM"| L1
    L2 -->|"Báo Lead Nét (Qualified)"| A2
    L3 -->|"Báo Giá trị Hợp đồng"| A2

    L2 -->|"Tạo Brief + Dòng LED + W×H"| D1
    D3 -->|"Trả ảnh Mockup & PDF đính kèm Báo giá"| L3

    style ADS fill:#3b2506,stroke:#fbbf24,stroke-width:2px,color:#ffffff
    style LEAD fill:#063928,stroke:#34d399,stroke-width:3px,color:#ffffff
    style DESIGN fill:#2e1045,stroke:#c084fc,stroke-width:2px,color:#ffffff
```

---

## ★ Sơ đồ 00C – Nền tảng Chung (`Core`) Phục vụ 5 Module (Tách riêng để không rối dây)

```mermaid
flowchart TD
    CORE["<b>Nền tảng chung (Core Platform)</b><br/>Auth & Phân quyền (RBAC) • Lưu trữ File/Ảnh • Audit Log • Hàng đợi Job/Cron • Thông báo • AI Adapter<br/><b>Danh mục chuẩn (Master Data):</b> Dòng sản phẩm LED (Cabinet W×H, Pitch) • Nguồn Kênh • Nhân sự"]

    CORE -.-> M01["<b>Nhóm 1: Lead</b><br/>Customer, Lead,<br/>Opportunity, Quotation"]
    CORE -.-> M02["<b>Nhóm 2: Tracking</b><br/>TrackingSession,<br/>WebhookEvent, SyncLog"]
    CORE -.-> M03["<b>Nhóm 3: Ads & Từ khóa</b><br/>AdCampaign,<br/>AdGroup, AdKeyword"]
    CORE -.-> M04["<b>Nhóm 4: Báo cáo</b><br/>DailyKpiFact,<br/>ReportExportLog"]
    CORE -.-> M05["<b>Nhóm 5: AI Design</b><br/>DesignTask,<br/>MockupRenderVersion"]

    style CORE fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#ffffff
    style M01 fill:#063928,stroke:#34d399,stroke-width:2px,color:#ffffff
    style M02 fill:#0f2942,stroke:#38bdf8,stroke-width:2px,color:#ffffff
    style M03 fill:#3b2506,stroke:#fbbf24,stroke-width:2px,color:#ffffff
    style M04 fill:#1e293b,stroke:#94a3b8,stroke-width:2px,color:#ffffff
    style M05 fill:#2e1045,stroke:#c084fc,stroke-width:2px,color:#ffffff
```

---

**Đọc thêm 7 sơ đồ chi tiết theo từng khía cạnh dưới đây:**

| # | Sơ đồ | Trả lời câu hỏi |
| :---: | :--- | :--- |
| 1 | Toàn cảnh hệ thống | Hệ thống gồm những lớp nào? |
| 2 | Người dùng ↔ Module | Phòng ban nào dùng module nào? |
| 3 | Dòng chảy dữ liệu chính | Dữ liệu chạy qua 5 module theo thứ tự nào? |
| 4 | Vòng đời một dự án LED | Một khách hàng đi qua hệ thống từ đầu đến cuối ra sao? |
| 5 | Module gọi nhau (hiện tại & mục tiêu) | Module nào phụ thuộc module nào? |
| 6 | Dữ liệu thuộc module nào | Bảng dữ liệu nằm ở đâu, nối với nhau thế nào? |
| 7 | Kết nối bên ngoài | Hệ thống lấy/gửi dữ liệu với Google, Facebook, Zalo, AI ra sao? |

---

## Sơ đồ 1 – Toàn cảnh hệ thống (4 lớp)

```mermaid
flowchart TB
  subgraph L1["LỚP 1 - NGƯỜI DÙNG"]
    U1["Sales"]
    U2["Marketing"]
    U3["Designer"]
    U4["Lãnh đạo"]
    U5["Khách hàng"]
  end

  subgraph L2["LỚP 2 - GIAO DIỆN (frontend)"]
    F1["M01 Lead"]
    F2["M02 Tracking"]
    F3["M03 Ads"]
    F4["M04 Báo cáo"]
    F5["M05 Design"]
  end

  subgraph L3["LỚP 3 - NGHIỆP VỤ (backend)"]
    B1["M01 Lead"]
    B2["M02 Tracking"]
    B3["M03 Ads"]
    B4["M04 Báo cáo"]
    B5["M05 Design"]
    CORE["CORE: đăng nhập, phân quyền, AI, file, log"]
  end

  subgraph L4["LỚP 4 - LƯU TRỮ & BÊN NGOÀI"]
    DB[("Database")]
    FS[("Kho file")]
    EXT["Google Ads, GA4, Facebook, Zalo, Gemini"]
  end

  L1 --> L2
  F1 --> B1
  F2 --> B2
  F3 --> B3
  F4 --> B4
  F5 --> B5
  B1 & B2 & B3 & B4 & B5 --> CORE
  CORE --> DB
  CORE --> FS
  B2 --> EXT
  B5 --> EXT
  U5 -. "Website, form, link duyệt" .-> B2
```

**Ý nghĩa:**
- Mỗi module có **2 phần**: giao diện (frontend) và nghiệp vụ (backend), cùng mã M01–M05 → nhóm nào phụ trách module nào thì sở hữu cả 2 phần.
- **CORE** là phần dùng chung (đăng nhập, phân quyền, kết nối AI, lưu file, ghi log) – không chứa nghiệp vụ riêng của module nào.
- Chỉ **M02** và **M05** nói chuyện trực tiếp với hệ thống bên ngoài.

---

## Sơ đồ 2 – Người dùng ↔ Module

```mermaid
flowchart LR
  SALES["Sales"]
  MKT["Marketing"]
  DES["Designer"]
  BOSS["Lãnh đạo"]

  M01["M01 Lead"]
  M02["M02 Tracking"]
  M03["M03 Ads"]
  M04["M04 Báo cáo"]
  M05["M05 Design"]

  SALES ==> M01
  SALES --> M05
  SALES --> M04
  MKT ==> M02
  MKT ==> M03
  MKT --> M04
  MKT --> M05
  DES ==> M05
  BOSS ==> M04
  BOSS --> M01
```

| Người dùng | Dùng chính (mũi tên đậm) | Dùng thêm |
| :--- | :--- | :--- |
| **Sales** | M01 – nhận khách, chăm sóc, báo giá | M05 tạo phối cảnh cho khách; M04 xem kết quả cá nhân |
| **Marketing** | M02 nguồn khách; M03 hiệu quả quảng cáo | M04 báo cáo Marketing; M05 đặt thiết kế quảng cáo |
| **Designer** | M05 – nhận Brief, làm thiết kế | – |
| **Lãnh đạo** | M04 – dashboard, dự báo doanh thu | M01 duyệt giá, xem dự án lớn |

---

## Sơ đồ 3 – Dòng chảy dữ liệu chính qua 5 module

```mermaid
flowchart LR
  A(["Khách tìm kiếm / xem quảng cáo"]) --> M02
  M02["M02 TRACKING: Ghi nguồn khách"] -->|"1. Lead + nguồn"| M01
  M01["M01 LEAD: Khách hàng, Lead, Cơ hội, Báo giá"] -->|"2. Yêu cầu thiết kế"| M05
  M05["M05 DESIGN: Phối cảnh đúng tỉ lệ"] -->|"3. Ảnh phối cảnh, phương án"| M01
  M01 -->|"4. Kết quả: đạt chuẩn, chốt, doanh thu"| M03
  M02 -->|"Chi phí quảng cáo"| M03
  M03["M03 ADS: Hiệu quả từng đồng quảng cáo"] -->|"5. Kết quả chốt"| G(["Google Ads tối ưu lại"])
  M01 -->|"6. Số liệu"| M04
  M02 -->|"6"| M04
  M03 -->|"6"| M04
  M05 -->|"6"| M04
  M04["M04 BÁO CÁO: KPI, dự báo doanh thu"] --> BOSS(["Lãnh đạo ra quyết định"])
```

| Bước | Từ → Đến | Dữ liệu | Nếu thiếu bước này |
| :---: | :--- | :--- | :--- |
| 1 | M02 → M01 | Lead kèm nguồn, chiến dịch, từ khóa, gclid | Không biết khách đến từ đâu |
| 2 | M01 → M05 | Thông tin khách, dòng LED, kích thước, ảnh khảo sát | Designer phải hỏi lại Sales, dễ sai thông số |
| 3 | M05 → M01 | Ảnh phối cảnh, phương án khách chọn | Phối cảnh và báo giá lệch nhau |
| 4 | M01 → M03 | Lead đạt chuẩn, đơn chốt, doanh thu | Chỉ đo được click, không đo được tiền thật |
| 5 | M03 → Google Ads | Danh sách khách đã chốt (chuyển đổi offline) | Google mang về nhiều Lead rác |
| 6 | Tất cả → M04 | Số liệu từng module | Phải tổng hợp báo cáo thủ công |

---

## Sơ đồ 4 – Vòng đời một dự án LED trong hệ thống

```mermaid
sequenceDiagram
  autonumber
  actor KH as Khách hàng
  participant M02 as M02 Tracking
  participant M01 as M01 Lead
  participant M05 as M05 Design
  participant M03 as M03 Ads
  participant M04 as M04 Báo cáo
  actor LD as Lãnh đạo

  KH->>M02: Click quảng cáo Google, gửi form báo giá
  M02->>M01: Tạo Lead (nguồn, từ khóa, gclid)
  M01->>M01: Kiểm tra trùng, gán Sales, chấm điểm HOT
  M01->>M01: Giá trị lớn → chuyển thành Cơ hội dự án
  M01->>M05: Giai đoạn Thiết kế → tạo Brief (ảnh khảo sát, số đo)
  M05->>M05: Tạo 3 phương án phối cảnh P2.5 / P3 / P4
  M05->>KH: Gửi link xem và so sánh phương án
  KH->>M05: Chọn phương án P2.5
  M05->>M01: Báo phương án đã chọn
  M01->>M01: Báo giá theo phương án, duyệt giá nhiều cấp
  M01->>M01: Ký hợp đồng (Chốt thành công)
  M01->>M03: Báo đơn chốt + doanh thu
  M03->>M02: Gửi chuyển đổi offline lên Google Ads
  M01-->>M04: Cập nhật doanh thu
  M03-->>M04: Cập nhật ROAS từ khóa
  M05-->>M04: Cập nhật thời gian thiết kế
  M04->>LD: Dashboard: doanh thu, hiệu quả quảng cáo, dự báo
```

---

## Sơ đồ 5 – Module gọi nhau

### 5a. Hiện tại trong code (đã kiểm tra tự động bằng `scripts/check-architecture.mjs`)

```mermaid
flowchart LR
  M01["M01 Lead"]
  M02["M02 Tracking"]
  M03["M03 Ads"]
  M04["M04 Báo cáo"]
  M05["M05 Design"]
  CORE["CORE"]

  M01 -->|"Gửi tờ trình duyệt giá"| M04
  M01 -->|"Đọc số liệu cho thống kê Lead"| M02
  M01 -->|"Đọc số liệu cho thống kê Lead"| M03
  M03 -->|"Trạng thái kết nối nguồn"| M02
  M04 -->|"Tổng hợp"| M02
  M04 -->|"Tổng hợp"| M03
  CORE -->|"Gắn file, tìm kiếm"| M01
  CORE -->|"Tìm kiếm"| M03
  CORE -->|"Thông báo bổ nhiệm"| M04
  M05 -->|"Gọi AI"| CORE
```

- Các module **chỉ gọi nhau qua cổng công khai** (`public.ts` ở backend, `index.ts` ở frontend).
- **Không có vòng lặp phụ thuộc** (A gọi B, B lại gọi A) – được kiểm tra tự động mỗi lần build.

### 5b. Mục tiêu khi hệ thống lớn: gọi trực tiếp + sự kiện

```mermaid
flowchart TB
  subgraph SYNC["GỌI TRỰC TIẾP - cần kết quả ngay"]
    direction LR
    S1["M04 đọc số liệu M01, M02, M03, M05"]
    S2["M05 đọc danh mục LED, thông tin Lead"]
    S3["M03 đọc trạng thái kết nối M02"]
  end

  subgraph ASYNC["SỰ KIỆN - báo tin, module khác tự xử lý"]
    direction LR
    E1["M02 phát: Lead mới đến"] --> R1["M01 tạo/gộp Lead"]
    E2["M01 phát: Lead chốt"] --> R2["M03 tính ROAS, M04 cập nhật"]
    E3["M01 phát: dự án sang Thiết kế"] --> R3["M05 tự tạo Brief"]
    E4["M05 phát: phối cảnh xong"] --> R4["M01 gắn ảnh, cộng điểm"]
  end
```

| Cách liên kết | Dùng khi | Ví dụ |
| :--- | :--- | :--- |
| **Gọi trực tiếp** (`public.ts`) | Cần dữ liệu ngay để hiển thị | Dashboard M04 đọc số Lead của M01 |
| **Sự kiện** | Báo "đã xảy ra việc gì", module khác xử lý sau, không cần chờ | Lead chốt → M03 tính lại ROAS |

**Lợi ích của sự kiện:** nhóm M01 không cần biết M03, M04, M05 làm gì với tin "Lead chốt" → 5 nhóm làm độc lập, thêm tính năng không phải sửa module khác.

---

## Sơ đồ 6 – Dữ liệu thuộc module nào và nối với nhau ra sao

```mermaid
erDiagram
  CUSTOMER ||--o{ LEAD : "M01"
  LEAD ||--o| OPPORTUNITY : "M01"
  LEAD ||--o{ QUOTE : "M01"
  LEAD ||--o{ TRACKING_EVENT : "M02 gắn nguồn"
  CAMPAIGN ||--o{ KEYWORD_DAILY : "M03"
  TRACKING_EVENT }o--|| CAMPAIGN : "UTM, gclid"
  OPPORTUNITY ||--o{ MOCKUP_OPTION : "M05"
  MOCKUP_OPTION ||--o| QUOTE : "phương án khớp báo giá"
  LED_SERIES ||--o{ QUOTE : "dùng chung"
  LED_SERIES ||--o{ MOCKUP_OPTION : "dùng chung"
  USER ||--o{ LEAD : "Sales phụ trách"
  DAILY_METRIC }o--|| LED_SERIES : "M04 tổng hợp"
```

| Bảng | Module sở hữu (được ghi) | Module khác dùng (chỉ đọc) |
| :--- | :--- | :--- |
| Khách hàng, Lead, Cơ hội, Báo giá | **M01** | M03, M04, M05 |
| Sự kiện tracking, nguồn, đồng bộ | **M02** | M01, M03, M04 |
| Chiến dịch, từ khóa, chi phí | **M03** | M04 |
| Bảng tổng hợp, chỉ tiêu, báo cáo | **M04** | – |
| Brief, phối cảnh, tài sản thiết kế | **M05** | M01, M04 |
| Dòng LED, người dùng, phòng ban | **CORE** | Tất cả |

> **Quy tắc vàng:** mỗi bảng **chỉ một module được ghi**. Module khác muốn thay đổi phải gọi qua cổng công khai của module sở hữu.

**Các "sợi dây" nối dữ liệu giữa module:**
| Khóa nối | Nối giữa | Dùng để |
| :--- | :--- | :--- |
| `leadId` / `opportunityId` | M01 ↔ M02, M05 | Biết nguồn của Lead, phối cảnh của dự án |
| `gclid`, `utm_campaign`, `utm_term` | M02 ↔ M03 | Biết Lead đến từ chiến dịch/từ khóa nào |
| `ledSeriesId` (dòng LED) | M01 ↔ M05 ↔ M03 ↔ M04 | Báo giá, phối cảnh, quảng cáo, báo cáo cùng một dòng sản phẩm |
| `quoteOptionId` | M01 ↔ M05 | Phương án phối cảnh khớp phương án báo giá |
| `userId` (Sales) | Tất cả | Báo cáo theo người phụ trách |

---

## Sơ đồ 7 – Kết nối với hệ thống bên ngoài

```mermaid
flowchart LR
  subgraph OUT["BÊN NGOÀI"]
    WEB["Website toantrungtelecom.com"]
    GADS["Google Ads"]
    GA4["Google Analytics 4"]
    GSC["Search Console"]
    FB["Facebook Lead Ads"]
    ZALO["Zalo OA"]
    AI["Gemini / OpenAI"]
  end

  subgraph SYS["HỆ THỐNG TOÀN TRUNG CRM"]
    M02["M02 Tracking"]
    M05["M05 Design"]
    COREAI["CORE: kết nối AI"]
    OTHER["M01, M03, M04"]
  end

  WEB -->|"Form, UTM, gclid"| M02
  FB -->|"Lead từ quảng cáo"| M02
  ZALO -->|"Tin nhắn khách"| M02
  GADS -->|"Chi phí, click, từ khóa"| M02
  GA4 -->|"Lượt truy cập"| M02
  GSC -->|"Từ khóa tự nhiên"| M02
  M02 -->|"Chuyển đổi offline"| GADS
  M05 --> COREAI
  COREAI <-->|"Tạo và hoàn thiện ảnh"| AI
  M02 --> OTHER
```

| Hệ thống ngoài | Đi qua module | Chiều | Trạng thái hiện tại |
| :--- | :--- | :---: | :--- |
| Website (form) | M02 | Vào | Có API nhận, chưa gắn script lên website thật |
| Google Ads | M02 | Vào + Ra | Chưa cấu hình (hiển thị đúng "Chưa cấu hình") |
| GA4, Search Console | M02 | Vào | Chưa cấu hình |
| Facebook, Zalo | M02 | Vào | Chưa có |
| Gemini | CORE (M01 AI nhập Lead, M05 Design) | Vào + Ra | **Đang hoạt động** khi có `GEMINI_API_KEY` |

> **Nguyên tắc:** mọi kết nối quảng cáo/kênh đi qua **M02** (một cửa), mọi kết nối AI đi qua **CORE** → đổi nhà cung cấp chỉ sửa một chỗ.

---

## Tóm tắt một trang

![Sơ đồ mối liên kết 5 module](./so-do-lien-ket-5-module.svg)

```mermaid
flowchart TD
  CORE["Nền tảng chung: Đăng nhập, Phân quyền, File, Log, AI, Tác vụ nền"]
  M02["Nhóm 2 - M02: Tracking và tích hợp"]
  M01["Nhóm 1 - M01: Quản lý Lead"]
  M03["Nhóm 3 - M03: Ads và từ khóa"]
  M05["Nhóm 5 - M05: AI Design"]
  M04["Nhóm 4 - M04: Dashboard và báo cáo"]

  CORE -.-> M02
  CORE -.-> M01
  CORE -.-> M03
  CORE -.-> M05
  CORE -.-> M04

  M02 -->|"Lead + nguồn, campaign"| M01
  M02 -->|"Chi phí quảng cáo"| M03
  M02 -->|"Nguồn chuẩn"| M04
  M01 -->|"Kết quả Sales"| M03
  M01 -->|"Brief được giao"| M05
  M05 -->|"Phối cảnh, phương án"| M01
  M01 -->|"Tiến độ và kết quả"| M04
  M03 -->|"KPI đã thống nhất"| M04
  M05 -->|"Trạng thái Design"| M04
```

| Module | Một câu | Nhận từ | Gửi cho |
| :--- | :--- | :--- | :--- |
| **M02** | Khách đến từ đâu | Website, quảng cáo, Zalo | M01 (Lead + nguồn), M03 (chi phí), M04 |
| **M01** | Khách là ai, ai phụ trách, chốt được không | M02, M05 | M03 (kết quả bán), M05 (yêu cầu thiết kế), M04 |
| **M05** | Cho khách thấy trước màn LED trong không gian thật | M01 | M01 (phối cảnh, phương án), M04 |
| **M03** | Mỗi đồng quảng cáo mang về bao nhiêu | M02, M01 | Google Ads (qua M02), M04 |
| **M04** | Kết quả kinh doanh ra sao | Cả 4 module | Lãnh đạo, các phòng |
