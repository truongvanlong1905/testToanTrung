import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const moduleDir = path.resolve(import.meta.dirname, "..");

test("02-tracking module files and public contract exist", () => {
  for (const rel of [
    "types.ts",
    "api.ts",
    "index.ts",
    "README.md",
    "hooks/useTrackingModule.ts",
    "components/TrackingView.tsx",
  ]) {
    assert.equal(
      fs.existsSync(path.join(moduleDir, rel)),
      true,
      `Expected ${rel} in 02-tracking`
    );
  }
  const typesContent = fs.readFileSync(path.join(moduleDir, "types.ts"), "utf8");
  assert.match(typesContent, /TrackingEventItem/);
  assert.match(typesContent, /SyncJobItem/);
});
