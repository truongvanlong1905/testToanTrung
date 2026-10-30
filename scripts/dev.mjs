import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { getCloudEnv, rootDir } from "./cloud-env.mjs";

function checkSingleHost(port, host) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", (err) => {
      if (err && (err.code === "EAFNOSUPPORT" || err.code === "EADDRNOTAVAIL")) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    srv.listen({ port, host, exclusive: true }, () => {
      srv.close(() => resolve(true));
    });
  });
}

async function isPortAvailable(port) {
  const ipv6Free = await checkSingleHost(port, "::");
  if (!ipv6Free) return false;
  const ipv4Free = await checkSingleHost(port, "0.0.0.0");
  return ipv4Free;
}

async function findAvailablePort(preferredPort, excludePorts = new Set()) {
  for (let p = preferredPort; p < preferredPort + 50; p += 1) {
    if (excludePorts.has(p)) continue;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(p)) return p;
  }
  throw new Error(`Không tìm được cổng trống bắt đầu từ ${preferredPort}`);
}

function readEnvValueFromFile(filePath, key) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    if (k !== key) continue;
    return trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return null;
}

async function main() {
  const baseEnv = getCloudEnv();

  const sharedJwtSecret =
    process.env.JWT_SECRET ||
    readEnvValueFromFile(path.join(rootDir, "backend", ".env.local"), "JWT_SECRET") ||
    readEnvValueFromFile(path.join(rootDir, "frontend", ".env.local"), "JWT_SECRET") ||
    readEnvValueFromFile(path.join(rootDir, ".env"), "JWT_SECRET") ||
    baseEnv.JWT_SECRET;

  const webPort = await findAvailablePort(3001);
  const apiPort = await findAvailablePort(3002, new Set([webPort]));

  if (webPort !== 3001 || apiPort !== 3002) {
    console.log(
      `\n⚠️  Cổng 3001/3002 đang bận trên máy của bạn -> Đã tự động chuyển sang cổng trống an toàn:`
    );
  }
  console.log(
    `\n🚀 Toàn Trung CRM Dev Server:\n   • Giao diện Web (Frontend): http://localhost:${webPort}\n   • Máy chủ API  (Backend) : http://localhost:${apiPort}\n`
  );

  const nextBinJs = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");

  const sharedEnv = {
    ...baseEnv,
    JWT_SECRET: sharedJwtSecret,
    API_BASE_URL: `http://localhost:${apiPort}`,
  };

  const apiProc = spawn(process.execPath, [nextBinJs, "dev", "-p", String(apiPort)], {
    cwd: path.join(rootDir, "backend"),
    stdio: "inherit",
    env: { ...sharedEnv, PORT: String(apiPort) },
  });

  const webProc = spawn(process.execPath, [nextBinJs, "dev", "-p", String(webPort)], {
    cwd: path.join(rootDir, "frontend"),
    stdio: "inherit",
    env: { ...sharedEnv, PORT: String(webPort) },
  });

  let shuttingDown = false;
  function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      apiProc.kill();
    } catch {}
    try {
      webProc.kill();
    } catch {}
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
}

main().catch((err) => {
  console.error("❌ Lỗi khởi động dev server:", err);
  process.exit(1);
});
