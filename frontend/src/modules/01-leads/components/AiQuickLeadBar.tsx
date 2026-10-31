"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Zap,
  FileEdit,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Phone,
  Tv,
  Calculator,
  Users2,
} from "lucide-react";
import { Lead } from "../types";
import { Button } from "@/src/core/ui/button";
import { StatusBadge } from "@/src/core/ui/badge";
import { sharedGetJson } from "@/src/core/http/shared-fetch";

export interface AiLeadDraft {
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
  ledModuleType?: string | null;
  ledWidth?: number | null;
  ledHeight?: number | null;
  aiSummary?: string;
}

interface AiQuickLeadBarProps {
  onLeadCreated: (lead: Lead, message: string) => void;
  onOpenPrefilledModal: (draft: AiLeadDraft, warning?: string) => void;
  onSelectLead?: (lead: Lead) => void;
}

interface LivePreviewItem {
  customerName: string;
  phone: string;
  productLabel: string;
  categoryName: string;
  areaLabel: string | null;
  estimatedVndLabel: string;
}

const VN_QUICK_TOKENS: Record<string, string> = {
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
  van: "Văn",
  thi: "Thị",
  minh: "Minh",
  duc: "Đức",
  quoc: "Quốc",
  ngoc: "Ngọc",
  long: "Long",
  tuan: "Tuấn",
  hung: "Hùng",
  dung: "Dũng",
  cuong: "Cường",
  thang: "Thắng",
  thao: "Thảo",
  huong: "Hương",
  trang: "Trang",
  linh: "Linh",
  lan: "Lan",
  nam: "Nam",
  hai: "Hải",
  son: "Sơn",
  dat: "Đạt",
  tai: "Tài",
  khoa: "Khoa",
  khanh: "Khánh",
  huy: "Huy",
  tung: "Tùng",
  bach: "Bách",
  bao: "Bảo",
};

function quickTitleVnName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const l = w.toLowerCase();
      if (/^[a-z]+$/.test(l) && VN_QUICK_TOKENS[l]) return VN_QUICK_TOKENS[l];
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * 0ms client-side live breakdown preview so as soon as user types
 * "truong van long 0926471382 led p2.5 2x3", they immediately see AI splitting every field!
 */
