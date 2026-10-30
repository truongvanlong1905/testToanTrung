import { execSync } from "node:child_process";
import { getCloudEnv, rootDir } from "./cloud-env.mjs";

const env = getCloudEnv();

function run(cmd) {
  console.log(`\n▶ Running: ${cmd}`);
  execSync(cmd, {
    cwd: rootDir,
    stdio: "inherit",
    env,
  });
}

run("npm run db:generate");
run("npm run db:push");
run("npm run db:seed --workspace @toantrung/database");
run("npm run build:api");
run("npm run build:web");

