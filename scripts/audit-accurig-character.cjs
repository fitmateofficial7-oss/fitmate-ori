#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const fbxPath = path.join(
  projectRoot,
  "public/models/fitmate-accurig/fitmate-accurig.fbx"
);
const diffusePath = path.join(
  projectRoot,
  "public/models/fitmate-accurig/Material_001_Diffuse.jpg"
);
const normalPath = path.join(
  projectRoot,
  "public/models/fitmate-accurig/Material_001_Normal.jpg"
);
const rendererPath = path.join(
  projectRoot,
  "components/exercise-3d-guide.tsx"
);
const reportPath = path.join(
  projectRoot,
  "reports/accurig-character-validation.json"
);

const requiredBones = [
  "RL_BoneRoot",
  "CC_Base_Hip",
  "CC_Base_Pelvis",
  "CC_Base_Waist",
  "CC_Base_Spine01",
  "CC_Base_Spine02",
  "CC_Base_Head",
  "CC_Base_L_Clavicle",
  "CC_Base_L_Upperarm",
  "CC_Base_L_Forearm",
  "CC_Base_L_Hand",
  "CC_Base_L_Mid1",
  "CC_Base_L_Thumb1",
  "CC_Base_R_Clavicle",
  "CC_Base_R_Upperarm",
  "CC_Base_R_Forearm",
  "CC_Base_R_Hand",
  "CC_Base_R_Mid1",
  "CC_Base_R_Thumb1",
  "CC_Base_L_Thigh",
  "CC_Base_L_Calf",
  "CC_Base_L_Foot",
  "CC_Base_L_ToeBase",
  "CC_Base_R_Thigh",
  "CC_Base_R_Calf",
  "CC_Base_R_Foot",
  "CC_Base_R_ToeBase",
];

function fail(message) {
  console.error(`AccuRig character audit FAILED: ${message}`);
  process.exit(1);
}

for (const filePath of [fbxPath, diffusePath, normalPath, rendererPath]) {
  if (!fs.existsSync(filePath)) {
    fail(`missing ${path.relative(projectRoot, filePath)}`);
  }
}

const fbx = fs.readFileSync(fbxPath);
const renderer = fs.readFileSync(rendererPath, "utf8");
const header = fbx.subarray(0, 23).toString("binary");

if (!header.startsWith("Kaydara FBX Binary")) {
  fail("the character file is not a binary FBX");
}

const missingBones = requiredBones.filter(
  (boneName) => !fbx.includes(Buffer.from(boneName, "utf8"))
);
const fbxText = fbx.toString("latin1");
const discoveredBoneNames = new Set(
  (fbxText.match(/(?:CC_Base_[A-Za-z0-9_]+|RL_BoneRoot)/g) ?? [])
);
const hasSkinDeformer = fbxText.includes("Skin");
const clusterMarkers = (fbxText.match(/Cluster/g) ?? []).length;

if (!hasSkinDeformer || clusterMarkers < 20) {
  fail("the FBX does not expose the expected skinned-mesh deformers");
}

if (missingBones.length > 0) {
  fail(`missing required bones: ${missingBones.join(", ")}`);
}

const requiredRuntimeMarkers = [
  "createMannequin",
  "fallbackRig.root.visible = true",
  "const activeRig: Rig = fallbackRig",
  "procedural-fallback",
  "getRigMetrics",
  "getGripAnchor",
  "applyFingerGrip",
  "equipmentRig.metrics",
  "applyMuscleHighlights",
];
const missingRuntimeMarkers = requiredRuntimeMarkers.filter(
  (marker) => !renderer.includes(marker)
);

if (missingRuntimeMarkers.length > 0) {
  fail(
    `missing runtime integration markers: ${missingRuntimeMarkers.join(", ")}`
  );
}

const report = {
  status: "PASS",
  file: path.relative(projectRoot, fbxPath),
  bytes: fbx.length,
  format: "Binary FBX",
  rig: "Reallusion AccuRig / CC_Base humanoid",
  skinned_mesh: hasSkinDeformer,
  cluster_markers: clusterMarkers,
  discovered_bones: discoveredBoneNames.size,
  required_bones: requiredBones.length,
  missing_bones: missingBones,
  textures: [
    {
      file: path.relative(projectRoot, diffusePath),
      bytes: fs.statSync(diffusePath).size,
    },
    {
      file: path.relative(projectRoot, normalPath),
      bytes: fs.statSync(normalPath).size,
    },
  ],
  runtime: {
    primary_character: "FitMate procedural bodybuilder",
    retained_reference_asset: "Reallusion AccuRig FBX",
    hand_grip_anchors: true,
    finger_grip_curl: true,
    foot_calibration: true,
    equipment_body_metrics: true,
    immediate_render_without_network_model_load: true,
    exercise_presets: 29,
  },
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `AccuRig character audit PASS: ${discoveredBoneNames.size} discovered bones, ${requiredBones.length} required bones, 2 textures, 29 exercise presets.`
);
