import type { Lead, LeadStatus } from "@/src/modules/01-leads";
import type { CampaignItem, KeywordItem } from "@/src/modules/03-ads-keywords";
import type { ReportItem, OverviewStats } from "@/src/modules/04-reports-dashboard";
import type { TrackingEventItem, SyncJobItem } from "@/src/modules/02-tracking";
import { parseEstimatedVnd } from "./lead-value";

/* ============================================================================
   NATIVE OPENXML (.XLSX) STYLED WORKBOOK ENGINE — TOÀN TRUNG TELECOM & LED
   Generates 100% genuine Microsoft Excel (.xlsx) multi-sheet files with:
   - Corporate Header Banners, Colored Worksheet Tabs, Freeze Panes, AutoFilter
   - Custom Column Widths, Generous Row Heights, Crisp Cell Borders & Zebra Rows
   - Color-coded Status Badges, Live Excel Formulas (=SUM), Text-Formatted Phones
   ============================================================================ */

type AlignH = "left" | "center" | "right";

interface StyleDef {
  name: string;
  fontId: number;
  fillId: number;
  borderId: number;
  numFmtId: number;
  alignH: AlignH;
  wrap?: boolean;
}

const STYLE_DEFS: StyleDef[] = [
  // 0: Mandatory default cellXf
  { name: "default", fontId: 0, fillId: 0, borderId: 0, numFmtId: 0, alignH: "left" },
  // 1-4: Corporate Banner & Section Headers
  { name: "bannerTitle", fontId: 1, fillId: 2, borderId: 0, numFmtId: 0, alignH: "left" },
  { name: "bannerSubtitle", fontId: 2, fillId: 2, borderId: 0, numFmtId: 0, alignH: "left" },
  { name: "metaBar", fontId: 12, fillId: 6, borderId: 1, numFmtId: 0, alignH: "left" },
  { name: "sectionHeader", fontId: 3, fillId: 4, borderId: 4, numFmtId: 0, alignH: "left" },
  // 5-8: KPI Summary Cards
  { name: "kpiLabel", fontId: 5, fillId: 4, borderId: 1, numFmtId: 0, alignH: "center", wrap: true },
  { name: "kpiInt", fontId: 13, fillId: 5, borderId: 1, numFmtId: 165, alignH: "center" },
  { name: "kpiCurrency", fontId: 13, fillId: 5, borderId: 1, numFmtId: 164, alignH: "center" },
  { name: "kpiPercent", fontId: 13, fillId: 5, borderId: 1, numFmtId: 166, alignH: "center" },
  // 9-11: Table Column Headers
  { name: "thCenter", fontId: 4, fillId: 3, borderId: 2, numFmtId: 0, alignH: "center", wrap: true },
  { name: "thLeft", fontId: 4, fillId: 3, borderId: 2, numFmtId: 0, alignH: "left", wrap: true },
  { name: "thRight", fontId: 4, fillId: 3, borderId: 2, numFmtId: 0, alignH: "right", wrap: true },
  // Even Rows (White Fill = 5)
  { name: "cellCenter", fontId: 0, fillId: 5, borderId: 1, numFmtId: 0, alignH: "center" },
  { name: "cellCode", fontId: 6, fillId: 5, borderId: 1, numFmtId: 49, alignH: "center" },
  { name: "cellBold", fontId: 5, fillId: 5, borderId: 1, numFmtId: 0, alignH: "left", wrap: true },
  { name: "cellText", fontId: 0, fillId: 5, borderId: 1, numFmtId: 0, alignH: "left", wrap: true },
  { name: "cellPhone", fontId: 5, fillId: 5, borderId: 1, numFmtId: 49, alignH: "center" },
  { name: "cellNote", fontId: 12, fillId: 5, borderId: 1, numFmtId: 0, alignH: "left", wrap: true },
  { name: "cellInt", fontId: 0, fillId: 5, borderId: 1, numFmtId: 165, alignH: "right" },
  { name: "cellCurrency", fontId: 5, fillId: 5, borderId: 1, numFmtId: 164, alignH: "right" },
  { name: "cellPercent", fontId: 5, fillId: 5, borderId: 1, numFmtId: 166, alignH: "right" },
  // Zebra Rows (Soft Slate Fill = 6)
  { name: "cellCenterZ", fontId: 0, fillId: 6, borderId: 1, numFmtId: 0, alignH: "center" },
  { name: "cellCodeZ", fontId: 6, fillId: 6, borderId: 1, numFmtId: 49, alignH: "center" },
  { name: "cellBoldZ", fontId: 5, fillId: 6, borderId: 1, numFmtId: 0, alignH: "left", wrap: true },
  { name: "cellTextZ", fontId: 0, fillId: 6, borderId: 1, numFmtId: 0, alignH: "left", wrap: true },
  { name: "cellPhoneZ", fontId: 5, fillId: 6, borderId: 1, numFmtId: 49, alignH: "center" },
  { name: "cellNoteZ", fontId: 12, fillId: 6, borderId: 1, numFmtId: 0, alignH: "left", wrap: true },
  { name: "cellIntZ", fontId: 0, fillId: 6, borderId: 1, numFmtId: 165, alignH: "right" },
  { name: "cellCurrencyZ", fontId: 5, fillId: 6, borderId: 1, numFmtId: 164, alignH: "right" },
  { name: "cellPercentZ", fontId: 5, fillId: 6, borderId: 1, numFmtId: 166, alignH: "right" },
  // Semantic Colored Status Badges
  { name: "badgeEmerald", fontId: 7, fillId: 7, borderId: 1, numFmtId: 0, alignH: "center" },
  { name: "badgeAmber", fontId: 8, fillId: 8, borderId: 1, numFmtId: 0, alignH: "center" },
  { name: "badgeBlue", fontId: 6, fillId: 9, borderId: 1, numFmtId: 0, alignH: "center" },
  { name: "badgeOrange", fontId: 9, fillId: 10, borderId: 1, numFmtId: 0, alignH: "center" },
  { name: "badgeRose", fontId: 10, fillId: 11, borderId: 1, numFmtId: 0, alignH: "center" },
  { name: "badgeViolet", fontId: 11, fillId: 12, borderId: 1, numFmtId: 0, alignH: "center" },
  // Total Summary Row
  { name: "totalLabel", fontId: 5, fillId: 13, borderId: 3, numFmtId: 0, alignH: "left" },
  { name: "totalCenter", fontId: 5, fillId: 13, borderId: 3, numFmtId: 0, alignH: "center" },
  { name: "totalInt", fontId: 5, fillId: 13, borderId: 3, numFmtId: 165, alignH: "right" },
  { name: "totalCurrency", fontId: 5, fillId: 13, borderId: 3, numFmtId: 164, alignH: "right" },
  { name: "totalPercent", fontId: 5, fillId: 13, borderId: 3, numFmtId: 166, alignH: "right" },
] as const;

type StyleName = (typeof STYLE_DEFS)[number]["name"];

const STYLE_MAP: Record<string, number> = Object.fromEntries(
  STYLE_DEFS.map((def, idx) => [def.name, idx])
);

function sIdx(name: StyleName, zebra = false): number {
  if (zebra && `${name}Z` in STYLE_MAP) {
    return STYLE_MAP[`${name}Z`];
  }
  return STYLE_MAP[name] ?? 0;
}

interface CellSpec {
  col: number; // 1-based
  value?: string | number | null;
  formula?: string;
  style: number;
  type?: "str" | "num";
}

interface RowSpec {
  row: number; // 1-based
  height?: number;
  cells: CellSpec[];
}

interface SheetSpec {
  name: string;
  tabColorRgb?: string; // 8-hex ARGB e.g. "FF2563EB"
  colWidths: number[];
  freezeRow?: number; // freezes rows 1..freezeRow
  autoFilterRef?: string; // e.g. "A6:O25"
  merges: string[];
  rows: RowSpec[];
}

function escapeXml(raw: string): string {
  return raw
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colToLetter(col: number): string {
  let n = col;
  let res = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    res = String.fromCharCode(65 + rem) + res;
    n = Math.floor((n - 1) / 26);
  }
  return res;
}

function sanitizeSheetName(name: string, index: number): string {
  const cleaned = name.replace(/[:\\/?*\[\]]/g, " ").trim();
  return (cleaned || `Sheet ${index + 1}`).slice(0, 31);
}

