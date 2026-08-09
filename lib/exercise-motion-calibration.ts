import type { ExerciseScenePreset } from "@/lib/exercise-3d-guides";

export type MotionVector = [number, number, number];

export type CalibratedPose = {
  rootX: number;
  rootY: number;
  rootZ: number;
  rootRotationX: number;
  rootRotationY: number;
  rootRotationZ: number;
  torsoX: number;
  torsoZ: number;
  torsoScaleX: number;
  torsoScaleY: number;
  torsoScaleZ: number;
  leftUpperArm: MotionVector;
  rightUpperArm: MotionVector;
  leftForearm: MotionVector;
  rightForearm: MotionVector;
  leftThigh: MotionVector;
  rightThigh: MotionVector;
  leftShin: MotionVector;
  rightShin: MotionVector;
};

type PoseInput = Partial<CalibratedPose>;

const PI = Math.PI;

const STANDING: CalibratedPose = {
  rootX: 0,
  rootY: 0.12,
  rootZ: 0,
  rootRotationX: 0,
  rootRotationY: 0,
  rootRotationZ: 0,
  torsoX: 0,
  torsoZ: 0,
  torsoScaleX: 1,
  torsoScaleY: 1,
  torsoScaleZ: 1,
  leftUpperArm: [-0.06, -0.99, 0.08],
  rightUpperArm: [0.06, -0.99, 0.08],
  leftForearm: [-0.02, -1, 0.04],
  rightForearm: [0.02, -1, 0.04],
  leftThigh: [-0.08, -1, 0],
  rightThigh: [0.08, -1, 0],
  leftShin: [-0.02, -1, 0.04],
  rightShin: [0.02, -1, 0.04],
};

const SEATED: CalibratedPose = {
  ...STANDING,
  rootY: -0.85,
  leftThigh: [-0.08, -0.12, 0.99],
  rightThigh: [0.08, -0.12, 0.99],
  leftShin: [-0.02, -0.99, 0.1],
  rightShin: [0.02, -0.99, 0.1],
};

const KNEELING: CalibratedPose = {
  ...STANDING,
  rootY: -0.62,
  leftThigh: [-0.06, -0.92, 0.4],
  rightThigh: [0.06, -0.92, 0.4],
  leftShin: [-0.03, -0.08, -1],
  rightShin: [0.03, -0.08, -1],
};

const BENCH: CalibratedPose = {
  ...STANDING,
  rootY: 1.26,
  rootZ: 0,
  rootRotationX: -PI / 2,
  leftUpperArm: [-0.06, 1, 0],
  rightUpperArm: [0.06, 1, 0],
  leftForearm: [-0.03, 1, 0],
  rightForearm: [0.03, 1, 0],
  leftThigh: [-0.08, -0.32, 0.94],
  rightThigh: [0.08, -0.32, 0.94],
  leftShin: [-0.03, -0.92, 0.39],
  rightShin: [0.03, -0.92, 0.39],
};

const VECTOR_KEYS: Array<
  keyof Pick<
    CalibratedPose,
    | "leftUpperArm"
    | "rightUpperArm"
    | "leftForearm"
    | "rightForearm"
    | "leftThigh"
    | "rightThigh"
    | "leftShin"
    | "rightShin"
  >
> = [
  "leftUpperArm",
  "rightUpperArm",
  "leftForearm",
  "rightForearm",
  "leftThigh",
  "rightThigh",
  "leftShin",
  "rightShin",
];

const NUMBER_KEYS: Array<
  keyof Pick<
    CalibratedPose,
    | "rootX"
    | "rootY"
    | "rootZ"
    | "rootRotationX"
    | "rootRotationY"
    | "rootRotationZ"
    | "torsoX"
    | "torsoZ"
    | "torsoScaleX"
    | "torsoScaleY"
    | "torsoScaleZ"
  >
