import fs from "node:fs";
import { execSync } from "node:child_process";
import { getCloudEnv, rootDir } from "./cloud-env.mjs";

const env = getCloudEnv();
const sqliteExists = fs.existsSync(env.sqliteFilePath);

function run(cmd) {
  console.log(`\n▶ Running: ${cmd}`);
  execSync(cmd, {
    cwd: rootDir,
    stdio: "inherit",
    env,
  });
}

run("npm run db:generate");
if (!sqliteExists || process.env.FORCE_DEMO_SEED === "true") {
  run("npm run db:push");
  if (env.ALLOW_DEMO_SEED === "true") {
    run("npm run db:seed --workspace @toantrung/database");
  }
}
run("npm run build:api");
run("npm run build:web");

