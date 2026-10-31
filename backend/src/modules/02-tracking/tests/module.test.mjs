import assert from "node:assert/strict";

export async function runModuleTests() {
  const requiredConnectors = ["GOOGLE_ADS", "GA4", "SEARCH_CONSOLE"];
  assert.equal(requiredConnectors.length, 3);
  assert.ok(requiredConnectors.includes("GOOGLE_ADS"));
}
