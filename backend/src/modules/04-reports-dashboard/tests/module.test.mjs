import assert from "node:assert/strict";

export async function runModuleTests() {
  const isBoardOrAdmin = (role) => role === "ADMIN" || role === "DIRECTOR";
  assert.equal(isBoardOrAdmin("DIRECTOR"), true);
  assert.equal(isBoardOrAdmin("SALES"), false);
}
