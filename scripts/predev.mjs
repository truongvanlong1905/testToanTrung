import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { getCloudEnv, rootDir } from "./cloud-env.mjs";

const env = getCloudEnv();

function freeDevPortsOnWindows(ports) {
  if (process.platform !== "win32") return;
  for (const port of ports) {
    try {
      const out = execSync(`netstat -ano -p tcp`, { encoding: "utf8" });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.includes("LISTENING")) continue;
        const parts = trimmed.split(/\s+/);
        const localAddr = parts[1] || "";
        const pid = parts[4];
        if (
          (localAddr.endsWith(`:${port}`) || localAddr.endsWith(`]:${port}`)) &&
          pid &&
          pid !== "0" &&
          Number(pid) !== process.pid
        ) {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          console.log(`🔄 Đang giải phóng cổng dev ${port} (PID ${pid} từ phiên chạy cũ)...`);
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        } catch {
          // Process already exited
        }
      }
    } catch {
      // Ignore if netstat unavailable
    }
  }
}

function cleanStaleNextDevLocks() {
  const lockFiles = [
    path.join(rootDir, "frontend", ".next", "dev", "lock"),
    path.join(rootDir, "backend", ".next", "dev", "lock"),
  ];
  for (const lockFile of lockFiles) {
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
      } catch {
        // Ignore if actively held
      }
    }
  }
}

freeDevPortsOnWindows([3001, 3002]);
cleanStaleNextDevLocks();

execSync("npm run db:generate", { cwd: rootDir, stdio: "inherit", env });
execSync("npm run db:push", { cwd: rootDir, stdio: "inherit", env });
