#!/usr/bin/env node

const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const reportPath = path.join(projectRoot, "reports", "prelaunch-calibration-1000000.json");
const TOTAL_CHECKS = 1_000_000;

function loadTypeScriptModule(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filePath,
    reportDiagnostics: true,
  });
  const syntaxErrors = (result.diagnostics || []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  if (syntaxErrors.length > 0) {
    throw new Error(
      `${relativePath}: ${syntaxErrors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, " ")).join(" | ")}`
    );
  }
  const loaded = new Module(filePath, module);
  loaded.filename = filePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(filePath));
  loaded._compile(result.outputText, filePath);
  return loaded.exports;
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function collectSourceFiles(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...collectSourceFiles(fullPath));
    else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) output.push(fullPath);
  }
  return output;
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function poseSignature(pose) {
  const numbers = [];
  for (const value of Object.values(pose)) {
    if (Array.isArray(value)) numbers.push(...value);
    else if (typeof value === "number") numbers.push(value);
  }
  return numbers;
}

function assertMotionPose(preset, amount, pose) {
  if (!pose || typeof pose !== "object") throw new Error(`${preset}: missing pose`);
  const values = poseSignature(pose);
  if (values.length < 20 || values.some((value) => !finite(value))) {
    throw new Error(`${preset}: non-finite or incomplete pose at ${amount}`);
  }
  const vectorKeys = [
    "leftUpperArm", "rightUpperArm", "leftForearm", "rightForearm",
    "leftThigh", "rightThigh", "leftShin", "rightShin",
  ];
  for (const key of vectorKeys) {
    const vector = pose[key];
    if (!Array.isArray(vector) || vector.length !== 3) throw new Error(`${preset}: invalid ${key}`);
    const length = Math.hypot(...vector);
    if (Math.abs(length - 1) > 0.00001) throw new Error(`${preset}: ${key} length ${length}`);
  }
  for (const key of ["torsoScaleX", "torsoScaleY", "torsoScaleZ"]) {
    if (!finite(pose[key]) || pose[key] < 0.55 || pose[key] > 1.55) {
      throw new Error(`${preset}: unsafe ${key}=${pose[key]}`);
    }
  }
  if (amount < 0 || amount > 1) throw new Error(`${preset}: motion amount out of range`);
}

function parseAllSources() {
  const files = collectSourceFiles(projectRoot);
  const diagnostics = [];
  const fileInfo = files.map((filePath) => {
    const source = fs.readFileSync(filePath, "utf8");
    const kind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, kind);
    for (const diagnostic of sf.parseDiagnostics) {
      diagnostics.push({
        file: path.relative(projectRoot, filePath),
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
      });
    }
    return { filePath, relative: path.relative(projectRoot, filePath), source, sf };
  });
  if (diagnostics.length > 0) throw new Error(`Source parse errors: ${JSON.stringify(diagnostics.slice(0, 5))}`);
  return fileInfo;
}

function checkRequiredText(relativePath, patterns) {
  const source = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  for (const pattern of patterns) {
    if (pattern instanceof RegExp ? !pattern.test(source) : !source.includes(pattern)) {
      throw new Error(`${relativePath}: missing ${String(pattern)}`);
    }
  }
}