function buildStylesXml(): string {
  const cellXfsXml = STYLE_DEFS.map((d, idx) => {
    if (idx === 0) {
      return `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`;
    }
    const wrapAttr = d.wrap ? ` wrapText="1"` : "";
    return `<xf numFmtId="${d.numFmtId}" fontId="${d.fontId}" fillId="${d.fillId}" borderId="${d.borderId}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${d.alignH}" vertical="center"${wrapAttr}/></xf>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="4">
    <numFmt numFmtId="164" formatCode="#,##0 &quot;đ&quot;"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
    <numFmt numFmtId="166" formatCode="0.0%"/>
    <numFmt numFmtId="167" formatCode="0.00%"/>
  </numFmts>
  <fonts count="14">
    <font><sz val="10.5"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>
    <font><b/><sz val="15"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>
    <font><i/><sz val="10"/><color rgb="FFDBEAFE"/><name val="Segoe UI"/></font>
    <font><b/><sz val="11.5"/><color rgb="FF1E3A8A"/><name val="Segoe UI"/></font>
    <font><b/><sz val="10.5"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>
    <font><b/><sz val="10.5"/><color rgb="FF0F172A"/><name val="Segoe UI"/></font>
    <font><b/><sz val="10"/><color rgb="FF1D4ED8"/><name val="Segoe UI"/></font>
    <font><b/><sz val="10"/><color rgb="FF166534"/><name val="Segoe UI"/></font>
    <font><b/><sz val="10"/><color rgb="FF92400E"/><name val="Segoe UI"/></font>
    <font><b/><sz val="10"/><color rgb="FFC2410C"/><name val="Segoe UI"/></font>
    <font><b/><sz val="10"/><color rgb="FFBE123C"/><name val="Segoe UI"/></font>
    <font><b/><sz val="10"/><color rgb="FF6D28D9"/><name val="Segoe UI"/></font>
    <font><sz val="9.5"/><color rgb="FF475569"/><name val="Segoe UI"/></font>
    <font><b/><sz val="13"/><color rgb="FF1E40AF"/><name val="Segoe UI"/></font>
  </fonts>
  <fills count="14">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFEDD5"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFE4E6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF3E8FF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="5">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FF3B82F6"/></left>
      <right style="thin"><color rgb="FF3B82F6"/></right>
      <top style="medium"><color rgb="FF1E3A8A"/></top>
      <bottom style="medium"><color rgb="FF1E3A8A"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="medium"><color rgb="FF1D4ED8"/></top>
      <bottom style="double"><color rgb="FF1E3A8A"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFBFDBFE"/></left>
      <right style="thin"><color rgb="FFBFDBFE"/></right>
      <top style="thin"><color rgb="FFBFDBFE"/></top>
      <bottom style="medium"><color rgb="FF2563EB"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="${STYLE_DEFS.length}">${cellXfsXml}</cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;
}

function buildWorksheetXml(sheet: SheetSpec, isFirstSheet: boolean): string {
  const maxCol = Math.max(1, sheet.colWidths.length);
  const maxRow = sheet.rows.length > 0 ? Math.max(...sheet.rows.map((r) => r.row)) : 1;
  const dimRef = `A1:${colToLetter(maxCol)}${maxRow}`;

  const tabColorXml = sheet.tabColorRgb ? `<tabColor rgb="${sheet.tabColorRgb}"/>` : "";
  const sheetPrXml = `<sheetPr>${tabColorXml}<pageSetUpPr fitToPage="1"/></sheetPr>`;

  const freezePaneXml =
    sheet.freezeRow && sheet.freezeRow > 0
      ? `<pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow + 1}" activePane="bottomLeft" state="frozen"/>`
      : "";

  const tabSelectedAttr = isFirstSheet ? ` tabSelected="1"` : "";
  const sheetViewsXml = `<sheetViews><sheetView${tabSelectedAttr} workbookViewId="0" showGridLines="1">${freezePaneXml}</sheetView></sheetViews>`;

  const colsXml =
    sheet.colWidths.length > 0
      ? `<cols>${sheet.colWidths
          .map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`)
          .join("")}</cols>`
      : "";

  const sortedRows = [...sheet.rows].sort((a, b) => a.row - b.row);
  const rowsXml = sortedRows
    .map((r) => {
      const htAttr = r.height ? ` ht="${r.height}" customHeight="1"` : "";
      const sortedCells = [...r.cells].sort((a, b) => a.col - b.col);
      const cellsXml = sortedCells
        .map((c) => {
          const ref = `${colToLetter(c.col)}${r.row}`;
          if (c.formula) {
            const cachedVal = typeof c.value === "number" && Number.isFinite(c.value) ? `<v>${c.value}</v>` : "";
            return `<c r="${ref}" s="${c.style}"><f>${escapeXml(c.formula)}</f>${cachedVal}</c>`;
          }
          if (c.value === undefined || c.value === null || c.value === "") {
            return `<c r="${ref}" s="${c.style}"/>`;
          }
          if (c.type === "num" && typeof c.value === "number" && Number.isFinite(c.value)) {
            return `<c r="${ref}" s="${c.style}"><v>${c.value}</v></c>`;
          }
          return `<c r="${ref}" s="${c.style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
            String(c.value)
          )}</t></is></c>`;
        })
        .join("");
      return `<row r="${r.row}"${htAttr}>${cellsXml}</row>`;
    })
    .join("");

  const mergeXml =
    sheet.merges.length > 0
      ? `<mergeCells count="${sheet.merges.length}">${sheet.merges
          .map((m) => `<mergeCell ref="${m}"/>`)
          .join("")}</mergeCells>`
      : "";

  const autoFilterXml = sheet.autoFilterRef ? `<autoFilter ref="${sheet.autoFilterRef}"/>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${sheetPrXml}
  <dimension ref="${dimRef}"/>
  ${sheetViewsXml}
  <sheetFormatPr defaultRowHeight="22" customHeight="1"/>
  ${colsXml}
  <sheetData>${rowsXml}</sheetData>
  ${mergeXml}
  ${autoFilterXml}
  <pageMargins left="0.35" right="0.35" top="0.45" bottom="0.45" header="0.25" footer="0.25"/>
  <pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

/* ── Minimal Pure-TypeScript PKZIP Builder (DEFLATE + CRC32) ───────────────── */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function deflateRawBytes(raw: Uint8Array): Promise<{ data: Uint8Array; method: number }> {
  if (typeof CompressionStream !== "undefined") {
    try {
      const cs = new CompressionStream("deflate-raw");
      const writer = cs.writable.getWriter();
      await writer.write(raw as unknown as BufferSource);
      await writer.close();
      const compressedBuf = await new Response(cs.readable).arrayBuffer();
      return { data: new Uint8Array(compressedBuf), method: 8 };
    } catch {
      return { data: raw, method: 0 };
    }
  }
  return { data: raw, method: 0 };
}

