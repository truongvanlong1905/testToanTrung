import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canAccessAllLeads,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  computeLeadScore,
  computeLeadSla,
  formatVndNumber,
  parseVndString,
  extractMaxCodeSuffix,
} from "@/lib/lead-scoring";

function maskPhoneNumber(phone: string): string {
  if (!phone) return phone;
  const digits = phone.trim();
  if (digits.length <= 6) return "***";
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}

export const runtime = "nodejs";

const AiAssistSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("PARSE_RAW_TEXT"),
    rawText: z.string().trim().min(3, "Vui lòng nhập thông tin khách hàng").max(6000),
  }),
  z.object({
    action: z.literal("QUICK_CREATE"),
    rawText: z.string().trim().min(3, "Vui lòng nhập thông tin khách hàng").max(6000),
    salesPersonId: z.string().optional(),
  }),
  z.object({
    action: z.literal("SALES_COPILOT"),
    leadId: z.string().trim().min(1),
  }),
]);

export interface ParsedAiLead {
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  product: string;
  categoryName: string;
  source: string;
  location: string;
  installationAddress: string;
  estimatedValue: string;
  notes: string;
  ledModuleType: string | null;
  ledWidth: number | null;
  ledHeight: number | null;
  aiSummary: string;
  aiEngine: string;
}

/**
 * Ordered from most-specific decimal pitches (P1.86, P2.5) to integer pitches (P2, P3, P4)
 * with negative lookahead (?![.,]\d) so "P2.5" NEVER falsely matches "P2.0".
 */
const LED_PRESET_CATALOG = [
  {
    key: "P1.86",
    matchRegex: /\bp1[.,](?:5|53|6|66|8|86)\b|phòng họp vip|phong hop vip|cabinet nhôm|cabinet nhom/i,
    label: "LED P1.86 Indoor Phòng họp VIP (Cabinet nhôm đúc)",
    shortName: "LED P1.86 Indoor Phòng họp VIP",
    categoryName: "LED trong nhà",
    unitPrice: 24_000_000,
    processorVnd: 16_500_000,
  },
  {
    key: "P2.5",
    matchRegex: /\bp2[.,]5\b|hội trường|hoi truong|tiệc cưới|tiec cuoi|sân khấu trong nhà|san khau/i,
    label: "LED P2.5 Indoor Hội trường & Tiệc cưới",
    shortName: "LED P2.5 Indoor Hội trường",
    categoryName: "LED trong nhà",
    unitPrice: 15_500_000,
    processorVnd: 12_500_000,
  },
  {
    key: "P2.0",
    matchRegex: /\bp2(?:[.,]0)?(?![.,]\d)\b/i,
    label: "LED P2.0 Indoor Hội trường Trung tâm",
    shortName: "LED P2.0 Indoor Hội trường",
    categoryName: "LED trong nhà",
    unitPrice: 19_500_000,
    processorVnd: 14_000_000,
  },
  {
    key: "P3.0 Outdoor",
    matchRegex: /\bp3(?:[.,]0)?(?![.,]\d)\b|mặt tiền|mat tien|ip65|led\s*ngoài trời|led\s*ngoai troi/i,
    label: "LED P3.0 Outdoor Mặt tiền Tòa nhà (Chống nước IP65)",
    shortName: "LED P3.0 Outdoor Mặt tiền",
    categoryName: "LED ngoài trời",
    unitPrice: 18_500_000,
    processorVnd: 15_000_000,
  },
  {
    key: "P4.0 Outdoor",
    matchRegex: /\bp[456](?:[.,]0)?(?![.,]\d)\b|quảng cáo ngoài trời|quang cao ngoai troi|billboard|cổng chào|cong chao/i,
    label: "LED P4.0 Outdoor Quảng cáo Ngoài trời (IP65)",
    shortName: "LED P4.0 Outdoor Quảng cáo",
    categoryName: "LED ngoài trời",
    unitPrice: 14_200_000,
    processorVnd: 12_500_000,
  },
  {
    key: "Bảng điện tử",
    matchRegex: /bảng điện tử|bang dien tu|tỷ giá|ty gia|ma trận|ma tran|chạy chữ|chay chu|\bp10\b/i,
    label: "Bảng điện tử LED Ma trận / Tỷ giá Ngân hàng",
    shortName: "Bảng điện tử LED Ma trận",
    categoryName: "Bảng điện tử",
    unitPrice: 9_500_000,
    processorVnd: 4_500_000,
  },
];

