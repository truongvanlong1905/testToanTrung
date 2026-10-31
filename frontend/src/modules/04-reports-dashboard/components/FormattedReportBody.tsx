"use client";

import React from "react";
import type { BadgeTone } from "@/src/core/ui/badge";

export const DEPARTMENT_META: Record<
  string,
  { label: string; shortLabel: string; tone: BadgeTone }
> = {
  SALES: { label: "Phòng Kinh Doanh (Sales)", shortLabel: "Sales", tone: "info" },
  MARKETING: {
    label: "Phòng Marketing",
    shortLabel: "Marketing",
    tone: "success",
  },
  ADS: { label: "Bộ phận Quảng cáo (Ads)", shortLabel: "Ads", tone: "warning" },
  DESIGN: { label: "Phòng Thiết kế (Design)", shortLabel: "Design", tone: "neutral" },
  ADMIN: { label: "Ban Giám Đốc", shortLabel: "Ban Giám Đốc", tone: "error" },
};

export const DEPARTMENT_FILTERS = [
  { id: "ALL", label: "Tất cả phòng ban" },
  { id: "SALES", label: "Sales" },
  { id: "MARKETING", label: "Marketing" },
  { id: "ADS", label: "Ads" },
  { id: "DESIGN", label: "Design" },
  { id: "ADMIN", label: "Ban Giám Đốc" },
] as const;

export const CALLOUT_STYLES = {
  info: "bg-blue-50/80 border-blue-200 text-blue-950",
  warning: "bg-amber-50/80 border-amber-200 text-amber-950",
  success: "bg-emerald-50/80 border-emerald-200 text-emerald-950",
} as const;

export function parseVndFromLead(raw?: string): number {
  if (!raw) return 0;
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits) || 0 : 0;
}

export function extractReportSummary(content: string): string {
  return (content || "").replace(/[#*`_>|]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Renders structured / Markdown report content as a clean executive document
 * (real headings, bold text, callouts, bullet lists, and bordered tables — zero raw # or ** noise).
 */
export const FormattedReportBody = React.memo(function FormattedReportBody({
  content,
}: {
  content: string;
}) {
  const lines = (content || "").split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let tableRows: string[][] = [];

  const renderInline = (text: string) => {
    const clean = text.replace(/<\/?u>/g, "");
    const parts = clean.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const flushTable = (keyPrefix: string) => {
    if (tableRows.length === 0) return;
    const dataRows = tableRows.filter(
      (r) => !r.every((cell) => /^(?:-|:|\s)+$/.test(cell))
    );
    if (dataRows.length > 0) {
      const header = dataRows[0];
      const body = dataRows.slice(1);
      blocks.push(
        <div
          key={`tbl-${keyPrefix}`}
          className="my-3 overflow-x-auto rounded-lg border border-slate-200"
        >
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                {header.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {body.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-slate-700">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableRows = [];
  };

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
      return;
    }

    flushTable(String(idx));

    if (!trimmed) {
      blocks.push(<div key={`sp-${idx}`} className="h-2" />);
      return;
    }

    if (trimmed.startsWith("# ")) {
      blocks.push(
        <h4
          key={`h1-${idx}`}
          className="mt-3 mb-1.5 text-[13.5px] font-bold uppercase tracking-wide text-blue-800 border-b border-blue-100 pb-1"
        >
          {renderInline(trimmed.slice(2))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h5
          key={`h2-${idx}`}
          className="mt-2.5 mb-1 text-[13px] font-semibold text-slate-900"
        >
          {renderInline(trimmed.slice(3))}
        </h5>
      );
      return;
    }

    if (trimmed.startsWith("> ")) {
      blocks.push(
        <div
          key={`qt-${idx}`}
          className="my-2 px-3.5 py-2.5 rounded-lg bg-amber-50/80 border-l-3 border border-amber-200 text-xs text-amber-950"
        >
          {renderInline(trimmed.slice(2))}
        </div>
      );
      return;
    }

    if (/^[-•]\s+/.test(trimmed)) {
      blocks.push(
        <div
          key={`li-${idx}`}
          className="flex items-start gap-2 text-[13.5px] text-slate-700 py-0.5 pl-1"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
          <span className="leading-relaxed">
            {renderInline(trimmed.replace(/^[-•]\s+/, ""))}
          </span>
        </div>
      );
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      blocks.push(
        <div
          key={`ol-${idx}`}
          className="flex items-start gap-2 text-[13.5px] text-slate-700 py-0.5 pl-1"
        >
          <span className="font-semibold text-blue-700 shrink-0">
            {numMatch?.[1]}.
          </span>
          <span className="leading-relaxed">
            {renderInline(numMatch?.[2] || trimmed)}
          </span>
        </div>
      );
      return;
    }

    blocks.push(
      <p key={`p-${idx}`} className="text-[13.5px] text-slate-700 leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushTable("end");

  return <div className="space-y-1">{blocks}</div>;
});
