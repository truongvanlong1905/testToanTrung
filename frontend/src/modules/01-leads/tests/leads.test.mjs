import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const moduleDir = path.resolve(import.meta.dirname, "..");

test("01-leads module contract & decomposed files exist", () => {
  const requiredFiles = [
    "types.ts",
    "api.ts",
    "index.ts",
    "README.md",
    "hooks/useLeadsWorkspace.ts",
    "components/LeadsWorkspaceView.tsx",
    "components/LeadDetailModal.tsx",
    "components/LeadDetailAuditTab.tsx",
    "components/lead-detail-constants.ts",
    "components/printable-quote.ts",
  ];
  for (const rel of requiredFiles) {
    assert.equal(
      fs.existsSync(path.join(moduleDir, rel)),
      true,
      `Expected ${rel} to exist in 01-leads`
    );
  }
});

test("01-leads types export 5 pipeline stages and core constants", () => {
  const content = fs.readFileSync(path.join(moduleDir, "types.ts"), "utf8");
  assert.match(content, /Vừa nhận thông tin/);
  assert.match(content, /Đang soạn báo giá/);
  assert.match(content, /Đã gửi báo giá/);
  assert.match(content, /Chốt thành công/);
  assert.match(content, /Thất bại/);
  assert.match(content, /PIPELINE_STAGES/);
  assert.match(content, /PRODUCT_CATEGORIES/);
  assert.match(content, /LEAD_SOURCES/);
});