const PROVINCE_KEYWORDS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\b(?:hcm|tphcm|tp\.?\s*hcm|sài gòn|sai gon|hồ chí minh|ho chi minh|quận\s*\d+|quan\s*\d+|thủ đức|thu duc|tân bình|tan binh|bình thạnh|binh thanh|gò vấp|go vap|phú nhuận|phu nhuan)\b/i, name: "TP. Hồ Chí Minh" },
  { pattern: /\b(?:hà nội|ha noi|hn|cầu giấy|cau giay|đống đa|dong da|ba đình|ba dinh|hoàn kiếm|hoan kiem|nam từ liêm|thanh xuân)\b/i, name: "Hà Nội" },
  { pattern: /\b(?:đà nẵng|da nang|hải châu|hai chau|sơn trà|son tra)\b/i, name: "Đà Nẵng" },
  { pattern: /\b(?:bình dương|binh duong|thuận an|thuan an|dĩ an|di an|thủ dầu một|thu dau mot)\b/i, name: "Bình Dương" },
  { pattern: /\b(?:đồng nai|dong nai|biên hòa|bien hoa|long thành|long thanh)\b/i, name: "Đồng Nai" },
  { pattern: /\b(?:cần thơ|can tho|ninh kiều|ninh kieu)\b/i, name: "Cần Thơ" },
  { pattern: /\b(?:hải phòng|hai phong)\b/i, name: "Hải Phòng" },
  { pattern: /\b(?:khánh hòa|khanh hoa|nha trang)\b/i, name: "Khánh Hòa" },
  { pattern: /\b(?:vũng tàu|vung tau|bà rịa|ba ria)\b/i, name: "Bà Rịa - Vũng Tàu" },
  { pattern: /\b(?:long an|đức hòa|duc hoa|bến lức|ben luc)\b/i, name: "Long An" },
  { pattern: /\b(?:bắc ninh|bac ninh)\b/i, name: "Bắc Ninh" },
];

const VN_NAME_TOKEN_MAP: Record<string, string> = {
  nguyen: "Nguyễn",
  tran: "Trần",
  le: "Lê",
  pham: "Phạm",
  hoang: "Hoàng",
  huynh: "Huỳnh",
  phan: "Phan",
  vu: "Vũ",
  vo: "Võ",
  dang: "Đặng",
  bui: "Bùi",
  do: "Đỗ",
  ho: "Hồ",
  ngo: "Ngô",
  duong: "Dương",
  ly: "Lý",
  truong: "Trương",
  dinh: "Đinh",
  trinh: "Trịnh",
  doan: "Đoàn",
  luong: "Lương",
  phung: "Phùng",
  ta: "Tạ",
  van: "Văn",
  thi: "Thị",
  huu: "Hữu",
  duc: "Đức",
  minh: "Minh",
  quoc: "Quốc",
  ngoc: "Ngọc",
  thanh: "Thanh",
  xuan: "Xuân",
  hong: "Hồng",
  quang: "Quang",
  anh: "Anh",
  tuan: "Tuấn",
  long: "Long",
  hung: "Hùng",
  dung: "Dũng",
  cuong: "Cường",
  thang: "Thắng",
  thao: "Thảo",
  huong: "Hương",
  trang: "Trang",
  linh: "Linh",
  lan: "Lan",
  mai: "Mai",
  nam: "Nam",
  hai: "Hải",
  son: "Sơn",
  dat: "Đạt",
  phat: "Phát",
  tai: "Tài",
  loc: "Lộc",
  khoa: "Khoa",
  khanh: "Khánh",
  huy: "Huy",
  phuong: "Phương",
  viet: "Việt",
  tung: "Tùng",
  bach: "Bách",
  bao: "Bảo",
  chi: "Chị",
};

