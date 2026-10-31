import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const moduleDir = path.resolve(import.meta.dirname, "..");

test("04-reports-dashboard module files and decomposed FormattedReportBody exist", () => {
  for (const rel of [
    "types.ts",
    "api.ts",
    "index.ts",
    "README.md",
    "hooks/useReportsModule.ts",
    "components/OverviewView.tsx",
    "components/ReportsView.tsx",
    "components/FormattedReportBody.tsx",
  ]) {
    assert.equal(
      fs.existsSync(path.join(moduleDir, rel)),
      true,
      `Expected ${rel} in 04-reports-dashboard`
    );
  }
  const formattedBody = fs.readFileSync(
    path.join(moduleDir, "components/FormattedReportBody.tsx"),
    "utf8"
  );
  assert.match(formattedBody, /CALLOUT_STYLES/);
  assert.match(formattedBody, /extractReportSummary/);
});