function parseInstantClientPreview(rawLine: string): LivePreviewItem | null {
  const line = rawLine.replace(/\s+/g, " ").trim();
  if (line.length < 3) return null;

  const phoneMatch = line.match(/(?:\+84|0)(?:[\s.-]*\d){7,10}/);
  const phone = phoneMatch ? phoneMatch[0].replace(/[^\d+]/g, "").replace(/^\+84/, "0") : "";

  const noPitch = line
    .replace(phoneMatch ? phoneMatch[0] : "", " ")
    .replace(/\bp\d+(?:[.,]\d+)?\b/gi, " ");

  let width: number | null = null;
  let height: number | null = null;
  const wh =
    noPitch.match(
      /(?:ngang|rộng|rong|dài|dai)\s*(\d+(?:[.,]\d+)?)\s*m?\s*[,x×* \-]+(?:cao|rộng|rong|đứng|dung)?\s*(\d+(?:[.,]\d+)?)\s*m?/i
    ) || noPitch.match(/(\d+(?:[.,]\d+)?)\s*m?\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*m?(?!\d)/i);

  if (wh) {
    width = parseFloat(wh[1].replace(",", "."));
    height = parseFloat(wh[2].replace(",", "."));
  }

  let productShort = "LED P2.5 Indoor";
  let categoryName = "LED trong nhà";
  let unitPrice = 15_500_000;
  let processor = 12_500_000;

  if (/\bp1[.,](?:5|53|6|8|86)\b/i.test(line)) {
    productShort = "LED P1.86 Phòng họp VIP";
    unitPrice = 24_000_000;
    processor = 16_500_000;
  } else if (/\bp2[.,]5\b/i.test(line)) {
    productShort = "LED P2.5 Indoor Hội trường";
    unitPrice = 15_500_000;
    processor = 12_500_000;
  } else if (/\bp2(?:[.,]0)?(?![.,]\d)\b/i.test(line)) {
    productShort = "LED P2.0 Indoor Hội trường";
    unitPrice = 19_500_000;
    processor = 14_000_000;
  } else if (/\bp3(?:[.,]0)?(?![.,]\d)\b|ngoài trời|ngoai troi|outdoor/i.test(line)) {
    productShort = "LED P3.0 Outdoor Mặt tiền";
    categoryName = "LED ngoài trời";
    unitPrice = 18_500_000;
    processor = 15_000_000;
  } else if (/\bp[456](?:[.,]0)?(?![.,]\d)\b/i.test(line)) {
    productShort = "LED P4.0 Outdoor Quảng cáo";
    categoryName = "LED ngoài trời";
    unitPrice = 14_200_000;
    processor = 12_500_000;
  } else if (/bảng điện tử|bang dien tu|tỷ giá|ty gia|ma trận|ma tran|\bp10\b/i.test(line)) {
    productShort = "Bảng điện tử LED Ma trận";
    categoryName = "Bảng điện tử";
    unitPrice = 9_500_000;
    processor = 4_500_000;
  }

  if (/ngoài trời|ngoai troi|outdoor/i.test(line)) categoryName = "LED ngoài trời";

  // Extract customer name by subtracting phone, dimensions & product tokens
  let residual = line;
  if (phoneMatch) residual = residual.replace(phoneMatch[0], " | ");
  residual = residual
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, " | ")
    .replace(/\bp\d+(?:[.,]\d+)?\b/gi, " | ")
    .replace(/\b\d+(?:[.,]\d+)?\s*m?\s*[x×*]\s*\d+(?:[.,]\d+)?\s*m?\b/gi, " | ")
    .replace(
      /\b(?:màn hình|man hinh|màn|man|led|bảng điện tử|bang dien tu|ma trận|ma tran|tỷ giá|ty gia|indoor|outdoor|trong nhà|trong nha|ngoài trời|ngoai troi|hội trường|hoi truong|phòng họp|phong hop|ngang|cao|rộng|rong|dài|dai|hcm|hn|hà nội|ha noi|đà nẵng|da nang|zalo|web|fb)\b/gi,
      " | "
    );

  const namePart = residual
    .split(/(?:\||,|;|:|-|–|\(|\)|\/)+/)
    .map((s) => s.replace(/[^A-Za-zÀ-ỹ\s]/g, " ").replace(/\s+/g, " ").trim())
    .find((s) => s.length >= 2);

  const area = width && height ? Number((width * height).toFixed(2)) : null;
  const estVnd = area
    ? `${Math.round(area * unitPrice + processor + area * 1_500_000).toLocaleString("vi-VN")} đ`
    : "Tự tính khi có kích thước";

  return {
    customerName: namePart ? quickTitleVnName(namePart) : "Đang đọc tên...",
    phone: phone || "Chưa có SĐT",
    productLabel: productShort,
    categoryName,
    areaLabel: area ? `${width}m × ${height}m (${area} m²)` : null,
    estimatedVndLabel: estVnd,
  };
}

const SHORTHAND_EXAMPLES = [
  {
    chip: "VD 1: truong van long 0926471382 led p2.5 2x3",
    text: "truong van long 0926471382 led p2.5 2x3",
  },
  {
    chip: "VD 2: LED P3 ngoài trời 6x4 Đà Nẵng",
    text: "nguyen minh tuan 0908112233 led p3 ngoai troi 6x4 da nang",
  },
  {
    chip: "VD 3: Chia 2 Lead cùng lúc",
    text: "truong van long 0926471382 led p2.5 2x3\npham thu trang 0918334455 bang dien tu ty gia 4x1.5 hcm",
  },
];

