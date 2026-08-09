import type { ExerciseGuidePreset } from "@/lib/exercise-guides";

export type Vec3 = [number, number, number];

export type HumanoidPose3D = {
  head: Vec3;
  neck: Vec3;
  chest: Vec3;
  pelvis: Vec3;
  leftShoulder: Vec3;
  rightShoulder: Vec3;
  leftElbow: Vec3;
  rightElbow: Vec3;
  leftWrist: Vec3;
  rightWrist: Vec3;
  leftHip: Vec3;
  rightHip: Vec3;
  leftKnee: Vec3;
  rightKnee: Vec3;
  leftAnkle: Vec3;
  rightAnkle: Vec3;
};


export type Equipment3D =
  | "none"
  | "barbell"
  | "dumbbells"
  | "bench-barbell"
  | "incline-dumbbells"
  | "pulldown"
  | "cable-row"
  | "squat-rack"
  | "leg-press"
  | "bench"
  | "cable"
  | "chest-press"
  | "pec-deck"
  | "pull-up"
  | "hack-squat"
  | "leg-extension"
  | "leg-curl"
  | "hip-thrust"
  | "calf-raise"
  | "preacher"
  | "dip"
  | "ab-crunch"
  | "ab-wheel"
  | "treadmill"
  | "mat";

export type ExerciseScene3D = {
  pose: HumanoidPose3D;
  equipment: Equipment3D;
  cameraDistance: number;
  cameraTargetY: number;
  groundY: number;
};

const v = (x: number, y: number, z = 0): Vec3 => [x, y, z];

function clonePose(pose: HumanoidPose3D): HumanoidPose3D {
  return Object.fromEntries(
    Object.entries(pose).map(([key, value]) => [key, [...value]])
  ) as HumanoidPose3D;
}

const poseKeys = [
  "head",
  "neck",
  "chest",
  "pelvis",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
] as const;

function mix(a: number, b: number, progress: number) {
  return a + (b - a) * progress;
}

function interpolatePose(
  start: HumanoidPose3D,
  finish: HumanoidPose3D,
  progress: number
): HumanoidPose3D {
  const result = {} as HumanoidPose3D;
  for (const key of poseKeys) {
    result[key] = [
      mix(start[key][0], finish[key][0], progress),
      mix(start[key][1], finish[key][1], progress),
      mix(start[key][2], finish[key][2], progress),
    ];
  }
  return result;
}

function subtractVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function addVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scaleVec(value: Vec3, scale: number): Vec3 {
  return [value[0] * scale, value[1] * scale, value[2] * scale];
}

function vecLength(value: Vec3) {
  return Math.hypot(value[0], value[1], value[2]);
}

