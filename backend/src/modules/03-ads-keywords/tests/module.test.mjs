import assert from "node:assert/strict";

export async function runModuleTests() {
  const clicks = 120;
  const impressions = 4000;
  const ctr = ((clicks / impressions) * 100).toFixed(2);
  assert.equal(ctr, "3.00");
}