export const AiQuickLeadBar = React.memo(function AiQuickLeadBar({
  onLeadCreated,
  onOpenPrefilledModal,
  onSelectLead,
}: AiQuickLeadBarProps) {
  const [rawText, setRawText] = useState("");
  const [selectedSalesId, setSelectedSalesId] = useState<string>("AUTO");
  const [salesUsers, setSalesUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [isParsingToForm, setIsParsingToForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdSummary, setCreatedSummary] = useState<{
    lead?: Lead;
    count: number;
    assignmentSummary?: Record<string, number>;
    message: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    sharedGetJson("/api/users?role=SALES", 60_000)
      .then(({ ok, payload }) => {
        if (active && ok && payload?.success && Array.isArray(payload.data?.users)) {
          setSalesUsers(payload.data.users.map((u: any) => ({ id: u.id, name: u.name })));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const livePreviews = useMemo(() => {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return lines
      .map(parseInstantClientPreview)
      .filter((x): x is LivePreviewItem => x !== null);
  }, [rawText]);

  const handleQuickCreate = async () => {
    if (!rawText.trim()) {
      setErrorMsg("Nhập nhanh cú pháp tắt, VD: truong van long 0926471382 led p2.5 2x3");
      return;
    }

    setIsQuickCreating(true);
    setErrorMsg(null);
    setCreatedSummary(null);

    try {
      const res = await fetch("/api/leads/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "QUICK_CREATE",
          rawText: rawText.trim(),
          salesPersonId: selectedSalesId !== "AUTO" ? selectedSalesId : undefined,
        }),
      });
      const json = await res.json();

      if (res.status === 422 && json.data?.parsed) {
        onOpenPrefilledModal(json.data.parsed, json.error?.message);
        return;
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "AI không thể khởi tạo Lead từ nội dung này");
      }

      const createdList: Lead[] = json.data.createdLeads || (json.data.lead ? [json.data.lead] : []);
      const first: Lead | undefined = createdList[0];
      setCreatedSummary({
        lead: first,
        count: createdList.length,
        assignmentSummary: json.data.assignmentSummary,
        message: json.message || "Đã tạo & phân chia Lead thành công!",
      });
      setRawText("");
      if (first) {
        onLeadCreated(first, json.message || `AI đã tạo nhanh Lead ${first.code}!`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi kết nối Trợ lý AI");
    } finally {
      setIsQuickCreating(false);
    }
  };

  const handleParseToForm = async () => {
    if (!rawText.trim()) {
      setErrorMsg("Vui lòng nhập thông tin khách hàng trước khi mở Form.");
      return;
    }

    setIsParsingToForm(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/leads/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PARSE_RAW_TEXT",
          rawText: rawText.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.parsed) {
        throw new Error(json.error?.message || "Không thể bóc tách nội dung");
      }

      onOpenPrefilledModal(json.data.parsed);
      setRawText("");
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi kết nối Trợ lý AI");
    } finally {
      setIsParsingToForm(false);
    }
  };

  return (
    <div className="crm-card relative overflow-hidden p-3.5 sm:p-5 space-y-3">
      {/* Theme-aware top accent bar (works cleanly in both Light & Dark Mode) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600"
      />

      {/* Header Row + Sales Auto-Distribution Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[13px] sm:text-[13.5px] font-semibold text-slate-900 leading-snug">
                Trợ lý AI Đọc Nhanh &amp; Tự Động Phân Chia Lead
              </h3>
              <span className="hidden md:inline-flex">
                <StatusBadge tone="info" size="sm" dot={false}>
                  Hỗ trợ gõ tắt không dấu · Nhập nhiều dòng cùng lúc
                </StatusBadge>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Gõ nhanh:{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-blue-600 font-mono text-[11px] break-all">
                truong van long 0926471382 led p2.5 2x3
              </code>{" "}
              <span className="hidden sm:inline">
                → Nhấn <strong>Enter</strong> để AI tự chuẩn hóa dấu, tính dự toán m² &amp; chia Sales.
              </span>
            </p>
          </div>
        </div>

        {/* Fast Sales Assignment Mode */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Users2 className="w-3.5 h-3.5 text-blue-600 shrink-0 hidden sm:block" />
          <select
            value={selectedSalesId}
            onChange={(e) => setSelectedSalesId(e.target.value)}
            aria-label="Chế độ phân chia Sales"
            className="crm-select h-8 text-xs bg-white font-medium w-full sm:w-auto"
          >
            <option value="AUTO">⚡ Tự động chia đều Sales (Ít tải nhất)</option>
            {salesUsers.map((s) => (
              <option key={s.id} value={s.id}>
                Chỉ định: {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1-Click Shorthand Chips — single-line horizontal scroll on mobile */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 sm:flex-wrap -mx-1 px-1">
        {SHORTHAND_EXAMPLES.map((ex, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setRawText(ex.text);
              setErrorMsg(null);
              setCreatedSummary(null);
            }}
            className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer font-mono whitespace-nowrap shrink-0"
          >
            {ex.chip}
          </button>
        ))}
      </div>

      {/* Shorthand Input + Buttons */}
      <div className="flex flex-col lg:flex-row gap-2.5">
        <textarea
          rows={rawText.includes("\n") ? 3 : 1}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          onKeyDown={(e) => {
            // Single-line Enter creates immediately; Shift+Enter adds a new line for multi-lead batch!
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleQuickCreate();
            }
          }}
          placeholder="Gõ tắt 1 dòng hoặc Shift+Enter dán nhiều dòng (VD: truong van long 0926471382 led p2.5 2x3)..."
          className="crm-textarea flex-1 text-[13px] sm:text-[13.5px] bg-white border-slate-200/90 focus:border-blue-500 resize-none py-2.5 min-h-[42px]"
        />

        <div className="grid grid-cols-2 sm:flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="md"
            isLoading={isParsingToForm}
            disabled={isQuickCreating}
            leftIcon={<FileEdit className="w-3.5 h-3.5 text-blue-600" />}
            onClick={() => void handleParseToForm()}
            className="whitespace-nowrap bg-white w-full sm:w-auto justify-center"
          >
            Xem Form
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            isLoading={isQuickCreating}
            disabled={isParsingToForm}
            leftIcon={<Zap className="w-4 h-4" />}
            onClick={() => void handleQuickCreate()}
            className="whitespace-nowrap w-full sm:w-auto justify-center"
          >
            {isQuickCreating
              ? "Đang chia..."
              : livePreviews.length > 1
                ? `Tạo & Chia ${livePreviews.length} Lead`
                : "Tạo & Phân chia"}
          </Button>
        </div>
      </div>

      {/* LIVE 0ms AI Field Breakdown Preview while typing */}
      {livePreviews.length > 0 && (
        <div className="space-y-1.5 pt-0.5 animate-fade-in">
          <div className="text-[11px] font-semibold text-blue-700 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            <span>
              AI đang tự đọc &amp; phân tách trực tiếp ({livePreviews.length} hồ sơ):
            </span>
          </div>
          <div className="space-y-1.5">
            {livePreviews.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-white/95 border border-blue-200/80 text-xs"
              >
                <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  {item.customerName}
                </span>
                <span className="text-slate-300">·</span>
                <span
                  className={`inline-flex items-center gap-1 font-mono font-medium ${
                    item.phone === "Chưa có SĐT" ? "text-amber-600" : "text-emerald-700"
                  }`}
                >
                  <Phone className="w-3 h-3" />
                  {item.phone}
                </span>
                <span className="text-slate-300">·</span>
                <span className="inline-flex items-center gap-1 text-slate-800 font-medium">
                  <Tv className="w-3.5 h-3.5 text-violet-600" />
                  {item.productLabel}
                  {item.areaLabel ? ` — ${item.areaLabel}` : ""}
                </span>
                <StatusBadge tone="neutral" size="sm" dot={false}>
                  {item.categoryName}
                </StatusBadge>
                <span className="ml-auto inline-flex items-center gap-1 font-semibold text-blue-700 kpi-number">
                  <Calculator className="w-3.5 h-3.5" />
                  {item.estimatedVndLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {createdSummary && (
        <div className="p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-start gap-2 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">{createdSummary.message}</div>
              {createdSummary.assignmentSummary &&
                Object.keys(createdSummary.assignmentSummary).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-emerald-700">Phân chia cho Sales:</span>
                    {Object.entries(createdSummary.assignmentSummary).map(([sName, cnt]) => (
                      <span
                        key={sName}
                        className="px-2 py-0.5 rounded bg-white border border-emerald-200 font-semibold text-emerald-800"
                      >
                        {sName}: +{cnt} Lead
                      </span>
                    ))}
                  </div>
                )}
            </div>
          </div>

          {onSelectLead && createdSummary.lead && (
            <button
              type="button"
              onClick={() => onSelectLead(createdSummary.lead!)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-semibold hover:bg-emerald-100/60 transition-colors cursor-pointer shrink-0"
            >
              <span>Mở hồ sơ {createdSummary.lead.code}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
