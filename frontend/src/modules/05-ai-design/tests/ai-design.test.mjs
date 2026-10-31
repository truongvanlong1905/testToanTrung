import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const moduleDir = path.resolve(import.meta.dirname, "..");

test("05-ai-design module files and decomposed components exist", () => {
  for (const rel of [
    "types.ts",
    "api.ts",
    "index.ts",
    "README.md",
    "hooks/useAiDesignModule.ts",
    "components/AiDesignView.tsx",
    "components/AiDesignRecentJobsTable.tsx",
    "components/ai-design-presets.ts",
  ]) {
    assert.equal(
      fs.existsSync(path.join(moduleDir, rel)),
      true,
      `Expected ${rel} in 05-ai-design`
    );
  }
  const presets = fs.readFileSync(
    path.join(moduleDir, "components/ai-design-presets.ts"),
    "utf8"
  );
  assert.match(presets, /STYLE_PRESETS/);
  assert.match(presets, /ASPECT_RATIOS/);
  assert.match(presets, /PROMPT_SUGGESTIONS/);
  assert.match(presets, /parsePromptMetadata/);
});
