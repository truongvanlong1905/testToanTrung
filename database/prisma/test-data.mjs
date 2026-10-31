/**
 * FILE DỮ LIỆU TEST DÙNG CHUNG TOÀN HỆ THỐNG (LOCAL & CLOUD RENDER)
 * Tự động xuất từ Database qua lệnh: npm run db:save-test
 */

export const TEST_USERS = [
  {
    "id": "usr_admin_01",
    "email": "admin@toantrung.vn",
    "name": "Nguyễn Toàn Trung (Admin)",
    "phone": "0909.123.456",
    "role": "ADMIN",
    "actorType": "ADMIN",
    "department": "ADMIN_SYS",
    "position": "Quản trị hệ thống",
    "appointedDecisionCode": null,
    "initials": "TT",
    "avatar": "/uploads/1793367126647_2.jpg",
    "achievements": "Top 1 sever"
  },
  {
    "id": "usr_sales_01",
    "email": "tuan.tm@toantrung.vn",
    "name": "Trần Minh Tuấn",
    "phone": "0912.334.556",
    "role": "SALES",
    "actorType": "USER",
    "department": "SALES",
    "position": "Trưởng phòng",
    "appointedDecisionCode": "QD-BGD-2610-001",
    "initials": "MT",
    "avatar": null,
    "achievements": null
  },
  {
    "id": "usr_sales_02",
    "email": "cuong.lh@toantrung.vn",
    "name": "Lê Hoàng Cường",
    "phone": "0933.445.667",
    "role": "SALES",
    "actorType": "USER",
    "department": "SALES",
    "position": "Nhân viên",
    "appointedDecisionCode": null,
    "initials": "HC",
    "avatar": null,
    "achievements": null
  },
  {
    "id": "usr_sales_03",
    "email": "trang.pt@toantrung.vn",
    "name": "Phạm Thùy Trang",
    "phone": "0977.889.900",
    "role": "SALES",
    "actorType": "USER",
    "department": "SALES",
    "position": "Nhân viên",
    "appointedDecisionCode": null,
    "initials": "TT",
    "avatar": null,
    "achievements": null
  },
  {
    "id": "usr_sales_04",
    "email": "ngoc.nb@toantrung.vn",
    "name": "Nguyễn Bảo Ngọc",
    "phone": "0944.556.778",
    "role": "SALES",
    "actorType": "USER",
    "department": "SALES",
    "position": "Nhân viên",
    "appointedDecisionCode": null,
    "initials": "BN",
    "avatar": null,
    "achievements": null
  },
  {
    "id": "usr_mkt_01",
    "email": "marketing@toantrung.vn",
    "name": "Lê Thu Hà",
    "phone": "0966.778.899",
    "role": "MARKETING",
    "actorType": "USER",
    "department": "MARKETING",
    "position": "Trưởng ban",
    "appointedDecisionCode": "QD-BGD-2610-002",
    "initials": "TH",
    "avatar": null,
    "achievements": null
  },
  {
    "id": "usr_design_01",
    "email": "design@toantrung.vn",
    "name": "Đặng Mỹ Linh",
    "phone": "0988.112.233",
    "role": "DESIGN",
    "actorType": "USER",
    "department": "DESIGN",
    "position": "Nhân viên",
    "appointedDecisionCode": null,
    "initials": "ML",
    "avatar": null,
    "achievements": null
  },
  {
    "id": "usr_director_01",
    "email": "giamdoc@toantrung.vn",
    "name": "Nguyễn Toàn Trung (Giám Đốc)",
    "phone": "0909.888.999",
    "role": "DIRECTOR",
    "actorType": "DIRECTOR",
    "department": "BOARD",
    "position": "Giám đốc",
    "appointedDecisionCode": null,
    "initials": "GĐ",
    "avatar": null,
    "achievements": null
  }
];

export const TEST_DEPARTMENTS = [
  {
    "code": "ADS",
    "name": "Bộ Phận Quảng Cáo (Ads)",
    "description": "Tối ưu ngân sách Google Ads, Facebook Ads và bộ từ khóa chuyển đổi"
  },
  {
    "code": "DESIGN",
    "name": "Phòng Thiết Kế (Design)",
    "description": "Thiết kế maquette màn hình LED, bản vẽ kỹ thuật và AI Design Studio"
  },
  {
    "code": "MARKETING",
    "name": "Phòng Marketing",
    "description": "Quản lý chiến dịch truyền thông, nội dung và đo lường UTM Tracking"
  },
  {
    "code": "SALES",
    "name": "Phòng Kinh Doanh (Sales)",
    "description": "Tiếp nhận Lead, khảo sát công trình LED và lập báo giá dự án"
  }
];