async function buildXlsxZipBlob(entries: Array<{ path: string; xml: string }>): Promise<Blob> {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | ((now.getSeconds() >> 1) & 0x1f);
  const dosDate = (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0x0f) << 5) | (now.getDate() & 0x1f);

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const rawBytes = encoder.encode(entry.xml);
    const crc = crc32(rawBytes);
    const { data: compBytes, method } = await deflateRawBytes(rawBytes);

    const lh = new Uint8Array(30 + nameBytes.length);
    const lhv = new DataView(lh.buffer);
    lhv.setUint32(0, 0x04034b50, true);
    lhv.setUint16(4, 20, true);
    lhv.setUint16(6, 0x0800, true);
    lhv.setUint16(8, method, true);
    lhv.setUint16(10, dosTime, true);
    lhv.setUint16(12, dosDate, true);
    lhv.setUint32(14, crc, true);
    lhv.setUint32(18, compBytes.length, true);
    lhv.setUint32(22, rawBytes.length, true);
    lhv.setUint16(26, nameBytes.length, true);
    lhv.setUint16(28, 0, true);
    lh.set(nameBytes, 30);

    localParts.push(lh, compBytes);

    const ch = new Uint8Array(46 + nameBytes.length);
    const chv = new DataView(ch.buffer);
    chv.setUint32(0, 0x02014b50, true);
    chv.setUint16(4, 20, true);
    chv.setUint16(6, 20, true);
    chv.setUint16(8, 0x0800, true);
    chv.setUint16(10, method, true);
    chv.setUint16(12, dosTime, true);
    chv.setUint16(14, dosDate, true);
    chv.setUint32(16, crc, true);
    chv.setUint32(20, compBytes.length, true);
    chv.setUint32(24, rawBytes.length, true);
    chv.setUint16(28, nameBytes.length, true);
    chv.setUint16(30, 0, true);
    chv.setUint16(32, 0, true);
    chv.setUint16(34, 0, true);
    chv.setUint16(36, 0, true);
    chv.setUint32(38, 0, true);
    chv.setUint32(42, localOffset, true);
    ch.set(nameBytes, 46);

    centralParts.push(ch);
    localOffset += lh.length + compBytes.length;
  }

  const cdSize = centralParts.reduce((acc, arr) => acc + arr.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, localOffset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, eocd] as unknown as BlobPart[], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function downloadWorkbook(filename: string, sheets: SheetSpec[]): Promise<void> {
  const safeSheets = sheets.map((s, i) => ({
    ...s,
    name: sanitizeSheetName(s.name, i),
  }));

  const contentTypesOverrides = safeSheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("");

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${contentTypesOverrides}
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const workbookSheetsXml = safeSheets
    .map(
      (s, i) =>
        `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
    )
    .join("");

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${workbookSheetsXml}</sheets>
</workbook>`;

  const wbRelsItems = safeSheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join("");

  const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${wbRelsItems}
  <Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const isoNow = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Báo Cáo Quản Trị Toàn Trung Telecom &amp; LED</dc:title>
  <dc:creator>Toàn Trung LED CRM</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">${isoNow}</dcterms:created>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Toàn Trung CRM</Application>
  <Company>Công ty TNHH Điện tử Viễn thông Toàn Trung</Company>
</Properties>`;

  const entries: Array<{ path: string; xml: string }> = [
    { path: "[Content_Types].xml", xml: contentTypesXml },
    { path: "_rels/.rels", xml: rootRelsXml },
    { path: "docProps/core.xml", xml: coreXml },
    { path: "docProps/app.xml", xml: appXml },
    { path: "xl/workbook.xml", xml: workbookXml },
    { path: "xl/_rels/workbook.xml.rels", xml: wbRelsXml },
    { path: "xl/styles.xml", xml: buildStylesXml() },
    ...safeSheets.map((s, i) => ({
      path: `xl/worksheets/sheet${i + 1}.xml`,
      xml: buildWorksheetXml(s, i === 0),
    })),
  ];

  const blob = await buildXlsxZipBlob(entries);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ============================================================================
   LAYOUT & BUSINESS HELPERS
   ============================================================================ */

function addMergedBanner(
  sheet: SheetSpec,
  row: number,
  startCol: number,
  endCol: number,
  text: string,
  styleName: StyleName,
  height: number
) {
  const style = sIdx(styleName);
  const cells: CellSpec[] = [];
  for (let c = startCol; c <= endCol; c++) {
    cells.push({
      col: c,
      value: c === startCol ? text : undefined,
      style,
      type: "str",
    });
  }
  sheet.rows.push({ row, height, cells });
  if (endCol > startCol) {
    sheet.merges.push(`${colToLetter(startCol)}${row}:${colToLetter(endCol)}${row}`);
  }
}

function addCorporateHeader(
  sheet: SheetSpec,
  totalCols: number,
  reportTitle: string,
  subtitle: string,
  metaInfo: string
): number {
  addMergedBanner(
    sheet,
    1,
    1,
    totalCols,
    `  CÔNG TY TNHH ĐIỆN TỬ VIỄN THÔNG TOÀN TRUNG  —  ${reportTitle.toUpperCase()}`,
    "bannerTitle",
    36
  );
  addMergedBanner(sheet, 2, 1, totalCols, `  ${subtitle}`, "bannerSubtitle", 23);
  addMergedBanner(sheet, 3, 1, totalCols, `  ${metaInfo}`, "metaBar", 24);
  return 5;
}

function addEmptyTableRow(sheet: SheetSpec, row: number, totalCols: number, message: string) {
  addMergedBanner(sheet, row, 1, totalCols, `  ${message}`, "cellNote", 28);
}

export { parseEstimatedVnd };

function classifyProductGroupLabel(lead: Lead): string {
  const text = `${lead.category || ""} ${lead.product || ""}`.toLowerCase();
  if (text.includes("bảng điện tử") || text.includes("ma trận") || text.includes("tỷ giá")) {
    return "Bảng điện tử";
  }
  if (text.includes("led") || text.includes("màn hình")) {
    return "Màn hình LED";
  }
  return "Sản phẩm khác";
}

function statusBadgeStyle(status: LeadStatus | string): number {
  switch (status) {
    case "Chốt thành công":
      return sIdx("badgeEmerald");
    case "Đã gửi báo giá":
      return sIdx("badgeBlue");
    case "Đang soạn báo giá":
      return sIdx("badgeAmber");
    case "Vừa nhận thông tin":
      return sIdx("badgeOrange");
    case "Thất bại":
      return sIdx("badgeRose");
    default:
      return sIdx("cellCenter");
  }
}

/* ============================================================================
   1. LEADS & OVERVIEW WORKBOOK (4 SHEETS — CHUẨN BRIEF, KHÔNG CỘT TIỀN/DOANH THU)
   ============================================================================ */

function buildLeadOverviewSheet(
  leads: Lead[],
  stats: OverviewStats | undefined,
  metaInfo: string
): SheetSpec {
  const sheet: SheetSpec = {
    name: "1. Tổng Quan Kinh Doanh",
    tabColorRgb: "FF2563EB",
    colWidths: [28, 18, 18, 22, 28],
    merges: [],
    rows: [],
  };

  let r = addCorporateHeader(
    sheet,
    5,
    "BÁO CÁO TỔNG QUAN QUẢN TRỊ LEAD & PHỄU BÁN HÀNG",
    "Hệ thống Quản trị Marketing - Kinh doanh Màn hình LED & Viễn thông Toàn Trung",
    metaInfo
  );

  const total = stats?.total ?? leads.length;
  const newCount = leads.filter((l) => l.status === "Vừa nhận thông tin").length;
  const sentQuoteCount = leads.filter((l) => l.status === "Đã gửi báo giá").length;
  const unrespondedCount = leads.filter(
    (l) => l.status === "Đã gửi báo giá" && !l.customerResponded
  ).length;
  const wonCount = leads.filter((l) => l.status === "Chốt thành công").length;
  const winRate = total > 0 ? wonCount / total : 0;

  // Section 1: KPI Cards (No money/revenue columns per AC-15, AC-24)
  addMergedBanner(sheet, r++, 1, 5, "I. CHỈ SỐ ĐO LƯỜNG HIỆU QUẢ TỔNG HỢP (KPIs)", "sectionHeader", 26);

  sheet.rows.push({
    row: r++,
    height: 25,
    cells: [
      { col: 1, value: "Tổng số Lead quản lý", style: sIdx("kpiLabel") },
      { col: 2, value: "Vừa nhận thông tin", style: sIdx("kpiLabel") },
      { col: 3, value: "Đã gửi báo giá", style: sIdx("kpiLabel") },
      { col: 4, value: "Chưa phản hồi báo giá", style: sIdx("kpiLabel") },
      { col: 5, value: "Chốt thành công (Tỷ lệ)", style: sIdx("kpiLabel") },
    ],
  });

  sheet.rows.push({
    row: r++,
    height: 32,
    cells: [
      { col: 1, value: leads.length, type: "num", style: sIdx("kpiInt") },
      { col: 2, value: newCount, type: "num", style: sIdx("kpiInt") },
      { col: 3, value: sentQuoteCount, type: "num", style: sIdx("kpiInt") },
      { col: 4, value: unrespondedCount, type: "num", style: sIdx("kpiInt") },
      { col: 5, value: winRate, type: "num", style: sIdx("kpiPercent") },
    ],
  });

  r += 1;

  // Section 2: 5-Stage Pipeline Funnel
  addMergedBanner(sheet, r++, 1, 5, "II. PHỄU CHUYỂN ĐỔI TIẾN ĐỘ BÁN HÀNG (5 TRẠNG THÁI CHUẨN)", "sectionHeader", 26);
  sheet.rows.push({
    row: r++,
    height: 27,
    cells: [
      { col: 1, value: "Giai đoạn tiến độ", style: sIdx("thLeft") },
      { col: 2, value: "Số lượng Lead", style: sIdx("thRight") },
      { col: 3, value: "Tỷ trọng (%)", style: sIdx("thRight") },
      { col: 4, value: "Số khách chưa phản hồi", style: sIdx("thRight") },
      { col: 5, value: "Đánh giá trạng thái", style: sIdx("thCenter") },
    ],
  });

  const stages: Array<{ status: LeadStatus; note: string }> = [
    { status: "Vừa nhận thông tin", note: "Cần liên hệ tư vấn & khảo sát ngay" },
    { status: "Đang soạn báo giá", note: "Đang bóc tách kỹ thuật & chuẩn bị báo giá" },
    { status: "Đã gửi báo giá", note: "Ưu tiên Sales bám sát ghi nhận phản hồi" },
    { status: "Chốt thành công", note: "Khách hàng đồng ý triển khai" },
    { status: "Thất bại", note: "Đã lưu lý do để phân tích tối ưu" },
  ];

  const funnelStartRow = r;
  stages.forEach((st, idx) => {
    const stageLeads = leads.filter((l) => l.status === st.status);
    const stageUnresponded =
      st.status === "Đã gửi báo giá"
        ? stageLeads.filter((l) => !l.customerResponded).length
        : 0;
    const pct = leads.length > 0 ? stageLeads.length / leads.length : 0;
    const z = idx % 2 === 1;
    sheet.rows.push({
      row: r++,
      height: 24,
      cells: [
        { col: 1, value: st.status, style: statusBadgeStyle(st.status) },
        { col: 2, value: stageLeads.length, type: "num", style: sIdx("cellInt", z) },
        { col: 3, value: pct, type: "num", style: sIdx("cellPercent", z) },
        { col: 4, value: stageUnresponded, type: "num", style: sIdx("cellInt", z) },
        { col: 5, value: st.note, style: sIdx("cellNote", z) },
      ],
    });
  });
  const funnelEndRow = r - 1;

  sheet.rows.push({
    row: r++,
    height: 26,
    cells: [
      { col: 1, value: "TỔNG CỘNG TOÀN PHỄU", style: sIdx("totalLabel") },
      { col: 2, formula: `SUM(B${funnelStartRow}:B${funnelEndRow})`, value: leads.length, style: sIdx("totalInt") },
      { col: 3, value: 1, type: "num", style: sIdx("totalPercent") },
      { col: 4, value: unrespondedCount, type: "num", style: sIdx("totalInt") },
      { col: 5, value: "100% Dữ liệu đối soát", style: sIdx("totalCenter") },
    ],
  });

  r += 1;

  // Section 3: Product Groups
  addMergedBanner(sheet, r++, 1, 5, "III. CƠ CẤU THEO NHÓM SẢN PHẨM & NHU CẦU KHÁCH HÀNG", "sectionHeader", 26);
  sheet.rows.push({
    row: r++,
    height: 27,
    cells: [
      { col: 1, value: "Nhóm sản phẩm chủ lực", style: sIdx("thLeft") },
      { col: 2, value: "Số lượng Lead", style: sIdx("thRight") },
      { col: 3, value: "Tỷ trọng nhu cầu", style: sIdx("thRight") },
      { col: 4, value: "Số lượng chốt", style: sIdx("thRight") },
      { col: 5, value: "Dòng sản phẩm tiêu biểu", style: sIdx("thLeft") },
    ],
  });

  const groupDefs = [
    { name: "Màn hình LED", desc: "Màn hình LED trong nhà, ngoài trời, sân khấu, hội trường, phòng họp" },
    { name: "Bảng điện tử", desc: "Bảng điện tử ngân hàng, bệnh viện, nhà máy, trường học, giao thông" },
    { name: "Sản phẩm khác", desc: "Nhu cầu tùy chỉnh theo yêu cầu riêng của khách hàng" },
  ];

  groupDefs.forEach((g, idx) => {
    const grpLeads = leads.filter((l) => classifyProductGroupLabel(l) === g.name);
    const grpWon = grpLeads.filter((l) => l.status === "Chốt thành công").length;
    const pct = leads.length > 0 ? grpLeads.length / leads.length : 0;
    const z = idx % 2 === 1;
    sheet.rows.push({
      row: r++,
      height: 24,
      cells: [
        { col: 1, value: g.name, style: sIdx("cellBold", z) },
        { col: 2, value: grpLeads.length, type: "num", style: sIdx("cellInt", z) },
        { col: 3, value: pct, type: "num", style: sIdx("cellPercent", z) },
        { col: 4, value: grpWon, type: "num", style: sIdx("cellInt", z) },
        { col: 5, value: g.desc, style: sIdx("cellNote", z) },
      ],
    });
  });

  r += 1;

  // Section 4: Sales Leaderboard
  addMergedBanner(sheet, r++, 1, 5, "IV. THỐNG KÊ PHÂN BỔ LEAD THEO NHÂN VIÊN KINH DOANH", "sectionHeader", 26);
  sheet.rows.push({
    row: r++,
    height: 27,
    cells: [
      { col: 1, value: "Nhân viên kinh doanh", style: sIdx("thLeft") },
      { col: 2, value: "Tổng Lead phụ trách", style: sIdx("thRight") },
      { col: 3, value: "Đã gửi báo giá", style: sIdx("thRight") },
      { col: 4, value: "Chốt thành công", style: sIdx("thRight") },
      { col: 5, value: "Tỷ lệ chốt cá nhân", style: sIdx("thRight") },
    ],
  });

  const salesPerf = new Map<string, { total: number; sentQuote: number; won: number }>();
  leads.forEach((l) => {
    const name = l.salesPerson?.name || "Chưa phân công";
    const cur = salesPerf.get(name) || { total: 0, sentQuote: 0, won: 0 };
    cur.total += 1;
    if (l.status === "Đã gửi báo giá") cur.sentQuote += 1;
    if (l.status === "Chốt thành công") cur.won += 1;
    salesPerf.set(name, cur);
  });

  Array.from(salesPerf.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([salesName, p], idx) => {
      const z = idx % 2 === 1;
      sheet.rows.push({
        row: r++,
        height: 24,
        cells: [
          { col: 1, value: `#${idx + 1} · ${salesName}`, style: sIdx("cellBold", z) },
          { col: 2, value: p.total, type: "num", style: sIdx("cellInt", z) },
          { col: 3, value: p.sentQuote, type: "num", style: sIdx("cellInt", z) },
          { col: 4, value: p.won, type: "num", style: sIdx("cellInt", z) },
          { col: 5, value: p.total > 0 ? p.won / p.total : 0, type: "num", style: sIdx("cellPercent", z) },
        ],
      });
    });

  return sheet;
}

