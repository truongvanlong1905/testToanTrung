# Bộ sơ đồ

> **Lưu ý:** Đây là sơ đồ dự thảo để thảo luận, không phải bản As-Is đã được khảo sát. Đặc biệt, quy trình “hiện tại” dưới đây là giả thuyết dựa trên các trạng thái và chức năng được mô tả trong dự án; BA cần thay thế bằng quy trình vận hành thực tế. Các sơ đồ BPMN được biểu diễn bằng Mermaid flowchart theo lane để xem trực tiếp trong trình đọc Markdown hỗ trợ Mermaid; đây chưa phải file BPMN 2.0 XML.

## 1. Sơ đồ ngữ cảnh

```mermaid
flowchart LR
    Visitor["Khách truy cập website"]
    Mkt["Marketing"]
    Sales["Sales"]
    Admin["Admin / Ban quản trị"]
    Design["Design"]
    Ads["ADS / Marketing performance"]
    Gemini["Google Gemini API"]
    AdPlatforms["Google Ads / GA4 / Search Console"]

    System(["Toàn Trung Marketing Management"])

    Visitor -->|"UTM và sự kiện website; không gửi PII nhạy cảm"| System
    Mkt -->|"Tạo và theo dõi Lead; chiến dịch; báo cáo"| System
    Sales -->|"Nhận Lead; cập nhật trạng thái; bàn giao"| System
    Admin -->|"Tài khoản, cấu hình, quyền và giám sát"| System
    Design -->|"Yêu cầu banner / storyboard / mockup"| System
    Ads -->|"Theo dõi campaign, keyword và hiệu suất"| System
    System -->|"Dashboard, hồ sơ Lead, báo cáo, audit"| Mkt
    System -->|"Danh sách Lead được phân công"| Sales
    System -->|"Thông tin quản trị và báo cáo"| Admin
    System -->|"Kết quả AI nếu dịch vụ được cấu hình"| Design
    System <-->|"Yêu cầu và kết quả đồng bộ; trạng thái tích hợp cần xác nhận"| AdPlatforms
    System <-->|"Yêu cầu tạo nội dung và kết quả"| Gemini
```

## 2. BPMN dự thảo — quy trình hiện tại (As-Is giả định)

**Giả định để BA xác nhận:** Lead đến từ nhiều kênh; nhân viên ghi nhận thông tin, kiểm tra trùng và chuyển Sales xử lý; trạng thái nghiệp vụ được theo dõi theo tiến độ báo giá/kết quả. Chưa có căn cứ khẳng định quy trình ngoài hệ thống thực tế là thủ công hay công cụ nào đang được sử dụng.

```mermaid
flowchart LR
    subgraph Customer["Lane: Khách hàng / Nguồn Lead"]
        A((Bắt đầu)) --> B["Gửi yêu cầu qua Hotline / Website / Ads / giới thiệu / sự kiện"]
    end
    subgraph Marketing["Lane: Marketing / Người tiếp nhận"]
        B --> C["Tiếp nhận thông tin Lead"]
        C --> D["Kiểm tra thông tin và tìm dấu hiệu trùng"]
        D --> E{"Thông tin đủ để xử lý?"}
        E -->|"Không"| F["Bổ sung thông tin từ nguồn tiếp nhận"]
        F --> D
        E -->|"Có"| G["Chuyển Lead cho Sales"]
    end
    subgraph Sales["Lane: Sales"]
        G --> H["Liên hệ và xác minh nhu cầu"]
        H --> I{"Có cơ hội tiếp tục?"}
        I -->|"Có"| J["Khảo sát / chuẩn bị báo giá"]
        J --> K["Gửi báo giá và cập nhật tiến độ"]
        K --> L{"Kết quả"}
        L -->|"Thành công"| M["Ghi nhận chốt thành công"]
        L -->|"Không thành công"| N["Ghi nhận thất bại và lý do"]
        I -->|"Chưa đủ thông tin"| O["Theo dõi / liên hệ bổ sung"]
        O --> H
    end
    M --> P((Kết thúc))
    N --> P
```

## 3. BPMN dự thảo — quy trình đề xuất (To-Be)

