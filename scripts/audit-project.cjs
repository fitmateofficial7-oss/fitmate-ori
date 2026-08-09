#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoots = ["app", "components", "lib"];
const standaloneFiles = [
  "proxy.ts",
  "next.config.ts",
  "playwright.config.ts",
];
const sourceExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);
const resolutionExtensions = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
];

function positiveIntegerArgument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  const value =
    index >= 0 ? Number(process.argv[index + 1]) : fallback;

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer.`);
  }

  return value;
}

function walk(entryPath, files) {
  const absolutePath = path.join(projectRoot, entryPath);

  if (!fs.existsSync(absolutePath)) {
    return;
  }

  const stat = fs.statSync(absolutePath);

  if (stat.isFile()) {
    files.push(absolutePath);
    return;
  }

  for (const entry of fs.readdirSync(absolutePath, {
    withFileTypes: true,
  })) {
    const relativePath = path.join(entryPath, entry.name);

    if (entry.isDirectory()) {
      walk(relativePath, files);
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(path.join(projectRoot, relativePath));
    }
  }
}

function collectSourceFiles() {
  const files = [];

  for (const root of sourceRoots) {
    walk(root, files);
  }

  for (const file of standaloneFiles) {
    walk(file, files);
  }

  return files.sort();
}

function resolveLocalImport(importer, specifier) {
  const basePath = specifier.startsWith("@/")
    ? path.join(projectRoot, specifier.slice(2))
    : path.resolve(path.dirname(importer), specifier);

  for (const extension of resolutionExtensions) {
    const candidate = `${basePath}${extension}`;

    if (
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile()
    ) {
      return candidate;
    }
  }

  if (
    fs.existsSync(basePath) &&
    fs.statSync(basePath).isDirectory()
  ) {
    for (const indexFile of [
      "index.ts",
      "index.tsx",
      "index.js",
      "index.jsx",
    ]) {
      const candidate = path.join(basePath, indexFile);

      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

function inspectSyntax(filePath, source) {
  const scriptKind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : filePath.endsWith(".jsx")
      ? ts.ScriptKind.JSX
      : filePath.endsWith(".ts")
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  return sourceFile.parseDiagnostics.map((diagnostic) => {
    const location = sourceFile.getLineAndCharacterOfPosition(
      diagnostic.start || 0
    );

    return {
      file: path.relative(projectRoot, filePath),
      line: location.line + 1,
      column: location.character + 1,
      message: ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        " "
      ),
    };
  });
}

function inspectImports(filePath, source) {
  const errors = [];
  const importPattern =
    /(?:from\s+|import\s*\(|require\s*\()\s*["']([^"']+)["']/g;
  let match;

  while ((match = importPattern.exec(source))) {
    const specifier = match[1];

    if (
      !specifier.startsWith("@/") &&
      !specifier.startsWith("./") &&
      !specifier.startsWith("../")
    ) {
      continue;
    }

    if (!resolveLocalImport(filePath, specifier)) {
      errors.push({
        file: path.relative(projectRoot, filePath),
        import: specifier,
      });
    }
  }

  return errors;
}

function assertProjectConfiguration() {
  const tsconfig = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "tsconfig.json"), "utf8")
  );
  const compilerOptions = tsconfig.compilerOptions || {};
  const alias = compilerOptions.paths?.["@/*"];

  if (compilerOptions.baseUrl !== ".") {
    throw new Error('tsconfig compilerOptions.baseUrl must be ".".');
  }

  if (!Array.isArray(alias) || !alias.includes("./*")) {
    throw new Error('tsconfig alias "@/*" must resolve to "./*".');
  }

  const canonicalSupabase = path.join(
    projectRoot,
    "lib",
    "supabase.ts"
  );
  const compatibilitySupabase = path.join(
    projectRoot,
    "app",
    "lib",
    "supabase.ts"
  );

  if (!fs.existsSync(canonicalSupabase)) {
    throw new Error("Missing canonical lib/supabase.ts client.");
  }

  if (!fs.existsSync(compatibilitySupabase)) {
    throw new Error("Missing app/lib/supabase.ts compatibility export.");
  }

  const canonicalSource = fs.readFileSync(
    canonicalSupabase,
    "utf8"
  );
  const compatibilitySource = fs.readFileSync(
    compatibilitySupabase,
    "utf8"
  );

  if (!canonicalSource.includes("export const supabase")) {
    throw new Error("lib/supabase.ts must export const supabase.");
  }

  if (!compatibilitySource.includes('from "../../lib/supabase"')) {
    throw new Error(
      "app/lib/supabase.ts must re-export the canonical client."
    );
  }
}

function run() {
  const cycles = positiveIntegerArgument("cycles", 100);
  const files = collectSourceFiles();
  let checkedFiles = 0;
  let checkedImports = 0;

  assertProjectConfiguration();

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    const syntaxErrors = [];
    const importErrors = [];

    for (const filePath of files) {
      const source = fs.readFileSync(filePath, "utf8");
      const importMatches = source.match(
        /(?:from\s+|import\s*\(|require\s*\()\s*["'][^"']+["']/g
      );

      checkedFiles += 1;
      checkedImports += importMatches?.length || 0;
      syntaxErrors.push(...inspectSyntax(filePath, source));
      importErrors.push(...inspectImports(filePath, source));
    }

    if (syntaxErrors.length > 0) {
      throw new Error(
        `syntax errors found: ${JSON.stringify(syntaxErrors)}`
      );
    }

    if (importErrors.length > 0) {
      throw new Error(
        `broken local imports found: ${JSON.stringify(importErrors)}`
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        cycles,
        uniqueSourceFiles: files.length,
        checkedFiles,
        checkedImports,
        brokenLocalImports: 0,
        syntaxErrors: 0,
        supabaseCanonicalImport: "@/lib/supabase",
        supabaseCompatibilityImport: "@/app/lib/supabase",
        tsconfigAlias: "@/* -> ./*",
      },
      null,
      2
    )
  );
}

try {
  run();
} catch (error) {
  console.error(
    `Project audit FAILED: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exitCode = 1;
}