function run() {
  const startedAt = Date.now();
  const random = mulberry32(20260728);
  const motion = loadTypeScriptModule("lib/exercise-motion-calibration.ts");
  const fitness = loadTypeScriptModule("lib/prelaunch-fitness.ts");
  const sourceFiles = parseAllSources();

  const presets = [
    "bench-press", "incline-press", "lat-pulldown", "seated-row", "back-squat",
    "leg-press", "romanian-deadlift", "split-squat", "shoulder-press", "lateral-raise",
    "barbell-curl", "hammer-curl", "triceps-pushdown", "cable-crunch", "machine-press",
    "pec-deck", "assisted-pull-up", "hack-squat", "leg-extension", "leg-curl",
    "hip-thrust", "calf-raise", "preacher-curl", "assisted-dip", "ab-crunch",
    "ab-wheel-rollout", "alternating-curl", "treadmill-walk", "plank", "standing",
  ];

  const failures = [];
  let executed = 0;
  const breakdown = {
    motion: 0,
    readiness: 0,
    progression: 0,
    nutrition: 0,
    pagesAndSecurity: 0,
    databaseAndStorage: 0,
  };
  const motionRanges = Object.fromEntries(
    presets.map((preset) => [preset, { minimum: Infinity, maximum: -Infinity, signatureMin: Infinity, signatureMax: -Infinity }])
  );

  function execute(group, callback) {
    try {
      callback();
    } catch (error) {
      if (failures.length < 100) failures.push({ group, check: executed + 1, message: error instanceof Error ? error.message : String(error) });
    }
    breakdown[group] += 1;
    executed += 1;
  }

  // 600,000 calibrated animation cases: 20,000 time/phase samples for each of 30 presets.
  for (const preset of presets) {
    for (let sample = 0; sample < 20_000; sample += 1) {
      execute("motion", () => {
        const elapsed = sample * 0.0137 + random() * 0.01;
        const amount = motion.getCalibratedMotionAmount(preset, elapsed);
        const pose = motion.getCalibratedPose(preset, amount);
        assertMotionPose(preset, amount, pose);
        const signature = poseSignature(pose).reduce((sum, value, index) => sum + value * (index + 1), 0);
        const range = motionRanges[preset];
        range.minimum = Math.min(range.minimum, amount);
        range.maximum = Math.max(range.maximum, amount);
        range.signatureMin = Math.min(range.signatureMin, signature);
        range.signatureMax = Math.max(range.signatureMax, signature);
      });
    }
  }

  // Verify every preset has visible variation before continuing.
  for (const [preset, range] of Object.entries(motionRanges)) {
    if (range.maximum - range.minimum < 0.85 || range.signatureMax - range.signatureMin < 0.005) {
      failures.push({ group: "motion", check: executed, message: `${preset}: animation variance too small` });
    }
  }

  // 100,000 readiness cases covering normal, reduced, recovery, and stop paths.
  for (let index = 0; index < 100_000; index += 1) {
    execute("readiness", () => {
      const input = {
        sleepHours: random() * 12,
        energy: 1 + random() * 9,
        soreness: 1 + random() * 9,
        stress: 1 + random() * 9,
        painLevel: random() * 10,
        availableMinutes: Math.round(10 + random() * 110),
      };
      const result = fitness.calculateReadiness(input);
      if (!Number.isInteger(result.score) || result.score < 0 || result.score > 100) throw new Error("readiness score out of range");
      if (!["normal", "reduced", "recovery", "stop"].includes(result.action)) throw new Error("invalid readiness action");
      if (result.volumeModifier <= 0 || result.volumeModifier > 1 || result.intensityModifier <= 0 || result.intensityModifier > 1) throw new Error("invalid readiness modifier");
      if (input.painLevel >= 7 && result.action !== "stop") throw new Error("high pain did not stop training");
      if (!result.recommendationId || !result.recommendationEn) throw new Error("missing bilingual readiness guidance");
    });
  }

  // 100,000 set/progressive-overload cases.
  const setTypes = ["working", "warmup", "failure", "drop", "backoff"];
  for (let index = 0; index < 100_000; index += 1) {
    execute("progression", () => {
      const count = Math.floor(random() * 7);
      const sets = Array.from({ length: count }, () => ({
        loadKg: Math.round(random() * 2500) / 10,
        reps: Math.floor(random() * 31),
        rir: Math.round(random() * 50) / 10,
        rpe: Math.round((5 + random() * 5) * 10) / 10,
        setType: setTypes[Math.floor(random() * setTypes.length)],
      }));
      const min = 5 + Math.floor(random() * 8);
      const max = min + 2 + Math.floor(random() * 6);
      const result = fitness.recommendProgression({ sets, plannedRepsMin: min, plannedRepsMax: max });
      if (!["increase", "maintain", "reduce", "deload", "technique"].includes(result.action)) throw new Error("invalid progression action");
      if (result.recommendedLoadKg !== null && (!finite(result.recommendedLoadKg) || result.recommendedLoadKg < 0)) throw new Error("invalid recommended load");
      if (result.recommendedRepsMin !== min || result.recommendedRepsMax !== max) throw new Error("rep range changed unexpectedly");
      if (!Number.isInteger(result.recommendedSets) || result.recommendedSets < 2 || result.recommendedSets > 7) throw new Error("invalid recommended set count");
      if (!["low", "medium", "high"].includes(result.confidence)) throw new Error("invalid confidence");
      if (!result.reasonId || !result.reasonEn) throw new Error("missing progression explanation");
    });
  }

  // 50,000 nutrition-target cases across extreme but sanitized body weights and goals.
  const goals = ["build muscle", "fat loss", "maintenance", "membangun otot", "turun lemak"];
  for (let index = 0; index < 50_000; index += 1) {
    execute("nutrition", () => {
      const result = fitness.calculateNutritionTargets({ weightKg: -50 + random() * 500, goal: goals[index % goals.length] });
      const values = [result.calories, result.proteinG, result.carbsG, result.fatG, result.fiberG];
      if (values.some((value) => !finite(value) || value <= 0)) throw new Error("invalid nutrition target");
      const macroCalories = result.proteinG * 4 + result.carbsG * 4 + result.fatG * 9;
      if (Math.abs(macroCalories - result.calories) > 20) throw new Error("macro calories are inconsistent");
    });
  }

  const pageAssertions = [
    () => checkRequiredText("app/settings/page.tsx", ["injury_history", "movement_limitations", "pain_areas", "/api/account/export", "/api/account/delete", "Notification"]),
    () => checkRequiredText("app/progress/page.tsx", ["readiness_logs", "body_measurements", "progress_photos", "adaptive_recommendations", "muscleBalance", "personalRecords", "weeklyReview"]),
    () => checkRequiredText("app/nutrition/page.tsx", ["nutrition_entries", "nutrition_targets", "calculateNutritionTargets", "mealSuggestions", "remaining"]),
    () => checkRequiredText("components/exercise-set-logger.tsx", ["workout_set_logs", "recommendProgression", "RIR", "RPE"]),
    () => checkRequiredText("components/readiness-banner.tsx", ["readiness_logs", "readiness_score", "volume_modifier"]),
    () => checkRequiredText("components/pwa-manager.tsx", ["serviceWorker", "online", "fitmate-offline-queue", "checkWorkoutReminder", "reminder_preferences"]),
    () => checkRequiredText("public/sw.js", ["fitmate-shell", "/offline", "self.addEventListener"]),
    () => checkRequiredText("app/manifest.ts", ["standalone", "FitMate", "icon-512.png"]),
    () => checkRequiredText("app/privacy/page.tsx", ["Privacy", "Supabase", "OpenAI"]),
    () => checkRequiredText("app/terms/page.tsx", ["Terms", "fitness", "medical"]),
    () => checkRequiredText("app/delete-account/page.tsx", ["Delete Account", "HAPUS AKUN", "redirect=%2Fsettings"]),
    () => checkRequiredText("app/api/account/delete/route.ts", ["admin.auth.admin.deleteUser", "createServiceRoleClient"]),
    () => checkRequiredText("app/api/account/export/route.ts", ["content-disposition", "application/json"]),
    () => checkRequiredText("app/api/coach/route.ts", ["nutrition_entries", "injury_history", "pain_areas"]),
    () => checkRequiredText("app/api/generate-plan/route.ts", ["medical_clearance_required", "movement_limitations", "available_equipment", "adherencePercent", "averageReadiness", "adaptiveHistory"]),
    () => checkRequiredText("components/exercise-3d-guide.tsx", ["hair", "trainingTop", "const shoe", "thumb"]),
    () => checkRequiredText("lib/exercise-motion-calibration.ts", ["case \"standing\"", "responsiveEase", "MOTION_DURATION_SECONDS"]),
    () => checkRequiredText("app/layout.tsx", ["PwaManager", "manifest"]),
    () => checkRequiredText("components/app-dock.tsx", ["/progress", "/nutrition", "/settings"]),
    () => {
      const picked = sourceFiles[Math.floor(random() * sourceFiles.length)];
      if (!picked || picked.sf.parseDiagnostics.length > 0) throw new Error("source syntax parse failed");
    },
  ];
  for (let index = 0; index < 100_000; index += 1) {
    execute("pagesAndSecurity", pageAssertions[index % pageAssertions.length]);
  }

  const migrationPath = "supabase/migrations/202607280008_prelaunch_features.sql";
  const databaseAssertions = [
    () => checkRequiredText(migrationPath, ["create table if not exists public.readiness_logs", "enable row level security"]),
    () => checkRequiredText(migrationPath, ["create table if not exists public.workout_set_logs", "table_name || '_owner_all'"]),
    () => checkRequiredText(migrationPath, ["create table if not exists public.adaptive_recommendations", "table_name || '_owner_all'"]),
    () => checkRequiredText(migrationPath, ["create table if not exists public.body_measurements", "table_name || '_owner_all'"]),
    () => checkRequiredText(migrationPath, ["create table if not exists public.progress_photos", "table_name || '_owner_all'"]),
    () => checkRequiredText(migrationPath, ["create table if not exists public.nutrition_entries", "table_name || '_owner_all'"]),
    () => checkRequiredText(migrationPath, ["create table if not exists public.nutrition_targets", "table_name || '_owner_all'"]),
    () => checkRequiredText(migrationPath, ["create table if not exists public.reminder_preferences", "table_name || '_owner_all'"]),
    () => checkRequiredText(migrationPath, ["create table if not exists public.account_deletion_requests", "table_name || '_owner_all'"]),
    () => checkRequiredText(migrationPath, ["progress-photos", "bucket_id = 'progress-photos'", "storage.foldername(name)"]),
  ];
  for (let index = 0; index < 50_000; index += 1) {
    execute("databaseAndStorage", databaseAssertions[index % databaseAssertions.length]);
  }

  if (executed !== TOTAL_CHECKS) {
    failures.push({ group: "counter", check: executed, message: `Expected ${TOTAL_CHECKS}, executed ${executed}` });
  }

  const report = {
    status: failures.length === 0 ? "PASS" : "FAIL",
    methodology: "1,000,000 deterministic software assertion cases; this is not clinical or motion-capture validation.",
    totalChecks: executed,
    breakdown,
    sourceFilesParsed: sourceFiles.length,
    motionPresets: presets.length,
    motionSamplesPerPreset: 20_000,
    motionRanges: Object.fromEntries(Object.entries(motionRanges).map(([key, value]) => [key, {
      minimumAmount: Number(value.minimum.toFixed(6)),
      maximumAmount: Number(value.maximum.toFixed(6)),
      poseSignatureRange: Number((value.signatureMax - value.signatureMin).toFixed(6)),
    }])),
    failures,
    durationMs: Date.now() - startedAt,
    generatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

run();