/**
 * Sheet chuẩn mẫu Brief (AC-20, AC-22, AC-24):
 * Tên nhân viên kinh doanh | Ngày nhận Lead | Tên khách hàng | Số điện thoại | Nhu cầu / Sản phẩm | Tình trạng Lead | Ghi chú
 */
function buildSalesBriefAllocationSheet(leads: Lead[], metaInfo: string): SheetSpec {
  const colWidths = [24, 20, 26, 16, 36, 20, 38];
  const totalCols = colWidths.length;
  const sheet: SheetSpec = {
    name: "2. Phân Bổ Theo Sales (Brief)",
    tabColorRgb: "FF2563EB",
    colWidths,
    freezeRow: 5,
    merges: [],
    rows: [],
  };

  addCorporateHeader(
    sheet,
    totalCols,
    "BÁO CÁO PHÂN BỔ LEAD THEO NHÂN VIÊN KINH DOANH (MẪU BRIEF)",
    "Đúng 7 cột chuẩn nghiệp vụ: Tên NV kinh doanh, Ngày nhận Lead, Tên khách hàng, Số điện thoại (Text giữ số 0), Nhu cầu/Sản phẩm, Tình trạng Lead, Ghi chú",
    metaInfo
  );

  const headers = [
    { label: "Tên nhân viên kinh doanh", align: "thLeft" as StyleName },
    { label: "Ngày nhận Lead", align: "thCenter" as StyleName },
    { label: "Tên khách hàng", align: "thLeft" as StyleName },
    { label: "Số điện thoại", align: "thCenter" as StyleName },
    { label: "Nhu cầu / Sản phẩm", align: "thLeft" as StyleName },
    { label: "Tình trạng Lead", align: "thCenter" as StyleName },
    { label: "Ghi chú", align: "thLeft" as StyleName },
  ];

  sheet.rows.push({
    row: 5,
    height: 30,
    cells: headers.map((h, i) => ({
      col: i + 1,
      value: h.label,
      style: sIdx(h.align),
    })),
  });

  let r = 6;
  const startDataRow = r;

  leads.forEach((lead, idx) => {
    const z = idx % 2 === 1;
    const demandLabel = lead.demandType
      ? `${lead.product} (${lead.demandType})`
      : lead.product;
    const noteText =
      lead.status === "Thất bại" && lead.failureReason
        ? `[Lý do: ${lead.failureReason}] ${lead.notes || ""}`.trim()
        : lead.notes || "—";

    sheet.rows.push({
      row: r++,
      height: 28,
      cells: [
        { col: 1, value: lead.salesPerson?.name || "Chưa phân công", style: sIdx("cellBold", z), type: "str" },
        { col: 2, value: lead.createdAtTime || lead.createdAt, style: sIdx("cellCenter", z), type: "str" },
        {
          col: 3,
          value: lead.companyName ? `${lead.customerName} (${lead.companyName})` : lead.customerName,
          style: sIdx("cellBold", z),
          type: "str",
        },
        { col: 4, value: String(lead.phone || ""), style: sIdx("cellPhone", z), type: "str" },
        { col: 5, value: demandLabel, style: sIdx("cellText", z), type: "str" },
        { col: 6, value: lead.status, style: statusBadgeStyle(lead.status), type: "str" },
        { col: 7, value: noteText, style: sIdx("cellNote", z), type: "str" },
      ],
    });
  });

  const endDataRow = Math.max(startDataRow, r - 1);
  if (leads.length > 0) {
    sheet.autoFilterRef = `A5:${colToLetter(totalCols)}${endDataRow}`;
  } else {
    addEmptyTableRow(sheet, r, totalCols, "Hiện chưa có hồ sơ Lead nào trong kỳ báo cáo.");
  }

  return sheet;
}

