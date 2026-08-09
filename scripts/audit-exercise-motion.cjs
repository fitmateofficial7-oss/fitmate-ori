#!/usr/bin/env node

const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const motionPath = path.join(
  projectRoot,
  "lib",
  "exercise-motion-calibration.ts"
);
const guidePath = path.join(
  projectRoot,
  "lib",
  "exercise-3d-guides.ts"
);
const rendererPath = path.join(
  projectRoot,
  "components",
  "exercise-3d-guide.tsx"
);
const vectorKeys = [
  "leftUpperArm",
  "rightUpperArm",
  "leftForearm",
  "rightForearm",
  "leftThigh",
  "rightThigh",
  "leftShin",
  "rightShin",
];
const numberKeys = [
  "rootX",
  "rootY",
  "rootZ",
  "rootRotationX",
  "rootRotationY",
  "rootRotationZ",
  "torsoX",
  "torsoZ",
  "torsoScaleX",
  "torsoScaleY",
  "torsoScaleZ",
];
const fixedFootPresets = new Set([
  "back-squat",
  "split-squat",
  "hack-squat",
  "hip-thrust",
  "plank",
]);

function getArgument(name, fallback) {
  const flagIndex = process.argv.indexOf(`--${name}`);
  const value =
    flagIndex >= 0 ? Number(process.argv[flagIndex + 1]) : fallback;

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer.`);
  }

  return value;
}

function loadTypeScriptModule(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;
  const loaded = new Module(filePath, module);

  loaded.filename = filePath;
  loaded.paths = Module._nodeModulePaths(path.dirname(filePath));
  loaded._compile(output, filePath);

  return loaded.exports;
}

function add(left, right) {
  return [
    left[0] + right[0],
    left[1] + right[1],
    left[2] + right[2],
  ];
}

function scale(vector, amount) {
  return [
    vector[0] * amount,
    vector[1] * amount,
    vector[2] * amount,
  ];
}

function distance(left, right) {
  return Math.hypot(
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2]
  );
}

function subtract(left, right) {
  return [
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  ];
}

function dot(left, right) {
  return (
    left[0] * right[0] +
    left[1] * right[1] +
    left[2] * right[2]
  );
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function normalize(vector) {
  const length = Math.hypot(...vector) || 1;

  return vector.map((value) => value / length);
}

function rotate(vector, rotationX, rotationY, rotationZ) {
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const afterX = [
    vector[0],
    vector[1] * cosX - vector[2] * sinX,
    vector[1] * sinX + vector[2] * cosX,
  ];
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const afterY = [
    afterX[0] * cosY + afterX[2] * sinY,
    afterX[1],
    -afterX[0] * sinY + afterX[2] * cosY,
  ];
  const cosZ = Math.cos(rotationZ);
  const sinZ = Math.sin(rotationZ);

  return [
    afterY[0] * cosZ - afterY[1] * sinZ,
    afterY[0] * sinZ + afterY[1] * cosZ,
    afterY[2],
  ];
}

function rootPoint(pose, localPoint) {
  return add(
    [pose.rootX, pose.rootY, pose.rootZ],
    rotate(
      localPoint,
      pose.rootRotationX,
      pose.rootRotationY,
      pose.rootRotationZ
    )
  );
}

function torsoPoint(pose, localPoint) {
  return rootPoint(
    pose,
    add(
      [0, 2.12, 0],
      rotate(
        [
          localPoint[0] * pose.torsoScaleX,
          localPoint[1] * pose.torsoScaleY,
          localPoint[2] * pose.torsoScaleZ,
        ],
        pose.torsoX,
        0,
        pose.torsoZ
      )
    )
  );
}

function hipPoint(pose, side) {
  return rootPoint(pose, [side * 0.29, 2, 0]);
}

function shoulderPoint(pose, side) {
  return torsoPoint(pose, [side * 0.72, 1.25, 0]);
}

function kneePoint(pose, side) {
  return add(
    hipPoint(pose, side),
    scale(
      side === -1 ? pose.leftThigh : pose.rightThigh,
      1.08
    )
  );
}

function elbowPoint(pose, side) {
  return add(
    shoulderPoint(pose, side),
    scale(
      side === -1
        ? pose.leftUpperArm
        : pose.rightUpperArm,
      0.82
    )
  );
}

function limbEnd(start, first, second, firstLength, secondLength) {
  return add(
    add(start, scale(first, firstLength)),
    scale(second, secondLength)
  );
}

function footPoint(pose, side) {
  return limbEnd(
    hipPoint(pose, side),
    side === -1 ? pose.leftThigh : pose.rightThigh,
    side === -1 ? pose.leftShin : pose.rightShin,
    1.08,
    1.02
  );
}

function handPoint(pose, side) {
  return limbEnd(
    shoulderPoint(pose, side),
    side === -1 ? pose.leftUpperArm : pose.rightUpperArm,
    side === -1 ? pose.leftForearm : pose.rightForearm,
    0.82,
    0.76
  );
}

function sceneFocus(preset) {
  if (preset === "bench-press") {
    return [0, 1.32, -2.25];
  }

  if (preset === "incline-press") {
    return [0, 1.65, -0.85];
  }

  if (preset === "plank") {
    return [0, 1.1, -1.65];
  }

  if (preset === "leg-press" || preset === "hack-squat") {
    return [0, 1.65, -0.2];
  }

  if (preset === "hip-thrust") {
    return [0, 1.2, 0.35];
  }

  return [0, 2.05, 0];
}

function projectToDefaultCamera(preset, point) {
  const focus = sceneFocus(preset);
  const camera = add(focus, [6.3, 2.45, 7.2]);
  const forward = normalize(subtract(focus, camera));
  const right = normalize(cross(forward, [0, 1, 0]));
  const cameraUp = normalize(cross(right, forward));
  const relative = subtract(point, camera);
  const depth = Math.max(0.01, dot(relative, forward));
  const halfHeight =
    depth * Math.tan((38 * Math.PI) / 360);
  const halfWidth = halfHeight * (16 / 9);

  return [
    dot(relative, right) / halfWidth,
    dot(relative, cameraUp) / halfHeight,
  ];
}

function poseLandmarks(pose) {
  return [
    torsoPoint(pose, [0, 1.89, 0]),
    rootPoint(pose, [0, 2.08, 0]),
    shoulderPoint(pose, -1),
    shoulderPoint(pose, 1),
    elbowPoint(pose, -1),
    elbowPoint(pose, 1),
    handPoint(pose, -1),
    handPoint(pose, 1),
    kneePoint(pose, -1),
    kneePoint(pose, 1),
    footPoint(pose, -1),
    footPoint(pose, 1),
  ];
}

function projectedPoseMotion(preset, leftPose, rightPose) {
  const left = poseLandmarks(leftPose).map((point) =>
    projectToDefaultCamera(preset, point)
  );
  const right = poseLandmarks(rightPose).map((point) =>
    projectToDefaultCamera(preset, point)
  );

  return Math.max(
    ...left.map((point, index) =>
      Math.hypot(
        point[0] - right[index][0],
        point[1] - right[index][1]
      )
    )
  );
}

function vectorAngle(left, right) {
  const leftLength = Math.hypot(...left) || 1;
  const rightLength = Math.hypot(...right) || 1;
  const dot =
    (left[0] * right[0] +
      left[1] * right[1] +
      left[2] * right[2]) /
    (leftLength * rightLength);

  return (
    (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) /
    Math.PI
  );
}

function assertWithin(value, maximum, label) {
  if (value > maximum) {
    throw new Error(
      `${label}: ${value.toFixed(6)} exceeds ${maximum.toFixed(6)}.`
    );
  }
}

function assertSemantic(condition, label) {
  if (!condition) {
    throw new Error(`Movement semantics failed: ${label}.`);
  }
}

function getGuideInventory(source) {
  const primarySection = source.slice(
    source.indexOf("const GUIDES"),
    source.indexOf("const ENGLISH_GUIDES")
  );
  const entries = [
    ...primarySection.matchAll(
      /^\s{2}(?:"([^"]+)"|([a-z][a-z0-9-]*)):\s*\{\s*\n\s*slug:\s*"([^"]+)",\s*\n\s*preset:\s*"([^"]+)"/gm
    ),
  ].map((match) => ({
    key: match[1] || match[2],
    slug: match[3],
    preset: match[4],
  }));

  return entries;
}

function verifyMovementSemantics(getPose) {
  const pose = (preset, amount) => getPose(preset, amount);
  const bend = (preset, amount, firstKey, secondKey) =>
    vectorAngle(
      pose(preset, amount)[firstKey],
      pose(preset, amount)[secondKey]
    );
  const startWalk = pose("treadmill-walk", 0);
  const endWalk = pose("treadmill-walk", 1);
  const handSpacing = (preset, amount) =>
    distance(
      handPoint(pose(preset, amount), -1),
      handPoint(pose(preset, amount), 1)
    );
  const checks = [
    [
      bend(
        "bench-press",
        0,
        "leftUpperArm",
        "leftForearm"
      ) > 110 &&
        bend(
          "bench-press",
          1,
          "leftUpperArm",
          "leftForearm"
        ) < 20,
      "Barbell Bench Press extends the elbows vertically",
    ],
    [
      bend(
        "incline-press",
        0,
        "leftUpperArm",
        "leftForearm"
      ) > 100 &&
        bend(
          "incline-press",
          1,
          "leftUpperArm",
          "leftForearm"
        ) < 20,
      "Incline Dumbbell Press follows an inclined pressing path",
    ],
    [
      bend(
        "lat-pulldown",
        0,
        "leftUpperArm",
        "leftForearm"
      ) < 35 &&
        bend(
          "lat-pulldown",
          1,
          "leftUpperArm",
          "leftForearm"
        ) > 110 &&
        handPoint(pose("lat-pulldown", 0), -1)[1] -
          handPoint(pose("lat-pulldown", 1), -1)[1] >
          0.9,
      "Lat Pulldown pulls the bar from overhead toward the chest",
    ],
    [
      bend(
        "seated-row",
        0,
        "leftUpperArm",
        "leftForearm"
      ) < 65 &&
        bend(
          "seated-row",
          1,
          "leftUpperArm",
          "leftForearm"
        ) > 90,
      "Seated Cable Row draws the elbows behind the torso",
    ],
    [
      bend("back-squat", 0, "leftThigh", "leftShin") < 20 &&
        bend("back-squat", 1, "leftThigh", "leftShin") > 65,
      "Back Squat bends the knees during descent",
    ],
    [
      bend("leg-press", 0, "leftThigh", "leftShin") > 80 &&
        bend("leg-press", 1, "leftThigh", "leftShin") < 20,
      "Leg Press extends the knees",
    ],
    [
      Math.abs(
        pose("romanian-deadlift", 1).torsoX -
          pose("romanian-deadlift", 0).torsoX
      ) > 0.8,
      "Romanian Deadlift hinges at the hips",
    ],
    [
      pose("split-squat", 0).rootY -
          pose("split-squat", 1).rootY >
          0.35 &&
        bend(
          "split-squat",
          1,
          "leftThigh",
          "leftShin"
        ) >
          bend(
            "split-squat",
            0,
            "leftThigh",
            "leftShin"
          ) +
            35,
      "Bulgarian Split Squat lowers on the front leg",
    ],
    [
      bend(
        "shoulder-press",
        0,
        "leftUpperArm",
        "leftForearm"
      ) > 100 &&
        bend(
          "shoulder-press",
          1,
          "leftUpperArm",
          "leftForearm"
        ) < 40,
      "Dumbbell Shoulder Press extends overhead",
    ],
    [
      vectorAngle(
        pose("lateral-raise", 0).leftUpperArm,
        pose("lateral-raise", 1).leftUpperArm
      ) > 75,
      "Dumbbell Lateral Raise abducts both arms",
    ],
    [
      bend(
        "barbell-curl",
        0,
        "leftUpperArm",
        "leftForearm"
      ) < 25 &&
        bend(
          "barbell-curl",
          1,
          "leftUpperArm",
          "leftForearm"
        ) > 110,
      "Barbell Curl flexes both elbows",
    ],
    [
      bend(
        "hammer-curl",
        0,
        "leftUpperArm",
        "leftForearm"
      ) < 25 &&
        bend(
          "hammer-curl",
          1,
          "leftUpperArm",
          "leftForearm"
        ) > 110,
      "Hammer Curl flexes the elbows with a neutral grip",
    ],
    [
      bend("leg-extension", 0, "leftThigh", "leftShin") > 65 &&
        bend("leg-extension", 1, "leftThigh", "leftShin") < 20,
      "Leg Extension isolates knee extension",
    ],
    [
      bend("leg-curl", 0, "leftThigh", "leftShin") < 20 &&
        bend("leg-curl", 1, "leftThigh", "leftShin") > 75,
      "Leg Curl flexes the knees",
    ],
    [
      bend(
        "triceps-pushdown",
        0,
        "leftUpperArm",
        "leftForearm"
      ) > 75 &&
        bend(
          "triceps-pushdown",
          1,
          "leftUpperArm",
          "leftForearm"
        ) < 40,
      "Triceps Pushdown extends the elbows",
    ],
    [
      Math.abs(
        pose("cable-crunch", 1).torsoX -
          pose("cable-crunch", 0).torsoX
      ) > 0.7,
      "Cable Crunch flexes the torso",
    ],
    [
      bend(
        "machine-press",
        0,
        "leftUpperArm",
        "leftForearm"
      ) > 75 &&
        bend(
          "machine-press",
          1,
          "leftUpperArm",
          "leftForearm"
        ) < 35,
      "Machine Chest Press extends the elbows",
    ],
    [
      handSpacing("pec-deck", 0) -
          handSpacing("pec-deck", 1) >
        1.2,
      "Pec Deck Fly brings both arms together in front of the chest",
    ],
    [
      pose("assisted-pull-up", 1).rootY -
          pose("assisted-pull-up", 0).rootY >
        1,
      "Assisted Pull-Up raises the body toward fixed handles",
    ],
    [
      pose("hack-squat", 0).rootY -
          pose("hack-squat", 1).rootY >
          0.4 &&
        bend(
          "hack-squat",
          1,
          "leftThigh",
          "leftShin"
        ) > 60,
      "Hack Squat lowers the sled while flexing the knees",
    ],
    [
      distance(
        [
          pose("hip-thrust", 0).rootX,
          pose("hip-thrust", 0).rootY,
          pose("hip-thrust", 0).rootZ,
        ],
        [
          pose("hip-thrust", 1).rootX,
          pose("hip-thrust", 1).rootY,
          pose("hip-thrust", 1).rootZ,
        ]
      ) > 0.8,
      "Hip Thrust raises the hips",
    ],
    [
      pose("calf-raise", 1).rootY -
          pose("calf-raise", 0).rootY >
        0.18,
      "Standing Calf Raise visibly raises the heels and body",
    ],
    [
      bend(
        "preacher-curl",
        0,
        "leftUpperArm",
        "leftForearm"
      ) < 20 &&
        bend(
          "preacher-curl",
          1,
          "leftUpperArm",
          "leftForearm"
        ) > 120,
      "Preacher Curl flexes the elbows on the support pad",
    ],
    [
      bend(
        "assisted-dip",
        0,
        "leftUpperArm",
        "leftForearm"
      ) > 60 &&
        bend(
          "assisted-dip",
          1,
          "leftUpperArm",
          "leftForearm"
        ) < 20 &&
        pose("assisted-dip", 1).rootY >
          pose("assisted-dip", 0).rootY,
      "Assisted Dip extends the elbows and raises the body",
    ],
    [
      Math.abs(
        pose("ab-crunch", 1).torsoX -
          pose("ab-crunch", 0).torsoX
      ) > 0.7,
      "Ab Crunch Machine flexes the torso against the pad",
    ],
    [
      vectorAngle(
        startWalk.leftThigh,
        endWalk.leftThigh
      ) > 35 &&
        vectorAngle(
          startWalk.rightThigh,
          endWalk.rightThigh
        ) > 35,
      "Treadmill Walk alternates both legs",
    ],
    [
      Math.abs(
        pose("ab-wheel-rollout", 1).torsoX -
          pose("ab-wheel-rollout", 0).torsoX
      ) > 0.35 &&
        distance(
          handPoint(pose("ab-wheel-rollout", 0), -1),
          handPoint(pose("ab-wheel-rollout", 1), -1)
        ) > 0.45,
      "Ab Wheel Rollout extends the braced torso and moves the wheel forward",
    ],
    [
      bend(
        "alternating-curl",
        0,
        "leftUpperArm",
        "leftForearm"
      ) > 100 &&
        bend(
          "alternating-curl",
          1,
          "leftUpperArm",
          "leftForearm"
        ) < 25 &&
        bend(
          "alternating-curl",
          0,
          "rightUpperArm",
          "rightForearm"
        ) < 25 &&
        bend(
          "alternating-curl",
          1,
          "rightUpperArm",
          "rightForearm"
        ) > 100,
      "Alternating Dumbbell Curl visibly switches sides",
    ],
    [
      pose("plank", 1).torsoScaleZ -
          pose("plank", 0).torsoScaleZ >
          0.04 &&
        Math.abs(
          pose("plank", 0).rootY - pose("plank", 1).rootY
        ) < 0.000001,
      "Plank remains an isometric hold while showing a breathing cue",
    ],
  ];

  for (const [condition, label] of checks) {
    assertSemantic(condition, label);
  }

  return checks.length;
}

function run() {
  const cycles = getArgument("cycles", 1000);
  // Keep at least 1,000 distinct calibration points per preset while
  // avoiding duplicate millions-of-pose work when cycles is already 1,000.
  const samplesPerPreset = Math.max(
    1,
    Math.ceil(1000 / Math.max(1, cycles))
  );
  const guideSource = fs.readFileSync(guidePath, "utf8");
  const rendererSource = fs.readFileSync(rendererPath, "utf8");
  const guideInventory = getGuideInventory(guideSource);
  const presetInventory = guideInventory.map(({ preset }) => preset);
  const uniquePresets = [...new Set(presetInventory)];
  const {
    getExercise3DGuide,
    getCanonicalExerciseName,
    CALIBRATED_EXERCISE_NAMES,
  } =
    loadTypeScriptModule(guidePath);
  const {
    getCalibratedPose,
    getCalibratedMotionAmount,
  } =
    loadTypeScriptModule(motionPath);

  assertSemantic(
    guideInventory.length === 29,
    `expected 29 calibrated guides, found ${guideInventory.length}`
  );
  assertSemantic(
    uniquePresets.length === 29,
    `expected 29 unique presets, found ${uniquePresets.length}`
  );
  assertSemantic(
    rendererSource.includes("createMannequin()") &&
      rendererSource.includes("equipmentRig.metrics = getRigMetrics(fallbackRig)") &&
      rendererSource.includes("applyCalibratedPose(") &&
      rendererSource.includes("placeEquipment(") &&
      rendererSource.includes('>("procedural-fallback")') &&
      rendererSource.includes("fallbackRig.root.visible = true"),
    "all exercise guides animate the built-in FitMate procedural rig as the primary model with calibrated equipment placement"
  );
  assertSemantic(
    rendererSource.includes(
      "window.requestAnimationFrame(animate)"
    ) &&
      rendererSource.includes(
        "elapsedRef.current += delta * speedRef.current"
      ),
    "the browser render loop advances every playing frame"
  );
  assertSemantic(
    !rendererSource.includes(
      'playingRef.current = false'
    ),
    "instructional exercise motion is not silently disabled by reduced-motion preferences"
  );
  assertSemantic(
    !rendererSource.includes("motionProgressRef") &&
      rendererSource.includes("webglcontextlost"),
    "the guide omits distracting motion-progress chrome and detects frozen WebGL contexts"
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

  for (const [name, expectedPreset] of resolverChecks) {
    const resolved = getExercise3DGuide(
      name.toLowerCase().replaceAll(" ", "-"),
      name,
      "en"
    );
    assertSemantic(
      resolved.preset === expectedPreset,
      `${name} resolves to ${expectedPreset}, received ${resolved.preset}`
    );
    assertSemantic(
      getCanonicalExerciseName(name) === name,
      `${name} remains canonical after server normalization`
    );
  }
  assertSemantic(
    CALIBRATED_EXERCISE_NAMES.length === 29,
    `expected 29 canonical exercise names, found ${CALIBRATED_EXERCISE_NAMES.length}`
  );
  const aliasResolverChecks = [
    ["Dumbbell Biceps Curl", "Alternating Dumbbell Curl"],
    ["Walking Lunge", "Bulgarian Split Squat"],
    ["RDL", "Romanian Deadlift"],
  ];

  for (const [alias, canonicalName] of aliasResolverChecks) {
    assertSemantic(
      getCanonicalExerciseName(alias) === canonicalName,
      `${alias} normalizes to ${canonicalName}`
    );
  }

  let maximumVectorLengthError = 0;
  let maximumDirectionStepDegrees = 0;
  let maximumFixedFootDriftMeters = 0;
  let maximumEquipmentContactDriftMeters = 0;
  let minimumAbWheelHandHeightMeters = Infinity;
  let minimumAbWheelKneeHeightMeters = Infinity;
  let minimumBodyJointHeightMeters = Infinity;
  let minimumPlaybackAmount = Infinity;
  let maximumPlaybackAmount = -Infinity;
  let minimumProjectedEndpointMotion = Infinity;
  let maximumPerceptualStallMs = 0;
  const movementMagnitudes = {};
  const playbackRanges = {};
  const projectedEndpointMotion = {};
  const perceptualStallMs = {};

  for (const preset of uniquePresets) {
    playbackRanges[preset] = {
      minimum: Infinity,
      maximum: -Infinity,
    };

    for (let sample = 0; sample <= 2000; sample += 1) {
      const playbackAmount =
        getCalibratedMotionAmount(preset, sample * 0.01);

      playbackRanges[preset].minimum = Math.min(
        playbackRanges[preset].minimum,
        playbackAmount
      );
      playbackRanges[preset].maximum = Math.max(
        playbackRanges[preset].maximum,
        playbackAmount
      );
      minimumPlaybackAmount = Math.min(
        minimumPlaybackAmount,
        playbackAmount
      );
      maximumPlaybackAmount = Math.max(
        maximumPlaybackAmount,
        playbackAmount
      );
    }

    const startPose = getCalibratedPose(preset, 0);
    const finishPose = getCalibratedPose(preset, 1);
    const projectedMotion = projectedPoseMotion(
      preset,
      startPose,
      finishPose
    );
    projectedEndpointMotion[preset] = projectedMotion;
    minimumProjectedEndpointMotion = Math.min(
      minimumProjectedEndpointMotion,
      projectedMotion
    );

    let previousPlaybackPose = null;
    let currentStallFrames = 0;
    let longestStallFrames = 0;

    for (let frame = 0; frame <= 1_200; frame += 1) {
      const elapsed = frame / 60;
      const pose = getCalibratedPose(
        preset,
        getCalibratedMotionAmount(preset, elapsed)
      );

      if (
        previousPlaybackPose &&
        projectedPoseMotion(
          preset,
          previousPlaybackPose,
          pose
        ) < 0.00002
      ) {
        currentStallFrames += 1;
        longestStallFrames = Math.max(
          longestStallFrames,
          currentStallFrames
        );
      } else {
        currentStallFrames = 0;
      }

      previousPlaybackPose = pose;
    }

    const stallMs = (longestStallFrames / 60) * 1_000;
    perceptualStallMs[preset] = stallMs;
    maximumPerceptualStallMs = Math.max(
      maximumPerceptualStallMs,
      stallMs
    );
  }

  const previousCalibrationPoses = {};

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    for (const preset of uniquePresets) {
      const firstPose = getCalibratedPose(preset, 0);
      const lastPose = getCalibratedPose(preset, 1);
      movementMagnitudes[preset] = Math.max(
        ...numberKeys.map((key) =>
          Math.abs(lastPose[key] - firstPose[key])
        ),
        ...vectorKeys.map((key) =>
          distance(lastPose[key], firstPose[key])
        )
      );
      const footAnchors = {
        left: footPoint(firstPose, -1),
        right: footPoint(firstPose, 1),
      };
      let previousPose =
        previousCalibrationPoses[preset] || null;

      for (
        let sample = 0;
        sample < samplesPerPreset;
        sample += 1
      ) {
        const globalSample =
          cycle * samplesPerPreset + sample;
        const amount =
          (globalSample + 0.5) /
          (cycles * samplesPerPreset);
        const pose = getCalibratedPose(preset, amount);
        const playbackAmount =
          getCalibratedMotionAmount(
            preset,
            cycle * samplesPerPreset * 0.017 +
              sample * 0.017
          );
        minimumPlaybackAmount = Math.min(
          minimumPlaybackAmount,
          playbackAmount
        );
        maximumPlaybackAmount = Math.max(
          maximumPlaybackAmount,
          playbackAmount
        );
        playbackRanges[preset].minimum = Math.min(
          playbackRanges[preset].minimum,
          playbackAmount
        );
        playbackRanges[preset].maximum = Math.max(
          playbackRanges[preset].maximum,
          playbackAmount
        );
        assertSemantic(
          Number.isFinite(playbackAmount) &&
            playbackAmount >= 0 &&
            playbackAmount <= 1,
          `${preset} playback amount is valid`
        );

        for (const key of numberKeys) {
          assertSemantic(
            Number.isFinite(pose[key]),
            `${preset}.${key} is finite at ${amount}`
          );
        }

        for (const key of vectorKeys) {
          const vector = pose[key];
          assertSemantic(
            Array.isArray(vector) &&
              vector.length === 3 &&
              vector.every(Number.isFinite),
            `${preset}.${key} is a valid vector at ${amount}`
          );
          maximumVectorLengthError = Math.max(
            maximumVectorLengthError,
            Math.abs(Math.hypot(...vector) - 1)
          );

          if (previousPose) {
            maximumDirectionStepDegrees = Math.max(
              maximumDirectionStepDegrees,
              vectorAngle(previousPose[key], vector)
            );
          }
        }

        for (const side of [-1, 1]) {
          const jointPoints = [
            hipPoint(pose, side),
            kneePoint(pose, side),
            footPoint(pose, side),
            shoulderPoint(pose, side),
            elbowPoint(pose, side),
            handPoint(pose, side),
          ];

          minimumBodyJointHeightMeters = Math.min(
            minimumBodyJointHeightMeters,
            ...jointPoints.map((point) => point[1])
          );
        }

        if (fixedFootPresets.has(preset)) {
          const drift = Math.max(
            distance(footPoint(pose, -1), footAnchors.left),
            distance(footPoint(pose, 1), footAnchors.right)
          );
          maximumFixedFootDriftMeters = Math.max(
            maximumFixedFootDriftMeters,
            drift
          );
          assertWithin(
            drift,
            0.005,
            `${preset} foot contact at ${amount}`
          );
        }

        if (preset === "back-squat") {
          const barCenter = torsoPoint(pose, [0, 1.08, -0.32]);
          const leftHand = handPoint(pose, -1);
          const rightHand = handPoint(pose, 1);
          const drift = Math.max(
            Math.hypot(
              leftHand[1] - barCenter[1],
              leftHand[2] - barCenter[2]
            ),
            Math.hypot(
              rightHand[1] - barCenter[1],
              rightHand[2] - barCenter[2]
            )
          );
          maximumEquipmentContactDriftMeters = Math.max(
            maximumEquipmentContactDriftMeters,
            drift
          );
          assertWithin(
            drift,
            0.005,
            `back-squat bar contact at ${amount}`
          );
        }

        if (preset === "assisted-pull-up") {
          const drift = Math.max(
            distance(handPoint(pose, -1), [-1.2, 4.28, 0.05]),
            distance(handPoint(pose, 1), [1.2, 4.28, 0.05])
          );
          maximumEquipmentContactDriftMeters = Math.max(
            maximumEquipmentContactDriftMeters,
            drift
          );
          assertWithin(
            drift,
            0.005,
            `assisted-pull-up handle contact at ${amount}`
          );
        }

        if (preset === "assisted-dip") {
          const leftHand = handPoint(pose, -1);
          const rightHand = handPoint(pose, 1);
          const drift = Math.max(
            Math.hypot(
              leftHand[0] + 0.62,
              leftHand[1] - 2.55
            ),
            Math.hypot(
              rightHand[0] - 0.62,
              rightHand[1] - 2.55
            )
          );
          maximumEquipmentContactDriftMeters = Math.max(
            maximumEquipmentContactDriftMeters,
            drift
          );
          assertWithin(
            drift,
            0.01,
            `assisted-dip handle contact at ${amount}`
          );
        }

        if (preset === "ab-wheel-rollout") {
          minimumAbWheelHandHeightMeters = Math.min(
            minimumAbWheelHandHeightMeters,
            handPoint(pose, -1)[1],
            handPoint(pose, 1)[1]
          );
          minimumAbWheelKneeHeightMeters = Math.min(
            minimumAbWheelKneeHeightMeters,
            kneePoint(pose, -1)[1],
            kneePoint(pose, 1)[1]
          );
        }

        previousPose = pose;
      }

      previousCalibrationPoses[preset] = previousPose;
    }
  }

  assertWithin(
    maximumVectorLengthError,
    0.000001,
    "maximum direction-vector length error"
  );
  assertSemantic(
    minimumAbWheelHandHeightMeters >= 0.28,
    `Ab Wheel hands stay above the 0.28 m wheel hub; minimum ${minimumAbWheelHandHeightMeters.toFixed(
      4
    )} m`
  );
  assertSemantic(
    minimumAbWheelKneeHeightMeters >= -0.03,
    `Ab Wheel knees do not penetrate the floor; minimum ${minimumAbWheelKneeHeightMeters.toFixed(
      4
    )} m`
  );
  assertWithin(
    maximumDirectionStepDegrees,
    5,
    "maximum one-percent direction step"
  );
  assertSemantic(
    minimumBodyJointHeightMeters >= -0.04,
    `body joints stay above the floor tolerance; minimum ${minimumBodyJointHeightMeters.toFixed(
      4
    )} m`
  );
  assertSemantic(
    minimumPlaybackAmount < 0.001 &&
      maximumPlaybackAmount > 0.999,
    `playback visits both movement endpoints; range ${minimumPlaybackAmount.toFixed(
      4
    )}–${maximumPlaybackAmount.toFixed(4)}`
  );
  for (const preset of uniquePresets) {
    assertSemantic(
      movementMagnitudes[preset] > 0.04,
      `${preset} must contain a visible movement instead of a static pose`
    );
    assertSemantic(
      playbackRanges[preset].minimum < 0.01 &&
        playbackRanges[preset].maximum > 0.99,
      `${preset} playback reaches both calibrated endpoints`
    );
    assertSemantic(
      projectedEndpointMotion[preset] > 0.012,
      `${preset} remains visibly different between endpoints in the default camera (projected motion ${projectedEndpointMotion[
        preset
      ].toFixed(6)})`
    );
    assertSemantic(
      perceptualStallMs[preset] < 750,
      `${preset} does not appear frozen for more than 750 ms while playback is active (longest ${perceptualStallMs[
        preset
      ].toFixed(2)} ms)`
    );
  }
  const semanticChecks = verifyMovementSemantics(
    getCalibratedPose
  );
  const totalSampledPoses =
    cycles * uniquePresets.length * samplesPerPreset;

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        cycles,
        calibratedGuides: guideInventory.length,
        uniqueMotionPresets: uniquePresets.length,
        samplesPerPreset,
        totalSampledPoses,
        uniqueSamplePhasesPerPreset:
          cycles * samplesPerPreset,
        calibrationCycles: cycles,
        semanticChecks,
        resolverChecks:
          resolverChecks.length + aliasResolverChecks.length,
        maximumDirectionStepDegrees: Number(
          maximumDirectionStepDegrees.toFixed(4)
        ),
        maximumVectorLengthError: Number(
          maximumVectorLengthError.toFixed(8)
        ),
        maximumFixedFootDriftMeters: Number(
          maximumFixedFootDriftMeters.toFixed(6)
        ),
        maximumEquipmentContactDriftMeters: Number(
          maximumEquipmentContactDriftMeters.toFixed(6)
        ),
        minimumProjectedEndpointMotion: Number(
          minimumProjectedEndpointMotion.toFixed(6)
        ),
        maximumPerceptualStallMs: Number(
          maximumPerceptualStallMs.toFixed(2)
        ),
        minimumAbWheelHandHeightMeters: Number(
          minimumAbWheelHandHeightMeters.toFixed(4)
        ),
        minimumAbWheelKneeHeightMeters: Number(
          minimumAbWheelKneeHeightMeters.toFixed(4)
        ),
        minimumBodyJointHeightMeters: Number(
          minimumBodyJointHeightMeters.toFixed(4)
        ),
        playbackRange: [
          Number(minimumPlaybackAmount.toFixed(4)),
          Number(maximumPlaybackAmount.toFixed(4)),
        ],
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
    `Motion calibration audit FAILED: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exitCode = 1;
}