function restoreVietnameseName(rawName: string): string {
  const cleaned = rawName
    .replace(/^[-–|,.:;\s]+|[-–|,.:;\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      if (/^[a-z]+$/.test(lower) && VN_NAME_TOKEN_MAP[lower]) {
        return VN_NAME_TOKEN_MAP[lower];
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(trimmed.slice(first, last + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callGeminiJson(
  prompt: string,
  timeoutMs = 5000
): Promise<{ data: Record<string, unknown> | null; modelUsed: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { data: null, modelUsed: null };

  const primaryModel = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
  const models = Array.from(new Set([primaryModel, "gemini-2.5-flash", "gemini-2.0-flash"]));

  for (const model of models) {
    try {
      const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          ...(model.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        }
      );

      if (!res.ok) continue;
      const payload = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text =
        payload.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("\n") || "";
      const obj = extractJsonObject(text);
      if (obj) {
        return { data: obj, modelUsed: model };
      }
    } catch {
      // Fallback gracefully
    }
  }

  return { data: null, modelUsed: null };
}

function deterministicParseVietnameseLead(rawText: string): ParsedAiLead {
  const normalized = rawText.replace(/\s+/g, " ").trim();

  // 1. Phone extraction
  const phoneMatch = normalized.match(/(?:\+84|0)(?:[\s.-]*\d){8,10}/);
  const phone = phoneMatch
    ? phoneMatch[0].replace(/[^\d+]/g, "").replace(/^\+84/, "0")
    : "";

  // 2. Email extraction
  const emailMatch = normalized.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : "";

  // 3. Dimensions: strip "p2.5" / "p1.86" first so pitch numbers never interfere with "2x3"
  const textWithoutPitch = normalized
    .replace(phoneMatch ? phoneMatch[0] : "", " ")
    .replace(/\bp\d+(?:[.,]\d+)?\b/gi, " ");

  let ledWidth: number | null = null;
  let ledHeight: number | null = null;

  const whNamed = textWithoutPitch.match(
    /(?:ngang|rộng|rong|dài|dai)\s*(\d+(?:[.,]\d+)?)\s*m?\s*[,x×* \-]+(?:cao|rộng|rong|đứng|dung)?\s*(\d+(?:[.,]\d+)?)\s*m?/i
  );
  const whCross = textWithoutPitch.match(
    /(\d+(?:[.,]\d+)?)\s*m?\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*m?(?!\d)/i
  );

  if (whNamed) {
    ledWidth = parseFloat(whNamed[1].replace(",", "."));
    ledHeight = parseFloat(whNamed[2].replace(",", "."));
  } else if (whCross) {
    ledWidth = parseFloat(whCross[1].replace(",", "."));
    ledHeight = parseFloat(whCross[2].replace(",", "."));
  } else {
    const areaOnly = textWithoutPitch.match(/(\d+(?:[.,]\d+)?)\s*(?:m2|m²)\b/i);
    if (areaOnly) {
      const area = parseFloat(areaOnly[1].replace(",", "."));
      if (area > 0 && area <= 600) {
        const h = Number(Math.sqrt(area / 1.77).toFixed(1));
        const w = Number((area / Math.max(0.5, h)).toFixed(1));
        ledWidth = w;
        ledHeight = h;
      }
    }
  }

  // 4. LED Preset & Category detection (P2.5 checked before P2.0!)
  let matchedPreset = LED_PRESET_CATALOG.find((item) => item.matchRegex.test(normalized));
  if (!matchedPreset) {
    if (/ngoài trời|ngoai troi|outdoor|mặt tiền|mat tien/i.test(normalized)) {
      matchedPreset = LED_PRESET_CATALOG[3];
    } else {
      matchedPreset = LED_PRESET_CATALOG[1]; // Default P2.5 Indoor
    }
  }

  let categoryName = matchedPreset.categoryName;
  if (/ngoài trời|ngoai troi|outdoor/i.test(normalized)) {
    categoryName = "LED ngoài trời";
  } else if (/trong nhà|trong nha|indoor/i.test(normalized)) {
    categoryName = "LED trong nhà";
  }

  // 5. Source detection
  let source = "Hotline";
  if (/email|mail/i.test(normalized)) source = "Email";
  if (/facebook|\bfb\b|fanpage|mess/i.test(normalized)) source = "Facebook Ads";
  if (/google|gg\s*ads/i.test(normalized)) source = "Google Ads";
  if (/web|toantrungtelecom|ledtoantrung|form/i.test(normalized)) source = "Website";
  if (/giới thiệu|gioi thieu|đối tác|doi tac/i.test(normalized)) source = "Giới thiệu";
  if (/triển lãm|trien lam|vietbuild/i.test(normalized)) source = "Triển lãm";

  // 6. Location & Address
  let location = "TP. Hồ Chí Minh";
  for (const prov of PROVINCE_KEYWORDS) {
    if (prov.pattern.test(normalized)) {
      location = prov.name;
      break;
    }
  }

  const addrMatch = normalized.match(
    /(?:tại|địa chỉ|dia chi|lắp tại|lap tai|công trình|cong trinh)\s*:?\s*([^,.;()]{4,75})/i
  );
  const installationAddress = addrMatch ? addrMatch[1].trim() : "";

  // 7. Company Name extraction
  let companyName = "";
  const orgMatch = normalized.match(
    /\b((?:Công ty|Cong ty|Cty|Tập đoàn|Tap doan|Khách sạn|Khach san|KS|Ngân hàng|Ngan hang|Bệnh viện|Benh vien|BV|Trường|Truong\s+ĐH|Đại học|Dai hoc|Trung tâm|Trung tam|Nhà hàng|Nha hang|Resort|UBND|Nhà máy|Nha may|Showroom)\s+[^,.;()\n0-9]{2,48})/i
  );
  if (orgMatch) {
    companyName = orgMatch[1]
      .replace(
        /\s+(?:sđt|sdt|đt|liên hệ|lien he|nhắn|nhan|gọi|goi|hỏi|hoi|cần|can|lắp|lap|led|màn|man|bảng|bang)\b.*$/i,
        ""
      )
      .trim();
  }

  // 8. Customer Name extraction
  let customerName = "";
  const honorificMatch = normalized.match(
    /\b(Anh|Chị|Chi|Cô|Chú|Bác|Mr\.?|Ms\.?|Mrs\.?|Ông|Bà)\s+([A-Za-zÀ-ỹ]+(?:\s+[A-Za-zÀ-ỹ]+){0,3})/i
  );
  if (honorificMatch) {
    const rawHon = `${honorificMatch[1].replace(".", "")} ${honorificMatch[2]}`;
    const trimmedHon = rawHon.replace(
      /\s+(?:bên|ben|cty|công|cong|khách|khach|sđt|sdt|gọi|goi|nhắn|nhan|hỏi|hoi|cần|can|led|màn|man)\b.*$/i,
      ""
    );
    customerName = restoreVietnameseName(trimmedHon);
  } else {
    let residual = normalized;
    if (phoneMatch) residual = residual.replace(phoneMatch[0], " | ");
    if (emailMatch) residual = residual.replace(emailMatch[0], " | ");
    if (orgMatch) residual = residual.replace(orgMatch[0], " | ");
    residual = residual
      .replace(/\bp\d+(?:[.,]\d+)?\b/gi, " | ")
      .replace(/\b\d+(?:[.,]\d+)?\s*m?\s*[x×*]\s*\d+(?:[.,]\d+)?\s*m?\b/gi, " | ")
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:m2|m²|tỷ|ty|triệu|trieu|tr|củ)\b/gi, " | ")
      .replace(
        /\b(?:màn hình|man hinh|màn|man|led|bảng điện tử|bang dien tu|ma trận|ma tran|tỷ giá|ty gia|indoor|outdoor|trong nhà|trong nha|ngoài trời|ngoai troi|hội trường|hoi truong|phòng họp|phong hop|mặt tiền|mat tien|ngang|cao|rộng|rong|dài|dai|zalo|hotline|website|web|fb|facebook|google|ads|sđt|sdt|đt|cần|can|hỏi|hoi|lắp|lap|báo giá|bao gia|tư vấn|tu van|khảo sát|khao sat)\b/gi,
        " | "
      );
    for (const prov of PROVINCE_KEYWORDS) {
      residual = residual.replace(prov.pattern, " | ");
    }

    const candidateSegments = residual
      .split(/(?:\||,|;|:|-|–|\(|\)|\/)+/)
      .map((s) => s.replace(/[^A-Za-zÀ-ỹ\s]/g, " ").replace(/\s+/g, " ").trim())
      .filter((s) => s.length >= 2 && s.split(" ").length <= 5);

    if (candidateSegments.length > 0) {
      customerName = restoreVietnameseName(candidateSegments[0]);
    }
  }

  // 9. Budget / Estimated Value
  let estimatedValue = "Đang khảo sát";
  const explicitTy = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:tỷ|ty\b)/i);
  const explicitTrieu = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr\b|củ)/i);
  if (explicitTy) {
    const vnd = Math.round(parseFloat(explicitTy[1].replace(",", ".")) * 1_000_000_000);
    estimatedValue = formatVndNumber(vnd);
  } else if (explicitTrieu) {
    const vnd = Math.round(parseFloat(explicitTrieu[1].replace(",", ".")) * 1_000_000);
    estimatedValue = formatVndNumber(vnd);
  } else if (ledWidth && ledHeight) {
    const area = ledWidth * ledHeight;
    const structureEstimate = Math.round(area * 1_500_000);
    const totalAuto = Math.round(
      area * matchedPreset.unitPrice + matchedPreset.processorVnd + structureEstimate
    );
    estimatedValue = formatVndNumber(totalAuto);
  }

  // 10. Clean Product Title
  const areaVal = ledWidth && ledHeight ? Number((ledWidth * ledHeight).toFixed(2)) : null;
  const dimSuffix =
    ledWidth && ledHeight ? ` (${ledWidth}m × ${ledHeight}m = ${areaVal}m²)` : "";
  const product = `Màn hình ${matchedPreset.shortName}${dimSuffix}`;

  const notes = [
    areaVal
      ? `[AI Phân tách nhanh] Cấu hình: ${matchedPreset.label} · Kích thước ${ledWidth}m × ${ledHeight}m (${areaVal}m²) · Tự tính dự toán chuẩn: ${estimatedValue}.`
      : `[AI Phân tách nhanh] Dòng sản phẩm: ${matchedPreset.label}.`,
    `Ghi chú gốc: "${normalized}"`,
  ].join(" ");

  return {
    customerName: customerName || "Khách hàng mới",
    companyName: companyName ? restoreVietnameseName(companyName) : "Khách hàng cá nhân / Dự án",
    phone,
    email,
    product,
    categoryName,
    source,
    location,
    installationAddress: installationAddress || location,
    estimatedValue,
    notes,
    ledModuleType: matchedPreset.label,
    ledWidth,
    ledHeight,
    aiSummary: areaVal
      ? `AI đã tách: ${customerName || "Khách hàng"} · ${phone || "Chưa có SĐT"} · ${
          matchedPreset.shortName
        } (${ledWidth}m × ${ledHeight}m = ${areaVal}m²) · Dự toán: ${estimatedValue}`
      : `AI đã tách: ${customerName || "Khách hàng"} · ${phone || "Chưa có SĐT"} · ${
          matchedPreset.shortName
        }`,
    aiEngine: "Toàn Trung Smart LED NLP",
  };
}

