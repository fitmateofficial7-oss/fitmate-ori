#!/usr/bin/env node

const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const guidePath = path.join(projectRoot, "lib/exercise-guides.ts");
const motionPath = path.join(projectRoot, "lib/exercise-3d-motion.ts");
const canvasPath = path.join(projectRoot, "components/simple-exercise-3d-canvas.tsx");
const viewerPath = path.join(projectRoot, "components/exercise-3d-guide.tsx");
const previewPath = path.join(projectRoot, "components/exercise-3d-preview.tsx");

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
  if (!condition) throw new Error(message);
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
  const errors = (result.diagnostics || []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error
  );
  assert(
    errors.length === 0,
    errors.map((error) => ts.flattenDiagnosticMessageText(error.messageText, " ")).join(" | ")
  );
  const loaded = new Module(filePath, module);
  loaded.filename = filePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(filePath));
  loaded._compile(result.outputText, filePath);
  return loaded.exports;
}

function allFinitePose(pose) {
  return Object.values(pose).every(
    (point) => Array.isArray(point) && point.length === 3 && point.every(Number.isFinite)
  );
}

function run() {
  const startedAt = Date.now();
  const cycles = positiveIntegerArgument("cycles", 1000);
  const guideSource = fs.readFileSync(guidePath, "utf8");
  const motionSource = fs.readFileSync(motionPath, "utf8");
  const canvasSource = fs.readFileSync(canvasPath, "utf8");
  const viewerSource = fs.readFileSync(viewerPath, "utf8");
  const previewSource = fs.readFileSync(previewPath, "utf8");

  const {
    getExerciseGuide,
    getCanonicalExerciseName,
    CALIBRATED_EXERCISE_NAMES,
    SUPPORTED_3D_EXERCISE_COUNT,
  } = loadTypeScriptModule(guidePath);
  const { getExercise3DScene, SUPPORTED_3D_PRESETS } = loadTypeScriptModule(motionPath);

  assert(SUPPORTED_3D_EXERCISE_COUNT === 29, `Expected 29 3D guides, found ${SUPPORTED_3D_EXERCISE_COUNT}.`);
  assert(CALIBRATED_EXERCISE_NAMES.length === 29, "Expected 29 canonical exercise names.");
  assert(new Set(CALIBRATED_EXERCISE_NAMES).size === 29, "Canonical exercise names must be unique.");
  assert(SUPPORTED_3D_PRESETS.length === 30, "Expected 29 exercise presets plus standing fallback.");
  assert(new Set(SUPPORTED_3D_PRESETS).size === 30, "3D preset list must be unique.");

  assert(canvasSource.includes('getContext("webgl"') && canvasSource.includes("requestAnimationFrame"), "The guide must use a real animated WebGL canvas.");
  assert(canvasSource.includes("pointerdown") && canvasSource.includes("wheel"), "The 3D camera must support drag rotation and zoom.");
  assert(canvasSource.includes("drawCharacter") && canvasSource.includes("drawEquipment"), "The procedural character and equipment must render together.");
  assert(viewerSource.includes('"front"') && viewerSource.includes('"side"') && viewerSource.includes('"back"'), "Front, side, and back camera controls are required.");
  assert(viewerSource.includes('"animation"') && viewerSource.includes('"start"') && viewerSource.includes('"finish"'), "Animation, start, and finish modes are required.");
  assert(previewSource.includes("3D") && !previewSource.includes("ExercisePoseThumbnail"), "Exercise cards must use the lightweight 3D preview.");
  assert(!canvasSource.includes("GLTFLoader") && !canvasSource.includes("FBXLoader") && !canvasSource.includes('from "three"'), "The simple 3D character must not depend on external model files or Three.js.");
  assert(!guideSource.includes("model_3d_url"), "The guide resolver must not require database model URLs.");

  const presets = new Set();
  let deterministicChecks = 0;
  const sampleProgress = [0, 0.125, 0.25, 0.5, 0.75, 0.875, 1];

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    for (const [name, expectedPreset] of resolverChecks) {
      for (const language of ["id", "en"]) {
        const slug = name.toLowerCase().replaceAll(" ", "-");
        const guide = getExerciseGuide(slug, name, language);
        assert(guide.preset === expectedPreset, `${name} resolved to ${guide.preset}; expected ${expectedPreset}.`);
        assert(guide.phases.length === 3 && guide.phases.every((phase) => phase.trim()), `${name} must have three movement phases.`);
        assert(guide.equipmentSetup.length >= 3, `${name} must have equipment setup guidance.`);
        presets.add(guide.preset);

        for (const progress of sampleProgress) {
          const scene = getExercise3DScene(guide.preset, progress);
          assert(allFinitePose(scene.pose), `${name} produced a non-finite 3D pose at ${progress}.`);
          assert(Number.isFinite(scene.cameraDistance) && scene.cameraDistance > 0, `${name} has an invalid camera distance.`);
          deterministicChecks += 1;
        }
      }
      assert(getCanonicalExerciseName(name) === name, `${name} must remain canonical.`);
      deterministicChecks += 1;
    }
  }

  assert(presets.size === 29, `Expected 29 unique exercise presets, found ${presets.size}.`);
  for (const preset of presets) {
    assert(SUPPORTED_3D_PRESETS.includes(preset), `Missing 3D motion preset: ${preset}.`);
    assert(motionSource.includes(`"${preset}"`), `3D motion source is missing ${preset}.`);
  }

  const report = {
    status: "PASS",
    guideCount: SUPPORTED_3D_EXERCISE_COUNT,
    uniqueExercisePresets: presets.size,
    fallbackPreset: "standing",
    views: ["animation", "start", "finish"],
    cameraViews: ["front", "side", "back", "drag-360"],
    renderer: "native-webgl-procedural",
    externalModelFiles: false,
    threeJsDependency: false,
    cycles,
    deterministicChecks,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
  };
  const reportPath = path.join(projectRoot, "reports/exercise-3d-guide-audit.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

run();
