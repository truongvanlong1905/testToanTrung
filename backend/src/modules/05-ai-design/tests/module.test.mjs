import assert from "node:assert/strict";

export async function runModuleTests() {
  const validModes = ["banner", "storyboard", "mockup"];
  assert.ok(validModes.includes("mockup"));
  assert.equal(validModes.length, 3);
}