async function parseLeadWithAiAndDomain(rawText: string): Promise<ParsedAiLead> {
  const base = deterministicParseVietnameseLead(rawText);

  const prompt = `Bạn là AI Phân tách nhanh Lead Màn hình LED Toàn Trung Telecom.
Đọc dòng ghi chú tắt/tin nhắn sau (có thể viết thường không dấu, ví dụ "truong van long 0926471382 led p2.5 2x3") và bóc tách sang JSON:
"""${rawText}"""

Quy tắc bắt buộc:
- Nếu tên người hoặc tên công ty viết thường/không dấu (VD: "truong van long"), hãy tự khôi phục dấu tiếng Việt và viết hoa chuẩn ("Trương Văn Long").
- "2x3" hoặc "2*3" nghĩa là kích thước màn hình LED: ledWidth = 2, ledHeight = 3 (đơn vị mét). Không nhầm chữ số của dòng LED (như P2.5) với kích thước!
- Trả về JSON đúng mẫu:
{
  "customerName": "Họ tên chuẩn tiếng Việt có dấu",
  "companyName": "Tên công ty/đơn vị nếu có (hoặc chuỗi rỗng)",
  "phone": "Số điện thoại bắt đầu bằng 0",
  "email": "Email nếu có (hoặc chuỗi rỗng)",
  "categoryName": "LED trong nhà | LED ngoài trời | Bảng điện tử | Màn hình cong / đặc thù",
  "source": "Hotline | Website | Google Ads | Facebook Ads | Email | Giới thiệu | Triển lãm",
  "location": "Tỉnh/TP Việt Nam (mặc định TP. Hồ Chí Minh)",
  "installationAddress": "Địa chỉ cụ thể nếu có",
  "ledPitchHint": "VD: P1.86, P2.0, P2.5, P3.0 Outdoor, P4.0 Outdoor, Bảng điện tử",
  "ledWidth": số_mét_hoặc_null,
  "ledHeight": số_mét_hoặc_null,
  "explicitBudgetVnd": số_tiền_VND_khách_nêu_hoặc_null
}`;

  const { data: llm, modelUsed } = await callGeminiJson(prompt, 3500);
  if (!llm) return base;

  const str = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
  const num = (v: unknown, fallback: number | null) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Number(v.toFixed(2)) : fallback;

  const width = base.ledWidth ?? num(llm.ledWidth, null);
  const height = base.ledHeight ?? num(llm.ledHeight, null);

  const preset =
    LED_PRESET_CATALOG.find((item) => item.matchRegex.test(rawText)) ||
    LED_PRESET_CATALOG.find((item) => item.matchRegex.test(String(llm.ledPitchHint || ""))) ||
    LED_PRESET_CATALOG[1];

  const categoryName = [
    "LED trong nhà",
    "LED ngoài trời",
    "Bảng điện tử",
    "Màn hình cong / đặc thù",
  ].includes(String(llm.categoryName || ""))
    ? String(llm.categoryName)
    : base.categoryName;

  let estimatedValue = base.estimatedValue;
  if (typeof llm.explicitBudgetVnd === "number" && llm.explicitBudgetVnd >= 5_000_000) {
    estimatedValue = formatVndNumber(llm.explicitBudgetVnd);
  } else if (width && height) {
    const area = width * height;
    const autoTotal = Math.round(
      area * preset.unitPrice + preset.processorVnd + area * 1_500_000
    );
    estimatedValue = formatVndNumber(autoTotal);
  }

  const areaVal = width && height ? Number((width * height).toFixed(2)) : null;
  const dimSuffix = width && height ? ` (${width}m × ${height}m = ${areaVal}m²)` : "";
  const product = `Màn hình ${preset.shortName}${dimSuffix}`;

  const customerName = str(llm.customerName, base.customerName);
  const companyName = str(llm.companyName, base.companyName);
  const cleanPhone =
    typeof llm.phone === "string" && llm.phone.replace(/\D/g, "").length >= 8
      ? llm.phone.replace(/[^\d+]/g, "").replace(/^\+84/, "0")
      : base.phone;

  const validSources = [
    "Hotline",
    "Form",
    "Email",
    "Google Ads",
    "Facebook Ads",
    "Website",
    "Giới thiệu",
    "Triển lãm",
  ];
  const source = validSources.includes(String(llm.source || ""))
    ? String(llm.source)
    : base.source;

  return {
    customerName,
    companyName,
    phone: cleanPhone,
    email: str(llm.email, base.email),
    product,
    categoryName,
    source,
    location: str(llm.location, base.location),
    installationAddress: str(llm.installationAddress, base.installationAddress),
    estimatedValue,
    notes: base.notes,
    ledModuleType: preset.label,
    ledWidth: width,
    ledHeight: height,
    aiSummary: areaVal
      ? `AI (${modelUsed}) đã phân tách: ${customerName} · ${cleanPhone} · ${preset.shortName} (${width}m × ${height}m = ${areaVal}m²) · Dự toán: ${estimatedValue}`
      : `AI (${modelUsed}) đã phân tách: ${customerName} · ${cleanPhone} · ${preset.shortName}`,
    aiEngine: `Gemini (${modelUsed}) + Toàn Trung LED Engine`,
  };
}

