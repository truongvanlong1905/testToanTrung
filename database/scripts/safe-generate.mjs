import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(dbDir, "..");
const schemaPath = path.join(dbDir, "prisma", "schema.prisma");
const targetDir = path.join(dbDir, "generated", "sqlite");
const dllPath = path.join(targetDir, "query_engine-windows.dll.node");

const isWin = process.platform === "win32";
const prismaCliJs = path.join(rootDir, "node_modules", "prisma", "build", "index.js");

function runPrismaGenerate(schemaFile) {
  return spawnSync(process.execPath, [prismaCliJs, "generate", "--schema", schemaFile], {
    cwd: dbDir,
    encoding: "utf8",
    env: process.env,
  });
}

function copyWithoutLockedDll(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name.endsWith(".dll.node") || entry.name.includes(".dll.node.tmp")) {
      continue;
    }
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyWithoutLockedDll(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean up any leftover .tmp files in generated/sqlite first
if (fs.existsSync(targetDir)) {
  for (const name of fs.readdirSync(targetDir)) {
    if (name.includes(".dll.node.tmp")) {
      try {
        fs.unlinkSync(path.join(targetDir, name));
      } catch {
        // Ignore if still locked
      }
    }
  }
}

const direct = runPrismaGenerate("prisma/schema.prisma");

if (direct.status === 0) {
  if (direct.stdout) process.stdout.write(direct.stdout);
  process.exit(0);
}

const combinedOutput = `${direct.stdout || ""}\n${direct.stderr || ""}`;
const isWindowsDllEperm =
  isWin &&
  combinedOutput.includes("EPERM") &&
  combinedOutput.includes("query_engine-windows.dll.node") &&
  fs.existsSync(dllPath);

if (!isWindowsDllEperm) {
  if (direct.stdout) process.stdout.write(direct.stdout);
  if (direct.stderr) process.stderr.write(direct.stderr);
  process.exit(direct.status || 1);
}

console.log(
  "⚡ Phát hiện query_engine-windows.dll.node đang được giữ bởi tiến trình khác (VS Code / Node). Đang đồng bộ Prisma Client an toàn không cần ghi đè DLL..."
);

const stageDir = path.join(dbDir, "generated", "sqlite-stage");
const tmpSchemaPath = path.join(dbDir, "prisma", "schema.__stage__.prisma");

try {
  if (fs.existsSync(stageDir)) {
    fs.rmSync(stageDir, { recursive: true, force: true });
  }

  const rawSchema = fs.readFileSync(schemaPath, "utf8");
  const stagedSchema = rawSchema.replace(
    'output   = "../generated/sqlite"',
    'output   = "../generated/sqlite-stage"'
  );
  fs.writeFileSync(tmpSchemaPath, stagedSchema, "utf8");

  const staged = runPrismaGenerate("prisma/schema.__stage__.prisma");
  if (staged.status !== 0) {
    if (staged.stdout) process.stdout.write(staged.stdout);
    if (staged.stderr) process.stderr.write(staged.stderr);
    process.exit(staged.status || 1);
  }

  copyWithoutLockedDll(stageDir, targetDir);
  console.log("✅ Đã cập nhật thành công Prisma Client Types & Runtime (bỏ qua file DLL đang khóa)!");
} finally {
  try {
    if (fs.existsSync(tmpSchemaPath)) fs.unlinkSync(tmpSchemaPath);
  } catch {}
  try {
    if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true });
  } catch {}
}