export const TEST_CATEGORIES = [
  {
    "id": "cat_electronic_board",
    "code": "E_BOARD",
    "name": "Bảng điện tử",
    "description": "Bảng ma trận chữ chạy 3 màu, bảng tỷ giá ngân hàng, số thứ tự bệnh viện"
  },
  {
    "id": "cat_led_indoor",
    "code": "LED_INDOOR",
    "name": "LED trong nhà",
    "description": "Màn hình LED P1.86, P2.0, P2.5 hội trường, phòng họp"
  },
  {
    "id": "cat_led_outdoor",
    "code": "LED_OUTDOOR",
    "name": "LED ngoài trời",
    "description": "Màn hình LED P3, P4, P5 chống nước ngoài trời tòa nhà"
  },
  {
    "id": "cat_other",
    "code": "OTHER",
    "name": "Khác",
    "description": "Phụ kiện cabin, card điều khiển Nova, video processor"
  },
  {
    "id": "cat_special",
    "code": "SPECIAL",
    "name": "Màn hình cong / đặc thù",
    "description": "Màn hình LED cong, LED trong suốt, màn hình sàn sân khấu"
  }
];

export const TEST_PROMOTION_DECISIONS = [
  {
    "code": "QD-BGD-2610-001",
    "title": "Thông báo chúc mừng bổ nhiệm Trưởng Phòng Kinh Doanh LED",
    "content": "Ban Giám Đốc Công ty Toàn Trung trân trọng chúc mừng nhân sự Trần Minh Tuấn chính thức được bổ nhiệm giữ chức vụ Trưởng phòng tại Phòng Kinh Doanh (SALES) nhờ thành tích xuất sắc trong công tác phát triển dự án màn hình LED hội trường & tòa nhà.",
    "targetUserId": "usr_sales_01",
    "targetDepartment": "SALES",
    "newPosition": "Trưởng phòng",
    "signedById": "usr_director_01",
    "signedByName": "Nguyễn Toàn Trung (Giám Đốc)",
    "status": "APPLIED_BY_ADMIN",
    "appliedByAdminId": "usr_admin_01"
  },
  {
    "code": "QD-BGD-2610-002",
    "title": "Thông báo chúc mừng bổ nhiệm Trưởng Ban Marketing & Truyền Thông",
    "content": "Ban Giám Đốc Công ty Toàn Trung chúc mừng nhân sự Lê Thu Hà được bổ nhiệm giữ chức vụ Trưởng ban tại Phòng Marketing (MARKETING).",
    "targetUserId": "usr_mkt_01",
    "targetDepartment": "MARKETING",
    "newPosition": "Trưởng ban",
    "signedById": "usr_director_01",
    "signedByName": "Nguyễn Toàn Trung (Giám Đốc)",
    "status": "APPLIED_BY_ADMIN",
    "appliedByAdminId": "usr_admin_01"
  }
];

export const TEST_CAMPAIGNS = [
  {
    "id": "cmp_03",
    "code": "CMP_FB_EVENT_26",
    "name": "Facebook Ads - Giải pháp hiển thị Trung tâm Hội nghị & Tiệc cưới",
    "platform": "Facebook Ads",
    "status": "Active",
    "budget": 15000000,
    "spent": 9800000
  },
  {
    "id": "cmp_01",
    "code": "CMP_GG_INDOOR_26",
    "name": "Google Ads - Màn hình LED P2.5 Hội trường & Phòng họp",
    "platform": "Google Ads",
    "status": "Active",
    "budget": 25000000,
    "spent": 18450000
  },
  {
    "id": "cmp_02",
    "code": "CMP_GG_OUTDOOR_26",
    "name": "Google Ads - Màn hình LED P3/P4 Ngoài trời Quảng cáo",
    "platform": "Google Ads",
    "status": "Active",
    "budget": 30000000,
    "spent": 24200000
  },
  {
    "id": "cmp_04",
    "code": "CMP_SEO_BOARD_26",
    "name": "SEO Tổng lực - Bảng điện tử ma trận & Tỷ giá Ngân hàng",
    "platform": "SEO",
    "status": "Active",
    "budget": 10000000,
    "spent": 8500000
  }
];