```mermaid
flowchart LR
    subgraph Source["Lane: Website / Marketing"]
        A((Bắt đầu)) --> B["Lead phát sinh từ kênh hoặc được nhân viên tạo"]
        B --> C["Gửi thông tin và nguồn/UTM phù hợp"]
    end
    subgraph App["Lane: Hệ thống"]
        C --> D["Validate dữ liệu bắt buộc"]
        D --> E{"Dữ liệu hợp lệ?"}
        E -->|"Không"| F["Trả lỗi để người dùng bổ sung"]
        F --> C
        E -->|"Có"| G["Đối chiếu dấu hiệu trùng"]
        G --> H{"Có Lead tương tự?"}
        H -->|"Có"| I["Hiển thị cảnh báo và hồ sơ liên quan"]
        I --> J{"Người dùng xác nhận tiếp tục?"}
        J -->|"Không"| K["Mở hồ sơ liên quan / dừng tạo"]
        J -->|"Có"| L["Tạo Lead, ghi nguồn và lịch sử"]
        H -->|"Không"| L
        L --> M["Thông báo Lead đã được ghi nhận"]
    end
    subgraph Team["Lane: Marketing / Admin"]
        M --> N["Kiểm tra dữ liệu và phân Sales phụ trách"]
        N --> O["Bàn giao Lead; ghi lịch sử phân công"]
    end
    subgraph Sales["Lane: Sales"]
        O --> P["Liên hệ khách hàng và cập nhật tiến độ"]
        P --> Q{"Trạng thái xử lý"}
        Q -->|"Đang theo đuổi"| R["Cập nhật nhu cầu / báo giá / ghi chú / tệp"]
        R --> P
        Q -->|"Thành công"| S["Đóng Lead: chốt thành công"]
        Q -->|"Thất bại"| T["Bắt buộc nhập lý do thất bại"]
        T --> U["Đóng Lead: thất bại"]
    end
    subgraph Reports["Lane: Quản lý / Marketing"]
        S --> V["Tổng hợp dashboard và báo cáo"]
        U --> V
        V --> W((Kết thúc))
    end
```

## 4. DFD — Level 0 (Context)

```mermaid
flowchart LR
    E1["Khách truy cập / Website"]
    E2["Marketing"]
    E3["Sales"]
    E4["Admin / Quản lý"]
    E5["Dịch vụ ngoài: Gemini / nền tảng Ads"]
    P0(("P0 — Marketing Management"))

    E1 -->|"UTM, sự kiện web, yêu cầu"| P0
    P0 -->|"Trang/biểu mẫu phản hồi"| E1
    E2 -->|"Lead, chiến dịch, báo cáo"| P0
    P0 -->|"Lead, tracking, analytics"| E2
    E3 -->|"Cập nhật Lead, trạng thái, bàn giao"| P0
    P0 -->|"Lead được phân công, lịch sử"| E3
    E4 -->|"Tài khoản, cấu hình, truy vấn"| P0
    P0 -->|"Dashboard, báo cáo, nhật ký"| E4
    P0 -->|"Yêu cầu dịch vụ ngoài"| E5
    E5 -->|"Kết quả AI / dữ liệu đồng bộ nếu cấu hình"| P0
```

## 5. DFD — Level 1

```mermaid
flowchart LR
    Marketing["Marketing / Nhân viên"]
    Sales["Sales"]
    Admin["Admin / Quản lý"]
    Web["Website"]
    External["Gemini / Ads / Analytics"]

    P1(("P1 — Xác thực và phân quyền"))
    P2(("P2 — Tiếp nhận & quản lý Lead"))
    P3(("P3 — Tracking & analytics"))
    P4(("P4 — Báo cáo & AI Design"))

    D1[("D1 — User / Role")]
    D2[("D2 — Lead / History / Assignment")]
    D3[("D3 — Campaign / Tracking / SyncJob")]
    D4[("D4 — Report / AuditLog")]
    D5[("D5 — File storage")]

    Marketing -->|"Thông tin đăng nhập"| P1
    Sales -->|"Thông tin đăng nhập"| P1
    Admin -->|"Thông tin đăng nhập"| P1
    P1 <--> D1
    P1 -->|"Session / quyền"| P2
    P1 -->|"Session / quyền"| P3
    P1 -->|"Session / quyền"| P4

    Marketing -->|"Lead mới / cập nhật"| P2
    Sales -->|"Cập nhật status / ghi chú / bàn giao"| P2
    P2 <--> D2
    P2 -->|"Hồ sơ cần giao"| Sales
    P2 -->|"Metadata tệp"| D5
    D5 -->|"Tệp đính kèm"| P2

    Web -->|"Sự kiện, UTM"| P3
    P3 <--> D3
    P3 <-->|"Đồng bộ có cấu hình"| External
    P3 -->|"KPI / campaign / tracking"| Marketing

    Marketing -->|"Tạo báo cáo / yêu cầu thiết kế"| P4
    Admin -->|"Tra cứu báo cáo"| P4
    P4 <--> D4
    P4 <-->|"Prompt, kết quả AI nếu cấu hình"| External
    P4 -->|"Báo cáo / nội dung"| Marketing
    P4 -->|"Báo cáo quản trị"| Admin
    P4 -->|"Tệp báo cáo"| D5
```

