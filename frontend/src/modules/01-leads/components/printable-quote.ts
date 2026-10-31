import type { Lead, LeadQuoteItem } from "../types";
import { escapeHtml, formatVnd } from "./lead-detail-constants";

export function openPrintableQuoteWindow(lead: Lead, quote: LeadQuoteItem) {
  const win = window.open("", "_blank", "width=920,height=860");
  if (!win) return;

  const ledLineTotal = Math.round(quote.areaSqm * quote.unitPriceVnd);
  const subtotal = ledLineTotal + quote.processorVnd + quote.structureInstallVnd;
  const discountVnd = Math.round(subtotal * (quote.discountPercent / 100));

  const approvalStamp =
    quote.status === "DIRECTOR_APPROVED"
      ? `<div style="margin-top:8px;color:#047857;font-weight:700;font-size:12px;">✓ ĐÃ PHÊ DUYỆT BỞI BAN GIÁM ĐỐC (${escapeHtml(
          quote.approvedByName || "Giám đốc Toàn Trung"
        )})</div>`
      : quote.status === "PENDING_DIRECTOR"
        ? `<div style="margin-top:8px;color:#b45309;font-weight:700;font-size:12px;">BẢN DỰ THẢO ĐANG TRÌNH BAN GIÁM ĐỐC PHÊ DUYỆT</div>`
        : "";

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Báo giá ${escapeHtml(quote.code)} - ${escapeHtml(lead.customerName)}</title>
  <style>
    * { box-sizing: border-box; font-family: "Segoe UI", Arial, sans-serif; }
    body { margin: 0; padding: 28px 36px; color: #0f172a; background: #fff; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #1e3a8a; padding-bottom: 14px; margin-bottom: 18px; }
    .brand { font-size: 18px; font-weight: 800; color: #1e3a8a; letter-spacing: 0.02em; }
    .sub { font-size: 12px; color: #475569; margin-top: 3px; }
    .quote-title { text-align: center; margin: 18px 0; }
    .quote-title h1 { margin: 0; font-size: 20px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.03em; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #1e3a8a; color: #fff; text-align: left; padding: 9px 10px; font-size: 12px; text-transform: uppercase; }
    td { border-bottom: 1px solid #e2e8f0; padding: 10px; vertical-align: top; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .totals { margin-left: auto; width: 340px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .totals-row.final { background: #eff6ff; font-weight: 800; font-size: 14.5px; color: #1e3a8a; border-bottom: none; }
    .terms { margin-top: 18px; font-size: 12px; color: #334155; background: #f8fafc; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; text-align: center; }
    .sig-box { min-height: 95px; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 12px 16px; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;display:flex;justify-content:flex-end;gap:10px;">
    <button onclick="window.print()" style="background:#2563eb;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-weight:600;cursor:pointer;">In / Lưu file PDF (A4)</button>
  </div>

  <div class="header">
    <div>
      <div class="brand">CÔNG TY TNHH ĐIỆN TỬ VIỄN THÔNG TOÀN TRUNG</div>
      <div class="sub">Giải pháp Màn hình LED Hội trường, Quảng cáo Ngoài trời &amp; Bảng điện tử Chuyên nghiệp</div>
      <div class="sub">Website: toantrungtelecom.com · ledtoantrung.vn | Hotline: 0909.123.456</div>
    </div>
    <div style="text-align:right;">
      <div style="font-weight:700;color:#1e3a8a;">Số: ${escapeHtml(quote.code)}</div>
      <div class="sub">Mã hồ sơ: ${escapeHtml(lead.code)}</div>
      <div class="sub">Ngày lập: ${escapeHtml(quote.createdAt)}</div>
    </div>
  </div>

  <div class="quote-title">
    <h1>BẢNG BÁO GIÁ GIẢI PHÁP MÀN HÌNH LED</h1>
    ${approvalStamp}
  </div>

  <div class="meta-grid">
    <div>
      <div><strong>Kính gửi:</strong> ${escapeHtml(lead.customerName)}</div>
      <div><strong>Đơn vị / Công ty:</strong> ${escapeHtml(lead.companyName)}</div>
      <div><strong>Điện thoại:</strong> ${escapeHtml(lead.phone)}</div>
    </div>
    <div>
      <div><strong>Địa điểm lắp đặt:</strong> ${escapeHtml(
        lead.installationAddress || lead.location
      )}</div>
      <div><strong>Chuyên viên tư vấn:</strong> ${escapeHtml(lead.salesPerson.name)}</div>
      <div><strong>Bảo hành tiêu chuẩn:</strong> ${quote.warrantyMonths} tháng tận nơi</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:42px;">STT</th>
        <th>Hạng mục &amp; Quy cách kỹ thuật</th>
        <th style="width:90px;">ĐVT / Khối lượng</th>
        <th class="num" style="width:130px;">Đơn giá (VNĐ)</th>
        <th class="num" style="width:140px;">Thành tiền (VNĐ)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>01</td>
        <td>
          <strong>${escapeHtml(quote.moduleSpec)}</strong><br/>
          <span style="color:#475569;font-size:12px;">Kích thước hiển thị: Ngang ${quote.widthMeters}m × Cao ${
            quote.heightMeters
          }m (Tổng diện tích: ${quote.areaSqm} m²). Bao gồm module LED, nguồn chuyên dụng, card thu tín hiệu đồng bộ tần số quét cao ≥ 3840Hz.</span>
        </td>
        <td>${quote.areaSqm} m²</td>
        <td class="num">${formatVnd(quote.unitPriceVnd)}</td>
        <td class="num"><strong>${formatVnd(ledLineTotal)}</strong></td>
      </tr>
      <tr>
        <td>02</td>
        <td>
          <strong>Bộ xử lý hình ảnh &amp; Điều khiển trung tâm (Video Processor Novastar)</strong><br/>
          <span style="color:#475569;font-size:12px;">Hỗ trợ cổng HDMI/DVI, cân chỉnh tỷ lệ khung hình chuẩn xác theo độ phân giải thực tế.</span>
        </td>
        <td>01 Bộ</td>
        <td class="num">${formatVnd(quote.processorVnd)}</td>
        <td class="num"><strong>${formatVnd(quote.processorVnd)}</strong></td>
      </tr>
      <tr>
        <td>03</td>
        <td>
          <strong>Hệ khung kết cấu thép chịu lực, viền trang trí, tủ điện &amp; Nhân công lắp đặt</strong><br/>
          <span style="color:#475569;font-size:12px;">Thi công trọn gói, cân chỉnh màu sắc, nghiệm thu bàn giao &amp; hướng dẫn vận hành tại công trình.</span>
        </td>
        <td>01 Gói</td>
        <td class="num">${formatVnd(quote.structureInstallVnd)}</td>
        <td class="num"><strong>${formatVnd(quote.structureInstallVnd)}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Cộng thành tiền trước chiết khấu:</span>
      <span class="num">${formatVnd(subtotal)}</span>
    </div>
    <div class="totals-row">
      <span>Chiết khấu thương mại (${quote.discountPercent}%):</span>
      <span class="num">- ${formatVnd(discountVnd)}</span>
    </div>
    <div class="totals-row final">
      <span>TỔNG GIÁ TRỊ BÁO GIÁ:</span>
      <span class="num">${formatVnd(quote.totalVnd)}</span>
    </div>
  </div>

  <div class="terms">
    <strong>Ghi chú &amp; Điều khoản thương mại:</strong><br/>
    • Bảo hành chính hãng Toàn Trung: <strong>${quote.warrantyMonths} tháng</strong> cho toàn bộ hệ thống màn hình LED và bộ điều khiển.<br/>
    • Tiến độ thi công dự kiến: 05 – 10 ngày làm việc kể từ ngày ký hợp đồng và bàn giao mặt bằng.<br/>
    ${quote.notes ? `• Ghi chú dự án: ${escapeHtml(quote.notes)}` : ""}
  </div>

  <div class="signatures">
    <div class="sig-box">
      <strong>CHUYÊN VIÊN LẬP BÁO GIÁ</strong>
      <div style="font-size:11.5px;color:#64748b;margin-top:4px;">(Ký &amp; ghi rõ họ tên)</div>
      <div style="margin-top:52px;font-weight:600;">${escapeHtml(quote.createdBy)}</div>
    </div>
    <div class="sig-box">
      <strong>ĐẠI DIỆN CÔNG TY TOÀN TRUNG</strong>
      <div style="font-size:11.5px;color:#64748b;margin-top:4px;">(Phê duyệt Ban Giám Đốc)</div>
      <div style="margin-top:52px;font-weight:600;">${escapeHtml(
        quote.approvedByName || "Ban Giám Đốc Toàn Trung"
      )}</div>
    </div>
  </div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}