export const TEST_KEYWORDS = [
  {
    "id": "kw_test_01",
    "keyword": "màn hình led p2.5 trong nhà",
    "impressions": 14200,
    "clicks": 1280,
    "avgCpc": 12400,
    "avgPosition": 1.4,
    "searchVolume": 8800,
    "source": "Google Ads"
  },
  {
    "id": "kw_test_02",
    "keyword": "báo giá màn hình led ngoài trời p3",
    "impressions": 19500,
    "clicks": 1650,
    "avgCpc": 15800,
    "avgPosition": 1.2,
    "searchVolume": 12400,
    "source": "Google Ads"
  },
  {
    "id": "kw_test_03",
    "keyword": "bảng điện tử led ma trận 3 màu",
    "impressions": 8900,
    "clicks": 720,
    "avgCpc": 8900,
    "avgPosition": 2.1,
    "searchVolume": 5600,
    "source": "Google Ads"
  },
  {
    "id": "kw_test_04",
    "keyword": "màn hình led cong phòng họp vip",
    "impressions": 6400,
    "clicks": 580,
    "avgCpc": 18200,
    "avgPosition": 1.8,
    "searchVolume": 3200,
    "source": "Google Search Console"
  },
  {
    "id": "kw_test_05",
    "keyword": "toàn trung telecom màn hình led",
    "impressions": 5200,
    "clicks": 940,
    "avgCpc": 4500,
    "avgPosition": 1,
    "searchVolume": 2400,
    "source": "Google Search Console"
  }
];

export const TEST_TRACKING_EVENTS = [
  {
    "id": "trk_test_01",
    "websiteSource": "toantrungtelecom.com",
    "source": "google",
    "medium": "cpc",
    "campaign": "LED_Indoor_Hall_P2.5",
    "landingPage": "/du-an/man-hinh-led-p2.5-hoi-truong",
    "device": "Desktop",
    "ipAddress": "14.232.180.45",
    "location": "TP. Hồ Chí Minh"
  },
  {
    "id": "trk_test_02",
    "websiteSource": "ledtoantrung.vn",
    "source": "facebook",
    "medium": "cpc",
    "campaign": "LED_Outdoor_P4_Building",
    "landingPage": "/san-pham/led-ngoai-troi-p4",
    "device": "Mobile",
    "ipAddress": "113.161.74.88",
    "location": "Hà Nội"
  }
];

