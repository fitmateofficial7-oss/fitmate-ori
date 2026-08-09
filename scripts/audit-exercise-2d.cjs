#!/usr/bin/env node

const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const guidePath = path.join(projectRoot, "lib/exercise-guides.ts");
const diagramPath = path.join(
  projectRoot,
  "components/exercise-pose-thumbnail.tsx"
);
const viewerPath = path.join(
  projectRoot,
  "components/exercise-2d-guide.tsx"
);

const resolverChecks = [
  ["Barbell Bench Press", "bench-press"],
  ["Incline Dumbbell Press", "incline-press"],
  ["Lat Pulldown", "lat-pulldown"],
  ["Seated Cable Row", "seated-row"],
  ["Barbell Back Squat", "back-squat"],
  ["Leg Press", "leg-press"],
  ["Romanian Deadlift", "romanian-deadlift"],
  ["Bulgarian Split Squat", "split-squat"],
  ["Dumbbell Shoulder Press", "shoulder-press"],
  ["Dumbbell Lateral Raise", "lateral-raise"],
  ["Barbell Curl", "barbell-curl"],
  ["Hammer Curl", "hammer-curl"],
  ["Rope Triceps Pushdown", "triceps-pushdown"],
  ["Cable Crunch", "cable-crunch"],
  ["Machine Chest Press", "machine-press"],
  ["Pec Deck Fly", "pec-deck"],
  ["Assisted Pull-Up", "assisted-pull-up"],
  ["Hack Squat Machine", "hack-squat"],
  ["Leg Extension Machine", "leg-extension"],
  ["Seated Leg Curl Machine", "leg-curl"],
  ["Hip Thrust Machine", "hip-thrust"],
  ["Standing Calf Raise Machine", "calf-raise"],
  ["Preacher Curl Machine", "preacher-curl"],
  ["Assisted Dip Machine", "assisted-dip"],
  ["Ab Crunch Machine", "ab-crunch"],
  ["Ab Wheel Rollout", "ab-wheel-rollout"],
  ["Alternating Dumbbell Curl", "alternating-curl"],
  ["Treadmill Walk", "treadmill-walk"],
  ["Plank", "plank"],
];

function positiveIntegerArgument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer.`);
  }

  return value;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadTypeScriptModule(filePath) {
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

  assert(
    syntaxErrors.length === 0,
    syntaxErrors
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")
      )
      .join(" | ")
  );

  const loaded = new Module(filePath, module);
  loaded.filename = filePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(filePath));
  loaded._compile(result.outputText, filePath);
  return loaded.exports;
}

function run() {
  const startedAt = Date.now();
  const cycles = positiveIntegerArgument("cycles", 1000);
  const guideSource = fs.readFileSync(guidePath, "utf8");
  const diagramSource = fs.readFileSync(diagramPath, "utf8");
  const viewerSource = fs.readFileSync(viewerPath, "utf8");
  const {
    getExerciseGuide,
    getCanonicalExerciseName,
    CALIBRATED_EXERCISE_NAMES,
    SUPPORTED_2D_EXERCISE_COUNT,
  } = loadTypeScriptModule(guidePath);

  assert(
    SUPPORTED_2D_EXERCISE_COUNT === 29,
    `Expected 29 2D guides, found ${SUPPORTED_2D_EXERCISE_COUNT}.`
  );
  assert(
    CALIBRATED_EXERCISE_NAMES.length === 29,
    `Expected 29 canonical names, found ${CALIBRATED_EXERCISE_NAMES.length}.`
  );
  assert(
    new Set(CALIBRATED_EXERCISE_NAMES).size === 29,
    "Canonical exercise names must be unique."
  );
  assert(
    diagramSource.includes('mode?: "comparison" | "start" | "finish"') &&
      diagramSource.includes("<Equipment") &&
      diagramSource.includes("<Figure"),
    "The SVG diagram must expose comparison, start, and finish views with equipment."
  );
  assert(
    viewerSource.includes("ExercisePoseThumbnail") &&
      viewerSource.includes("guide.phases.map") &&
      viewerSource.includes("guide.motionLabel"),
    "The 2D viewer must combine the diagram with the written movement stages."
  );
  assert(
    !viewerSource.includes("WebGL") &&
      !viewerSource.includes("three") &&
      !guideSource.includes("model_3d_url"),
    "The 2D guide must not depend on WebGL or a 3D model."
  );

  const presets = new Set();
  let deterministicChecks = 0;

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    for (const [name, expectedPreset] of resolverChecks) {
      for (const language of ["id", "en"]) {
        const slug = name.toLowerCase().replaceAll(" ", "-");
        const guide = getExerciseGuide(slug, name, language);

        assert(
          guide.preset === expectedPreset,
          `${name} resolved to ${guide.preset}; expected ${expectedPreset}.`
        );
        assert(
          guide.phases.length === 3 &&
            guide.phases.every((phase) => phase.trim().length > 0),
          `${name} must have three non-empty movement phases.`
        );
        assert(
          guide.equipmentSetup.length >= 3 &&
            guide.equipmentSetup.every((step) => step.trim().length > 0),
          `${name} must have at least three equipment setup steps.`
        );
        assert(
          guide.motionLabel.trim().length > 0 &&
            guide.formFocus.trim().length > 0,
          `${name} must have a motion label and form focus.`
        );
        presets.add(guide.preset);
        deterministicChecks += 1;
      }

      assert(
        getCanonicalExerciseName(name) === name,
        `${name} must remain canonical.`
      );
      deterministicChecks += 1;
    }
  }

  assert(presets.size === 29, `Expected 29 unique 2D presets, found ${presets.size}.`);
  for (const preset of presets) {
    assert(
      diagramSource.includes(`"${preset}"`),
      `The SVG pose catalog is missing preset ${preset}.`
    );
  }

  const report = {
    status: "PASS",
    guideCount: SUPPORTED_2D_EXERCISE_COUNT,
    uniquePresets: presets.size,
    views: ["comparison", "start", "finish"],
    languages: ["id", "en"],
    cycles,
    deterministicChecks,
    webglDependency: false,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };
  const reportPath = path.join(
    projectRoot,
    "reports/exercise-2d-guide-audit.json"
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

run();
