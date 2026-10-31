/**
 * Parses the free-text estimated value of a Lead ("1,5 tỷ", "250 triệu", "250.000.000") into VND.
 * Kept in its own tiny module so the table and sorting code do not pull the ~1,700-line Excel engine
 * into the main bundle. `excel-export.ts` re-exports it for existing importers.
 */
export function parseEstimatedVnd(raw: string): number {
  if (!raw) return 0;
  const text = raw.trim();
  const billionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:tỷ|ty)(?=$|\s|[^\p{L}\p{N}])/iu);
  if (billionMatch && !/\d{4,}/.test(billionMatch[1].replace(/[.,]/g, ""))) {
    const num = parseFloat(billionMatch[1].replace(",", "."));
    return Number.isFinite(num) ? Math.round(num * 1_000_000_000) : 0;
  }
  const millionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|trieu|tr)(?=$|\s|[^\p{L}\p{N}])/iu);
  if (millionMatch && !/\d{5,}/.test(millionMatch[1].replace(/[.,]/g, ""))) {
    const num = parseFloat(millionMatch[1].replace(",", "."));
    return Number.isFinite(num) ? Math.round(num * 1_000_000) : 0;
  }
  const digits = text.replace(/\D/g, "");
  return digits.length >= 5 ? parseInt(digits, 10) : 0;
}