export const TEST_LEADS = [
  {
    "id": "cmvtz0ncv000fbzpbqhtn5evm",
    "code": "TT-LED-2610-0001",
    "customerName": "Truong Van Long",
    "companyName": "royle",
    "phone": "09827420001",
    "email": "long@gmail.com",
    "installationAddress": "lê quang định ",
    "location": "TP. Hồ Chí Minh",
    "product": "màn hình 28inch",
    "categoryId": "cat_led_indoor",
    "source": "Hotline",
    "status": "Chốt thành công",
    "failureReason": null,
    "estimatedValue": "294.120.000 đ",
    "notes": "màn LED",
    "priorityScore": 88,
    "priorityTier": "HOT",
    "nextFollowUpAt": "2026-10-30T21:39:20.458Z",
    "nextActionNote": null,
    "ledWidth": null,
    "ledHeight": null,
    "ledModuleType": null,
    "discountPercent": 0,
    "directorApprovalStatus": "NONE",
    "salesPersonId": "usr_sales_02",
    "createdById": "usr_admin_01",
    "createdAt": "2026-10-29T20:03:18.463Z",
    "attachments": [
      {
        "id": "cmvtz0ncv000hbzpbdpn6x6wx",
        "fileName": "1111.jpg",
        "fileUrl": "/uploads/1793304190710_1111.jpg",
        "fileSize": 45023,
        "fileType": "IMAGE",
        "uploadedById": "usr_admin_01"
      }
    ]
  },
  {
    "id": "cmvuqj1c2000b7g1jsjgwhpcz",
    "code": "TT-LED-2610-0002",
    "customerName": "uth",
    "companyName": "uth",
    "phone": "0129329321",
    "email": "long@gmail.com",
    "installationAddress": "13A",
    "location": "TP. Hồ Chí Minh",
    "product": "màn 38inch",
    "categoryId": "cat_led_indoor",
    "source": "Hotline",
    "status": "Thất bại",
    "failureReason": "khách không ứng",
    "estimatedValue": "390.000.000",
    "notes": "",
    "priorityScore": 50,
    "priorityTier": "WARM",
    "nextFollowUpAt": null,
    "nextActionNote": null,
    "ledWidth": null,
    "ledHeight": null,
    "ledModuleType": null,
    "discountPercent": 0,
    "directorApprovalStatus": "NONE",
    "salesPersonId": "usr_design_01",
    "createdById": "usr_admin_01",
    "createdAt": "2026-10-30T08:53:25.999Z",
    "attachments": []
  },
  {
    "id": "cmvvc1svk000110xhxuh4c98g",
    "code": "TT-LED-2610-0003",
    "customerName": "Anh Minh",
    "companyName": "Khách sạn Rex Quận 1",
    "phone": "0903888912",
    "email": "minh.nguyen@rexhotel.vn",
    "installationAddress": "TP. Hồ Chí Minh",
    "location": "TP. Hồ Chí Minh",
    "product": "Màn hình LED P2.5 Indoor Hội trường (6m × 3.5m = 21m²)",
    "categoryId": "cat_led_indoor",
    "source": "Hotline",
    "status": "Vừa nhận thông tin",
    "failureReason": null,
    "estimatedValue": "369.500.000 đ",
    "notes": "[AI Bóc tách nhanh] Nội dung gốc: \"Anh Minh bên Khách sạn Rex Quận 1 (0903888912, minh.nguyen@rexhotel.vn) nhắn Zalo hỏi lắp màn hình LED P2.5 hội trường ngang 6m cao 3.5m, cần khảo sát báo giá trong tuần này.\" Kênh tương tác: Khách nhắn qua Zalo.",
    "priorityScore": 93,
    "priorityTier": "HOT",
    "nextFollowUpAt": "2026-10-30T20:55:53.451Z",
    "nextActionNote": "AI khởi tạo nhanh — Gọi xác nhận mặt bằng & gửi báo giá m² (SLA 2h)",
    "ledWidth": 6,
    "ledHeight": 3.5,
    "ledModuleType": "LED P2.5 Indoor Hội trường & Tiệc cưới",
    "discountPercent": 0,
    "directorApprovalStatus": "NONE",
    "salesPersonId": "usr_sales_01",
    "createdById": "usr_admin_01",
    "createdAt": "2026-10-30T18:55:53.456Z",
    "attachments": []
  },
  {
    "id": "cmvvo7eo40001mbfh4b59gokc",
    "code": "TT-LED-2610-0004",
    "customerName": "Trương Văn Long",
    "companyName": "Khách hàng cá nhân / Dự án",
    "phone": "0926471382",
    "email": null,
    "installationAddress": "TP. Hồ Chí Minh",
    "location": "TP. Hồ Chí Minh",
    "product": "Màn hình LED P2.5 Indoor Hội trường (2m × 3m = 6m²)",
    "categoryId": "cat_led_indoor",
    "source": "Hotline",
    "status": "Vừa nhận thông tin",
    "failureReason": null,
    "estimatedValue": "114.500.000 đ",
    "notes": "[AI Phân tách nhanh] Cấu hình: LED P2.5 Indoor Hội trường & Tiệc cưới · Kích thước 2m × 3m (6m²) · Tự tính dự toán chuẩn: 114.500.000 đ. Ghi chú gốc: \"truong van long 0926471382 led p2.5 2x3\"",
    "priorityScore": 82,
    "priorityTier": "HOT",
    "nextFollowUpAt": "2026-10-31T02:36:10.369Z",
    "nextActionNote": "AI phân chia nhanh — Gọi xác nhận mặt bằng & báo giá m² (SLA 2h)",
    "ledWidth": 2,
    "ledHeight": 3,
    "ledModuleType": "LED P2.5 Indoor Hội trường & Tiệc cưới",
    "discountPercent": 0,
    "directorApprovalStatus": "NONE",
    "salesPersonId": "usr_sales_02",
    "createdById": "usr_admin_01",
    "createdAt": "2026-10-31T00:36:10.372Z",
    "attachments": []
  },
  {
    "id": "lead_test_hoabinh_05",
    "code": "TT-LED-2610-0005",
    "customerName": "Nguyễn Hoàng Bách",
    "companyName": "Tập đoàn Xây dựng Hòa Bình",
    "phone": "0908123888",
    "email": "bach.nh@hoabinhcorp.vn",
    "installationAddress": "235 Võ Thị Sáu, Quận 3, TP.HCM",
    "location": "TP. Hồ Chí Minh",
    "product": "Màn hình LED P1.86 Phòng họp Hội đồng Quản trị",
    "categoryId": "cat_led_indoor",
    "source": "Website",
    "status": "Đang soạn báo giá",
    "failureReason": null,
    "estimatedValue": "294.120.000 đ",
    "notes": "Yêu cầu tần số quét 3840Hz, thi công ngoài giờ hành chính cuối tuần.",
    "priorityScore": 88,
    "priorityTier": "HOT",
    "nextFollowUpAt": "2026-10-31T09:15:47.549Z",
    "nextActionNote": "Chờ Giám đốc duyệt chiết khấu 10% để gửi bản PDF chốt hợp đồng",
    "ledWidth": 4.8,
    "ledHeight": 2.5,
    "ledModuleType": "LED P1.86 Indoor Phòng họp VIP (Cabinet nhôm đúc)",
    "discountPercent": 10,
    "directorApprovalStatus": "PENDING",
    "salesPersonId": "usr_sales_01",
    "createdById": "usr_admin_01",
    "createdAt": "2026-10-30T10:00:00.000Z",
    "attachments": []
  },
  {
    "id": "lead_test_whitepalace_06",
    "code": "TT-LED-2610-0006",
    "customerName": "Trần Thanh Tùng",
    "companyName": "Trung tâm Hội nghị White Palace",
    "phone": "0913889977",
    "email": "tung.tt@whitepalace.com.vn",
    "installationAddress": "194 Hoàng Văn Thụ, Phú Nhuận, TP.HCM",
    "location": "TP. Hồ Chí Minh",
    "product": "Màn hình LED P2.5 Hội trường Sảnh Đại Yến",
    "categoryId": "cat_led_indoor",
    "source": "Hotline",
    "status": "Đã gửi báo giá",
    "failureReason": null,
    "estimatedValue": "182.500.000 đ",
    "notes": "Khách đã chốt mặt bằng, cần tiến độ bàn giao trong 7 ngày.",
    "priorityScore": 82,
    "priorityTier": "HOT",
    "nextFollowUpAt": "2026-11-01T00:15:47.549Z",
    "nextActionNote": "Gọi xác nhận lịch ký hợp đồng & tạm ứng đợt 1 (50%)",
    "ledWidth": 4,
    "ledHeight": 2.5,
    "ledModuleType": "LED P2.5 Indoor Hội trường & Tiệc cưới",
    "discountPercent": 0,
    "directorApprovalStatus": "NONE",
    "salesPersonId": "usr_sales_02",
    "createdById": "usr_admin_01",
    "createdAt": "2026-10-30T11:00:00.000Z",
    "attachments": []
  }
];

