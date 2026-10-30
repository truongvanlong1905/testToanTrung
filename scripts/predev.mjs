import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { getCloudEnv, rootDir } from "./cloud-env.mjs";

const env = getCloudEnv();

function collectListeningPidsWindows(ports) {
  const pids = new Set();
  const portList = ports.join(",");

  // Cách 1: PowerShell Get-NetTCPConnection (hỗ trợ cả IPv4 + IPv6 :: và mọi ngôn ngữ Windows) + quét tiến trình next dev cũ của workspace
  try {
    const escapedRoot = rootDir.replace(/'/g, "''");
    const psCmd = [
      `$ports = @(${portList});`,
      `Get-NetTCPConnection -LocalPort $ports -State Listen -ErrorAction SilentlyContinue | ForEach-Object { $_.OwningProcess };`,
      `Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*next*dev*' -and $_.CommandLine -like '*${escapedRoot}*' } | ForEach-Object { $_.ProcessId }`,
    ].join(" ");
    const psOut = execSync(
      `powershell.exe -NoProfile -NonInteractive -Command "${psCmd.replace(/"/g, '\\"')}"`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    for (const line of psOut.split(/\r?\n/)) {
      const pid = line.trim();
      if (/^\d+$/.test(pid) && pid !== "0" && Number(pid) !== process.pid) {
        pids.add(pid);
      }
    }
  } catch {
    // Fallback sang netstat bên dưới
  }

  // Cách 2: Quét cả TCP (IPv4) và TCPv6 (IPv6 :::3001, :::3002) với maxBuffer lớn
  for (const proto of ["tcp", "tcpv6"]) {
    try {
      const out = execSync(`netstat -ano -p ${proto}`, {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      });
      for (const line of out.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("TCP")) continue;
        const parts = trimmed.split(/\s+/);
        // Cột: Proto | Local Address | Foreign Address | State | PID
        if (parts.length < 5) continue;
        const localAddr = parts[1] || "";
        const foreignAddr = parts[2] || "";
        const pid = parts[parts.length - 1];
        const isListeningSocket =
          trimmed.includes("LISTENING") ||
          foreignAddr.endsWith(":0") ||
          foreignAddr === "[::]:0";

        if (!isListeningSocket) continue;

        for (const port of ports) {
          if (
            (localAddr.endsWith(`:${port}`) || localAddr.endsWith(`]:${port}`)) &&
            /^\d+$/.test(pid) &&
            pid !== "0" &&
            Number(pid) !== process.pid
          ) {
            pids.add(pid);
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return [...pids];
}

function freeDevPorts(ports) {
  if (process.platform === "win32") {
    const pids = collectListeningPidsWindows(ports);
    for (const pid of pids) {
      try {
        console.log(`🔄 Đang tắt tiến trình dev cũ đang giữ cổng 3001/3002 (PID ${pid})...`);
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: "ignore" });
      } catch {
        try {
          execSync(
            `powershell.exe -NoProfile -NonInteractive -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`,
            { stdio: "ignore" }
          );
        } catch {
          console.warn(
            `⚠️ Không thể tắt PID ${pid} (có thể đang chạy quyền Administrator). Hệ thống sẽ tự động chọn cổng trống kế tiếp.`
          );
        }
      }
    }
  } else {
    for (const port of ports) {
      try {
        execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
      } catch {
        // Ignore if fuser not installed or port already free
      }
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

freeDevPorts([3001, 3002]);
cleanStaleNextDevLocks();

execSync("npm run db:generate", { cwd: rootDir, stdio: "inherit", env });
execSync("npm run db:push", { cwd: rootDir, stdio: "inherit", env });