function splitIntoLeadLines(rawText: string): string[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [rawText.trim()];

  const linesWithPhones = lines.filter((l) => /(?:\+84|0)(?:[\s.-]*\d){8,10}/.test(l));
  if (linesWithPhones.length >= 2) {
    return linesWithPhones;
  }
  return [rawText.trim()];
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();

    const body = await req.json();
    const parsedReq = AiAssistSchema.safeParse(body);
    if (!parsedReq.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsedReq.error.issues[0]?.message || "Yêu cầu AI không hợp lệ",
          },
        },
        { status: 400 }
      );
    }

    const input = parsedReq.data;

    // =========================================================================
    // ACTION 1: PARSE_RAW_TEXT (Single lead extraction into Form)
    // =========================================================================
    if (input.action === "PARSE_RAW_TEXT") {
      const parsed = await parseLeadWithAiAndDomain(input.rawText);
      const rawDuplicates =
        parsed.phone.length >= 8
          ? await prisma.lead.findMany({
              where: { phone: { contains: parsed.phone.slice(-8) } },
              select: {
                id: true,
                code: true,
                customerName: true,
                companyName: true,
                phone: true,
                status: true,
                salesPersonId: true,
                createdById: true,
              },
              take: 3,
            })
          : [];

      const fullAccess = canAccessAllLeads(user);
      const duplicateLeads = rawDuplicates.map((d) => {
        const isOwner =
          fullAccess ||
          !d.salesPersonId ||
          d.salesPersonId === user.userId ||
          d.createdById === user.userId;
        return {
          id: d.id,
          code: d.code,
          customerName: d.customerName,
          companyName: d.companyName,
          phone: isOwner ? d.phone : maskPhoneNumber(d.phone),
          status: d.status,
        };
      });

      return NextResponse.json({
        success: true,
        data: { parsed, duplicateLeads },
      });
    }

    // =========================================================================
    // ACTION 2: QUICK_CREATE
    // =========================================================================
    if (input.action === "QUICK_CREATE") {
      const lines = splitIntoLeadLines(input.rawText);

      const [categories, salesPool, existingLeadCodes] = await Promise.all([
        prisma.productCategory.findMany(),
        prisma.user.findMany({
          where: { role: "SALES", isActive: true },
          select: {
            id: true,
            name: true,
            initials: true,
            _count: {
              select: {
                assignedLeads: {
                  where: { status: { notIn: ["Chốt thành công", "Thất bại"] } },
                },
              },
            },
          },
        }),
        prisma.lead.findMany({ select: { code: true } }),
      ]);

      salesPool.sort((a, b) => a._count.assignedLeads - b._count.assignedLeads);
      const baseMaxSeq = extractMaxCodeSuffix(existingLeadCodes, existingLeadCodes.length);

      const parsedItems = await Promise.all(
        lines.map((line) =>
          lines.length <= 3
            ? parseLeadWithAiAndDomain(line)
            : Promise.resolve(deterministicParseVietnameseLead(line))
        )
      );

      if (parsedItems.length === 1 && parsedItems[0].phone.replace(/\D/g, "").length < 8) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MISSING_PHONE",
              message:
                "AI đã đọc Tên & cấu hình LED nhưng chưa thấy Số điện thoại (>= 8 số). Vui lòng nhập thêm SĐT!",
            },
            data: { parsed: parsedItems[0], duplicateLeads: [] },
          },
          { status: 422 }
        );
      }

      const now = new Date();
      const yearMonth = `${String(now.getFullYear()).slice(-2)}${String(
        now.getMonth() + 1
      ).padStart(2, "0")}`;
      const slaDeadline = new Date(now.getTime() + 2 * 3_600_000);

      const createdLeads: Array<Record<string, unknown>> = [];
      const assignmentSummary: Record<string, number> = {};
      let seqOffset = 0;

      for (let i = 0; i < parsedItems.length; i++) {
        const parsed = parsedItems[i];
        if (parsed.phone.replace(/\D/g, "").length < 8) continue;

        const category =
          categories.find((c) => c.name === parsed.categoryName) || categories[0];
        const categoryId = category?.id || "cat_led_indoor";

        let assignedSales = salesPool.find((s) => s.id === input.salesPersonId);
        if (!assignedSales && salesPool.length > 0) {
          assignedSales = salesPool[i % salesPool.length];
        }
        const salesPersonId = assignedSales?.id;

        seqOffset += 1;
        const code = `TT-LED-${yearMonth}-${String(baseMaxSeq + seqOffset).padStart(4, "0")}`;

        const scored = computeLeadScore({
          status: "Vừa nhận thông tin",
          estimatedValue: parsed.estimatedValue,
          installationAddress: parsed.installationAddress,
          email: parsed.email,
          source: parsed.source,
          ledWidth: parsed.ledWidth,
          ledHeight: parsed.ledHeight,
        });

        const newLead = await prisma.lead.create({
          data: {
            code,
            customerName: parsed.customerName,
            companyName: parsed.companyName || "Khách hàng cá nhân / Dự án",
            phone: parsed.phone,
            email: parsed.email || null,
            installationAddress: parsed.installationAddress || null,
            location: parsed.location || "TP. Hồ Chí Minh",
            product: parsed.product,
            categoryId,
            source: parsed.source,
            status: "Vừa nhận thông tin",
            salesPersonId,
            createdById: user.userId,
            estimatedValue: parsed.estimatedValue,
            notes: parsed.notes,
            ledWidth: parsed.ledWidth,
            ledHeight: parsed.ledHeight,
            ledModuleType: parsed.ledModuleType,
            priorityScore: scored.score,
            priorityTier: scored.tier,
            nextFollowUpAt: slaDeadline,
            nextActionNote: "AI phân chia nhanh — Gọi xác nhận mặt bằng & báo giá m² (SLA 2h)",
          },
          include: {
            category: true,
            salesPerson: true,
          },
        });

        await prisma.leadStatusHistory.create({
          data: {
            leadId: newLead.id,
            fromStatus: null,
            toStatus: newLead.status,
            reason: `Khởi tạo & phân chia nhanh bằng AI (${parsed.aiEngine})`,
            changedById: user.userId || salesPersonId,
          },
        });

        if (salesPersonId) {
          const sName = newLead.salesPerson?.name || "Sales";
          assignmentSummary[sName] = (assignmentSummary[sName] || 0) + 1;
          await prisma.leadAssignment.create({
            data: {
              leadId: newLead.id,
              toSalesId: salesPersonId,
              reason: input.salesPersonId
                ? "Chỉ định trực tiếp từ thanh Tạo nhanh AI"
                : "AI tự động phân chia cân bằng tải cho Sales",
              assignedById: user.userId,
            },
          });
        }

        await prisma.auditLog.create({
          data: {
            userId: user.userId,
            leadId: newLead.id,
            action: "AI_QUICK_CREATE_LEAD",
            entity: "LEAD",
            entityId: newLead.id,
            details: JSON.stringify({
              code: newLead.code,
              customerName: newLead.customerName,
              product: newLead.product,
              estimatedValue: newLead.estimatedValue,
              assignedTo: newLead.salesPerson?.name,
            }),
          },
        });

        const sla = computeLeadSla({
          status: newLead.status,
          createdAt: newLead.createdAt,
          lastContactedAt: newLead.lastContactedAt,
          nextFollowUpAt: newLead.nextFollowUpAt,
        });

        createdLeads.push({
          id: newLead.id,
          code: newLead.code,
          customerName: newLead.customerName,
          companyName: newLead.companyName,
          phone: newLead.phone,
          email: newLead.email || "",
          product: newLead.product,
          category: newLead.category?.name || parsed.categoryName,
          categoryId: newLead.categoryId,
          source: newLead.source,
          status: newLead.status,
          estimatedValue: newLead.estimatedValue || "Đang khảo sát",
          installationAddress: newLead.installationAddress || "",
          location: newLead.location,
          notes: newLead.notes || "",
          createdAt: newLead.createdAt.toLocaleDateString("vi-VN"),
          priorityScore: scored.score,
          priorityTier: scored.tier,
          slaStatus: sla.slaStatus,
          slaLabel: sla.slaLabel,
          nextFollowUpAt: newLead.nextFollowUpAt?.toISOString() || null,
          nextActionNote: newLead.nextActionNote,
          ledWidth: newLead.ledWidth,
          ledHeight: newLead.ledHeight,
          ledModuleType: newLead.ledModuleType,
          salesPerson: {
            id: newLead.salesPerson?.id,
            name: newLead.salesPerson?.name || "Chưa phân công",
            initials: newLead.salesPerson?.initials || "TT",
          },
          attachments: [],
        });
      }

      const firstLead = createdLeads[0];
      const msg =
        createdLeads.length > 1
          ? `AI đã đọc & tự động phân chia ${createdLeads.length} Lead mới cho đội Sales!`
          : `AI đã tạo Lead ${firstLead?.code} (${firstLead?.customerName}) & phân công cho ${(firstLead?.salesPerson as { name?: string })?.name}!`;

      return NextResponse.json(
        {
          success: true,
          message: msg,
          data: {
            parsed: parsedItems[0],
            lead: firstLead,
            createdLeads,
            assignmentSummary,
          },
        },
        { status: 201 }
      );
    }

    // =========================================================================
    // ACTION 3: SALES_COPILOT
    // =========================================================================
    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      include: {
        category: true,
        salesPerson: { select: { id: true, name: true } },
        quotes: { orderBy: { createdAt: "desc" }, take: 2 },
        activities: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Không tìm thấy hồ sơ Lead" } },
        { status: 404 }
      );
    }

    const canView =
      canAccessAllLeads(user) ||
      !lead.salesPersonId ||
      lead.salesPersonId === user.userId ||
      lead.createdById === user.userId;
    if (!canView) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Bạn không có quyền truy cập hồ sơ này" } },
        { status: 403 }
      );
    }

    const hintText = `${lead.product} ${lead.category?.name || ""} ${lead.notes || ""}`;
    const preset =
      LED_PRESET_CATALOG.find((item) => item.matchRegex.test(hintText)) || LED_PRESET_CATALOG[1];

    let recWidth = lead.ledWidth && lead.ledWidth > 0 ? lead.ledWidth : 4.8;
    let recHeight = lead.ledHeight && lead.ledHeight > 0 ? lead.ledHeight : 2.7;

    if (!lead.ledWidth || !lead.ledHeight) {
      const budgetVnd = parseVndString(lead.estimatedValue);
      if (budgetVnd >= 40_000_000) {
        const usableForScreen = Math.max(
          20_000_000,
          budgetVnd - preset.processorVnd - 15_000_000
        );
        const estArea = Math.min(120, Math.max(4, usableForScreen / preset.unitPrice));
        recHeight = Number(Math.sqrt(estArea / 1.77).toFixed(1));
        recWidth = Number((estArea / Math.max(1, recHeight)).toFixed(1));
      }
    }

    const areaSqm = Number((recWidth * recHeight).toFixed(2));
    const structureInstallVnd = Math.max(9_000_000, Math.round(areaSqm * 1_500_000));
    const estimatedTotalVnd = Math.round(
      areaSqm * preset.unitPrice + preset.processorVnd + structureInstallVnd
    );

    const copilotPrompt = `Bạn là Giám đốc Kỹ thuật & Kinh doanh giải pháp Màn hình LED Toàn Trung Telecom.
Phân tích hồ sơ khách hàng sau và soạn tư vấn ngắn gọn:
- Khách hàng: ${lead.customerName} (${lead.companyName})
- Nhu cầu: ${lead.product} (${lead.category?.name || "LED"})
- Khu vực: ${lead.installationAddress || lead.location}
- Cấu hình đề xuất: ${preset.label}, kích thước ${recWidth}m x ${recHeight}m (${areaSqm}m²), tổng dự toán trọn gói ~${formatVndNumber(estimatedTotalVnd)}.

Trả về JSON hợp lệ:
{
  "rationale": "Lý do chọn dòng module LED & kích thước này (khoảng cách nhìn, tần số quét >= 3840Hz) trong 2 câu ngắn",
  "outreachMessage": "Tin nhắn Zalo chuyên nghiệp gửi ${lead.customerName} từ Toàn Trung Telecom, báo cấu hình ${recWidth}m x ${recHeight}m (${areaSqm}m²) và hẹn khảo sát/gửi báo giá PDF",
  "nextBestActions": ["Bước 1", "Bước 2", "Bước 3"]
}`;

    const { data: llmCopilot, modelUsed } = await callGeminiJson(copilotPrompt, 4500);

    const rationale =
      typeof llmCopilot?.rationale === "string" && llmCopilot.rationale.trim()
        ? llmCopilot.rationale.trim()
        : `Cấu hình ${preset.label} kích thước ${recWidth}m × ${recHeight}m (${areaSqm}m²) đảm bảo hình ảnh sắc nét, tần số quét ≥ 3840Hz chống sọc khi quay phim sự kiện và tối ưu ngân sách đầu tư.`;

    const outreachMessage =
      typeof llmCopilot?.outreachMessage === "string" && llmCopilot.outreachMessage.trim()
        ? llmCopilot.outreachMessage.trim()
        : `Dạ chào ${lead.customerName}, em là ${
            lead.salesPerson?.name || "Chuyên viên tư vấn"
          } từ Toàn Trung Telecom (ledtoantrung.vn). Với nhu cầu "${
            lead.product
          }", bên em đề xuất cấu hình chuẩn ${
            preset.label
          } kích thước ${recWidth}m × ${recHeight}m (${areaSqm}m², tần số quét ≥ 3840Hz, bảo hành 24 tháng tận nơi) với tổng dự toán trọn gói khoảng ${formatVndNumber(
            estimatedTotalVnd
          )}. Em xin phép gửi bảng báo giá PDF chi tiết và hẹn lịch khảo sát mặt bằng thực tế ạ!`;

    const nextBestActions =
      Array.isArray(llmCopilot?.nextBestActions) &&
      llmCopilot.nextBestActions.every((x) => typeof x === "string") &&
      llmCopilot.nextBestActions.length >= 2
        ? (llmCopilot.nextBestActions as string[]).slice(0, 3)
        : [
            `Gửi tin nhắn Zalo xác nhận kích thước ${recWidth}m × ${recHeight}m (${areaSqm}m²) với ${lead.customerName}.`,
            `Bấm "Đẩy cấu hình này sang Báo giá m²" để xuất báo giá PDF chuẩn Toàn Trung.`,
            `Đặt lịch hẹn SLA khảo sát nguồn điện & khung đỡ tại ${
              lead.installationAddress || lead.location
            }.`,
          ];

    return NextResponse.json({
      success: true,
      data: {
        aiEngine: modelUsed ? `Gemini (${modelUsed})` : "Toàn Trung LED Engineering Advisor",
        recommendedConfig: {
          moduleSpec: preset.label,
          widthMeters: recWidth,
          heightMeters: recHeight,
          areaSqm,
          unitPriceVnd: preset.unitPrice,
          processorVnd: preset.processorVnd,
          structureInstallVnd,
          estimatedTotalVnd,
          rationale,
        },
        outreachMessage,
        nextBestActions,
      },
    });
  } catch (error) {
    console.error("POST /api/leads/ai-assist error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Lỗi xử lý Trợ lý AI Quản lý Lead" },
      },
      { status: 500 }
    );
  }
}