export const TEST_QUOTES = [
  {
    "id": "quote_test_01",
    "code": "BG-TT-2610-001",
    "leadId": "lead_test_hoabinh_05",
    "moduleSpec": "LED P1.86 Indoor Phòng họp VIP (Cabinet nhôm đúc)",
    "widthMeters": 4.8,
    "heightMeters": 2.5,
    "areaSqm": 12,
    "unitPriceVnd": 24000000,
    "processorVnd": 16500000,
    "structureInstallVnd": 22300000,
    "discountPercent": 10,
    "totalVnd": 294120000,
    "warrantyMonths": 36,
    "notes": "Bao gồm hệ khung nhôm định hình CNC siêu mỏng & Bộ xử lý Novastar VX600.",
    "status": "PENDING_DIRECTOR",
    "createdById": "usr_sales_01"
  }
];

export const TEST_ACTIVITIES = [
  {
    "id": "act_test_01",
    "leadId": "lead_test_hoabinh_05",
    "type": "SURVEY",
    "summary": "Đã khảo sát thực tế mặt bằng phòng họp VIP: vách bê tông chịu lực tốt, kích thước chuẩn 4.8m × 2.5m (12m²), tủ điện 3 pha cách 8m.",
    "outcome": "Khách đề nghị mức chiết khấu dự án 10% — Đã lập báo giá trình Giám đốc phê duyệt.",
    "nextFollowUpAt": "2026-10-31T10:15:47.549Z",
    "createdById": "usr_sales_01"
  }
];

