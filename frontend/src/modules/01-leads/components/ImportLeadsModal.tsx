"use client";

import React, { useDeferredValue, useMemo, useRef, useState } from "react";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Users2,
  FileSpreadsheet,
} from "lucide-react";
import { Modal } from "@/src/core/ui/modal";
import { Button } from "@/src/core/ui/button";
import { StatusBadge } from "@/src/core/ui/badge";

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (message: string) => void;
}

interface ParsedImportRow {
  customerName: string;
  companyName: string;
  phone: string;
  product: string;
  source: string;
  location: string;
}

const SAMPLE_IMPORT_ROWS = [
  "Nguyễn Hoàng Nam\tTập đoàn Xây dựng Hòa Bình\t0908112233\tMàn hình LED Hội trường\tWebsite\tTP. Hồ Chí Minh",
  "Trần Thị Minh Châu\tTrung tâm Hội nghị White Palace\t0913445566\tMàn hình LED Sân khấu\tWebsite\tTP. Hồ Chí Minh",
  "Lê Quốc Bảo\tNgân hàng Á Châu (ACB - CN Đà Nẵng)\t0935778899\tBảng Tỷ Giá Ngân Hàng\tGoogle Ads\tĐà Nẵng",
  "Phạm Đức Thắng\tBệnh viện Đa khoa Quốc tế Hoàn Mỹ\t0979223344\tMàn hình LED Ngoài trời\tGoogle Ads\tBình Dương",
].join("\n");

function splitSmartLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((s) => s.trim());
  if (line.includes("|")) return line.split("|").map((s) => s.trim());
  if (line.includes(";")) return line.split(";").map((s) => s.trim());
  return line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
}

function isLikelyHeaderRow(cols: string[]): boolean {
  const joined = cols.join(" ").toLowerCase();
  return (
    (joined.includes("tên") || joined.includes("name") || joined.includes("khách")) &&
    (joined.includes("sđt") || joined.includes("điện thoại") || joined.includes("phone"))
  );
}

function parseRawLeadText(raw: string): ParsedImportRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result: ParsedImportRow[] = [];

  lines.forEach((line, idx) => {
    const cols = splitSmartLine(line);
    if (idx === 0 && isLikelyHeaderRow(cols)) return;
    if (cols.length < 2) return;

    const customerName = cols[0] || "";
    let companyName = "";
    let phone = "";
    let product = "Chưa xác định";
    let source = "Website";
    let location = "";

    const secondDigits = (cols[1] || "").replace(/\D/g, "");
    if (secondDigits.length >= 8 && cols.length <= 4) {
      phone = cols[1];
      product = cols[2] || product;
      source = cols[3] || source;
    } else {
      companyName = cols[1] || companyName;
      phone = cols[2] || "";
      product = cols[3] || product;
      source = cols[4] || source;
      location = cols[5] || location;
    }

    const cleanDigits = phone.replace(/\D/g, "");
    if (customerName.length >= 2 && cleanDigits.length >= 8) {
      result.push({
        customerName,
        companyName,
        phone,
        product,
        source,
        location,
      });
    }
  });

  return result;
}

export const ImportLeadsModal = React.memo(function ImportLeadsModal({
  isOpen,
  onClose,
  onImported,
}: ImportLeadsModalProps) {
  const [rawText, setRawText] = useState("");
  const deferredRawText = useDeferredValue(rawText);
  const [autoAssignRoundRobin, setAutoAssignRoundRobin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    skippedDuplicates: number;
    assignmentSummary: Record<string, number>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsedRows = useMemo(() => parseRawLeadText(deferredRawText), [deferredRawText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      setRawText(content);
      setImportResult(null);
      setErrorMsg(null);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) {
      setErrorMsg("Chưa có dòng dữ liệu hợp lệ nào (cần tối thiểu Họ tên + Số điện thoại >= 8 số).");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: parsedRows,
          autoAssignRoundRobin,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Lỗi import danh sách Lead");
      }

      setImportResult(json.data);
      setRawText("");
      onImported(json.message || `Đã import ${json.data?.importedCount || 0} Lead thành công!`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể import danh sách Lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      preventClose={isSubmitting}
      size="xl"
      icon={<Upload className="w-4 h-4" />}
      title="Import Lead Hàng loạt & Chia Sales Tự động"
      description="Đồng bộ danh sách khách hàng từ file Excel / CSV và phân bổ đều cho đội ngũ kinh doanh."
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Hợp lệ:{" "}
            <strong className="text-slate-900 kpi-number">{parsedRows.length}</strong> dòng
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
              Đóng
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={parsedRows.length === 0}
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={handleImportSubmit}
            >
              Thực thi Import ({parsedRows.length} Lead)
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {importResult && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5 text-xs animate-fade-in">
            <div className="flex items-center gap-2 font-semibold text-emerald-900 text-[13px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Hoàn tất đồng bộ: Đã tạo mới {importResult.importedCount} Lead · Tự động lọc bỏ{" "}
                {importResult.skippedDuplicates} SĐT trùng lặp!
              </span>
            </div>
            {Object.keys(importResult.assignmentSummary).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-emerald-800 font-medium">Phân bổ cho Sales:</span>
                {Object.entries(importResult.assignmentSummary).map(([salesName, cnt]) => (
                  <span
                    key={salesName}
                    className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-emerald-800 font-semibold"
                  >
                    {salesName}: +{cnt} Lead
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Toolbar: Upload CSV or Load Sample */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Tải lên file .CSV / .TSV
            </Button>
            <Button
              type="button"
              variant="subtle"
              size="sm"
              onClick={() => {
                setRawText(SAMPLE_IMPORT_ROWS);
                setImportResult(null);
                setErrorMsg(null);
              }}
            >
              Điền 4 dòng dữ liệu mẫu
            </Button>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoAssignRoundRobin}
              onChange={(e) => setAutoAssignRoundRobin(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <Users2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Chia đều cho đội Sales</span>
          </label>
        </div>

        {/* Paste Textarea */}
        <div>
          <label htmlFor="bulk-lead-paste" className="crm-label text-xs">
            Dán trực tiếp từ Excel / Google Sheets (Thứ tự cột: Tên KH | Công ty | SĐT | Sản phẩm | Nguồn | Khu vực)
          </label>
          <textarea
            id="bulk-lead-paste"
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Nguyễn Hoàng Nam | Tập đoàn Hòa Bình | 0908112233 | Màn hình LED Hội trường | Website | TP. Hồ Chí Minh"
            className="crm-textarea font-mono text-xs"
          />
        </div>

        {/* Live Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Xem trước dữ liệu bóc tách ({parsedRows.length} khách hàng hợp lệ)
              </span>
              <StatusBadge tone="info" dot={false} size="sm">
                Tự động lọc SĐT trùng trong DB
              </StatusBadge>
            </div>
            <div className="rounded-xl border border-slate-200 overflow-x-auto max-h-56">
              <table className="crm-table text-xs">
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Đơn vị</th>
                    <th>SĐT</th>
                    <th>Sản phẩm quan tâm</th>
                    <th>Nguồn</th>
                    <th>Khu vực</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 20).map((row, idx) => (
                    <tr key={`${row.phone}-${idx}`}>
                      <td className="py-2 px-3 font-semibold text-slate-900">{row.customerName}</td>
                      <td className="py-2 px-3 text-slate-600">{row.companyName || "—"}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{row.phone}</td>
                      <td className="py-2 px-3 text-slate-700">{row.product}</td>
                      <td className="py-2 px-3 text-slate-500">{row.source}</td>
                      <td className="py-2 px-3 text-slate-500">{row.location || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
});
