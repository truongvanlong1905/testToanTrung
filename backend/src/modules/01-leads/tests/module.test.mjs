import assert from "node:assert/strict";

export async function runModuleTests() {
  const raw = "245.000.000 đ";
  const digits = Number(raw.replace(/[^\d]/g, ""));
  assert.equal(digits, 245000000);

  const codes = [{ code: "TT-LED-2610-0002" }, { code: "TT-LED-2610-0009" }];
  const maxSuffix = Math.max(
    ...codes.map((c) => Number(c.code.split("-").pop() || 0))
  );
  assert.equal(maxSuffix, 9);
}