function buildLeadDetailsSheet(
  leads: Lead[],
  sheetName: string,
  tabColorRgb: string,
  bannerTitle: string,
  metaInfo: string,
  includeFollowUpAdvice = false
): SheetSpec {
  const colWidths = [6, 15, 24, 26, 16, 24, 18, 34, 16, 16, 19, 20, 18, 18, 36];

  const totalCols = colWidths.length;
  const sheet: SheetSpec = {
    name: sheetName,
    tabColorRgb,
    colWidths,
    freezeRow: 5,
    merges: [],
    rows: [],
  };

  addCorporateHeader(
    sheet,
    totalCols,
    bannerTitle,
    "Bảng dữ liệu chuẩn hóa có bộ lọc AutoFilter, cố định dòng tiêu đề (Freeze Panes) và giữ nguyên số 0 đầu của SĐT",
    metaInfo
  );

  const headers = [
    { label: "STT", align: "thCenter" as StyleName },
    { label: "Mã Lead", align: "thCenter" as StyleName },
    { label: "Tên Khách Hàng", align: "thLeft" as StyleName },
    { label: "Công Ty / Tổ Chức", align: "thLeft" as StyleName },
    { label: "Số Điện Thoại", align: "thCenter" as StyleName },
    { label: "Email Liên Hệ", align: "thLeft" as StyleName },
    { label: "Nhóm SP", align: "thCenter" as StyleName },
    { label: "Sản Phẩm / Dự Án Quan Tâm", align: "thLeft" as StyleName },
    { label: "Loại Nhu Cầu", align: "thCenter" as StyleName },
    { label: "Nguồn Khách", align: "thCenter" as StyleName },
    { label: "Trạng Thái Tiến Độ", align: "thCenter" as StyleName },
    { label: "Phản Hồi Báo Giá", align: "thCenter" as StyleName },
    { label: "Sales Phụ Trách", align: "thLeft" as StyleName },
    { label: "Ngày Nhận", align: "thCenter" as StyleName },
    {
      label: includeFollowUpAdvice ? "Hành Động Bám Sát & Ghi Chú" : "Ghi Chú Chăm Sóc",
      align: "thLeft" as StyleName,
    },
  ];

  sheet.rows.push({
    row: 5,
    height: 30,
    cells: headers.map((h, i) => ({
      col: i + 1,
      value: h.label,
      style: sIdx(h.align),
    })),
  });

  let r = 6;
  const startDataRow = r;

  leads.forEach((lead, idx) => {
    const z = idx % 2 === 1;
    const prodGroup = classifyProductGroupLabel(lead);
    const quoteRespLabel =
      lead.status === "Đã gửi báo giá"
        ? lead.customerResponded
          ? "Đã phản hồi"
          : "Chưa phản hồi"
        : lead.customerResponded
          ? "Đã phản hồi"
          : "—";

    const noteText = includeFollowUpAdvice
      ? lead.status === "Đã gửi báo giá" && !lead.customerResponded
        ? `[CHỜ PHẢN HỒI BÁO GIÁ] ${lead.notes || "Liên hệ xác nhận phản hồi báo giá"}`
        : `${lead.notes || "Bám sát tiến độ báo giá"}`
      : lead.status === "Thất bại" && lead.failureReason
        ? `[Lý do thất bại: ${lead.failureReason}] ${lead.notes || ""}`.trim()
        : lead.notes || "—";

    sheet.rows.push({
      row: r++,
      height: 28,
      cells: [
        { col: 1, value: idx + 1, type: "num", style: sIdx("cellCenter", z) },
        { col: 2, value: lead.code, style: sIdx("cellCode", z), type: "str" },
        { col: 3, value: lead.customerName, style: sIdx("cellBold", z), type: "str" },
        { col: 4, value: lead.companyName || "—", style: sIdx("cellText", z), type: "str" },
        { col: 5, value: String(lead.phone || ""), style: sIdx("cellPhone", z), type: "str" },
        { col: 6, value: lead.email || "—", style: sIdx("cellText", z), type: "str" },
        { col: 7, value: prodGroup, style: sIdx("cellCenter", z), type: "str" },
        { col: 8, value: lead.product, style: sIdx("cellText", z), type: "str" },
        { col: 9, value: lead.demandType || "—", style: sIdx("cellCenter", z), type: "str" },
        { col: 10, value: lead.source, style: sIdx("cellCenter", z), type: "str" },
        { col: 11, value: lead.status, style: statusBadgeStyle(lead.status), type: "str" },
        {
          col: 12,
          value: quoteRespLabel,
          style:
            quoteRespLabel === "Chưa phản hồi"
              ? sIdx("badgeAmber")
              : quoteRespLabel === "Đã phản hồi"
                ? sIdx("badgeEmerald")
                : sIdx("cellCenter", z),
          type: "str",
        },
        { col: 13, value: lead.salesPerson?.name || "Chưa phân công", style: sIdx("cellBold", z), type: "str" },
        { col: 14, value: lead.createdAtTime || lead.createdAt, style: sIdx("cellCenter", z), type: "str" },
        { col: 15, value: noteText, style: sIdx("cellNote", z), type: "str" },
      ],
    });
  });

  const endDataRow = Math.max(startDataRow, r - 1);
  if (leads.length > 0) {
    sheet.autoFilterRef = `A5:${colToLetter(totalCols)}${endDataRow}`;
  } else {
    addEmptyTableRow(sheet, r, totalCols, "Hiện chưa có dự án Lead nào thuộc danh mục này trong kỳ báo cáo.");
  }

  return sheet;
}

export async function exportLeadsWorkbook(options: {
  leads: Lead[];
  stats?: OverviewStats;
  filterLabel?: string;
  exportedBy?: string;
}): Promise<void> {
  const { leads, stats, filterLabel = "Toàn bộ danh sách", exportedBy = "Hệ thống Toàn Trung" } = options;
  const nowStr = new Date().toLocaleString("vi-VN");
  const metaInfo = `Ngày xuất báo cáo: ${nowStr}   |   Người xuất: ${exportedBy}   |   Phạm vi lọc: ${filterLabel} (${leads.length} Lead)`;

  const quotingLeads = leads.filter(
    (l) => l.status === "Đang soạn báo giá" || l.status === "Đã gửi báo giá"
  );

  const sheets: SheetSpec[] = [
    buildLeadOverviewSheet(leads, stats, metaInfo),
    buildSalesBriefAllocationSheet(leads, metaInfo),
    buildLeadDetailsSheet(
      quotingLeads,
      "3. Báo Giá & Chưa Phản Hồi",
      "FFF59E0B",
      "DANH SÁCH KHÁCH HÀNG ĐÃ GỬI BÁO GIÁ & THEO DÕI PHẢN HỒI",
      `Ngày xuất: ${nowStr}   |   Tổng số dự án báo giá cần theo sát: ${quotingLeads.length} hồ sơ`,
      true
    ),
    buildLeadDetailsSheet(
      leads,
      "4. Danh Sách Lead Chi Tiết",
      "FFF97316",
      "DANH SÁCH CHI TIẾT KHÁCH HÀNG TIỀM NĂNG (MODULE 1)",
      metaInfo,
      false
    ),
  ];

  const dateTag = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(`ToanTrung_BaoCao_QuanLy_Lead_${dateTag}.xlsx`, sheets);
}

