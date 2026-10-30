import fs from "node:fs";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import { getCloudEnv, rootDir } from "./cloud-env.mjs";

const env = getCloudEnv();
const webPort = String(process.env.PORT || "3001");
const apiPort = "3002";

if (!fs.existsSync(env.sqliteFilePath)) {
  console.log("📦 Initializing SQLite database & demo seed...");
  execSync("npm run db:push", { cwd: rootDir, stdio: "inherit", env });
  execSync("npm run db:seed --workspace @toantrung/database", {
    cwd: rootDir,
    stdio: "inherit",
    env,
  });
}

const isWin = process.platform === "win32";
const npxBin = isWin ? "npx.cmd" : "npx";

console.log(`🚀 Starting Backend API on port ${apiPort} and Frontend Web on port ${webPort}...`);

const apiProc = spawn(npxBin, ["next", "start", "-p", apiPort], {
  cwd: path.join(rootDir, "backend"),
  stdio: "inherit",
  env: { ...env, PORT: apiPort },
  shell: isWin,
});

const webProc = spawn(npxBin, ["next", "start", "-p", webPort, "-H", "0.0.0.0"], {
  cwd: path.join(rootDir, "frontend"),
  stdio: "inherit",
  env: { ...env, PORT: webPort },
  shell: isWin,
});

function shutdown(code = 0) {
  apiProc.kill();
  webProc.kill();
  process.exit(code);
}

apiProc.on("exit", (code) => {
  if (code && code !== 0) shutdown(code);
});
webProc.on("exit", (code) => {
  if (code && code !== 0) shutdown(code);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