function normalizeVec(value: Vec3, fallback: Vec3): Vec3 {
  const length = vecLength(value);
  if (length < 0.0001) return fallback;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function boneLength(pose: HumanoidPose3D, a: keyof HumanoidPose3D, b: keyof HumanoidPose3D) {
  return vecLength(subtractVec(pose[b], pose[a]));
}

function averagedBoneLength(
  start: HumanoidPose3D,
  finish: HumanoidPose3D,
  a: keyof HumanoidPose3D,
  b: keyof HumanoidPose3D,
  minimum = 0.08
) {
  return Math.max(minimum, (boneLength(start, a, b) + boneLength(finish, a, b)) / 2);
}

function stabilizeInterpolatedPose(
  pose: HumanoidPose3D,
  start: HumanoidPose3D,
  finish: HumanoidPose3D
): HumanoidPose3D {
  const stable = clonePose(pose);
  const lengths = {
    spine: averagedBoneLength(start, finish, 'pelvis', 'chest', 0.55),
    neck: averagedBoneLength(start, finish, 'chest', 'neck', 0.18),
    head: averagedBoneLength(start, finish, 'neck', 'head', 0.22),
    leftShoulder: averagedBoneLength(start, finish, 'chest', 'leftShoulder', 0.18),
    rightShoulder: averagedBoneLength(start, finish, 'chest', 'rightShoulder', 0.18),
    leftUpperArm: averagedBoneLength(start, finish, 'leftShoulder', 'leftElbow', 0.3),
    rightUpperArm: averagedBoneLength(start, finish, 'rightShoulder', 'rightElbow', 0.3),
    leftForearm: averagedBoneLength(start, finish, 'leftElbow', 'leftWrist', 0.3),
    rightForearm: averagedBoneLength(start, finish, 'rightElbow', 'rightWrist', 0.3),
    leftHip: averagedBoneLength(start, finish, 'pelvis', 'leftHip', 0.12),
    rightHip: averagedBoneLength(start, finish, 'pelvis', 'rightHip', 0.12),
    leftThigh: averagedBoneLength(start, finish, 'leftHip', 'leftKnee', 0.45),
    rightThigh: averagedBoneLength(start, finish, 'rightHip', 'rightKnee', 0.45),
    leftShin: averagedBoneLength(start, finish, 'leftKnee', 'leftAnkle', 0.42),
    rightShin: averagedBoneLength(start, finish, 'rightKnee', 'rightAnkle', 0.42),
  };

  const placeChild = (
    parent: keyof HumanoidPose3D,
    child: keyof HumanoidPose3D,
    length: number,
    fallback: Vec3
  ) => {
    const direction = normalizeVec(subtractVec(pose[child], pose[parent]), fallback);
    stable[child] = addVec(stable[parent], scaleVec(direction, length));
  };

  stable.pelvis = [...pose.pelvis];
  placeChild('pelvis', 'chest', lengths.spine, [0, 1, 0]);
  placeChild('chest', 'neck', lengths.neck, [0, 1, 0]);
  placeChild('neck', 'head', lengths.head, [0, 1, 0]);

  placeChild('chest', 'leftShoulder', lengths.leftShoulder, [-1, 0.08, 0]);
  placeChild('chest', 'rightShoulder', lengths.rightShoulder, [1, 0.08, 0]);
  placeChild('leftShoulder', 'leftElbow', lengths.leftUpperArm, [-0.4, -0.8, 0]);
  placeChild('rightShoulder', 'rightElbow', lengths.rightUpperArm, [0.4, -0.8, 0]);
  placeChild('leftElbow', 'leftWrist', lengths.leftForearm, [-0.4, -0.9, 0]);
  placeChild('rightElbow', 'rightWrist', lengths.rightForearm, [0.4, -0.9, 0]);

  placeChild('pelvis', 'leftHip', lengths.leftHip, [-1, 0, 0]);
  placeChild('pelvis', 'rightHip', lengths.rightHip, [1, 0, 0]);
  placeChild('leftHip', 'leftKnee', lengths.leftThigh, [-0.06, -1, 0.04]);
  placeChild('rightHip', 'rightKnee', lengths.rightThigh, [0.06, -1, 0.04]);
  placeChild('leftKnee', 'leftAnkle', lengths.leftShin, [0, -1, 0.08]);
  placeChild('rightKnee', 'rightAnkle', lengths.rightShin, [0, -1, 0.08]);

  return stable;
}

function mirrorPoseDepth(pose: HumanoidPose3D): HumanoidPose3D {
  const mirrored = clonePose(pose);
  for (const key of poseKeys) {
    mirrored[key][2] = -mirrored[key][2];
  }
  return mirrored;
}

const DEPTH_FLIPPED_PRESETS = new Set<ExerciseGuidePreset>([
  "seated-row",
  "machine-press",
  "pec-deck",
  "preacher-curl",
]);

type FrontCalibration = {
  sign: 1 | -1;
  wrist: number;
  elbow?: number;
  head?: number;
};

const FRONT_CALIBRATIONS: Partial<Record<ExerciseGuidePreset, FrontCalibration>> = {
  "lat-pulldown": { sign: 1, wrist: 0.1, elbow: 0.02 },
  "seated-row": { sign: 1, wrist: 0.38, elbow: 0.12 },
  "romanian-deadlift": { sign: -1, wrist: 0.08 },
  "barbell-curl": { sign: 1, wrist: 0.18 },
  "hammer-curl": { sign: 1, wrist: 0.14 },
  "alternating-curl": { sign: 1, wrist: 0.14 },
  "triceps-pushdown": { sign: 1, wrist: 0.12, elbow: 0.06 },
  "cable-crunch": { sign: -1, wrist: 0.16, elbow: 0.1, head: 0.08 },
  "machine-press": { sign: 1, wrist: 0.28, elbow: 0.18 },
  "pec-deck": { sign: 1, wrist: 0.18, elbow: 0.16 },
  "preacher-curl": { sign: 1, wrist: 0.18, elbow: 0.12 },
  "ab-crunch": { sign: -1, wrist: 0.3, elbow: 0.18, head: 0.08 },
  "ab-wheel-rollout": { sign: -1, wrist: 0.62, elbow: 0.34, head: 0.12 },
  "assisted-pull-up": { sign: 1, wrist: 0.08, elbow: 0.06 },
  "assisted-dip": { sign: 1, wrist: 0.08, elbow: 0.06 },
};

function ensureFrontDistance(point: Vec3, reference: Vec3, calibration: FrontCalibration, amount: number) {
  const target = reference[2] + calibration.sign * amount;
  const current = (point[2] - reference[2]) * calibration.sign;
  if (current < amount) point[2] = target;
}

const SEATED_PRESETS = new Set<ExerciseGuidePreset>([
  "lat-pulldown",
  "seated-row",
  "machine-press",
  "pec-deck",
  "leg-extension",
  "leg-curl",
  "preacher-curl",
  "ab-crunch",
  "shoulder-press",
]);

const KNEELING_PRESETS = new Set<ExerciseGuidePreset>([
  "cable-crunch",
  "ab-wheel-rollout",
]);

const HANGING_PRESETS = new Set<ExerciseGuidePreset>([
  "assisted-pull-up",
  "assisted-dip",
]);

const HINGE_PRESETS = new Set<ExerciseGuidePreset>([
  "romanian-deadlift",
  "hip-thrust",
  "back-squat",
  "hack-squat",
]);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function averageZ(...values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function humanizePoseForPreset(
  preset: ExerciseGuidePreset,
  pose: HumanoidPose3D
): HumanoidPose3D {
  const p = clonePose(pose);

  p.head[0] = 0;
  p.neck[0] = 0;
  p.chest[0] = 0;
  p.pelvis[0] = 0;
  p.leftShoulder[0] = -Math.abs(p.leftShoulder[0] || 0.42);
  p.rightShoulder[0] = Math.abs(p.rightShoulder[0] || 0.42);
  p.leftHip[0] = -Math.abs(p.leftHip[0] || 0.22);
  p.rightHip[0] = Math.abs(p.rightHip[0] || 0.22);
  p.leftElbow[0] = Math.min(p.leftElbow[0], -0.08);
  p.rightElbow[0] = Math.max(p.rightElbow[0], 0.08);
  p.leftWrist[0] = Math.min(p.leftWrist[0], -0.08);
  p.rightWrist[0] = Math.max(p.rightWrist[0], 0.08);
  p.leftKnee[0] = Math.min(p.leftKnee[0], -0.08);
  p.rightKnee[0] = Math.max(p.rightKnee[0], 0.08);
  p.leftAnkle[0] = Math.min(p.leftAnkle[0], -0.08);
  p.rightAnkle[0] = Math.max(p.rightAnkle[0], 0.08);

  const torsoFront = averageZ(p.head[2], p.neck[2], p.chest[2], p.pelvis[2]);

  if (SEATED_PRESETS.has(preset)) {
    const chestZ = clamp(averageZ(p.chest[2], p.neck[2]), -0.02, 0.18);
    p.head[2] = clamp(averageZ(p.head[2], chestZ + 0.04), -0.02, 0.22);
    p.neck[2] = clamp(averageZ(p.neck[2], chestZ + 0.02), -0.02, 0.2);
    p.chest[2] = chestZ;
    p.pelvis[2] = clamp(averageZ(p.pelvis[2], chestZ + 0.08), 0.04, 0.28);
    p.leftHip[2] = p.pelvis[2];
    p.rightHip[2] = p.pelvis[2];
    p.leftKnee[2] = clamp(Math.max(p.leftKnee[2], p.pelvis[2] + 0.48), 0.48, 1.02);
    p.rightKnee[2] = clamp(Math.max(p.rightKnee[2], p.pelvis[2] + 0.48), 0.48, 1.02);
    p.leftAnkle[2] = clamp(Math.max(p.leftAnkle[2], p.leftKnee[2] - 0.04), 0.58, 1.08);
    p.rightAnkle[2] = clamp(Math.max(p.rightAnkle[2], p.rightKnee[2] - 0.04), 0.58, 1.08);
  } else if (KNEELING_PRESETS.has(preset)) {
    p.head[2] = clamp(averageZ(p.head[2], 0.0), -0.22, 0.16);
    p.neck[2] = clamp(averageZ(p.neck[2], 0.02), -0.16, 0.14);
    p.chest[2] = clamp(averageZ(p.chest[2], 0.04), -0.12, 0.16);
    p.pelvis[2] = clamp(averageZ(p.pelvis[2], 0.1), 0.04, 0.22);
    p.leftHip[2] = p.pelvis[2];
    p.rightHip[2] = p.pelvis[2];
    p.leftKnee[2] = clamp(averageZ(p.leftKnee[2], 0.16), 0.1, 0.24);
    p.rightKnee[2] = clamp(averageZ(p.rightKnee[2], 0.16), 0.1, 0.24);
    p.leftAnkle[2] = clamp(averageZ(p.leftAnkle[2], 0.64), 0.46, 0.76);
    p.rightAnkle[2] = clamp(averageZ(p.rightAnkle[2], 0.64), 0.46, 0.76);
  } else if (HANGING_PRESETS.has(preset)) {
    p.head[2] = clamp(averageZ(p.head[2], 0.08), 0.02, 0.2);
    p.neck[2] = clamp(averageZ(p.neck[2], 0.08), 0.02, 0.18);
    p.chest[2] = clamp(averageZ(p.chest[2], 0.1), 0.04, 0.22);
    p.pelvis[2] = clamp(averageZ(p.pelvis[2], 0.16), 0.08, 0.28);
    p.leftHip[2] = p.pelvis[2];
    p.rightHip[2] = p.pelvis[2];
    p.leftKnee[2] = clamp(averageZ(p.leftKnee[2], 0.24), 0.16, 0.32);
    p.rightKnee[2] = clamp(averageZ(p.rightKnee[2], 0.24), 0.16, 0.32);
    p.leftAnkle[2] = clamp(averageZ(p.leftAnkle[2], 0.44), 0.32, 0.56);
    p.rightAnkle[2] = clamp(averageZ(p.rightAnkle[2], 0.44), 0.32, 0.56);
  } else if (preset === "bench-press" || preset === "incline-press" || preset === "leg-press" || preset === "plank") {
    // keep these as authored
  } else if (HINGE_PRESETS.has(preset)) {
    p.head[2] = clamp(p.head[2], -0.9, 0.26);
    p.neck[2] = clamp(p.neck[2], -0.65, 0.24);
    p.chest[2] = clamp(p.chest[2], -0.3, 0.26);
    p.pelvis[2] = clamp(p.pelvis[2], -0.05, 0.55);
  } else {
    p.head[2] = clamp(averageZ(p.head[2], torsoFront + 0.03), -0.1, 0.24);
    p.neck[2] = clamp(averageZ(p.neck[2], torsoFront + 0.02), -0.08, 0.22);
    p.chest[2] = clamp(averageZ(p.chest[2], torsoFront + 0.02), -0.08, 0.24);
    p.pelvis[2] = clamp(averageZ(p.pelvis[2], torsoFront + 0.04), -0.04, 0.32);
  }

  if (preset === "romanian-deadlift") {
    p.leftWrist[2] = clamp(p.leftWrist[2], -0.16, 0.16);
    p.rightWrist[2] = clamp(p.rightWrist[2], -0.16, 0.16);
    p.leftElbow[2] = clamp(p.leftElbow[2], -0.2, 0.12);
    p.rightElbow[2] = clamp(p.rightElbow[2], -0.2, 0.12);
  }

  if (preset === "seated-row") {
    p.leftWrist[2] = clamp(p.leftWrist[2], 0.12, 0.82);
    p.rightWrist[2] = clamp(p.rightWrist[2], 0.12, 0.82);
    p.leftElbow[2] = clamp(p.leftElbow[2], 0.08, 0.52);
    p.rightElbow[2] = clamp(p.rightElbow[2], 0.08, 0.52);
  }

  if (preset === "alternating-curl") {
    p.leftWrist[2] = clamp(p.leftWrist[2], 0.08, 0.42);
    p.rightWrist[2] = clamp(p.rightWrist[2], 0.08, 0.42);
  }

  // hard anatomy normalization
  p.neck[1] = clamp(p.neck[1], p.chest[1] + 0.18, p.head[1] - 0.12);
  p.head[1] = Math.max(p.head[1], p.neck[1] + 0.18);
  p.leftShoulder[1] = clamp(p.leftShoulder[1], p.chest[1] + 0.1, p.neck[1]);
  p.rightShoulder[1] = clamp(p.rightShoulder[1], p.chest[1] + 0.1, p.neck[1]);
  p.leftElbow[1] = clamp(p.leftElbow[1], p.leftWrist[1] + 0.08, p.leftShoulder[1] - 0.04);
  p.rightElbow[1] = clamp(p.rightElbow[1], p.rightWrist[1] + 0.08, p.rightShoulder[1] - 0.04);
  p.leftHip[1] = clamp(p.leftHip[1], p.pelvis[1] - 0.08, p.pelvis[1] + 0.06);
  p.rightHip[1] = clamp(p.rightHip[1], p.pelvis[1] - 0.08, p.pelvis[1] + 0.06);
  p.leftKnee[1] = Math.min(p.leftKnee[1], p.leftHip[1] - 0.18);
  p.rightKnee[1] = Math.min(p.rightKnee[1], p.rightHip[1] - 0.18);
  p.leftAnkle[1] = Math.min(p.leftAnkle[1], p.leftKnee[1] - 0.18);
  p.rightAnkle[1] = Math.min(p.rightAnkle[1], p.rightKnee[1] - 0.18);
  if (!(preset === "bench-press" || preset === "incline-press" || preset === "leg-press")) {
    p.leftAnkle[1] = Math.max(p.leftAnkle[1], 0.04);
    p.rightAnkle[1] = Math.max(p.rightAnkle[1], 0.04);
  }

  return p;
}

function calibratePoseForPreset(
  preset: ExerciseGuidePreset,
  pose: HumanoidPose3D
): HumanoidPose3D {
  const calibrated = clonePose(pose);
  const front = FRONT_CALIBRATIONS[preset];
  if (front) {
    ensureFrontDistance(calibrated.leftWrist, calibrated.chest, front, front.wrist);
    ensureFrontDistance(calibrated.rightWrist, calibrated.chest, front, front.wrist);
    if (front.elbow != null) {
      ensureFrontDistance(calibrated.leftElbow, calibrated.chest, front, front.elbow);
      ensureFrontDistance(calibrated.rightElbow, calibrated.chest, front, front.elbow);
    }
    if (front.head != null) {
      ensureFrontDistance(calibrated.head, calibrated.chest, front, front.head);
      ensureFrontDistance(calibrated.neck, calibrated.chest, front, front.head * 0.75);
    }
  }

  switch (preset) {
    case "bench-press":
      calibrated.leftWrist[2] = Math.min(calibrated.leftWrist[2], calibrated.chest[2] + 0.08);
      calibrated.rightWrist[2] = Math.min(calibrated.rightWrist[2], calibrated.chest[2] + 0.08);
      break;
    case "incline-press":
      calibrated.leftWrist[2] = Math.min(calibrated.leftWrist[2], calibrated.chest[2] + 0.12);
      calibrated.rightWrist[2] = Math.min(calibrated.rightWrist[2], calibrated.chest[2] + 0.12);
      break;
    case "leg-press":
      calibrated.leftAnkle[2] = Math.min(calibrated.leftAnkle[2], calibrated.leftKnee[2] - 0.22);
      calibrated.rightAnkle[2] = Math.min(calibrated.rightAnkle[2], calibrated.rightKnee[2] - 0.22);
      break;
    case "hip-thrust":
      calibrated.pelvis[2] = max(calibrated.pelvis[2], calibrated.chest[2] + 0.45);
      break;
    case "assisted-dip":
      calibrated.leftWrist[0] = -0.58;
      calibrated.rightWrist[0] = 0.58;
      calibrated.leftWrist[2] = 0.1;
      calibrated.rightWrist[2] = 0.1;
      calibrated.leftKnee[2] = max(calibrated.leftKnee[2], 0.24);
      calibrated.rightKnee[2] = max(calibrated.rightKnee[2], 0.24);
      break;
    case "cable-crunch":
      calibrated.leftKnee[2] = 0.18;
      calibrated.rightKnee[2] = 0.18;
      calibrated.leftAnkle[2] = 0.72;
      calibrated.rightAnkle[2] = 0.72;
      break;
    case "assisted-pull-up":
      calibrated.leftKnee[0] = -0.14;
      calibrated.rightKnee[0] = 0.14;
      calibrated.leftKnee[2] = 0.2;
      calibrated.rightKnee[2] = 0.2;
      calibrated.leftAnkle[2] = 0.42;
      calibrated.rightAnkle[2] = 0.42;
      break;
    default:
      break;
  }
  return humanizePoseForPreset(preset, calibrated);
}

function max(a: number, b: number) {
  return a > b ? a : b;
}

function standingPose(): HumanoidPose3D {
  return {
    head: v(0, 2.86, 0),
    neck: v(0, 2.54, 0),
    chest: v(0, 2.12, 0),
    pelvis: v(0, 1.38, 0),
    leftShoulder: v(-0.48, 2.43, 0),
    rightShoulder: v(0.48, 2.43, 0),
    leftElbow: v(-0.56, 1.86, 0),
    rightElbow: v(0.56, 1.86, 0),
    leftWrist: v(-0.55, 1.28, 0),
    rightWrist: v(0.55, 1.28, 0),
    leftHip: v(-0.25, 1.35, 0),
    rightHip: v(0.25, 1.35, 0),
    leftKnee: v(-0.28, 0.66, 0),
    rightKnee: v(0.28, 0.66, 0),
    leftAnkle: v(-0.3, 0.06, 0),
    rightAnkle: v(0.3, 0.06, 0),
  };
}

function seatedPose(): HumanoidPose3D {
  const pose = standingPose();
  pose.head = v(0, 2.55, 0.15);
  pose.neck = v(0, 2.26, 0.1);
  pose.chest = v(0, 1.9, 0.08);
  pose.pelvis = v(0, 1.22, 0.2);
  pose.leftShoulder = v(-0.48, 2.15, 0.08);
  pose.rightShoulder = v(0.48, 2.15, 0.08);
  pose.leftElbow = v(-0.54, 1.65, 0.05);
  pose.rightElbow = v(0.54, 1.65, 0.05);
  pose.leftWrist = v(-0.52, 1.18, -0.05);
  pose.rightWrist = v(0.52, 1.18, -0.05);
  pose.leftHip = v(-0.25, 1.2, 0.2);
  pose.rightHip = v(0.25, 1.2, 0.2);
  pose.leftKnee = v(-0.28, 0.93, 0.92);
  pose.rightKnee = v(0.28, 0.93, 0.92);
  pose.leftAnkle = v(-0.3, 0.12, 0.98);
  pose.rightAnkle = v(0.3, 0.12, 0.98);
  return pose;
}

function kneelingPose(): HumanoidPose3D {
  const pose = standingPose();
  pose.head = v(0, 2.22, -0.04);
  pose.neck = v(0, 1.95, -0.02);
  pose.chest = v(0, 1.58, 0.02);
  pose.pelvis = v(0, 0.98, 0.12);
  pose.leftShoulder = v(-0.44, 1.82, 0.01);
  pose.rightShoulder = v(0.44, 1.82, 0.01);
  pose.leftElbow = v(-0.48, 1.45, 0.02);
  pose.rightElbow = v(0.48, 1.45, 0.02);
  pose.leftWrist = v(-0.42, 1.15, 0.06);
  pose.rightWrist = v(0.42, 1.15, 0.06);
  pose.leftHip = v(-0.23, 0.96, 0.12);
  pose.rightHip = v(0.23, 0.96, 0.12);
  pose.leftKnee = v(-0.25, 0.14, 0.18);
  pose.rightKnee = v(0.25, 0.14, 0.18);
  pose.leftAnkle = v(-0.27, 0.1, 0.72);
  pose.rightAnkle = v(0.27, 0.1, 0.72);
  return pose;
}

function lyingBenchPose(): HumanoidPose3D {
  return {
    head: v(0, 0.94, -1.08),
    neck: v(0, 0.88, -0.76),
    chest: v(0, 0.83, -0.35),
    pelvis: v(0, 0.76, 0.45),
    leftShoulder: v(-0.43, 0.88, -0.52),
    rightShoulder: v(0.43, 0.88, -0.52),
    leftElbow: v(-0.68, 0.98, -0.2),
    rightElbow: v(0.68, 0.98, -0.2),
    leftWrist: v(-0.46, 1.18, -0.16),
    rightWrist: v(0.46, 1.18, -0.16),
    leftHip: v(-0.23, 0.73, 0.42),
    rightHip: v(0.23, 0.73, 0.42),
    leftKnee: v(-0.3, 0.56, 1.15),
    rightKnee: v(0.3, 0.56, 1.15),
    leftAnkle: v(-0.34, 0.08, 1.42),
    rightAnkle: v(0.34, 0.08, 1.42),
  };
}

function inclineBenchPose(): HumanoidPose3D {
  return {
    head: v(0, 1.9, -0.72),
    neck: v(0, 1.68, -0.5),
    chest: v(0, 1.42, -0.18),
    pelvis: v(0, 0.9, 0.38),
    leftShoulder: v(-0.43, 1.62, -0.36),
    rightShoulder: v(0.43, 1.62, -0.36),
    leftElbow: v(-0.62, 1.42, -0.05),
    rightElbow: v(0.62, 1.42, -0.05),
    leftWrist: v(-0.42, 1.48, 0.12),
    rightWrist: v(0.42, 1.48, 0.12),
    leftHip: v(-0.23, 0.88, 0.36),
    rightHip: v(0.23, 0.88, 0.36),
    leftKnee: v(-0.3, 0.55, 1.05),
    rightKnee: v(0.3, 0.55, 1.05),
    leftAnkle: v(-0.34, 0.08, 1.3),
    rightAnkle: v(0.34, 0.08, 1.3),
  };
}

function plankPose(): HumanoidPose3D {
  return {
    head: v(0, 1.42, -1.14),
    neck: v(0, 1.38, -0.96),
    chest: v(0, 1.32, -0.55),
    pelvis: v(0, 1.28, 0.08),
    leftShoulder: v(-0.36, 1.34, -0.68),
    rightShoulder: v(0.36, 1.34, -0.68),
    leftElbow: v(-0.32, 0.92, -0.78),
    rightElbow: v(0.32, 0.92, -0.78),
    leftWrist: v(-0.26, 0.48, -0.82),
    rightWrist: v(0.26, 0.48, -0.82),
    leftHip: v(-0.22, 1.28, 0.08),
    rightHip: v(0.22, 1.28, 0.08),
    leftKnee: v(-0.2, 0.82, 0.44),
    rightKnee: v(0.2, 0.82, 0.44),
    leftAnkle: v(-0.18, 0.08, 0.92),
    rightAnkle: v(0.18, 0.08, 0.92),
  };
}

function benchPress() {
  const start = lyingBenchPose();
  const finish = clonePose(start);
  finish.leftElbow = v(-0.43, 1.62, -0.25);
  finish.rightElbow = v(0.43, 1.62, -0.25);
  finish.leftWrist = v(-0.43, 2.03, -0.25);
  finish.rightWrist = v(0.43, 2.03, -0.25);
  return { start, finish, equipment: "bench-barbell" as const };
}

function inclinePress() {
  const start = inclineBenchPose();
  const finish = clonePose(start);
  finish.leftElbow = v(-0.35, 1.92, -0.18);
  finish.rightElbow = v(0.35, 1.92, -0.18);
  finish.leftWrist = v(-0.3, 2.28, -0.35);
  finish.rightWrist = v(0.3, 2.28, -0.35);
  return { start, finish, equipment: "incline-dumbbells" as const };
}

function latPulldown() {
  const start = seatedPose();
  start.leftShoulder = v(-0.43, 2.18, 0);
  start.rightShoulder = v(0.43, 2.18, 0);
  start.leftElbow = v(-0.62, 2.62, 0);
  start.rightElbow = v(0.62, 2.62, 0);
  start.leftWrist = v(-0.74, 3.05, 0);
  start.rightWrist = v(0.74, 3.05, 0);
  const finish = clonePose(start);
  finish.leftElbow = v(-0.55, 1.82, 0.08);
  finish.rightElbow = v(0.55, 1.82, 0.08);
  finish.leftWrist = v(-0.66, 1.65, 0.08);
  finish.rightWrist = v(0.66, 1.65, 0.08);
  return { start, finish, equipment: "pulldown" as const };
}

function seatedRow() {
  const start = seatedPose();
  start.leftShoulder = v(-0.42, 2.08, 0.08);
  start.rightShoulder = v(0.42, 2.08, 0.08);
  start.leftElbow = v(-0.32, 1.84, 0.42);
  start.rightElbow = v(0.32, 1.84, 0.42);
  start.leftWrist = v(-0.22, 1.66, 0.78);
  start.rightWrist = v(0.22, 1.66, 0.78);
  const finish = clonePose(start);
  finish.leftElbow = v(-0.42, 1.74, 0.18);
  finish.rightElbow = v(0.42, 1.74, 0.18);
  finish.leftWrist = v(-0.22, 1.62, 0.22);
  finish.rightWrist = v(0.22, 1.62, 0.22);
  return { start, finish, equipment: "cable-row" as const };
}

function backSquat() {
  const start = standingPose();
  start.leftElbow = v(-0.62, 2.1, 0.32);
  start.rightElbow = v(0.62, 2.1, 0.32);
  start.leftWrist = v(-0.72, 2.3, 0.18);
  start.rightWrist = v(0.72, 2.3, 0.18);
  const finish = clonePose(start);
  finish.head = v(0, 2.15, 0.12);
  finish.neck = v(0, 1.88, 0.08);
  finish.chest = v(0, 1.52, 0.02);
  finish.pelvis = v(0, 0.82, 0.36);
  finish.leftShoulder = v(-0.46, 1.75, 0.04);
  finish.rightShoulder = v(0.46, 1.75, 0.04);
  finish.leftElbow = v(-0.62, 1.45, 0.35);
  finish.rightElbow = v(0.62, 1.45, 0.35);
  finish.leftWrist = v(-0.7, 1.65, 0.2);
  finish.rightWrist = v(0.7, 1.65, 0.2);
  finish.leftHip = v(-0.25, 0.8, 0.35);
  finish.rightHip = v(0.25, 0.8, 0.35);
  finish.leftKnee = v(-0.43, 0.52, -0.22);
  finish.rightKnee = v(0.43, 0.52, -0.22);
  finish.leftAnkle = v(-0.34, 0.06, 0.02);
  finish.rightAnkle = v(0.34, 0.06, 0.02);
  return { start, finish, equipment: "squat-rack" as const };
}

function legPress() {
  const start = inclineBenchPose();
  start.head = v(0, 1.75, 0.75);
  start.neck = v(0, 1.55, 0.54);
  start.chest = v(0, 1.3, 0.27);
  start.pelvis = v(0, 0.86, -0.23);
  start.leftShoulder = v(-0.42, 1.48, 0.44);
  start.rightShoulder = v(0.42, 1.48, 0.44);
  start.leftHip = v(-0.24, 0.84, -0.22);
  start.rightHip = v(0.24, 0.84, -0.22);
  start.leftKnee = v(-0.42, 1.1, -0.86);
  start.rightKnee = v(0.42, 1.1, -0.86);
  start.leftAnkle = v(-0.42, 1.58, -1.34);
  start.rightAnkle = v(0.42, 1.58, -1.34);
  const finish = clonePose(start);
  finish.leftKnee = v(-0.34, 1.25, -1.23);
  finish.rightKnee = v(0.34, 1.25, -1.23);
  finish.leftAnkle = v(-0.4, 1.72, -1.72);
  finish.rightAnkle = v(0.4, 1.72, -1.72);
  return { start, finish, equipment: "leg-press" as const };
}

function romanianDeadlift() {
  const start = standingPose();
  start.leftWrist = v(-0.42, 1.22, 0.18);
  start.rightWrist = v(0.42, 1.22, 0.18);
  const finish = clonePose(start);
  finish.head = v(0, 1.85, -0.72);
  finish.neck = v(0, 1.72, -0.46);
  finish.chest = v(0, 1.52, -0.1);
  finish.pelvis = v(0, 1.28, 0.38);
  finish.leftShoulder = v(-0.46, 1.62, -0.25);
  finish.rightShoulder = v(0.46, 1.62, -0.25);
  finish.leftElbow = v(-0.47, 1.18, -0.28);
  finish.rightElbow = v(0.47, 1.18, -0.28);
  finish.leftWrist = v(-0.42, 0.68, -0.18);
  finish.rightWrist = v(0.42, 0.68, -0.18);
  finish.leftHip = v(-0.25, 1.25, 0.36);
  finish.rightHip = v(0.25, 1.25, 0.36);
  finish.leftKnee = v(-0.29, 0.62, 0.08);
  finish.rightKnee = v(0.29, 0.62, 0.08);
  return { start, finish, equipment: "barbell" as const };
}

function splitSquat() {
  const start = standingPose();
  start.leftHip = v(-0.22, 1.35, -0.08);
  start.rightHip = v(0.22, 1.35, 0.08);
  start.leftKnee = v(-0.25, 0.7, -0.58);
  start.leftAnkle = v(-0.28, 0.06, -0.9);
  start.rightKnee = v(0.27, 0.68, 0.62);
  start.rightAnkle = v(0.28, 0.06, 0.96);
  start.leftWrist = v(-0.55, 1.25, 0);
  start.rightWrist = v(0.55, 1.25, 0);
  const finish = clonePose(start);
  finish.head = v(0, 2.25, 0);
  finish.neck = v(0, 1.96, 0);
  finish.chest = v(0, 1.62, 0);
  finish.pelvis = v(0, 0.9, 0.08);
  finish.leftShoulder = v(-0.45, 1.87, 0);
  finish.rightShoulder = v(0.45, 1.87, 0);
  finish.leftElbow = v(-0.54, 1.38, 0);
  finish.rightElbow = v(0.54, 1.38, 0);
  finish.leftWrist = v(-0.54, 0.92, 0);
  finish.rightWrist = v(0.54, 0.92, 0);
  finish.leftHip = v(-0.22, 0.88, 0.02);
  finish.rightHip = v(0.22, 0.88, 0.12);
  finish.leftKnee = v(-0.32, 0.5, -0.62);
  finish.rightKnee = v(0.28, 0.12, 0.42);
  return { start, finish, equipment: "dumbbells" as const };
}

function shoulderPress() {
  const start = seatedPose();
  start.leftElbow = v(-0.68, 2.1, 0);
  start.rightElbow = v(0.68, 2.1, 0);
  start.leftWrist = v(-0.5, 2.45, 0);
  start.rightWrist = v(0.5, 2.45, 0);
  const finish = clonePose(start);
  finish.leftElbow = v(-0.37, 2.65, 0);
  finish.rightElbow = v(0.37, 2.65, 0);
  finish.leftWrist = v(-0.3, 3.06, 0);
  finish.rightWrist = v(0.3, 3.06, 0);
  return { start, finish, equipment: "dumbbells" as const };
}

function lateralRaise() {
  const start = standingPose();
  start.leftWrist = v(-0.54, 1.25, 0.02);
  start.rightWrist = v(0.54, 1.25, 0.02);
  const finish = clonePose(start);
  finish.leftElbow = v(-0.9, 2.35, 0);
  finish.rightElbow = v(0.9, 2.35, 0);
  finish.leftWrist = v(-1.35, 2.28, 0);
  finish.rightWrist = v(1.35, 2.28, 0);
  return { start, finish, equipment: "dumbbells" as const };
}

function curl(neutral = false, alternating = false) {
  const start = standingPose();
  start.leftWrist = v(-0.5, 1.18, neutral ? 0.08 : 0.16);
  start.rightWrist = v(0.5, 1.18, neutral ? 0.08 : 0.16);
  const finish = clonePose(start);
  finish.leftElbow = v(-0.52, 1.86, 0);
  finish.rightElbow = v(0.52, 1.86, 0);
  finish.leftWrist = v(-0.5, 2.17, 0.35);
  finish.rightWrist = alternating
    ? v(0.5, 1.18, 0.08)
    : v(0.5, 2.17, 0.35);
  return {
    start,
    finish,
    equipment: neutral || alternating ? ("dumbbells" as const) : ("barbell" as const),
  };
}

function tricepsPushdown() {
  const start = standingPose();
  start.leftElbow = v(-0.38, 1.93, 0.08);
  start.rightElbow = v(0.38, 1.93, 0.08);
  start.leftWrist = v(-0.26, 1.55, 0.18);
  start.rightWrist = v(0.26, 1.55, 0.18);
  const finish = clonePose(start);
  finish.leftWrist = v(-0.38, 1.08, 0.12);
  finish.rightWrist = v(0.38, 1.08, 0.12);
  return { start, finish, equipment: "cable" as const };
}

function cableCrunch() {
  const start = kneelingPose();
  start.leftElbow = v(-0.24, 1.92, 0.06);
  start.rightElbow = v(0.24, 1.92, 0.06);
  start.leftWrist = v(-0.16, 2.1, 0.12);
  start.rightWrist = v(0.16, 2.1, 0.12);
  const finish = clonePose(start);
  finish.head = v(0, 1.54, -0.18);
  finish.neck = v(0, 1.46, -0.12);
  finish.chest = v(0, 1.3, -0.04);
  finish.pelvis = v(0, 0.96, 0.1);
  finish.leftShoulder = v(-0.32, 1.44, -0.04);
  finish.rightShoulder = v(0.32, 1.44, -0.04);
  finish.leftElbow = v(-0.18, 1.18, -0.02);
  finish.rightElbow = v(0.18, 1.18, -0.02);
  finish.leftWrist = v(-0.1, 1.0, 0.02);
  finish.rightWrist = v(0.1, 1.0, 0.02);
  return { start, finish, equipment: "cable" as const };
}

function machinePress() {
  const start = seatedPose();
  start.chest = v(0, 1.92, -0.05);
  start.pelvis = v(0, 1.2, 0.08);
  start.leftElbow = v(-0.54, 1.8, 0.08);
  start.rightElbow = v(0.54, 1.8, 0.08);
  start.leftWrist = v(-0.36, 1.76, 0.22);
  start.rightWrist = v(0.36, 1.76, 0.22);
  const finish = clonePose(start);
  finish.leftElbow = v(-0.42, 1.78, 0.18);
  finish.rightElbow = v(0.42, 1.78, 0.18);
  finish.leftWrist = v(-0.28, 1.76, 0.78);
  finish.rightWrist = v(0.28, 1.76, 0.78);
  return { start, finish, equipment: "chest-press" as const };
}

function pecDeck() {
  const start = seatedPose();
  start.leftElbow = v(-0.92, 1.95, 0.14);
  start.rightElbow = v(0.92, 1.95, 0.14);
  start.leftWrist = v(-1.08, 1.74, 0.22);
  start.rightWrist = v(1.08, 1.74, 0.22);
  const finish = clonePose(start);
  finish.leftElbow = v(-0.32, 1.92, 0.28);
  finish.rightElbow = v(0.32, 1.92, 0.28);
  finish.leftWrist = v(-0.12, 1.76, 0.54);
  finish.rightWrist = v(0.12, 1.76, 0.54);
  return { start, finish, equipment: "pec-deck" as const };
}

function pullUp() {
  const start = standingPose();
  start.head = v(0, 2.2, 0.04);
  start.neck = v(0, 1.92, 0.03);
  start.chest = v(0, 1.55, 0.02);
  start.pelvis = v(0, 0.82, 0.04);
  start.leftShoulder = v(-0.42, 1.84, 0.02);
  start.rightShoulder = v(0.42, 1.84, 0.02);
  start.leftElbow = v(-0.62, 2.42, 0.08);
  start.rightElbow = v(0.62, 2.42, 0.08);
  start.leftWrist = v(-0.78, 2.94, 0.12);
  start.rightWrist = v(0.78, 2.94, 0.12);
  start.leftHip = v(-0.22, 0.8, 0.08);
  start.rightHip = v(0.22, 0.8, 0.08);
  start.leftKnee = v(-0.24, 0.35, 0.22);
  start.rightKnee = v(0.24, 0.35, 0.22);
  start.leftAnkle = v(-0.26, 0.06, 0.42);
  start.rightAnkle = v(0.26, 0.06, 0.42);
  const finish = clonePose(start);
  finish.head = v(0, 2.7, 0.16);
  finish.neck = v(0, 2.45, 0.12);
  finish.chest = v(0, 2.08, 0.1);
  finish.pelvis = v(0, 1.32, 0.14);
  finish.leftShoulder = v(-0.42, 2.35, 0.1);
  finish.rightShoulder = v(0.42, 2.35, 0.1);
  finish.leftElbow = v(-0.62, 2.62, 0.14);
  finish.rightElbow = v(0.62, 2.62, 0.14);
  finish.leftWrist = v(-0.78, 2.94, 0.12);
  finish.rightWrist = v(0.78, 2.94, 0.12);
  finish.leftHip = v(-0.22, 1.3, 0.14);
  finish.rightHip = v(0.22, 1.3, 0.14);
  finish.leftKnee = v(-0.22, 0.86, 0.22);
  finish.rightKnee = v(0.22, 0.86, 0.22);
  finish.leftAnkle = v(-0.24, 0.48, 0.44);
  finish.rightAnkle = v(0.24, 0.48, 0.44);
  return { start, finish, equipment: "pull-up" as const };
}

function assistedPullUp() {
  const start = pullUp().start;
  start.leftKnee = v(-0.16, 0.56, 0.18);
  start.rightKnee = v(0.16, 0.56, 0.18);
  start.leftAnkle = v(-0.14, 0.24, 0.42);
  start.rightAnkle = v(0.14, 0.24, 0.42);
  const finish = clonePose(start);
  finish.head = v(0, 2.55, 0.16);
  finish.neck = v(0, 2.32, 0.12);
  finish.chest = v(0, 1.98, 0.1);
  finish.pelvis = v(0, 1.28, 0.16);
  finish.leftShoulder = v(-0.42, 2.24, 0.1);
  finish.rightShoulder = v(0.42, 2.24, 0.1);
  finish.leftElbow = v(-0.62, 2.54, 0.14);
  finish.rightElbow = v(0.62, 2.54, 0.14);
  finish.leftWrist = v(-0.78, 2.94, 0.12);
  finish.rightWrist = v(0.78, 2.94, 0.12);
  finish.leftHip = v(-0.22, 1.24, 0.18);
  finish.rightHip = v(0.22, 1.24, 0.18);
  finish.leftKnee = v(-0.14, 0.92, 0.2);
  finish.rightKnee = v(0.14, 0.92, 0.2);
  finish.leftAnkle = v(-0.12, 0.62, 0.42);
  finish.rightAnkle = v(0.12, 0.62, 0.42);
  return { start, finish, equipment: "pull-up" as const };
}

function hackSquat() {
  const start = standingPose();
  start.head = v(0, 2.8, 0.32);
  start.neck = v(0, 2.5, 0.25);
  start.chest = v(0, 2.12, 0.16);
  start.pelvis = v(0, 1.38, 0);
  const finish = clonePose(start);
  finish.head = v(0, 2.2, 0.36);
  finish.neck = v(0, 1.92, 0.28);
  finish.chest = v(0, 1.55, 0.18);
  finish.pelvis = v(0, 0.84, 0.08);
  finish.leftShoulder = v(-0.45, 1.82, 0.23);
  finish.rightShoulder = v(0.45, 1.82, 0.23);
  finish.leftHip = v(-0.24, 0.82, 0.08);
  finish.rightHip = v(0.24, 0.82, 0.08);
  finish.leftKnee = v(-0.43, 0.48, -0.25);
  finish.rightKnee = v(0.43, 0.48, -0.25);
  return { start, finish, equipment: "hack-squat" as const };
}

function legExtension() {
  const start = seatedPose();
  start.leftKnee = v(-0.3, 0.9, 0.82);
  start.rightKnee = v(0.3, 0.9, 0.82);
  start.leftAnkle = v(-0.3, 0.15, 0.92);
  start.rightAnkle = v(0.3, 0.15, 0.92);
  const finish = clonePose(start);
  finish.leftAnkle = v(-0.3, 0.84, -0.05);
  finish.rightAnkle = v(0.3, 0.84, -0.05);
  return { start, finish, equipment: "leg-extension" as const };
}

function legCurl() {
  const start = seatedPose();
  start.leftKnee = v(-0.3, 0.9, 0.82);
  start.rightKnee = v(0.3, 0.9, 0.82);
  start.leftAnkle = v(-0.3, 0.78, -0.05);
  start.rightAnkle = v(0.3, 0.78, -0.05);
  const finish = clonePose(start);
  finish.leftAnkle = v(-0.3, 0.18, 0.82);
  finish.rightAnkle = v(0.3, 0.18, 0.82);
  return { start, finish, equipment: "leg-curl" as const };
}

function hipThrust() {
  const start = lyingBenchPose();
  start.head = v(0, 1.12, -0.88);
  start.neck = v(0, 1.02, -0.58);
  start.chest = v(0, 0.98, -0.25);
  start.pelvis = v(0, 0.55, 0.5);
  start.leftHip = v(-0.24, 0.54, 0.48);
  start.rightHip = v(0.24, 0.54, 0.48);
  start.leftKnee = v(-0.3, 0.72, 1.12);
  start.rightKnee = v(0.3, 0.72, 1.12);
  start.leftAnkle = v(-0.33, 0.08, 1.35);
  start.rightAnkle = v(0.33, 0.08, 1.35);
  const finish = clonePose(start);
  finish.pelvis = v(0, 1.1, 0.35);
  finish.leftHip = v(-0.24, 1.08, 0.34);
  finish.rightHip = v(0.24, 1.08, 0.34);
  return { start, finish, equipment: "hip-thrust" as const };
}

function calfRaise() {
  const start = standingPose();
  const finish = clonePose(start);
  for (const key of poseKeys) {
    if (key !== "leftAnkle" && key !== "rightAnkle") finish[key][1] += 0.22;
  }
  finish.leftAnkle = v(-0.3, 0.18, 0);
  finish.rightAnkle = v(0.3, 0.18, 0);
  return { start, finish, equipment: "calf-raise" as const };
}

function preacherCurl() {
  const start = seatedPose();
  start.leftShoulder = v(-0.38, 2.08, 0.06);
  start.rightShoulder = v(0.38, 2.08, 0.06);
  start.leftElbow = v(-0.28, 1.48, 0.28);
  start.rightElbow = v(0.28, 1.48, 0.28);
  start.leftWrist = v(-0.28, 1.04, 0.54);
  start.rightWrist = v(0.28, 1.04, 0.54);
  const finish = clonePose(start);
  finish.leftElbow = v(-0.26, 1.56, 0.24);
  finish.rightElbow = v(0.26, 1.56, 0.24);
  finish.leftWrist = v(-0.22, 1.68, 0.34);
  finish.rightWrist = v(0.22, 1.68, 0.34);
  return { start, finish, equipment: "preacher" as const };
}

function assistedDip() {
  const start = standingPose();
  start.head = v(0, 2.42, 0.08);
  start.neck = v(0, 2.16, 0.06);
  start.chest = v(0, 1.82, 0.08);
  start.pelvis = v(0, 1.16, 0.14);
  start.leftShoulder = v(-0.4, 2.02, 0.08);
  start.rightShoulder = v(0.4, 2.02, 0.08);
  start.leftElbow = v(-0.5, 1.72, 0.1);
  start.rightElbow = v(0.5, 1.72, 0.1);
  start.leftWrist = v(-0.56, 1.38, 0.12);
  start.rightWrist = v(0.56, 1.38, 0.12);
  start.leftHip = v(-0.22, 1.12, 0.16);
  start.rightHip = v(0.22, 1.12, 0.16);
  start.leftKnee = v(-0.14, 0.8, 0.22);
  start.rightKnee = v(0.14, 0.8, 0.22);
  start.leftAnkle = v(-0.12, 0.52, 0.44);
  start.rightAnkle = v(0.12, 0.52, 0.44);
  const finish = clonePose(start);
  finish.head = v(0, 2.18, 0.12);
  finish.neck = v(0, 1.95, 0.1);
  finish.chest = v(0, 1.6, 0.14);
  finish.pelvis = v(0, 0.98, 0.2);
  finish.leftShoulder = v(-0.42, 1.82, 0.14);
  finish.rightShoulder = v(0.42, 1.82, 0.14);
  finish.leftElbow = v(-0.56, 1.46, 0.12);
  finish.rightElbow = v(0.56, 1.46, 0.12);
  finish.leftWrist = v(-0.56, 1.14, 0.12);
  finish.rightWrist = v(0.56, 1.14, 0.12);
  finish.leftHip = v(-0.22, 0.98, 0.22);
  finish.rightHip = v(0.22, 0.98, 0.22);
  finish.leftKnee = v(-0.12, 0.66, 0.24);
  finish.rightKnee = v(0.12, 0.66, 0.24);
  finish.leftAnkle = v(-0.1, 0.4, 0.44);
  finish.rightAnkle = v(0.1, 0.4, 0.44);
  return { start, finish, equipment: "dip" as const };
}

function abCrunch() {
  const start = seatedPose();
  const finish = clonePose(start);
  finish.head = v(0, 1.62, -0.58);
  finish.neck = v(0, 1.52, -0.38);
  finish.chest = v(0, 1.36, -0.08);
  finish.leftShoulder = v(-0.4, 1.48, -0.22);
  finish.rightShoulder = v(0.4, 1.48, -0.22);
  finish.leftElbow = v(-0.48, 1.3, -0.52);
  finish.rightElbow = v(0.48, 1.3, -0.52);
  finish.leftWrist = v(-0.38, 1.12, -0.72);
  finish.rightWrist = v(0.38, 1.12, -0.72);
  return { start, finish, equipment: "ab-crunch" as const };
}

function abWheel() {
  const start = kneelingPose();
  start.head = v(0, 1.86, -0.04);
  start.neck = v(0, 1.74, -0.02);
  start.chest = v(0, 1.56, 0.02);
  start.pelvis = v(0, 1.0, 0.12);
  start.leftShoulder = v(-0.34, 1.62, -0.08);
  start.rightShoulder = v(0.34, 1.62, -0.08);
  start.leftElbow = v(-0.28, 1.1, -0.22);
  start.rightElbow = v(0.28, 1.1, -0.22);
  start.leftWrist = v(-0.14, 0.46, -0.36);
  start.rightWrist = v(0.14, 0.46, -0.36);
  const finish = clonePose(start);
  finish.head = v(0, 1.38, -0.82);
  finish.neck = v(0, 1.3, -0.62);
  finish.chest = v(0, 1.2, -0.26);
  finish.pelvis = v(0, 1.0, 0.08);
  finish.leftShoulder = v(-0.34, 1.24, -0.46);
  finish.rightShoulder = v(0.34, 1.24, -0.46);
  finish.leftElbow = v(-0.24, 0.88, -0.72);
  finish.rightElbow = v(0.24, 0.88, -0.72);
  finish.leftWrist = v(-0.12, 0.44, -1.04);
  finish.rightWrist = v(0.12, 0.44, -1.04);
  finish.leftHip = v(-0.22, 1.0, 0.08);
  finish.rightHip = v(0.22, 1.0, 0.08);
  finish.leftKnee = v(-0.2, 0.18, 0.18);
  finish.rightKnee = v(0.2, 0.18, 0.18);
  finish.leftAnkle = v(-0.18, 0.08, 0.68);
  finish.rightAnkle = v(0.18, 0.08, 0.68);
  return { start, finish, equipment: "ab-wheel" as const };
}

function treadmillWalk(progress: number) {
  const pose = standingPose();
  const swing = Math.sin(progress * Math.PI * 2);
  const lift = Math.max(0, Math.sin(progress * Math.PI * 2));
  pose.leftElbow = v(-0.5, 1.9, 0.28 * swing);
  pose.rightElbow = v(0.5, 1.9, -0.28 * swing);
  pose.leftWrist = v(-0.48, 1.42, 0.5 * swing);
  pose.rightWrist = v(0.48, 1.42, -0.5 * swing);
  pose.leftKnee = v(-0.27, 0.68 + lift * 0.2, -0.4 * swing);
  pose.rightKnee = v(0.27, 0.68 + (1 - lift) * 0.12, 0.4 * swing);
  pose.leftAnkle = v(-0.3, 0.08 + lift * 0.12, -0.58 * swing);
  pose.rightAnkle = v(0.3, 0.08 + (1 - lift) * 0.08, 0.58 * swing);
  return { start: pose, finish: pose, equipment: "treadmill" as const };
}

function standingDrill(progress: number) {
  const pose = standingPose();
  const wave = Math.sin(progress * Math.PI * 2);
  const waveAbs = Math.max(0, Math.sin(progress * Math.PI * 2));
  pose.head = v(0, 2.84, 0.02 * wave);
  pose.chest = v(0, 2.1, 0.03 * wave);
  pose.pelvis = v(0, 1.37, -0.02 * wave);
  pose.leftElbow = v(-0.5, 1.82, 0.08);
  pose.rightElbow = v(0.5, 1.88, -0.04);
  pose.leftWrist = v(-0.48, 1.24, 0.12);
  pose.rightWrist = v(0.48, 1.24, -0.02);
  pose.leftKnee = v(-0.27, 0.74 + waveAbs * 0.12, 0.1);
  pose.leftAnkle = v(-0.28, 0.14 + waveAbs * 0.1, 0.26);
  pose.rightKnee = v(0.27, 0.67, -0.02);
  pose.rightAnkle = v(0.28, 0.06, -0.02);
  return { start: pose, finish: pose, equipment: "none" as const };
}

function alternatingCurl(progress: number) {
  const pose = standingPose();
  const leftPhase = (Math.sin(progress * Math.PI * 2) + 1) / 2;
  const rightPhase = (Math.sin(progress * Math.PI * 2 + Math.PI) + 1) / 2;
  pose.leftElbow = v(-0.5, 1.82 + 0.12 * leftPhase, 0.04);
  pose.rightElbow = v(0.5, 1.82 + 0.12 * rightPhase, 0.04);
  pose.leftWrist = v(-0.48, 1.18 + 0.95 * leftPhase, 0.12 + 0.18 * leftPhase);
  pose.rightWrist = v(0.48, 1.18 + 0.95 * rightPhase, 0.12 + 0.18 * rightPhase);
  return { start: pose, finish: pose, equipment: "dumbbells" as const };
}

function resolveMotion(preset: ExerciseGuidePreset, progress: number) {
  switch (preset) {
    case "bench-press":
      return benchPress();
    case "incline-press":
      return inclinePress();
    case "lat-pulldown":
      return latPulldown();
    case "seated-row":
      return seatedRow();
    case "back-squat":
      return backSquat();
    case "leg-press":
      return legPress();
    case "romanian-deadlift":
      return romanianDeadlift();
    case "split-squat":
      return splitSquat();
    case "shoulder-press":
      return shoulderPress();
    case "lateral-raise":
      return lateralRaise();
    case "barbell-curl":
      return curl(false, false);
    case "hammer-curl":
      return curl(true, false);
    case "triceps-pushdown":
      return tricepsPushdown();
    case "cable-crunch":
      return cableCrunch();
    case "machine-press":
      return machinePress();
    case "pec-deck":
      return pecDeck();
    case "assisted-pull-up":
      return assistedPullUp();
    case "hack-squat":
      return hackSquat();
    case "leg-extension":
      return legExtension();
    case "leg-curl":
      return legCurl();
    case "hip-thrust":
      return hipThrust();
    case "calf-raise":
      return calfRaise();
    case "preacher-curl":
      return preacherCurl();
    case "assisted-dip":
      return assistedDip();
    case "ab-crunch":
      return abCrunch();
    case "ab-wheel-rollout":
      return abWheel();
    case "alternating-curl":
      return alternatingCurl(progress);
    case "treadmill-walk":
      return treadmillWalk(progress);
    case "standing":
      return standingDrill(progress);
    case "plank": {
      const start = plankPose();
      const finish = clonePose(start);
      finish.chest[1] += 0.025;
      finish.pelvis[1] += 0.02;
      return { start, finish, equipment: "mat" as const };
    }
    default:
      return standingDrill(progress);
  }
}

function easeInOut(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  return 0.5 - Math.cos(clamped * Math.PI) / 2;
}

export function getExercise3DScene(
  preset: ExerciseGuidePreset,
  progress: number
): ExerciseScene3D {
  const motion = resolveMotion(preset, progress);
  const localProgress = preset === "treadmill-walk" ? 0 : easeInOut(progress);
  const preparedStart = DEPTH_FLIPPED_PRESETS.has(preset)
    ? mirrorPoseDepth(motion.start)
    : motion.start;
  const preparedFinish = DEPTH_FLIPPED_PRESETS.has(preset)
    ? mirrorPoseDepth(motion.finish)
    : motion.finish;
  const rawPose = interpolatePose(preparedStart, preparedFinish, localProgress);
  const stabilizedPose = stabilizeInterpolatedPose(rawPose, preparedStart, preparedFinish);
  const pose = calibratePoseForPreset(preset, stabilizedPose);
  const lowScene = [
    "bench-press",
    "incline-press",
    "leg-press",
    "hip-thrust",
    "ab-wheel-rollout",
    "plank",
    "assisted-pull-up",
    "assisted-dip",
  ].includes(preset);

  return {
    pose,
    equipment: motion.equipment,
    cameraDistance: lowScene ? 5.8 : 5.2,
    cameraTargetY: lowScene ? 1.05 : 1.55,
    groundY: 0,
  };
}

export const SUPPORTED_3D_PRESETS: ExerciseGuidePreset[] = [
  "bench-press",
  "incline-press",
  "lat-pulldown",
  "seated-row",
  "back-squat",
  "leg-press",
  "romanian-deadlift",
  "split-squat",
  "shoulder-press",
  "lateral-raise",
  "barbell-curl",
  "hammer-curl",
  "triceps-pushdown",
  "cable-crunch",
  "machine-press",
  "pec-deck",
  "assisted-pull-up",
  "hack-squat",
  "leg-extension",
  "leg-curl",
  "hip-thrust",
  "calf-raise",
  "preacher-curl",
  "assisted-dip",
  "ab-crunch",
  "ab-wheel-rollout",
  "alternating-curl",
  "treadmill-walk",
  "plank",
  "standing",
];