/* ============================================================================
   2. EXECUTIVE & DEPARTMENT REPORTS WORKBOOK (5 SHEETS)
   ============================================================================ */

const DEPT_NAME_MAP: Record<string, { label: string; style: StyleName }> = {
  ADMIN: { label: "Ban Giám Đốc", style: "badgeRose" },
  DIRECTOR: { label: "Ban Giám Đốc", style: "badgeRose" },
  SALES: { label: "Phòng Kinh Doanh", style: "badgeBlue" },
  MARKETING: { label: "Phòng Marketing", style: "badgeEmerald" },
  ADS: { label: "Bộ Phận Quảng Cáo (ADS)", style: "badgeAmber" },
  DESIGN: { label: "Phòng Thiết Kế", style: "badgeViolet" },
};

export async function exportExecutiveReportsWorkbook(options: {
  leads: Lead[];
  reports: ReportItem[];
  timeRangeLabel?: string;
  exportedBy?: string;
}): Promise<void> {
  const {
    leads,
    reports,
    timeRangeLabel = "30 ngày qua",
    exportedBy = "Trung tâm Báo cáo Toàn Trung",
  } = options;
  const nowStr = new Date().toLocaleString("vi-VN");
  const metaInfo = `Ngày xuất: ${nowStr}   |   Đơn vị: ${exportedBy}   |   Kỳ báo cáo: ${timeRangeLabel}`;

  const quotingLeads = leads.filter(
    (l) => l.status === "Đang soạn báo giá" || l.status === "Đã gửi báo giá"
  );

  const deptSheet: SheetSpec = {
    name: "5. Báo Cáo Phòng Ban",
    tabColorRgb: "FF10B981",
    colWidths: [7, 24, 34, 22, 20, 22, 16, 52],
    freezeRow: 5,
    merges: [],
    rows: [],
  };

  addCorporateHeader(
    deptSheet,
    8,
    "TỔNG HỢP VĂN BẢN BÁO CÁO CÁC PHÒNG BAN & CHỈ ĐẠO ĐIỀU HÀNH",
    "Lưu trữ báo cáo nội bộ giữa Ban Giám Đốc và các phòng Kinh doanh, Marketing, Quảng cáo (ADS), Thiết kế",
    `Ngày xuất: ${nowStr}   |   Tổng số văn bản báo cáo: ${reports.length} báo cáo`
  );

  deptSheet.rows.push({
    row: 5,
    height: 30,
    cells: [
      { col: 1, value: "STT", style: sIdx("thCenter") },
      { col: 2, value: "Phòng Ban / Bộ Phận", style: sIdx("thCenter") },
      { col: 3, value: "Tiêu Đề Báo Cáo", style: sIdx("thLeft") },
      { col: 4, value: "Người Lập Báo Cáo", style: sIdx("thLeft") },
      { col: 5, value: "Thời Gian Gửi", style: sIdx("thCenter") },
      { col: 6, value: "Tệp Đính Kèm", style: sIdx("thLeft") },
      { col: 7, value: "Trạng Thái", style: sIdx("thCenter") },
      { col: 8, value: "Nội Dung Chi Tiết Báo Cáo", style: sIdx("thLeft") },
    ],
  });

  let rr = 6;
  reports.forEach((rep, idx) => {
    const z = idx % 2 === 1;
    const deptMeta = DEPT_NAME_MAP[rep.department] || {
      label: rep.department,
      style: "badgeBlue" as StyleName,
    };
    const cleanContent = (rep.content || "").replace(/[#*`]/g, "").trim();

    deptSheet.rows.push({
      row: rr++,
      height: 36,
      cells: [
        { col: 1, value: idx + 1, type: "num", style: sIdx("cellCenter", z) },
        { col: 2, value: deptMeta.label, style: sIdx(deptMeta.style) },
        { col: 3, value: rep.title, style: sIdx("cellBold", z) },
        { col: 4, value: rep.createdBy?.name || "Nhân sự", style: sIdx("cellText", z) },
        {
          col: 5,
          value: new Date(rep.createdAt).toLocaleString("vi-VN"),
          style: sIdx("cellCenter", z),
        },
        { col: 6, value: rep.attachmentName || "Không đính kèm", style: sIdx("cellNote", z) },
        {
          col: 7,
          value: rep.isRead ? "Đã xem" : "Mới gửi",
          style: rep.isRead ? sIdx("badgeEmerald") : sIdx("badgeAmber"),
        },
        { col: 8, value: cleanContent, style: sIdx("cellNote", z) },
      ],
    });
  });

  if (reports.length > 0) {
    deptSheet.autoFilterRef = `A5:H${rr - 1}`;
  }

  const sheets: SheetSpec[] = [
    buildLeadOverviewSheet(leads, undefined, metaInfo),
    buildSalesBriefAllocationSheet(leads, metaInfo),
    buildLeadDetailsSheet(
      quotingLeads,
      "3. Báo Giá & Chưa Phản Hồi",
      "FFF59E0B",
      "DANH SÁCH KHÁCH HÀNG ĐÃ GỬI BÁO GIÁ & CHƯA PHẢN HỒI",
      metaInfo,
      true
    ),
    buildLeadDetailsSheet(
      leads,
      "4. Toàn Bộ Dự Án Lead",
      "FFF97316",
      "BẢNG CHI TIẾT TOÀN BỘ KHÁCH HÀNG TIỀM NĂNG TRONG HỆ THỐNG",
      metaInfo,
      false
    ),
    deptSheet,
  ];

  const dateTag = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(`ToanTrung_BaoCao_DieuHanh_TongHop_${dateTag}.xlsx`, sheets);
}

/* ============================================================================
   3. ADS CAMPAIGNS & KEYWORDS WORKBOOK (3 SHEETS — MODULE 3)
   ============================================================================ */

function platformBadgeStyle(platform: string): number {
  switch (platform) {
    case "Google Ads":
      return sIdx("badgeRose");
    case "Facebook Ads":
    case "Zalo Ads":
      return sIdx("badgeBlue");
    case "TikTok Ads":
      return sIdx("badgeViolet");
    case "SEO":
      return sIdx("badgeEmerald");
    default:
      return sIdx("cellCenter");
  }
}

export async function exportAdsKeywordsWorkbook(options: {
  campaigns: CampaignItem[];
  keywords: KeywordItem[];
  summary: {
    totalBudget: number;
    totalSpent: number;
    totalClicks: number;
    totalImpressions: number;
  };
}): Promise<void> {
  const { campaigns, keywords, summary } = options;
  const nowStr = new Date().toLocaleString("vi-VN");
  const metaInfo = `Ngày xuất báo cáo: ${nowStr}   |   Phân hệ: Module 03 — Quảng Cáo Đa Kênh & Phân Tích Từ Khóa Toàn Trung`;

  const overviewSheet: SheetSpec = {
    name: "1. Tổng Quan Hiệu Suất Ads",
    tabColorRgb: "FF2563EB",
    colWidths: [28, 22, 22, 20, 22],
    merges: [],
    rows: [],
  };

  let r1 = addCorporateHeader(
    overviewSheet,
    5,
    "BÁO CÁO HIỆU SUẤT QUẢNG CÁO ĐA KÊNH & TỐI ƯU NGÂN SÁCH ADS",
    "Tổng hợp hiệu suất chiến dịch Google Ads, Facebook Ads, TikTok Ads, Zalo Ads & SEO Màn hình LED",
    metaInfo
  );

  addMergedBanner(overviewSheet, r1++, 1, 5, "I. CHỈ SỐ HIỆU SUẤT QUẢNG CÁO TỔNG HỢP (ADS KPIs)", "sectionHeader", 26);

  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0) || summary.totalBudget || 0;
  const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0) || summary.totalSpent || 0;
  const totalImpr = keywords.reduce((s, k) => s + (k.impressions || 0), 0) || summary.totalImpressions || 0;
  const totalClicks = keywords.reduce((s, k) => s + (k.clicks || 0), 0) || summary.totalClicks || 0;
  const ctrVal = totalImpr > 0 ? totalClicks / totalImpr : 0;
  const avgCpcVal = totalClicks > 0 ? Math.round(totalSpent / totalClicks) : 0;

  overviewSheet.rows.push({
    row: r1++,
    height: 25,
    cells: [
      { col: 1, value: "Tổng Ngân Sách Cấp", style: sIdx("kpiLabel") },
      { col: 2, value: "Đã Giải Ngân Thực Tế", style: sIdx("kpiLabel") },
      { col: 3, value: "Tổng Lượt Nhấp (Clicks)", style: sIdx("kpiLabel") },
      { col: 4, value: "Tỷ Lệ Nhấp (CTR)", style: sIdx("kpiLabel") },
      { col: 5, value: "Chi Phí / Click (CPC)", style: sIdx("kpiLabel") },
    ],
  });

  overviewSheet.rows.push({
    row: r1++,
    height: 32,
    cells: [
      { col: 1, value: totalBudget, type: "num", style: sIdx("kpiCurrency") },
      { col: 2, value: totalSpent, type: "num", style: sIdx("kpiCurrency") },
      { col: 3, value: totalClicks, type: "num", style: sIdx("kpiInt") },
      { col: 4, value: ctrVal, type: "num", style: sIdx("kpiPercent") },
      { col: 5, value: avgCpcVal, type: "num", style: sIdx("kpiCurrency") },
    ],
  });

  r1 += 1;
  addMergedBanner(overviewSheet, r1++, 1, 5, "II. TỶ TRỌNG NGÂN SÁCH & CHI TIÊU THEO TỪNG NỀN TẢNG", "sectionHeader", 26);

  overviewSheet.rows.push({
    row: r1++,
    height: 27,
    cells: [
      { col: 1, value: "Nền tảng Quảng cáo", style: sIdx("thCenter") },
      { col: 2, value: "Số chiến dịch", style: sIdx("thRight") },
      { col: 3, value: "Ngân sách cấp (VNĐ)", style: sIdx("thRight") },
      { col: 4, value: "Đã chi tiêu (VNĐ)", style: sIdx("thRight") },
      { col: 5, value: "Tỷ trọng chi tiêu (%)", style: sIdx("thRight") },
    ],
  });

  const platMap = new Map<string, { count: number; budget: number; spent: number }>();
  campaigns.forEach((c) => {
    const cur = platMap.get(c.platform) || { count: 0, budget: 0, spent: 0 };
    cur.count += 1;
    cur.budget += c.budget || 0;
    cur.spent += c.spent || 0;
    platMap.set(c.platform, cur);
  });

  const pStart = r1;
  Array.from(platMap.entries()).forEach(([platform, st], idx) => {
    const z = idx % 2 === 1;
    const share = totalSpent > 0 ? st.spent / totalSpent : 0;
    overviewSheet.rows.push({
      row: r1++,
      height: 25,
      cells: [
        { col: 1, value: platform, style: platformBadgeStyle(platform) },
        { col: 2, value: st.count, type: "num", style: sIdx("cellInt", z) },
        { col: 3, value: st.budget, type: "num", style: sIdx("cellCurrency", z) },
        { col: 4, value: st.spent, type: "num", style: sIdx("cellCurrency", z) },
        { col: 5, value: share, type: "num", style: sIdx("cellPercent", z) },
      ],
    });
  });
  const pEnd = Math.max(pStart, r1 - 1);

  if (platMap.size > 0) {
    overviewSheet.rows.push({
      row: r1++,
      height: 27,
      cells: [
        { col: 1, value: "TỔNG CỘNG ĐA KÊNH", style: sIdx("totalCenter") },
        { col: 2, formula: `SUM(B${pStart}:B${pEnd})`, value: campaigns.length, style: sIdx("totalInt") },
        { col: 3, formula: `SUM(C${pStart}:C${pEnd})`, value: totalBudget, style: sIdx("totalCurrency") },
        { col: 4, formula: `SUM(D${pStart}:D${pEnd})`, value: totalSpent, style: sIdx("totalCurrency") },
        { col: 5, value: 1, type: "num", style: sIdx("totalPercent") },
      ],
    });
  }

  // SHEET 2: CHIẾN DỊCH QUẢNG CÁO
  const campSheet: SheetSpec = {
    name: "2. Chiến Dịch Quảng Cáo",
    tabColorRgb: "FFF59E0B",
    colWidths: [7, 18, 36, 18, 20, 20, 18, 18, 16],
    freezeRow: 5,
    merges: [],
    rows: [],
  };

  addCorporateHeader(
    campSheet,
    9,
    "DANH SÁCH CHI TIẾT CHIẾN DỊCH QUẢNG CÁO & CHUYỂN ĐỔI",
    "Phân biệt rõ Chuyển đổi nền tảng Ads và Lead thực tế ghi nhận trong CRM",
    metaInfo
  );

  campSheet.rows.push({
    row: 5,
    height: 30,
    cells: [
      { col: 1, value: "STT", style: sIdx("thCenter") },
      { col: 2, value: "Mã Chiến Dịch", style: sIdx("thCenter") },
      { col: 3, value: "Tên Chiến Dịch Quảng Cáo", style: sIdx("thLeft") },
      { col: 4, value: "Nền Tảng", style: sIdx("thCenter") },
      { col: 5, value: "Ngân Sách Cấp (VNĐ)", style: sIdx("thRight") },
      { col: 6, value: "Đã Giải Ngân (VNĐ)", style: sIdx("thRight") },
      { col: 7, value: "Chuyển Đổi Nền Tảng Ads", style: sIdx("thRight") },
      { col: 8, value: "Lead Thực Tế Ghi Nhận CRM", style: sIdx("thRight") },
      { col: 9, value: "Trạng Thái", style: sIdx("thCenter") },
    ],
  });

  let rc = 6;
  const cStart = rc;
  campaigns.forEach((c, idx) => {
    const z = idx % 2 === 1;
    const statusLabel =
      c.status === "Active" ? "Đang chạy" : c.status === "Paused" ? "Tạm dừng" : "Hoàn thành";
    const statusSt =
      c.status === "Active"
        ? sIdx("badgeEmerald")
        : c.status === "Paused"
          ? sIdx("badgeAmber")
          : sIdx("badgeBlue");

    campSheet.rows.push({
      row: rc,
      height: 26,
      cells: [
        { col: 1, value: idx + 1, type: "num", style: sIdx("cellCenter", z) },
        { col: 2, value: c.code, style: sIdx("cellCode", z) },
        { col: 3, value: c.name, style: sIdx("cellBold", z) },
        { col: 4, value: c.platform, style: platformBadgeStyle(c.platform) },
        { col: 5, value: c.budget, type: "num", style: sIdx("cellCurrency", z) },
        { col: 6, value: c.spent, type: "num", style: sIdx("cellCurrency", z) },
        { col: 7, value: c.platformConversions ?? c.conversions ?? 0, type: "num", style: sIdx("cellInt", z) },
        { col: 8, value: c.crmLeadsFromAds ?? 0, type: "num", style: sIdx("cellInt", z) },
        { col: 9, value: statusLabel, style: statusSt },
      ],
    });
    rc += 1;
  });

  const cEnd = Math.max(cStart, rc - 1);
  if (campaigns.length > 0) {
    campSheet.autoFilterRef = `A5:I${cEnd}`;
  }

  // SHEET 3: PHÂN TÍCH TỪ KHÓA & TỐI ƯU CPC
  const kwSheet: SheetSpec = {
    name: "3. Phân Tích Từ Khóa & CPC",
    tabColorRgb: "FF8B5CF6",
    colWidths: [7, 34, 22, 18, 16, 15, 20, 15, 24],
    freezeRow: 5,
    merges: [],
    rows: [],
  };

  addCorporateHeader(
    kwSheet,
    9,
    "PHÂN TÍCH HIỆU QUẢ TỪ KHÓA TÌM KIẾM & TỐI ƯU GIÁ THẦU CPC",
    "Dữ liệu kết hợp Google Ads & Google Search Console giúp phát hiện từ khóa hiệu quả cao và từ khóa tốn ngân sách",
    metaInfo
  );

  kwSheet.rows.push({
    row: 5,
    height: 30,
    cells: [
      { col: 1, value: "STT", style: sIdx("thCenter") },
      { col: 2, value: "Từ Khóa Tìm Kiếm", style: sIdx("thLeft") },
      { col: 3, value: "Nguồn Dữ Liệu", style: sIdx("thCenter") },
      { col: 4, value: "Lượt Hiển Thị", style: sIdx("thRight") },
      { col: 5, value: "Lượt Nhấp", style: sIdx("thRight") },
      { col: 6, value: "Tỷ Lệ CTR", style: sIdx("thRight") },
      { col: 7, value: "CPC Trung Bình", style: sIdx("thRight") },
      { col: 8, value: "Vị Trí TB", style: sIdx("thCenter") },
      { col: 9, value: "Khuyến Nghị Tối Ưu", style: sIdx("thCenter") },
    ],
  });

  let rk = 6;
  const kStart = rk;
  keywords.forEach((kw, idx) => {
    const z = idx % 2 === 1;
    const ctr = kw.impressions > 0 ? kw.clicks / kw.impressions : 0;
    const highCpc = kw.avgCpc > 18000;

    kwSheet.rows.push({
      row: rk,
      height: 26,
      cells: [
        { col: 1, value: idx + 1, type: "num", style: sIdx("cellCenter", z) },
        { col: 2, value: kw.keyword, style: sIdx("cellBold", z) },
        { col: 3, value: kw.source, style: sIdx("badgeBlue") },
        { col: 4, value: kw.impressions, type: "num", style: sIdx("cellInt", z) },
        { col: 5, value: kw.clicks, type: "num", style: sIdx("cellInt", z) },
        {
          col: 6,
          formula: kw.impressions > 0 ? `E${rk}/D${rk}` : undefined,
          value: ctr,
          type: "num",
          style: sIdx("cellPercent", z),
        },
        { col: 7, value: kw.avgCpc, type: "num", style: sIdx("cellCurrency", z) },
        { col: 8, value: `Hạng #${kw.avgPosition}`, style: sIdx("cellCenter", z) },
        {
          col: 9,
          value: highCpc ? "Cần tối ưu giá thầu CPC" : "Hiệu quả chuyển đổi tốt",
          style: highCpc ? sIdx("badgeAmber") : sIdx("badgeEmerald"),
        },
      ],
    });
    rk += 1;
  });

  const kEnd = Math.max(kStart, rk - 1);
  if (keywords.length > 0) {
    kwSheet.autoFilterRef = `A5:I${kEnd}`;
  }

  const dateTag = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(`ToanTrung_BaoCao_QuangCao_TuKhoa_${dateTag}.xlsx`, [
    overviewSheet,
    campSheet,
    kwSheet,
  ]);
}

