#!/usr/bin/env node
/**
 * Toàn Trung CRM — Architecture, Module Boundary & Circular Dependency Checker
 * Enforces:
 * 1. 5 main root directories (docs, frontend, backend, database, scripts)
 * 2. Identical 5 modules in frontend/src/modules & backend/src/modules:
 *    01-leads, 02-tracking, 03-ads-keywords, 04-reports-dashboard, 05-ai-design
 * 3. Required files inside every FE and BE module
 * 4. Removal of legacy duplicate directories
 * 5. Strict public boundary imports (only public.ts in BE, index.ts in FE)
 * 6. Zero circular dependencies between modules
 * 7. Zero Prisma / DB / server-secret leaks in frontend/
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const EXPECTED_ROOT_DIRS = ["docs", "frontend", "backend", "database", "scripts"];
const EXPECTED_MODULES = [
  "01-leads",
  "02-tracking",
  "03-ads-keywords",
  "04-reports-dashboard",
  "05-ai-design",
];

const FE_REQUIRED_ENTRIES = [
  "components",
  "hooks",
  "api.ts",
  "types.ts",
  "index.ts",
  "tests",
  "README.md",
];

const BE_REQUIRED_ENTRIES = [
  "service.ts",
  "repository.ts",
  "policy.ts",
  "contracts.ts",
  "public.ts",
  "tests",
  "README.md",
];

const FORBIDDEN_LEGACY_DIRS = [
  "frontend/components",
  "frontend/lib",
  "frontend/types",
  "frontend/data",
  "backend/lib",
  "backend/backend",
];

const errors = [];
const stats = {
  filesScanned: 0,
  importsChecked: 0,
  feModuleEdges: new Map(),
  beModuleEdges: new Map(),
};

for (const mod of EXPECTED_MODULES) {
  stats.feModuleEdges.set(mod, new Set());
  stats.beModuleEdges.set(mod, new Set());
}

function checkExists(relPath, description) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`[MISSING] ${description}: ${relPath}`);
    return false;
  }
  return true;
}

function walkFiles(dirPath, exts = [".ts", ".tsx", ".mjs", ".js"]) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
      continue;
    }
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full, exts));
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

function extractImports(content) {
  const specs = [];
  const importRegex = /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicRegex = /import\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    specs.push(match[1]);
  }
  while ((match = dynamicRegex.exec(content)) !== null) {
    specs.push(match[1]);
  }
  return specs;
}

// 1. Check 5 main root directories
for (const dir of EXPECTED_ROOT_DIRS) {
  checkExists(dir, "Root directory");
}

// 2. Check src/core in frontend and backend
checkExists("frontend/src/core", "Frontend core directory");
checkExists("backend/src/core", "Backend core directory");

// 3. Check 5 modules in both frontend and backend + required internal structure
for (const mod of EXPECTED_MODULES) {
  const feModDir = `frontend/src/modules/${mod}`;
  const beModDir = `backend/src/modules/${mod}`;
  const docModFile = `docs/modules/${mod}/README.md`;

  if (checkExists(feModDir, `Frontend module ${mod}`)) {
    for (const req of FE_REQUIRED_ENTRIES) {
      checkExists(`${feModDir}/${req}`, `Frontend ${mod} required entry '${req}'`);
    }
  }
  if (checkExists(beModDir, `Backend module ${mod}`)) {
    for (const req of BE_REQUIRED_ENTRIES) {
      checkExists(`${beModDir}/${req}`, `Backend ${mod} required entry '${req}'`);
    }
  }
  checkExists(docModFile, `Documentation for module ${mod}`);
}

// 4. Check legacy duplicate directories are removed
for (const legacyDir of FORBIDDEN_LEGACY_DIRS) {
  const full = path.join(rootDir, legacyDir);
  if (fs.existsSync(full)) {
    const remainingFiles = walkFiles(full);
    if (remainingFiles.length > 0) {
      errors.push(
        `[LEGACY_DUPLICATE] Legacy directory '${legacyDir}' still contains ${remainingFiles.length} file(s). Move all code to src/core or src/modules.`
      );
    }
  }
}

// 5. Scan Frontend files for security & module boundary rules
const feFiles = walkFiles(path.join(rootDir, "frontend"));
for (const file of feFiles) {
  stats.filesScanned++;
  const relFile = path.relative(rootDir, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  const imports = extractImports(content);

  // Security: No Prisma, database, or server-only env secrets in frontend
  if (
    content.includes("process.env.SESSION_SECRET") ||
    content.includes("process.env.GEMINI_API_KEY")
  ) {
    errors.push(`[FE_SECRET_LEAK] ${relFile} references server-only secret env variable.`);
  }

  const currentModMatch = relFile.match(/^frontend\/src\/modules\/([^/]+)\//);
  const currentMod = currentModMatch ? currentModMatch[1] : null;

  for (const spec of imports) {
    stats.importsChecked++;

    if (
      spec.includes("@prisma/client") ||
      spec.includes("@toantrung/database") ||
      spec.startsWith("database/") ||
      spec.includes("/backend/")
    ) {
      errors.push(`[FE_DB_IMPORT] ${relFile} imports backend/database module '${spec}'.`);
    }

    // Check cross-module imports in frontend
    const targetModMatch = spec.match(/^@\/src\/modules\/([^/]+)(?:\/(.+))?$/);
    if (targetModMatch) {
      const targetMod = targetModMatch[1];
      const subPath = targetModMatch[2] || "";

      if (currentMod && targetMod !== currentMod) {
        if (stats.feModuleEdges.has(currentMod) && stats.feModuleEdges.has(targetMod)) {
          stats.feModuleEdges.get(currentMod).add(targetMod);
        }
        if (subPath && subPath !== "index" && subPath !== "index.ts") {
          errors.push(
            `[FE_BOUNDARY_VIOLATION] ${relFile} (in ${currentMod}) imports internal path '${spec}'. Cross-module imports in Frontend must go through '@/src/modules/${targetMod}'.`
          );
        }
      } else if (!currentMod) {
        // From app/ or src/core/ importing a module: must use public index barrel
        if (subPath && subPath !== "index" && subPath !== "index.ts") {
          errors.push(
            `[FE_ENTRY_BOUNDARY_VIOLATION] ${relFile} imports internal module path '${spec}'. Must import from '@/src/modules/${targetMod}'.`
          );
        }
      }
    }

    // Check relative path escaping current module into another module
    if (currentMod && spec.startsWith(".")) {
      const resolved = path.resolve(path.dirname(file), spec).replace(/\\/g, "/");
      const rootNorm = rootDir.replace(/\\/g, "/");
      const relResolved = resolved.startsWith(rootNorm)
        ? resolved.slice(rootNorm.length + 1)
        : "";
      const relModMatch = relResolved.match(/^frontend\/src\/modules\/([^/]+)(?:\/(.+))?$/);
      if (relModMatch && relModMatch[1] !== currentMod) {
        errors.push(
          `[FE_RELATIVE_CROSS_MODULE] ${relFile} uses relative import '${spec}' into another module (${relModMatch[1]}). Use '@/src/modules/${relModMatch[1]}' instead.`
        );
      }
    }
  }
}

// 6. Scan Backend files for module boundaries
const beFiles = walkFiles(path.join(rootDir, "backend"));
for (const file of beFiles) {
  stats.filesScanned++;
  const relFile = path.relative(rootDir, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  const imports = extractImports(content);

  const currentModMatch = relFile.match(/^backend\/src\/modules\/([^/]+)\//);
  const currentMod = currentModMatch ? currentModMatch[1] : null;
  const isCoreFile = relFile.startsWith("backend/src/core/");

  for (const spec of imports) {
    stats.importsChecked++;

    const targetModMatch = spec.match(/^@\/src\/modules\/([^/]+)(?:\/(.+))?$/);
    if (targetModMatch) {
      const targetMod = targetModMatch[1];
      const subPath = targetModMatch[2] || "";

      if (currentMod && targetMod !== currentMod) {
        if (stats.beModuleEdges.has(currentMod) && stats.beModuleEdges.has(targetMod)) {
          stats.beModuleEdges.get(currentMod).add(targetMod);
        }
        if (subPath !== "public" && subPath !== "public.ts") {
          errors.push(
            `[BE_BOUNDARY_VIOLATION] ${relFile} (in ${currentMod}) imports internal file '${spec}'. Cross-module imports in Backend must ONLY use '@/src/modules/${targetMod}/public'.`
          );
        }
      } else if (isCoreFile) {
        if (subPath !== "public" && subPath !== "public.ts") {
          errors.push(
            `[BE_CORE_TO_MODULE_VIOLATION] Core file ${relFile} imports internal module path '${spec}'. Core may only call module public contracts via '@/src/modules/${targetMod}/public'.`
          );
        }
      }
    }

    // Check relative path escaping current module into another module
    if (currentMod && spec.startsWith(".")) {
      const resolved = path.resolve(path.dirname(file), spec).replace(/\\/g, "/");
      const rootNorm = rootDir.replace(/\\/g, "/");
      const relResolved = resolved.startsWith(rootNorm)
        ? resolved.slice(rootNorm.length + 1)
        : "";
      const relModMatch = relResolved.match(/^backend\/src\/modules\/([^/]+)(?:\/(.+))?$/);
      if (relModMatch && relModMatch[1] !== currentMod) {
        errors.push(
          `[BE_RELATIVE_CROSS_MODULE] ${relFile} uses relative import '${spec}' into another module (${relModMatch[1]}). Use '@/src/modules/${relModMatch[1]}/public' instead.`
        );
      }
    }
  }
}

// 7. Detect circular dependencies in FE and BE module graphs
function detectCycles(graph, label) {
  const visited = new Set();
  const inStack = new Set();

  function dfs(node, chain) {
    visited.add(node);
    inStack.add(node);
    const neighbors = graph.get(node) || new Set();
    for (const next of neighbors) {
      if (!visited.has(next)) {
        dfs(next, [...chain, next]);
      } else if (inStack.has(next)) {
        errors.push(
          `[CIRCULAR_DEPENDENCY] ${label} module cycle detected: ${[...chain, next].join(" -> ")}`
        );
      }
    }
    inStack.delete(node);
  }

  for (const mod of graph.keys()) {
    if (!visited.has(mod)) {
      dfs(mod, [mod]);
    }
  }
}

detectCycles(stats.feModuleEdges, "Frontend");
detectCycles(stats.beModuleEdges, "Backend");

// Report summary
console.log("==================================================================");
console.log(" Toàn Trung CRM — Architecture & Module Boundary Verification");
console.log("==================================================================");
console.log(`• Scanned files         : ${stats.filesScanned}`);
console.log(`• Checked import edges  : ${stats.importsChecked}`);
console.log(
  `• Backend module graph  : ${
    Array.from(stats.beModuleEdges.entries())
      .filter(([, targets]) => targets.size > 0)
      .map(([src, targets]) => `${src} -> [${Array.from(targets).join(", ")}]`)
      .join("; ") || "No cross-module edges"
  }`
);
console.log(
  `• Frontend module graph : ${
    Array.from(stats.feModuleEdges.entries())
      .filter(([, targets]) => targets.size > 0)
      .map(([src, targets]) => `${src} -> [${Array.from(targets).join(", ")}]`)
      .join("; ") || "No cross-module edges"
  }`
);

if (errors.length > 0) {
  console.error(`\n❌ Found ${errors.length} architecture violation(s):`);
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
} else {
  console.log("\n✅ All 5-module structure, public boundary, security, and DAG checks PASSED!");
}

