import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const moduleDir = path.resolve(import.meta.dirname, "..");

test("03-ads-keywords module files and public contract exist", () => {
  for (const rel of [
    "types.ts",
    "api.ts",
    "index.ts",
    "README.md",
    "hooks/useAdsModule.ts",
    "components/AdsView.tsx",
  ]) {
    assert.equal(
      fs.existsSync(path.join(moduleDir, rel)),
      true,
      `Expected ${rel} in 03-ads-keywords`
    );
  }
  const typesContent = fs.readFileSync(path.join(moduleDir, "types.ts"), "utf8");
  assert.match(typesContent, /CampaignItem/);
  assert.match(typesContent, /KeywordItem/);
  assert.match(typesContent, /AdsStatsSummary/);
});