> = [
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

function blendVector(
  start: MotionVector,
  end: MotionVector,
  amount: number
): MotionVector {
  const startLength = Math.hypot(...start) || 1;
  const endLength = Math.hypot(...end) || 1;
  const from: MotionVector = [
    start[0] / startLength,
    start[1] / startLength,
    start[2] / startLength,
  ];
  const to: MotionVector = [
    end[0] / endLength,
    end[1] / endLength,
    end[2] / endLength,
  ];
  const dot = Math.max(
    -1,
    Math.min(
      1,
      from[0] * to[0] +
        from[1] * to[1] +
        from[2] * to[2]
    )
  );

  if (dot > 0.9995) {
    const blended: MotionVector = [
      from[0] + (to[0] - from[0]) * amount,
      from[1] + (to[1] - from[1]) * amount,
      from[2] + (to[2] - from[2]) * amount,
    ];
    const length = Math.hypot(...blended) || 1;

    return [
      blended[0] / length,
      blended[1] / length,
      blended[2] / length,
    ];
  }

  if (dot < -0.9995) {
    const axis: MotionVector =
      Math.abs(from[1]) < 0.9
        ? [-from[2], 0, from[0]]
        : [from[1], -from[0], 0];
    const axisLength = Math.hypot(...axis) || 1;
    const perpendicular: MotionVector = [
      axis[0] / axisLength,
      axis[1] / axisLength,
      axis[2] / axisLength,
    ];
    const angle = Math.PI * amount;

    return [
      from[0] * Math.cos(angle) +
        perpendicular[0] * Math.sin(angle),
      from[1] * Math.cos(angle) +
        perpendicular[1] * Math.sin(angle),
      from[2] * Math.cos(angle) +
        perpendicular[2] * Math.sin(angle),
    ];
  }

  const theta = Math.acos(dot);
  const relativeLength = Math.sqrt(1 - dot * dot);
  const relative: MotionVector = [
    (to[0] - from[0] * dot) / relativeLength,
    (to[1] - from[1] * dot) / relativeLength,
    (to[2] - from[2] * dot) / relativeLength,
  ];
  const angle = theta * amount;

  return [
    from[0] * Math.cos(angle) +
      relative[0] * Math.sin(angle),
    from[1] * Math.cos(angle) +
      relative[1] * Math.sin(angle),
    from[2] * Math.cos(angle) +
      relative[2] * Math.sin(angle),
  ];
}

function interpolate(
  base: CalibratedPose,
  startInput: PoseInput,
  endInput: PoseInput,
  amount: number
): CalibratedPose {
  const start = {
    ...base,
    ...startInput,
  } as CalibratedPose;
  const end = {
    ...base,
    ...endInput,
  } as CalibratedPose;
  const result = {
    ...base,
  } as CalibratedPose;

  for (const key of NUMBER_KEYS) {
    result[key] =
      start[key] + (end[key] - start[key]) * amount;
  }

  for (const key of VECTOR_KEYS) {
    result[key] = blendVector(
      start[key],
      end[key],
      amount
    );
  }

  return result;
}

function getRawCalibratedPose(
  preset: ExerciseScenePreset,
  amount: number
): CalibratedPose {
  switch (preset) {
    case "standing":
      return interpolate(
        STANDING,
        {
          rootY: 0.12,
          torsoScaleX: 1,
          torsoScaleY: 0.992,
          torsoScaleZ: 0.985,
          leftUpperArm: [-0.06, -0.99, 0.08],
          rightUpperArm: [0.06, -0.99, 0.08],
        },
        {
          rootY: 0.145,
          torsoScaleX: 1.012,
          torsoScaleY: 1.018,
          torsoScaleZ: 1.03,
          leftUpperArm: [-0.075, -0.987, 0.095],
          rightUpperArm: [0.075, -0.987, 0.095],
        },
        amount
      );

    case "bench-press":
      return interpolate(
        BENCH,
        {
          leftUpperArm: [-0.82, -0.2, 0],
          rightUpperArm: [0.82, -0.2, 0],
          leftForearm: [0.62, 0.78, 0],
          rightForearm: [-0.62, 0.78, 0],
        },
        {
          leftUpperArm: [-0.25, 0.97, 0],
          rightUpperArm: [0.25, 0.97, 0],
          leftForearm: [-0.15, 0.99, 0],
          rightForearm: [0.15, 0.99, 0],
        },
        amount
      );

    case "incline-press":
      return interpolate(
        {
          ...BENCH,
          rootY: 0.92,
          rootZ: 0.28,
          rootRotationX: -1.03,
        },
        {
          leftUpperArm: [-0.76, -0.05, 0.32],
          rightUpperArm: [0.76, -0.05, 0.32],
          leftForearm: [0.52, 0.84, 0.12],
          rightForearm: [-0.52, 0.84, 0.12],
          leftThigh: [-0.08, -0.78, 0.62],
          rightThigh: [0.08, -0.78, 0.62],
          leftShin: [-0.03, -0.99, 0.12],
          rightShin: [0.03, -0.99, 0.12],
        },
        {
          leftUpperArm: [-0.1, 0.98, 0.14],
          rightUpperArm: [0.1, 0.98, 0.14],
          leftForearm: [-0.04, 0.99, 0.08],
          rightForearm: [0.04, 0.99, 0.08],
          leftThigh: [-0.08, -0.78, 0.62],
          rightThigh: [0.08, -0.78, 0.62],
          leftShin: [-0.03, -0.99, 0.12],
          rightShin: [0.03, -0.99, 0.12],
        },
        amount
      );

    case "lat-pulldown":
      return interpolate(
        SEATED,
        {
          rootY: -0.83,
          torsoX: -0.03,
          leftUpperArm: [-0.36, 0.93, 0.04],
          rightUpperArm: [0.36, 0.93, 0.04],
          leftForearm: [-0.18, 0.98, 0.06],
          rightForearm: [0.18, 0.98, 0.06],
        },
        {
          rootY: -0.87,
          torsoX: 0.05,
          leftUpperArm: [-0.72, -0.68, 0.12],
          rightUpperArm: [0.72, -0.68, 0.12],
          leftForearm: [0.18, 0.98, 0.02],
          rightForearm: [-0.18, 0.98, 0.02],
        },
        amount
      );

    case "seated-row":
      return interpolate(
        SEATED,
        {
          torsoX: 0.09,
          rootZ: 0.02,
          leftUpperArm: [-0.24, -0.06, 0.97],
          rightUpperArm: [0.24, -0.06, 0.97],
          leftForearm: [0.52, 0.03, 0.85],
          rightForearm: [-0.52, 0.03, 0.85],
        },
        {
          torsoX: -0.08,
          rootZ: -0.02,
          leftUpperArm: [-0.62, -0.34, 0.71],
          rightUpperArm: [0.62, -0.34, 0.71],
          leftForearm: [0.96, 0.21, 0.18],
          rightForearm: [-0.96, 0.21, 0.18],
        },
        amount
      );

    case "back-squat":
      return interpolate(
        STANDING,
        {
          leftUpperArm: [-0.753, -0.564, 0.337],
          rightUpperArm: [0.753, -0.564, 0.337],
          leftForearm: [0.557, 0.385, -0.785],
          rightForearm: [-0.557, 0.385, -0.785],
        },
        {
          rootY: -0.53,
          rootZ: -0.166,
          torsoX: 0.22,
          leftUpperArm: [-0.672, -0.734, 0.097],
          rightUpperArm: [0.672, -0.734, 0.097],
          leftForearm: [0.488, 0.666, -0.564],
          rightForearm: [-0.488, 0.666, -0.564],
          leftThigh: [-0.08, -0.62, 0.78],
          rightThigh: [0.08, -0.62, 0.78],
          leftShin: [-0.02, -0.78, -0.62],
          rightShin: [0.02, -0.78, -0.62],
        },
        amount
      );

    case "leg-press":
      return interpolate(
        {
          ...SEATED,
          rootY: 0.25,
          rootZ: -0.7,
          rootRotationX: -0.48,
          leftUpperArm: [-0.08, -0.96, -0.25],
          rightUpperArm: [0.08, -0.96, -0.25],
          leftForearm: [-0.04, -0.98, -0.18],
          rightForearm: [0.04, -0.98, -0.18],
        },
        {
          leftThigh: [-0.08, 0.2, 0.98],
          rightThigh: [0.08, 0.2, 0.98],
          leftShin: [-0.04, 0.97, -0.24],
          rightShin: [0.04, 0.97, -0.24],
        },
        {
          leftThigh: [-0.08, 0.42, 0.9],
          rightThigh: [0.08, 0.42, 0.9],
          leftShin: [-0.04, 0.42, 0.9],
          rightShin: [0.04, 0.42, 0.9],
        },
        amount
      );

    case "romanian-deadlift":
      return interpolate(
        STANDING,
        {
          leftUpperArm: [-0.06, -1, 0],
          rightUpperArm: [0.06, -1, 0],
          leftForearm: [-0.02, -1, 0],
          rightForearm: [0.02, -1, 0],
        },
        {
          rootY: 0.08,
          rootZ: -0.24,
          torsoX: 1.0,
          leftUpperArm: [-0.06, -1, 0],
          rightUpperArm: [0.06, -1, 0],
          leftForearm: [-0.02, -1, 0],
          rightForearm: [0.02, -1, 0],
          leftThigh: [-0.08, -0.98, -0.16],
          rightThigh: [0.08, -0.98, -0.16],
          leftShin: [-0.02, -0.98, 0.18],
          rightShin: [0.02, -0.98, 0.18],
        },
        amount
      );

    case "split-squat":
      return interpolate(
        {
          ...STANDING,
          leftThigh: [-0.08, -0.92, 0.38],
          rightThigh: [0.08, -0.94, -0.33],
          leftShin: [-0.03, -0.98, -0.17],
          rightShin: [0.03, 0, -1],
        },
        {},
        {
          rootY: -0.365,
          rootZ: -0.138,
          torsoX: 0.1,
          leftThigh: [-0.08, -0.58, 0.81],
          rightThigh: [0.08, -0.944, -0.32],
          leftShin: [-0.03, -0.87, -0.49],
          rightShin: [0.03, 0.48, -0.876],
        },
        amount
      );

    case "shoulder-press":
      return interpolate(
        SEATED,
        {
          leftUpperArm: [-0.946, 0.305, -0.108],
          rightUpperArm: [0.946, 0.305, -0.108],
          leftForearm: [0.837, 0.5, 0.222],
          rightForearm: [-0.837, 0.5, 0.222],
        },
        {
          leftUpperArm: [-0.322, 0.946, -0.028],
          rightUpperArm: [0.322, 0.946, -0.028],
          leftForearm: [0.111, 0.992, 0.057],
          rightForearm: [-0.111, 0.992, 0.057],
        },
        amount
      );

    case "lateral-raise":
      return interpolate(
        STANDING,
        {
          leftUpperArm: [-0.08, -0.99, 0.06],
          rightUpperArm: [0.08, -0.99, 0.06],
          leftForearm: [-0.04, -0.99, 0.08],
          rightForearm: [0.04, -0.99, 0.08],
        },
        {
          leftUpperArm: [-0.98, 0.1, 0.08],
          rightUpperArm: [0.98, 0.1, 0.08],
          leftForearm: [-0.92, -0.16, 0.35],
          rightForearm: [0.92, -0.16, 0.35],
        },
        amount
      );

    case "barbell-curl":
      return interpolate(
        STANDING,
        {
          leftUpperArm: [-0.08, -0.99, 0.08],
          rightUpperArm: [0.08, -0.99, 0.08],
          leftForearm: [-0.02, -0.98, 0.18],
          rightForearm: [0.02, -0.98, 0.18],
        },
        {
          leftUpperArm: [-0.08, -0.99, 0.08],
          rightUpperArm: [0.08, -0.99, 0.08],
          leftForearm: [0.02, 0.78, 0.62],
          rightForearm: [-0.02, 0.78, 0.62],
        },
        amount
      );

    case "hammer-curl":
      return interpolate(
        STANDING,
        {},
        {
          leftForearm: [0, 0.82, 0.57],
          rightForearm: [0, 0.82, 0.57],
        },
        amount
      );

    case "triceps-pushdown":
      return interpolate(
        STANDING,
        {
          leftUpperArm: [-0.05, -0.95, 0.3],
          rightUpperArm: [0.05, -0.95, 0.3],
          leftForearm: [0.685, 0.456, 0.568],
          rightForearm: [-0.685, 0.456, 0.568],
        },
        {
          leftUpperArm: [-0.05, -0.95, 0.3],
          rightUpperArm: [0.05, -0.95, 0.3],
          leftForearm: [0.27, -0.962, 0.044],
          rightForearm: [-0.27, -0.962, 0.044],
        },
        amount
      );

    case "cable-crunch":
      return interpolate(
        KNEELING,
        {
          leftUpperArm: [-0.263, 0.883, 0.389],
          rightUpperArm: [0.263, 0.883, 0.389],
          leftForearm: [0.837, -0.466, -0.288],
          rightForearm: [-0.837, -0.466, -0.288],
        },
        {
          rootY: -0.68,
          torsoX: 0.88,
          leftUpperArm: [-0.291, 0.953, -0.085],
          rightUpperArm: [0.291, 0.953, -0.085],
          leftForearm: [0.866, -0.484, -0.124],
          rightForearm: [-0.866, -0.484, -0.124],
        },
        amount
      );

    case "machine-press":
      return interpolate(
        SEATED,
        {
          leftUpperArm: [-0.671, -0.542, 0.506],
          rightUpperArm: [0.671, -0.542, 0.506],
          leftForearm: [0.75, 0.493, 0.441],
          rightForearm: [-0.75, 0.493, 0.441],
        },
        {
          leftUpperArm: [-0.215, -0.151, 0.965],
          rightUpperArm: [0.215, -0.151, 0.965],
          leftForearm: [0.232, 0.163, 0.959],
          rightForearm: [-0.232, 0.163, 0.959],
        },
        amount
      );

    case "pec-deck":
      return interpolate(
        SEATED,
        {
          leftUpperArm: [-1, 0.02, 0],
          rightUpperArm: [1, 0.02, 0],
          leftForearm: [0, -1, 0],
          rightForearm: [0, -1, 0],
        },
        {
          leftUpperArm: [-0.06, 0.02, 1],
          rightUpperArm: [0.06, 0.02, 1],
          leftForearm: [0, -1, 0],
          rightForearm: [0, -1, 0],
        },
        amount
      );

    case "assisted-pull-up":
      return interpolate(
        KNEELING,
        {
          rootY: -0.55,
          leftUpperArm: [-0.4, 0.91, 0],
          rightUpperArm: [0.4, 0.91, 0],
          leftForearm: [-0.2, 0.98, 0],
          rightForearm: [0.2, 0.98, 0],
        },
        {
          rootY: 0.72,
          leftUpperArm: [-0.8, -0.59, 0.06],
          rightUpperArm: [0.8, -0.59, 0.06],
          leftForearm: [0.24, 0.97, 0.04],
          rightForearm: [-0.24, 0.97, 0.04],
        },
        amount
      );

    case "hack-squat":
      return interpolate(
        {
          ...STANDING,
          rootY: 0,
          rootZ: -0.28,
          rootRotationX: -0.18,
          leftUpperArm: [-0.12, -0.96, -0.24],
          rightUpperArm: [0.12, -0.96, -0.24],
          leftThigh: [-0.1, -0.68, 0.73],
          rightThigh: [0.1, -0.68, 0.73],
          leftShin: [-0.03, -0.68, 0.73],
          rightShin: [0.03, -0.68, 0.73],
        },
        {},
        {
          rootY: -0.51,
          rootZ: -0.12,
          leftThigh: [-0.18, -0.927, 0.329],
          rightThigh: [0.18, -0.927, 0.329],
          leftShin: [0.054, 0.083, 0.995],
          rightShin: [-0.054, 0.083, 0.995],
        },
        amount
      );

    case "leg-extension":
      return interpolate(
        SEATED,
        {
          leftThigh: [-0.08, -0.1, 0.99],
          rightThigh: [0.08, -0.1, 0.99],
          leftShin: [-0.03, -0.99, 0.12],
          rightShin: [0.03, -0.99, 0.12],
        },
        {
          leftThigh: [-0.08, -0.1, 0.99],
          rightThigh: [0.08, -0.1, 0.99],
          leftShin: [-0.03, 0.02, 1],
          rightShin: [0.03, 0.02, 1],
        },
        amount
      );

    case "leg-curl":
      return interpolate(
        SEATED,
        {
          leftThigh: [-0.08, -0.1, 0.99],
          rightThigh: [0.08, -0.1, 0.99],
          leftShin: [-0.03, -0.1, 0.99],
          rightShin: [0.03, -0.1, 0.99],
        },
        {
          leftThigh: [-0.08, -0.1, 0.99],
          rightThigh: [0.08, -0.1, 0.99],
          leftShin: [-0.03, -0.99, -0.12],
          rightShin: [0.03, -0.99, -0.12],
        },
        amount
      );

    case "hip-thrust":
      return interpolate(
        {
          ...BENCH,
          rootY: 0.066,
          rootZ: 2.07,
          rootRotationX: -1.274,
          leftUpperArm: [-0.301, -0.252, 0.92],
          rightUpperArm: [0.301, -0.252, 0.92],
          leftForearm: [0.68, -0.057, 0.731],
          rightForearm: [-0.68, -0.057, 0.731],
          leftThigh: [-0.04, 0.233, 0.972],
          rightThigh: [0.04, 0.233, 0.972],
          leftShin: [-0.075, -0.845, 0.53],
          rightShin: [0.075, -0.845, 0.53],
        },
        {},
        {
          rootY: 1.05,
          rootZ: 2.22,
          rootRotationX: -PI / 2,
          leftUpperArm: [-0.25, 0.012, 0.968],
          rightUpperArm: [0.25, 0.012, 0.968],
          leftForearm: [0.625, 0.185, 0.758],
          rightForearm: [-0.625, 0.185, 0.758],
          leftThigh: [-0.051, -0.093, 0.994],
          rightThigh: [0.051, -0.093, 0.994],
          leftShin: [-0.063, -0.892, 0.447],
          rightShin: [0.063, -0.892, 0.447],
        },
        amount
      );

    case "calf-raise":
      return interpolate(
        STANDING,
        {
          rootY: 0.22,
          torsoX: 0.01,
          leftShin: [-0.02, -1, 0.03],
          rightShin: [0.02, -1, 0.03],
        },
        {
          rootY: 0.43,
          torsoX: -0.01,
          leftShin: [-0.02, -0.96, -0.28],
          rightShin: [0.02, -0.96, -0.28],
        },
        amount
      );

    case "preacher-curl":
      return interpolate(
        SEATED,
        {
          leftUpperArm: [-0.08, -0.45, 0.89],
          rightUpperArm: [0.08, -0.45, 0.89],
          leftForearm: [-0.02, -0.5, 0.86],
          rightForearm: [0.02, -0.5, 0.86],
        },
        {
          leftUpperArm: [-0.08, -0.45, 0.89],
          rightUpperArm: [0.08, -0.45, 0.89],
          leftForearm: [0.04, 0.9, -0.43],
          rightForearm: [-0.04, 0.9, -0.43],
        },
        amount
      );

    case "assisted-dip":
      return interpolate(
        KNEELING,
        {
          rootY: 0.43,
          leftUpperArm: [-0.12, -0.72, 0.68],
          rightUpperArm: [0.12, -0.72, 0.68],
          leftForearm: [0.08, -0.75, -0.66],
          rightForearm: [-0.08, -0.75, -0.66],
        },
        {
          rootY: 0.73,
          leftUpperArm: [-0.1, -0.98, 0.18],
          rightUpperArm: [0.1, -0.98, 0.18],
          leftForearm: [0.05, -0.98, 0.18],
          rightForearm: [-0.05, -0.98, 0.18],
        },
        amount
      );

    case "ab-crunch":
      return interpolate(
        {
          ...SEATED,
          leftUpperArm: [-0.22, -0.3, 0.93],
          rightUpperArm: [0.22, -0.3, 0.93],
          leftForearm: [0.2, 0.1, -0.97],
          rightForearm: [-0.2, 0.1, -0.97],
        },
        {},
        {
          torsoX: 0.78,
        },
        amount
      );

    case "ab-wheel-rollout":
      return interpolate(
        {
          ...KNEELING,
          rootY: -0.9,
          leftThigh: [-0.06, -0.94, 0.34],
          rightThigh: [0.06, -0.94, 0.34],
          leftShin: [-0.03, -0.08, -1],
          rightShin: [0.03, -0.08, -1],
        },
        {
          torsoX: 0.9,
          leftUpperArm: [-0.14, -0.99, 0.08],
          rightUpperArm: [0.14, -0.99, 0.08],
          leftForearm: [-0.06, -0.995, 0.08],
          rightForearm: [0.06, -0.995, 0.08],
        },
        {
          rootZ: 0.08,
          torsoX: 1.28,
          leftUpperArm: [-0.13, -0.74, 0.66],
          rightUpperArm: [0.13, -0.74, 0.66],
          leftForearm: [-0.04, -0.74, 0.67],
          rightForearm: [0.04, -0.74, 0.67],
        },
        amount
      );

    case "alternating-curl":
      return interpolate(
        STANDING,
        {
          leftUpperArm: [-0.08, -0.99, 0.08],
          rightUpperArm: [0.08, -0.99, 0.08],
          leftForearm: [0.02, 0.78, 0.62],
          rightForearm: [0.02, -0.98, 0.18],
        },
        {
          leftUpperArm: [-0.08, -0.99, 0.08],
          rightUpperArm: [0.08, -0.99, 0.08],
          leftForearm: [-0.02, -0.98, 0.18],
          rightForearm: [-0.02, 0.78, 0.62],
        },
        amount
      );

    case "treadmill-walk":
      return interpolate(
        STANDING,
        {
          rootY: 0.18,
          leftUpperArm: [-0.08, -0.92, 0.38],
          rightUpperArm: [0.08, -0.92, -0.38],
          leftForearm: [-0.04, -0.82, 0.56],
          rightForearm: [0.04, -0.82, -0.56],
          leftThigh: [-0.08, -0.9, 0.43],
          rightThigh: [0.08, -0.9, -0.43],
          leftShin: [-0.03, -0.82, -0.57],
          rightShin: [0.03, -0.98, 0.18],
        },
        {
          rootY: 0.22,
          leftUpperArm: [-0.08, -0.92, -0.38],
          rightUpperArm: [0.08, -0.92, 0.38],
          leftForearm: [-0.04, -0.82, -0.56],
          rightForearm: [0.04, -0.82, 0.56],
          leftThigh: [-0.08, -0.9, -0.43],
          rightThigh: [0.08, -0.9, 0.43],
          leftShin: [-0.03, -0.98, 0.18],
          rightShin: [0.03, -0.82, -0.57],
        },
        amount
      );

    case "plank":
      return interpolate(
        {
          ...BENCH,
          rootY: 1.05,
          leftUpperArm: [-0.08, -1, 0],
          rightUpperArm: [0.08, -1, 0],
          leftForearm: [-0.03, -0.05, 1],
          rightForearm: [0.03, -0.05, 1],
          leftThigh: [-0.08, -0.48, 0.87],
          rightThigh: [0.08, -0.48, 0.87],
          leftShin: [-0.03, -0.48, 0.88],
          rightShin: [0.03, -0.48, 0.88],
        },
        {},
        {
          torsoX: 0.026,
          torsoScaleX: 1.032,
          torsoScaleY: 1.022,
          torsoScaleZ: 1.105,
        },
        amount
      );

    default:
      return interpolate(
        STANDING,
        {},
        {},
        amount
      );
  }
}

function addVector(
  left: MotionVector,
  right: MotionVector
): MotionVector {
  return [
    left[0] + right[0],
    left[1] + right[1],
    left[2] + right[2],
  ];
}

function subtractVector(
  left: MotionVector,
  right: MotionVector
): MotionVector {
  return [
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  ];
}

function scaleVector(
  vector: MotionVector,
  scale: number
): MotionVector {
  return [
    vector[0] * scale,
    vector[1] * scale,
    vector[2] * scale,
  ];
}

function dotVector(
  left: MotionVector,
  right: MotionVector
) {
  return (
    left[0] * right[0] +
    left[1] * right[1] +
    left[2] * right[2]
  );
}

function normalizeVector(
  vector: MotionVector
): MotionVector {
  const length = Math.hypot(...vector) || 1;

  return [
    vector[0] / length,
    vector[1] / length,
    vector[2] / length,
  ];
}

function rotateVector(
  vector: MotionVector,
  rotationX: number,
  rotationY: number,
  rotationZ: number
): MotionVector {
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const afterX: MotionVector = [
    vector[0],
    vector[1] * cosX - vector[2] * sinX,
    vector[1] * sinX + vector[2] * cosX,
  ];

  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const afterY: MotionVector = [
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

function getRootWorldPoint(
  pose: CalibratedPose,
  localPoint: MotionVector
): MotionVector {
  return addVector(
    [
      pose.rootX,
      pose.rootY,
      pose.rootZ,
    ],
    rotateVector(
      localPoint,
      pose.rootRotationX,
      pose.rootRotationY,
      pose.rootRotationZ
    )
  );
}

function getTorsoWorldPoint(
  pose: CalibratedPose,
  localPoint: MotionVector
): MotionVector {
  const torsoPoint = addVector(
    [0, 2.12, 0],
    rotateVector(
      [
        localPoint[0] * pose.torsoScaleX,
        localPoint[1] * pose.torsoScaleY,
        localPoint[2] * pose.torsoScaleZ,
      ],
      pose.torsoX,
      0,
      pose.torsoZ
    )
  );

  return getRootWorldPoint(pose, torsoPoint);
}

function getLimbEnd(
  start: MotionVector,
  firstDirection: MotionVector,
  secondDirection: MotionVector,
  firstLength: number,
  secondLength: number
): MotionVector {
  return addVector(
    addVector(
      start,
      scaleVector(firstDirection, firstLength)
    ),
    scaleVector(secondDirection, secondLength)
  );
}

function solveTwoBoneDirections(
  start: MotionVector,
  target: MotionVector,
  firstLength: number,
  secondLength: number,
  currentFirstDirection: MotionVector
) {
  const targetOffset = subtractVector(target, start);
  const rawDistance = Math.hypot(...targetOffset);
  const distance = Math.min(
    firstLength + secondLength - 0.0001,
    Math.max(
      Math.abs(firstLength - secondLength) + 0.0001,
      rawDistance
    )
  );
  const targetDirection = normalizeVector(targetOffset);
  const along =
    (firstLength * firstLength -
      secondLength * secondLength +
      distance * distance) /
    (2 * distance);
  const perpendicularDistance = Math.sqrt(
    Math.max(
      0,
      firstLength * firstLength - along * along
    )
  );
  const currentKneeOffset = scaleVector(
    normalizeVector(currentFirstDirection),
    firstLength
  );
  const projected = scaleVector(
    targetDirection,
    dotVector(currentKneeOffset, targetDirection)
  );
  let bendDirection = subtractVector(
    currentKneeOffset,
    projected
  );

  if (Math.hypot(...bendDirection) < 0.0001) {
    bendDirection =
      Math.abs(targetDirection[1]) < 0.9
        ? [
            -targetDirection[2],
            0,
            targetDirection[0],
          ]
        : [
            targetDirection[1],
            -targetDirection[0],
            0,
          ];
  }

  bendDirection = normalizeVector(bendDirection);
  const knee = addVector(
    start,
    addVector(
      scaleVector(targetDirection, along),
      scaleVector(
        bendDirection,
        perpendicularDistance
      )
    )
  );

  return {
    first: normalizeVector(subtractVector(knee, start)),
    second: normalizeVector(subtractVector(target, knee)),
  };
}

function getHipPoint(
  pose: CalibratedPose,
  side: -1 | 1
): MotionVector {
  return getRootWorldPoint(
    pose,
    [side * 0.29, 2, 0]
  );
}

function getShoulderPoint(
  pose: CalibratedPose,
  side: -1 | 1
): MotionVector {
  return getTorsoWorldPoint(
    pose,
    [side * 0.72, 1.25, 0]
  );
}

function getFootPoint(
  pose: CalibratedPose,
  side: -1 | 1
): MotionVector {
  return getLimbEnd(
    getHipPoint(pose, side),
    side === -1
      ? pose.leftThigh
      : pose.rightThigh,
    side === -1
      ? pose.leftShin
      : pose.rightShin,
    1.08,
    1.02
  );
}

function getHandPoint(
  pose: CalibratedPose,
  side: -1 | 1
): MotionVector {
  return getLimbEnd(
    getShoulderPoint(pose, side),
    side === -1
      ? pose.leftUpperArm
      : pose.rightUpperArm,
    side === -1
      ? pose.leftForearm
      : pose.rightForearm,
    0.82,
    0.76
  );
}

function lockLegToTarget(
  pose: CalibratedPose,
  side: -1 | 1,
  target: MotionVector
) {
  const firstKey =
    side === -1 ? "leftThigh" : "rightThigh";
  const secondKey =
    side === -1 ? "leftShin" : "rightShin";
  const solved = solveTwoBoneDirections(
    getHipPoint(pose, side),
    target,
    1.08,
    1.02,
    pose[firstKey]
  );

  pose[firstKey] = solved.first;
  pose[secondKey] = solved.second;
}

function lockArmToTarget(
  pose: CalibratedPose,
  side: -1 | 1,
  target: MotionVector
) {
  const firstKey =
    side === -1 ? "leftUpperArm" : "rightUpperArm";
  const secondKey =
    side === -1 ? "leftForearm" : "rightForearm";
  const solved = solveTwoBoneDirections(
    getShoulderPoint(pose, side),
    target,
    0.82,
    0.76,
    pose[firstKey]
  );

  pose[firstKey] = solved.first;
  pose[secondKey] = solved.second;
}

function applyContactConstraints(
  preset: ExerciseScenePreset,
  pose: CalibratedPose
): CalibratedPose {
  const result: CalibratedPose = {
    ...pose,
    leftUpperArm: [...pose.leftUpperArm],
    rightUpperArm: [...pose.rightUpperArm],
    leftForearm: [...pose.leftForearm],
    rightForearm: [...pose.rightForearm],
    leftThigh: [...pose.leftThigh],
    rightThigh: [...pose.rightThigh],
    leftShin: [...pose.leftShin],
    rightShin: [...pose.rightShin],
  };

  if (
    preset === "back-squat" ||
    preset === "split-squat" ||
    preset === "hack-squat" ||
    preset === "hip-thrust"
  ) {
    const startPose = getRawCalibratedPose(preset, 0);
    lockLegToTarget(
      result,
      -1,
      getFootPoint(startPose, -1)
    );
    lockLegToTarget(
      result,
      1,
      getFootPoint(startPose, 1)
    );
  }

  if (preset === "back-squat") {
    const barCenter = getTorsoWorldPoint(
      result,
      [0, 1.08, -0.32]
    );
    lockArmToTarget(
      result,
      -1,
      [-0.9, barCenter[1], barCenter[2]]
    );
    lockArmToTarget(
      result,
      1,
      [0.9, barCenter[1], barCenter[2]]
    );
  }

  if (preset === "assisted-pull-up") {
    lockArmToTarget(result, -1, [-1.2, 4.28, 0.05]);
    lockArmToTarget(result, 1, [1.2, 4.28, 0.05]);
  }

  if (preset === "assisted-dip") {
    const leftHand = getHandPoint(result, -1);
    const rightHand = getHandPoint(result, 1);
    lockArmToTarget(
      result,
      -1,
      [-0.62, 2.55, leftHand[2]]
    );
    lockArmToTarget(
      result,
      1,
      [0.62, 2.55, rightHand[2]]
    );
  }

  if (preset === "ab-wheel-rollout") {
    const leftHand = getHandPoint(result, -1);
    const rightHand = getHandPoint(result, 1);
    const wheelZ = (leftHand[2] + rightHand[2]) / 2;

    lockArmToTarget(result, -1, [-0.48, 0.32, wheelZ]);
    lockArmToTarget(result, 1, [0.48, 0.32, wheelZ]);
  }

  return result;
}

export function getCalibratedPose(
  preset: ExerciseScenePreset,
  amount: number
): CalibratedPose {
  const safeAmount = Math.max(0, Math.min(1, amount));

  return applyContactConstraints(
    preset,
    getRawCalibratedPose(preset, safeAmount)
  );
}

const MOTION_DURATION_SECONDS: Partial<
  Record<ExerciseScenePreset, number>
> = {
  "bench-press": 3.2,
  "incline-press": 3.2,
  "lat-pulldown": 3.2,
  "seated-row": 3.2,
  "back-squat": 4,
  "leg-press": 3.6,
  "romanian-deadlift": 4,
  "split-squat": 4,
  "shoulder-press": 3.2,
  "lateral-raise": 3,
  "barbell-curl": 2.8,
  "hammer-curl": 2.8,
  "triceps-pushdown": 2.8,
  "cable-crunch": 3.2,
  "machine-press": 3.2,
  "pec-deck": 3.2,
  "assisted-pull-up": 3.4,
  "hack-squat": 3.8,
  "leg-extension": 3,
  "leg-curl": 3.2,
  "hip-thrust": 3.6,
  "calf-raise": 2.9,
  "preacher-curl": 3,
  "assisted-dip": 3.3,
  "ab-crunch": 3.2,
  "ab-wheel-rollout": 4.2,
  "alternating-curl": 3.6,
  "treadmill-walk": 1.55,
  plank: 4.8,
  standing: 3.6,
};

function smootherStep(amount: number) {
  const safeAmount = Math.max(0, Math.min(1, amount));
  return safeAmount * safeAmount * safeAmount *
    (safeAmount * (safeAmount * 6 - 15) + 10);
}

function responsiveEase(
  amount: number,
  durationSeconds: number
) {
  const safeDuration = Math.max(1.2, durationSeconds);
  const controlBias = safeDuration >= 3.4 ? 0.82 : 0.76;
  const safeAmount = Math.max(0, Math.min(1, amount));
  return safeAmount * (1 - controlBias) + smootherStep(safeAmount) * controlBias;
}

export function getCalibratedMotionAmount(
  preset: ExerciseScenePreset,
  elapsedSeconds: number
) {
  const duration =
    MOTION_DURATION_SECONDS[preset] || 3.2;
  const safeElapsed = Number.isFinite(elapsedSeconds)
    ? Math.max(0, elapsedSeconds)
    : 0;
  const phase = (safeElapsed % duration) / duration;

  if (
    preset === "treadmill-walk" ||
    preset === "alternating-curl" ||
    preset === "plank"
  ) {
    return (
      Math.sin(phase * Math.PI * 2 - Math.PI / 2) + 1
    ) / 2;
  }

  // The effort phase is slightly quicker than the controlled return,
  // matching a natural concentric/eccentric training cadence. There is
  // no artificial hold, so the figure never appears frozen.
  if (phase < 0.46) {
    return responsiveEase(phase / 0.46, duration);
  }

  return 1 - responsiveEase((phase - 0.46) / 0.54, duration);
}