## 6. Use Case

```mermaid
flowchart LR
    Admin["Actor: Admin"]
    Mkt["Actor: Marketing"]
    Sales["Actor: Sales"]
    Design["Actor: Design"]
    Ads["Actor: ADS"]
    Visitor["Actor: Website visitor"]

    subgraph App["Toàn Trung Marketing Management"]
        UC1(["Đăng nhập / đăng xuất"])
        UC2(["Quản lý tài khoản và cấu hình"])
        UC3(["Tạo / tìm / xem Lead"])
        UC4(["Kiểm tra trùng Lead"])
        UC5(["Phân công / bàn giao Lead"])
        UC6(["Cập nhật trạng thái và kết quả"])
        UC7(["Theo dõi Dashboard / báo cáo"])
        UC8(["Quản lý tracking / chiến dịch"])
        UC9(["Tạo báo cáo phòng ban"])
        UC10(["Tạo banner / storyboard / mockup"])
        UC11(["Gửi sự kiện website"])
    end

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC5
    Admin --> UC7
    Mkt --> UC1
    Mkt --> UC3
    Mkt --> UC4
    Mkt --> UC7
    Mkt --> UC8
    Mkt --> UC9
    Sales --> UC1
    Sales --> UC3
    Sales --> UC6
    Sales --> UC9
    Design --> UC1
    Design --> UC10
    Ads --> UC1
    Ads --> UC7
    Ads --> UC8
    Visitor --> UC11
    UC3 -. "bao gồm kiểm tra trùng" .-> UC4
```

> Use Case trên là tập hợp chức năng hiện diện trong source/tài liệu và giả thuyết vai trò. Cần chốt quyền truy cập theo ma trận role chính thức.

## 7. Sequence — tạo Lead, cảnh báo trùng và phân công

```mermaid
sequenceDiagram
    actor User as Marketing/Admin
    participant UI as Frontend
    participant API as Backend API
    participant DB as Prisma / Database
    participant Sales as Sales phụ trách

    User->>UI: Nhập thông tin Lead
    UI->>API: POST /api/leads/check-duplicate
    API->>DB: Tìm Lead khớp điện thoại/email/tên
    DB-->>API: Danh sách khớp (nếu có)
    API-->>UI: Kết quả kiểm tra trùng
    alt Có Lead tương tự
        UI-->>User: Hiển thị cảnh báo và lựa chọn
        User->>UI: Xác nhận tiếp tục tạo
    else Không có Lead tương tự
        UI-->>User: Cho phép tiếp tục
    end
    UI->>API: POST /api/leads
    API->>DB: Validate, tạo Lead và lịch sử ban đầu
    DB-->>API: Lead đã lưu
    API-->>UI: Kết quả tạo Lead
    opt Cần bàn giao/phân công sau khi tạo
        User->>UI: Chọn Sales và lý do
        UI->>API: POST /api/leads/{id}/assign
        API->>DB: Ghi assignment và cập nhật phụ trách
        DB-->>API: Kết quả phân công
        API-->>UI: Xác nhận bàn giao
        UI-->>Sales: Lead xuất hiện trong danh sách được phân công
    end
```

## 8. Activity — vòng đời Lead

```mermaid
flowchart TD
    Start((Bắt đầu)) --> Intake["Tiếp nhận Lead"]
    Intake --> Validate["Kiểm tra dữ liệu bắt buộc"]
    Validate --> Valid{"Hợp lệ?"}
    Valid -->|"Không"| Complete["Bổ sung dữ liệu"]
    Complete --> Validate
    Valid -->|"Có"| Duplicate["Kiểm tra dấu hiệu trùng"]
    Duplicate --> Match{"Có Lead tương tự?"}
    Match -->|"Có"| Review["Người dùng xem cảnh báo"]
    Review --> Continue{"Tiếp tục tạo?"}
    Continue -->|"Không"| Existing["Mở hồ sơ liên quan / dừng"]
    Continue -->|"Có"| Save["Lưu Lead và lịch sử"]
    Match -->|"Không"| Save
    Save --> Assign["Phân công Sales"]
    Assign --> Contact["Liên hệ / xác minh nhu cầu"]
    Contact --> Progress{"Kết quả xử lý"}
    Progress -->|"Tiếp tục"| Update["Cập nhật trạng thái, ghi chú, báo giá/tệp"]
    Update --> Contact
    Progress -->|"Thành công"| Won["Đóng Lead thành công"]
    Progress -->|"Thất bại"| Reason["Nhập lý do thất bại"]
    Reason --> Lost["Đóng Lead thất bại"]
    Won --> Report["Cập nhật số liệu báo cáo"]
    Lost --> Report
    Existing --> End((Kết thúc))
    Report --> End
```