export const TEST_REPORTS = [
  {
    "id": "cmvtxthdv0007bzpbc22k54gq",
    "title": "báo cáo",
    "content": "tôi xin phép báo cáo",
    "department": "MARKETING",
    "attachmentName": "1.jpg",
    "attachmentUrl": "/uploads/1793302184467_1.jpg",
    "createdById": "usr_mkt_01",
    "createdAt": "2026-10-29T19:29:44.515Z"
  },
  {
    "id": "cmvuqkq6u000l7g1jdofyw4zj",
    "title": "EM gửi báo cáo desgin",
    "content": "Tiếp nhận/tạo Lead; kiểm tra trùng; phân loại sản phẩm & nguồn; phân công/chuyển Sales; trạng thái & báo giá; lịch sử, file đính kèm, lý do thất bại; phân quyền.*\nNguồn Lead; UTM; Campaign; Landing Page; Website; thiết bị; Google Ads; GA4; Search Console; đồng bộ tự động; nghiên cứu n8n.*",
    "department": "DESIGN",
    "attachmentName": null,
    "attachmentUrl": null,
    "createdById": "usr_design_01",
    "createdAt": "2026-10-30T08:54:44.887Z"
  },
  {
    "id": "cmvvdzumf0001ei3e5o1m29zi",
    "title": "Báo cáo tổng hợp số liệu thực tế Ban Giám Đốc — Ngày 31/10/2026",
    "content": "> Phân loại văn bản: **Tờ trình / Đề xuất phê duyệt**\n\n# I. KẾT QUẢ THỰC HIỆN & SỐ LIỆU ĐẠT ĐƯỢC\n- Tổng số hồ sơ Lead thực tế trên hệ thống: **6 hồ sơ** (Tổng giá trị dự toán ghi nhận: **1.564.740.000 đ**).\n- Phân bổ tiến độ thực tế: **2** Lead mới tiếp nhận · **2** hồ sơ đang báo giá · **1** hợp đồng chốt thành công (294.120.000 đ) · **1** hồ sơ thất bại/tạm dừng.\n\nCác hồ sơ trọng tâm gần nhất trên hệ thống:\n- **TT-LED-2610-0004** (Trương Văn Long — Khách hàng cá nhân / Dự án): Màn hình LED P2.5 Indoor Hội trường (2m × 3m = 6m²) · Trạng thái: **Vừa nhận thông tin** (114.500.000 đ)\n- **TT-LED-2610-0003** (Anh Minh — Khách sạn Rex Quận 1): Màn hình LED P2.5 Indoor Hội trường (6m × 3.5m = 21m²) · Trạng thái: **Vừa nhận thông tin** (369.500.000 đ)\n- **TT-LED-2610-0002** (uth — uth): màn 38inch · Trạng thái: **Thất bại** (390.000.000)\n- **TT-LED-2610-0001** (Truong Van Long — royle): màn hình 28inch · Trạng thái: **Chốt thành công** (294.120.000 đ)\n\n# II. VƯỚNG MẮC & ĐỀ XUẤT HƯỚNG XỬ LÝ\n- Có **2 Lead mới vừa nhận thông tin** cần liên hệ khảo sát mặt bằng trong khung SLA 2 giờ.\n\n# III. KẾ HOẠCH TRỌNG TÂM TIẾP THEO\n1. Liên hệ xác nhận kích thước mặt bằng và gửi báo giá PDF chi tiết cho toàn bộ hồ sơ mới tiếp nhận.\n2. Rà soát các hồ sơ có mức chiết khấu > 8% hoặc giá trị >= 200 triệu đồng để trình Ban Giám Đốc phê duyệt sớm.",
    "department": "ADMIN_SYS",
    "attachmentName": null,
    "attachmentUrl": null,
    "createdById": "usr_admin_01",
    "createdAt": "2026-10-30T19:50:21.639Z"
  }
];
