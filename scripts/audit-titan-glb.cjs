const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const modelRelativePath =
  "public/models/titan-physique-rigged-ultra-precision.glb";
const modelPath = path.join(projectRoot, modelRelativePath);
const reportPath = path.join(
  projectRoot,
  "reports/bodybuilder-glb-validation.json"
);

const REQUIRED_NODES = [
  "Armature",
  "Hips",
  "Spine",
  "Spine1",
  "Spine2",
  "Neck",
  "Head",
  "LeftArm",
  "LeftForeArm",
  "LeftHand",
  "RightArm",
  "RightForeArm",
  "RightHand",
  "LeftUpLeg",
  "LeftLeg",
  "LeftFoot",
  "RightUpLeg",
  "RightLeg",
  "RightFoot",
  "Titan_Physique_Rigged_Ultra_Precision",
];
const REQUIRED_ANIMATIONS = [
  "Idle_Breath",
  "Rig_Check_Arms",
  "Rig_Check_Legs",
  "Rig_Check_Fingers",
];
const TARGET_RUNTIME_HEIGHT = 4.72469839;

function fail(message) {
  throw new Error(`Titan GLB audit failed: ${message}`);
}

function readGlbJson(buffer) {
  if (buffer.length < 20) {
    fail("file is too small to be a valid GLB");
  }

  if (buffer.toString("ascii", 0, 4) !== "glTF") {
    fail("invalid GLB magic header");
  }

  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);
  if (version !== 2) {
    fail(`expected GLB version 2, received ${version}`);
  }
  if (declaredLength !== buffer.length) {
    fail(
      `declared byte length ${declaredLength} does not match ${buffer.length}`
    );
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    offset += 8;
    const end = offset + chunkLength;
    if (end > buffer.length) {
      fail("chunk extends past the end of the file");
    }

    if (chunkType === 0x4e4f534a) {
      const jsonText = buffer
        .toString("utf8", offset, end)
        .replace(/[\u0000\s]+$/u, "");
      return JSON.parse(jsonText);
    }
    offset = end;
  }

  fail("JSON chunk was not found");
}

function getMeshBounds(document) {
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];

  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const positionAccessorIndex = primitive.attributes?.POSITION;
      if (!Number.isInteger(positionAccessorIndex)) {
        continue;
      }
      const accessor = document.accessors?.[positionAccessorIndex];
      if (!accessor?.min || !accessor?.max) {
        continue;
      }
      for (let axis = 0; axis < 3; axis += 1) {
        minimum[axis] = Math.min(minimum[axis], accessor.min[axis]);
        maximum[axis] = Math.max(maximum[axis], accessor.max[axis]);
      }
    }
  }

  if (!minimum.every(Number.isFinite) || !maximum.every(Number.isFinite)) {
    fail("POSITION accessor bounds are missing");
  }

  return [minimum, maximum];
}

function run() {
  if (!fs.existsSync(modelPath)) {
    fail(`${modelRelativePath} does not exist`);
  }

  const buffer = fs.readFileSync(modelPath);
  const document = readGlbJson(buffer);
  const nodeNames = new Set(
    (document.nodes ?? []).map((node) => node.name).filter(Boolean)
  );
  const animationNames = new Set(
    (document.animations ?? [])
      .map((animation) => animation.name)
      .filter(Boolean)
  );
  const missingNodes = REQUIRED_NODES.filter(
    (name) => !nodeNames.has(name)
  );
  const missingAnimations = REQUIRED_ANIMATIONS.filter(
    (name) => !animationNames.has(name)
  );

  if (missingNodes.length > 0) {
    fail(`missing required nodes: ${missingNodes.join(", ")}`);
  }
  if (missingAnimations.length > 0) {
    fail(
      `missing required animations: ${missingAnimations.join(", ")}`
    );
  }
  if ((document.skins ?? []).length !== 1) {
    fail(`expected one humanoid skin, found ${(document.skins ?? []).length}`);
  }
  if ((document.meshes ?? []).length !== 1) {
    fail(`expected one skinned mesh, found ${(document.meshes ?? []).length}`);
  }

  const bounds = getMeshBounds(document);
  const sourceHeight = bounds[1][1] - bounds[0][1];
  if (sourceHeight <= 0) {
    fail("mesh height is not positive");
  }

  const skinJointCount = document.skins[0].joints?.length ?? 0;
  if (skinJointCount < 60) {
    fail(`expected a detailed humanoid rig, found ${skinJointCount} joints`);
  }

  const report = {
    status: "PASS",
    file: modelRelativePath,
    bytes: buffer.length,
    format: "glTF 2.0 binary (.glb)",
    generator: document.asset?.generator ?? null,
    scene: document.scenes?.[document.scene ?? 0]?.name ?? null,
    nodes: document.nodes?.length ?? 0,
    meshes: document.meshes?.length ?? 0,
    skins: document.skins?.length ?? 0,
    skin_joints: skinJointCount,
    materials: document.materials?.length ?? 0,
    textures: document.textures?.length ?? 0,
    source_bounds: bounds,
    source_height: sourceHeight,
    runtime_target_height: TARGET_RUNTIME_HEIGHT,
    runtime_normalization_scale:
      TARGET_RUNTIME_HEIGHT / sourceHeight,
    required_nodes: REQUIRED_NODES,
    missing_nodes: missingNodes,
    animations: [...animationNames],
    required_animations: REQUIRED_ANIMATIONS,
    missing_animations: missingAnimations,
    primary_use:
      "FitMate procedural animation source for every calibrated exercise guide",
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `PASS Titan GLB: ${report.nodes} nodes, ${skinJointCount} joints, ` +
      `${report.animations.length} clips, scale ${report.runtime_normalization_scale.toFixed(6)}`
  );
}

run();