/* ============================================================================
   4. MULTI-CHANNEL TRACKING WORKBOOK (2 SHEETS — MODULE 2)
   ============================================================================ */

export async function exportTrackingWorkbook(options: {
  events: TrackingEventItem[];
  syncJobs: SyncJobItem[];
  totalEvents: number;
}): Promise<void> {
  const { events, syncJobs, totalEvents } = options;
  const nowStr = new Date().toLocaleString("vi-VN");
  const metaInfo = `Ngày xuất: ${nowStr}   |   Phân hệ: Module 02 — Tracking Đa Kênh & UTM   |   Tổng sự kiện ghi nhận: ${totalEvents || events.length}`;

  const evSheet: SheetSpec = {
    name: "1. Nhật Ký Truy Cập & UTM",
    tabColorRgb: "FF0284C7",
    colWidths: [7, 24, 16, 15, 26, 36, 18, 22, 20],
    freezeRow: 5,
    merges: [],
    rows: [],
  };

  addCorporateHeader(
    evSheet,
    9,
    "NHẬT KÝ THEO DÕI NGUỒN KHÁCH HÀNG & THAM SỐ CHIẾN DỊCH UTM",
    "Ghi nhận tự động website nguồn, chiến dịch quảng cáo, trang đích sản phẩm LED, thiết bị và vị trí địa lý",
    metaInfo
  );

  evSheet.rows.push({
    row: 5,
    height: 30,
    cells: [
      { col: 1, value: "STT", style: sIdx("thCenter") },
      { col: 2, value: "Website Nguồn", style: sIdx("thLeft") },
      { col: 3, value: "Nguồn", style: sIdx("thCenter") },
      { col: 4, value: "Kênh", style: sIdx("thCenter") },
      { col: 5, value: "Chiến Dịch (utm_campaign)", style: sIdx("thLeft") },
      { col: 6, value: "Trang Đích", style: sIdx("thLeft") },
      { col: 7, value: "Thiết Bị", style: sIdx("thCenter") },
      { col: 8, value: "Khu Vực / IP", style: sIdx("thCenter") },
      { col: 9, value: "Thời Gian Truy Cập", style: sIdx("thCenter") },
    ],
  });

  let re = 6;
  events.forEach((ev, idx) => {
    const z = idx % 2 === 1;
    evSheet.rows.push({
      row: re++,
      height: 26,
      cells: [
        { col: 1, value: idx + 1, type: "num", style: sIdx("cellCenter", z) },
        { col: 2, value: ev.websiteSource || "Chưa có thông tin", style: sIdx("cellBold", z) },
        { col: 3, value: ev.source || "Chưa có thông tin", style: sIdx("badgeBlue") },
        { col: 4, value: ev.medium || "Chưa có thông tin", style: sIdx("cellCenter", z) },
        { col: 5, value: ev.campaign || "Truy cập trực tiếp", style: sIdx("cellCode", z) },
        { col: 6, value: ev.landingPage || "/", style: sIdx("cellText", z) },
        { col: 7, value: ev.device || "Chưa có thông tin", style: sIdx("cellCenter", z) },
        { col: 8, value: ev.location || ev.ipAddress || "Chưa có thông tin", style: sIdx("cellCenter", z) },
        {
          col: 9,
          value: new Date(ev.createdAt).toLocaleString("vi-VN"),
          style: sIdx("cellCenter", z),
        },
      ],
    });
  });

  if (events.length > 0) {
    evSheet.autoFilterRef = `A5:I${re - 1}`;
  }

  const syncSheet: SheetSpec = {
    name: "2. Trạng Thái Đồng Bộ API",
    tabColorRgb: "FF10B981",
    colWidths: [8, 28, 22, 18, 24, 38],
    freezeRow: 5,
    merges: [],
    rows: [],
  };

  addCorporateHeader(
    syncSheet,
    6,
    "TRẠNG THÁI KẾT NỐI ĐỒNG BỘ GOOGLE ADS · GA4 · SEARCH CONSOLE",
    "Theo dõi lịch sử đồng bộ dữ liệu tự động từ các nền tảng tiếp thị số Toàn Trung",
    metaInfo
  );

  syncSheet.rows.push({
    row: 5,
    height: 30,
    cells: [
      { col: 1, value: "STT", style: sIdx("thCenter") },
      { col: 2, value: "Dịch Vụ Tích Hợp", style: sIdx("thLeft") },
      { col: 3, value: "Trạng Thái Kết Nối", style: sIdx("thCenter") },
      { col: 4, value: "Số Bản Ghi", style: sIdx("thRight") },
      { col: 5, value: "Đồng Bộ Gần Nhất", style: sIdx("thCenter") },
      { col: 6, value: "Ghi Chú", style: sIdx("thLeft") },
    ],
  });

  let rs = 6;
  syncJobs.forEach((job, idx) => {
    const z = idx % 2 === 1;
    const ok = job.status === "COMPLETED";
    syncSheet.rows.push({
      row: rs++,
      height: 26,
      cells: [
        { col: 1, value: idx + 1, type: "num", style: sIdx("cellCenter", z) },
        { col: 2, value: job.service, style: sIdx("cellBold", z) },
        {
          col: 3,
          value: ok ? "Đồng bộ hoàn tất" : "Chưa cấu hình / Chờ đồng bộ",
          style: ok ? sIdx("badgeEmerald") : sIdx("badgeAmber"),
        },
        { col: 4, value: job.recordsSynced || 0, type: "num", style: sIdx("cellInt", z) },
        {
          col: 5,
          value: job.lastSyncTime
            ? new Date(job.lastSyncTime).toLocaleString("vi-VN")
            : "Chưa đồng bộ",
          style: sIdx("cellCenter", z),
        },
        {
          col: 6,
          value: job.errorMessage || "Kết nối ổn định",
          style: sIdx("cellNote", z),
        },
      ],
    });
  });

  const dateTag = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(`ToanTrung_Tracking_DaKenh_${dateTag}.xlsx`, [evSheet, syncSheet]);
}
