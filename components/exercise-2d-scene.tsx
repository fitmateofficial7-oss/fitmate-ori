import type { ExerciseGuidePreset } from "@/lib/exercise-guides";
import { getExercise2DCategory, type Exercise2DCategory } from "@/lib/exercise-2d-categories";

type Point = { x: number; y: number };

type Joints = {
  head: Point;
  neck: Point;
  chest: Point;
  pelvis: Point;
  leftShoulder: Point;
  rightShoulder: Point;
  leftElbow: Point;
  rightElbow: Point;
  leftWrist: Point;
  rightWrist: Point;
  leftHip: Point;
  rightHip: Point;
  leftKnee: Point;
  rightKnee: Point;
  leftAnkle: Point;
  rightAnkle: Point;
};

type PoseSpec = {
  baseX?: number;
  baseY?: number;
  torsoAngle?: number;
  torsoLength?: number;
  shoulderWidth?: number;
  hipWidth?: number;
  upperArmLength?: number;
  foreArmLength?: number;
  thighLength?: number;
  shinLength?: number;
  leftUpperArm?: number;
  rightUpperArm?: number;
  leftForeArm?: number;
  rightForeArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftShin?: number;
  rightShin?: number;
  headTilt?: number;
};

type Exercise2DSceneProps = {
  preset: ExerciseGuidePreset;
  stepIndex?: 0 | 1 | 2;
  exerciseName: string;
  language?: "id" | "en";
  className?: string;
  compact?: boolean;
  showLabels?: boolean;
};

type MuscleZone =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core"
  | "quads"
  | "glutes"
  | "hamstrings"
  | "calves";

const COLORS = {
  floor: "#d9efe2",
  floorLine: "#b6ddcb",
  hair: "#3f2a1c",
  skin: "#f0bc90",
  shirt: "#2ea24e",
  shirtDark: "#1f7a38",
  shorts: "#1f2937",
  shoe: "#f8fafc",
  shoeSole: "#9ca3af",
  equipment: "#25384d",
  equipmentLight: "#8ca1b5",
  accent: "#16a34a",
  accentSoft: "rgba(34, 197, 94, 0.18)",
  highlight: "rgba(34, 197, 94, 0.28)",
  shadow: "rgba(15, 23, 42, 0.1)",
  arrow: "#0f766e",
};

const LOWER_GROUP = new Set<Exercise2DCategory>([
  "back-squat",
  "hack-squat",
  "split-squat",
  "leg-press",
  "leg-extension",
  "leg-curl",
  "calf-raise",
  "hip-thrust",
  "treadmill-walk",
]);

const CURL_GROUP = new Set<Exercise2DCategory>([
  "barbell-curl",
  "hammer-curl",
  "alternating-curl",
  "preacher-curl",
]);

function polar(length: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: Math.sin(rad) * length, y: Math.cos(rad) * length };
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function makeStandingPose(spec: PoseSpec): Joints {
  const baseX = spec.baseX ?? 160;
  const baseY = spec.baseY ?? 142;
  const torsoAngle = spec.torsoAngle ?? 0;
  const torsoLength = spec.torsoLength ?? 62;
  const shoulderWidth = spec.shoulderWidth ?? 22;
  const hipWidth = spec.hipWidth ?? 14;
  const upperArmLength = spec.upperArmLength ?? 34;
  const foreArmLength = spec.foreArmLength ?? 34;
  const thighLength = spec.thighLength ?? 46;
  const shinLength = spec.shinLength ?? 48;

  const pelvis = { x: baseX, y: baseY };
  const chest = add(pelvis, polar(torsoLength, 180 + torsoAngle));
  const neck = add(chest, polar(12, 180 + torsoAngle));
  const head = add(neck, polar(20, 180 + (spec.headTilt ?? torsoAngle * 0.4)));

  const leftShoulder = { x: chest.x - shoulderWidth, y: chest.y + 4 };
  const rightShoulder = { x: chest.x + shoulderWidth, y: chest.y + 4 };
  const leftHip = { x: pelvis.x - hipWidth, y: pelvis.y };
  const rightHip = { x: pelvis.x + hipWidth, y: pelvis.y };

  const leftElbow = add(leftShoulder, polar(upperArmLength, spec.leftUpperArm ?? 0));
  const rightElbow = add(rightShoulder, polar(upperArmLength, spec.rightUpperArm ?? 0));
  const leftWrist = add(leftElbow, polar(foreArmLength, spec.leftForeArm ?? 0));
  const rightWrist = add(rightElbow, polar(foreArmLength, spec.rightForeArm ?? 0));

  const leftKnee = add(leftHip, polar(thighLength, spec.leftThigh ?? 0));
  const rightKnee = add(rightHip, polar(thighLength, spec.rightThigh ?? 0));
  const leftAnkle = add(leftKnee, polar(shinLength, spec.leftShin ?? 0));
  const rightAnkle = add(rightKnee, polar(shinLength, spec.rightShin ?? 0));

  return {
    head,
    neck,
    chest,
    pelvis,
    leftShoulder,
    rightShoulder,
    leftElbow,
    rightElbow,
    leftWrist,
    rightWrist,
    leftHip,
    rightHip,
    leftKnee,
    rightKnee,
    leftAnkle,
    rightAnkle,
  };
}

function makeSeatedPose(spec: PoseSpec): Joints {
  return makeStandingPose({
    baseY: spec.baseY ?? 126,
    leftThigh: spec.leftThigh ?? 88,
    rightThigh: spec.rightThigh ?? 92,
    leftShin: spec.leftShin ?? 4,
    rightShin: spec.rightShin ?? 4,
    thighLength: spec.thighLength ?? 42,
    shinLength: spec.shinLength ?? 42,
    ...spec,
  });
}

function makeKneelingPose(spec: PoseSpec): Joints {
  return makeStandingPose({
    baseY: spec.baseY ?? 138,
    leftThigh: spec.leftThigh ?? 180,
    rightThigh: spec.rightThigh ?? 180,
    leftShin: spec.leftShin ?? 92,
    rightShin: spec.rightShin ?? 92,
    thighLength: spec.thighLength ?? 40,
    shinLength: spec.shinLength ?? 42,
    ...spec,
  });
}

function makeLyingPose(
  baseX: number,
  baseY: number,
  variant: "flat" | "incline" | "hip-thrust" | "leg-press" | "plank"
): Joints {
  if (variant === "plank") {
    return {
      head: { x: baseX + 66, y: baseY - 42 },
      neck: { x: baseX + 48, y: baseY - 30 },
      chest: { x: baseX + 18, y: baseY - 18 },
      pelvis: { x: baseX - 28, y: baseY - 6 },
      leftShoulder: { x: baseX + 28, y: baseY - 16 },
      rightShoulder: { x: baseX + 8, y: baseY - 20 },
      leftElbow: { x: baseX + 44, y: baseY + 14 },
      rightElbow: { x: baseX + 24, y: baseY + 12 },
      leftWrist: { x: baseX + 40, y: baseY + 40 },
      rightWrist: { x: baseX + 18, y: baseY + 38 },
      leftHip: { x: baseX - 18, y: baseY - 4 },
      rightHip: { x: baseX - 34, y: baseY - 8 },
      leftKnee: { x: baseX - 58, y: baseY + 12 },
      rightKnee: { x: baseX - 76, y: baseY + 18 },
      leftAnkle: { x: baseX - 112, y: baseY + 34 },
      rightAnkle: { x: baseX - 128, y: baseY + 40 },
    };
  }

  const inclineOffset = variant === "incline" ? -18 : variant === "leg-press" ? -34 : variant === "hip-thrust" ? 8 : 0;
  const chest = { x: baseX + 12, y: baseY + inclineOffset };
  const pelvis = { x: baseX - 42, y: baseY + (variant === "hip-thrust" ? 2 : 0) };
  const neck = { x: chest.x + 16, y: chest.y - 12 };
  const head = { x: neck.x + 18, y: neck.y - 4 };
  const leftShoulder = { x: chest.x + 4, y: chest.y - 2 };
  const rightShoulder = { x: chest.x - 10, y: chest.y + 2 };
  const leftHip = { x: pelvis.x + 8, y: pelvis.y - 2 };
  const rightHip = { x: pelvis.x - 6, y: pelvis.y + 4 };

  return {
    head,
    neck,
    chest,
    pelvis,
    leftShoulder,
    rightShoulder,
    leftElbow: { x: leftShoulder.x + 22, y: leftShoulder.y - 10 },
    rightElbow: { x: rightShoulder.x + 10, y: rightShoulder.y + 8 },
    leftWrist: { x: leftShoulder.x + 46, y: leftShoulder.y - 10 },
    rightWrist: { x: rightShoulder.x + 32, y: rightShoulder.y + 10 },
    leftHip,
    rightHip,
    leftKnee: { x: leftHip.x - 14, y: leftHip.y + (variant === "leg-press" ? -26 : 36) },
    rightKnee: { x: rightHip.x - 28, y: rightHip.y + (variant === "leg-press" ? -22 : 38) },
    leftAnkle: { x: leftHip.x - (variant === "leg-press" ? 8 : 40), y: leftHip.y + (variant === "leg-press" ? -56 : 70) },
    rightAnkle: { x: rightHip.x - (variant === "leg-press" ? 26 : 54), y: rightHip.y + (variant === "leg-press" ? -54 : 70) },
  };
}

function getPose(category: Exercise2DCategory, stepIndex: 0 | 1 | 2): Joints {
  switch (category) {
    case "back-squat":
    case "hack-squat":
      return makeStandingPose(
        stepIndex === 1
          ? { torsoAngle: 8, baseY: 150, leftUpperArm: 110, rightUpperArm: 250, leftForeArm: 66, rightForeArm: 294, leftThigh: 32, rightThigh: -32, leftShin: -10, rightShin: 10 }
          : { leftUpperArm: 114, rightUpperArm: 246, leftForeArm: 68, rightForeArm: 292, leftThigh: 6, rightThigh: -6, leftShin: 2, rightShin: -2 }
      );
    case "split-squat":
      return makeStandingPose(
        stepIndex === 1
          ? { baseY: 156, torsoAngle: 10, leftUpperArm: 8, rightUpperArm: -8, leftForeArm: 8, rightForeArm: -8, leftThigh: 60, rightThigh: -34, leftShin: -6, rightShin: 18 }
          : { baseY: 148, torsoAngle: 4, leftUpperArm: 8, rightUpperArm: -8, leftForeArm: 8, rightForeArm: -8, leftThigh: 36, rightThigh: -18, leftShin: 4, rightShin: 12 }
      );
    case "shoulder-press":
      return makeSeatedPose(
        stepIndex === 1
          ? { leftUpperArm: 176, rightUpperArm: 184, leftForeArm: 178, rightForeArm: 182 }
          : { leftUpperArm: 164, rightUpperArm: 196, leftForeArm: 170, rightForeArm: 190 }
      );
    case "lateral-raise":
      return makeStandingPose(
        stepIndex === 1
          ? { leftUpperArm: -90, rightUpperArm: 90, leftForeArm: -92, rightForeArm: 92 }
          : { leftUpperArm: 8, rightUpperArm: -8, leftForeArm: 8, rightForeArm: -8 }
      );
    case "barbell-curl":
    case "preacher-curl":
      return makeStandingPose(
        stepIndex === 1
          ? { leftUpperArm: 14, rightUpperArm: -14, leftForeArm: -145, rightForeArm: 145 }
          : { leftUpperArm: 4, rightUpperArm: -4, leftForeArm: 2, rightForeArm: -2 }
      );
    case "alternating-curl":
      return makeStandingPose(
        stepIndex === 0
          ? { leftUpperArm: 6, rightUpperArm: -6, leftForeArm: 4, rightForeArm: -4 }
          : stepIndex === 1
            ? { leftUpperArm: 10, rightUpperArm: -6, leftForeArm: -145, rightForeArm: -4 }
            : { leftUpperArm: 6, rightUpperArm: -10, leftForeArm: 4, rightForeArm: 145 }
      );
    case "hammer-curl":
      return makeStandingPose(
        stepIndex === 1
          ? { leftUpperArm: 16, rightUpperArm: -16, leftForeArm: -140, rightForeArm: 140 }
          : { leftUpperArm: 6, rightUpperArm: -6, leftForeArm: 6, rightForeArm: -6 }
      );
    case "triceps-pushdown":
      return makeStandingPose(
        stepIndex === 0
          ? { leftUpperArm: 166, rightUpperArm: 194, leftForeArm: 150, rightForeArm: 210 }
          : { leftUpperArm: 170, rightUpperArm: 190, leftForeArm: 178, rightForeArm: 182 }
      );
    case "cable-crunch":
      return makeKneelingPose(
        stepIndex === 1
          ? { torsoAngle: 28, baseY: 146, leftUpperArm: 176, rightUpperArm: 184, leftForeArm: 150, rightForeArm: 210 }
          : { torsoAngle: 10, leftUpperArm: 166, rightUpperArm: 194, leftForeArm: 160, rightForeArm: 200 }
      );
    case "lat-pulldown":
      return makeSeatedPose(
        stepIndex === 1
          ? { leftUpperArm: 138, rightUpperArm: 222, leftForeArm: 122, rightForeArm: 238 }
          : { leftUpperArm: 150, rightUpperArm: 210, leftForeArm: 166, rightForeArm: 194 }
      );
    case "assisted-pull-up":
      return makeStandingPose(
        stepIndex === 1
          ? { baseY: 114, torsoAngle: 4, leftUpperArm: 154, rightUpperArm: 206, leftForeArm: 138, rightForeArm: 222, leftThigh: 20, rightThigh: -20, leftShin: 66, rightShin: -66 }
          : { baseY: 126, leftUpperArm: 164, rightUpperArm: 196, leftForeArm: 176, rightForeArm: 184, leftThigh: 18, rightThigh: -18, leftShin: 56, rightShin: -56 }
      );
    case "seated-row":
      return makeSeatedPose(
        stepIndex === 1
          ? { torsoAngle: 0, leftUpperArm: 90, rightUpperArm: 270, leftForeArm: 86, rightForeArm: 274 }
          : { torsoAngle: 8, leftUpperArm: 108, rightUpperArm: 252, leftForeArm: 110, rightForeArm: 250 }
      );
    case "machine-press":
    case "pec-deck":
      return makeSeatedPose(
        stepIndex === 1
          ? { leftUpperArm: -20, rightUpperArm: 20, leftForeArm: -10, rightForeArm: 10 }
          : { leftUpperArm: -72, rightUpperArm: 72, leftForeArm: -92, rightForeArm: 92 }
      );
    case "leg-extension":
      return makeSeatedPose(
        stepIndex === 1
          ? { leftThigh: 88, rightThigh: 92, leftShin: -92, rightShin: -88 }
          : { leftThigh: 88, rightThigh: 92, leftShin: 8, rightShin: 4 }
      );
    case "leg-curl":
      return makeStandingPose(
        stepIndex === 1
          ? { baseY: 122, torsoAngle: 82, leftUpperArm: 4, rightUpperArm: -4, leftForeArm: 4, rightForeArm: -4, leftThigh: 4, rightThigh: -6, leftShin: 0, rightShin: -118 }
          : { baseY: 122, torsoAngle: 82, leftUpperArm: 4, rightUpperArm: -4, leftForeArm: 4, rightForeArm: -4, leftThigh: 4, rightThigh: -2, leftShin: 0, rightShin: -4 }
      );
    case "hip-thrust":
      return makeLyingPose(160, stepIndex === 1 ? 148 : 162, "hip-thrust");
    case "calf-raise":
      return makeStandingPose(
        stepIndex === 1
          ? { baseY: 138, leftThigh: 4, rightThigh: -4, leftShin: -8, rightShin: 8 }
          : { leftThigh: 4, rightThigh: -4, leftShin: 2, rightShin: -2 }
      );
    case "assisted-dip":
      return makeStandingPose(
        stepIndex === 1
          ? { baseY: 136, torsoAngle: 8, leftUpperArm: 172, rightUpperArm: 188, leftForeArm: 170, rightForeArm: 190, leftThigh: 20, rightThigh: -20, leftShin: 62, rightShin: -62 }
          : { baseY: 126, leftUpperArm: 176, rightUpperArm: 184, leftForeArm: 176, rightForeArm: 184, leftThigh: 18, rightThigh: -18, leftShin: 58, rightShin: -58 }
      );
    case "ab-crunch":
      return makeSeatedPose(
        stepIndex === 1
          ? { torsoAngle: 18, baseY: 132, leftUpperArm: 166, rightUpperArm: 194, leftForeArm: 176, rightForeArm: 184 }
          : { torsoAngle: 0, leftUpperArm: 168, rightUpperArm: 192, leftForeArm: 170, rightForeArm: 190 }
      );
    case "ab-wheel-rollout":
      return makeKneelingPose(
        stepIndex === 1
          ? { baseY: 148, torsoAngle: 54, leftUpperArm: 118, rightUpperArm: 242, leftForeArm: 98, rightForeArm: 262 }
          : stepIndex === 2
            ? { torsoAngle: 14, leftUpperArm: 108, rightUpperArm: 252, leftForeArm: 92, rightForeArm: 268 }
            : { torsoAngle: 6, leftUpperArm: 106, rightUpperArm: 254, leftForeArm: 90, rightForeArm: 270 }
      );
    case "treadmill-walk":
      return makeStandingPose(
        stepIndex === 1
          ? { leftUpperArm: -22, rightUpperArm: 18, leftForeArm: -26, rightForeArm: 18, leftThigh: -18, rightThigh: 22, leftShin: 6, rightShin: -12 }
          : stepIndex === 2
            ? { leftUpperArm: 18, rightUpperArm: -22, leftForeArm: 18, rightForeArm: -26, leftThigh: 22, rightThigh: -18, leftShin: -12, rightShin: 6 }
            : { leftUpperArm: 18, rightUpperArm: -18, leftForeArm: 18, rightForeArm: -18, leftThigh: 20, rightThigh: -18, leftShin: 8, rightShin: -8 }
      );
    case "romanian-deadlift":
      return makeStandingPose(
        stepIndex === 1
          ? { torsoAngle: 56, baseY: 146, leftUpperArm: 8, rightUpperArm: -8, leftForeArm: 8, rightForeArm: -8, leftThigh: 12, rightThigh: -12, leftShin: 0, rightShin: 0 }
          : { torsoAngle: 8, leftUpperArm: 6, rightUpperArm: -6, leftForeArm: 6, rightForeArm: -6 }
      );
    case "bench-press":
      return makeLyingPose(160, 142, "flat");
    case "incline-press":
      return makeLyingPose(156, 154, "incline");
    case "leg-press":
      return makeLyingPose(160, 158, "leg-press");
    case "plank":
      return makeLyingPose(162, 148, "plank");
    case "standing":
      return makeStandingPose(
        stepIndex === 1
          ? { leftUpperArm: -32, rightUpperArm: 24, leftForeArm: -42, rightForeArm: 30, leftThigh: -8, rightThigh: 10, leftShin: 2, rightShin: -2 }
          : { leftUpperArm: 12, rightUpperArm: -12, leftForeArm: 12, rightForeArm: -12 }
      );
    default:
      return makeStandingPose({});
  }
}

function getMuscleZones(category: Exercise2DCategory): MuscleZone[] {
  if (["bench-press", "incline-press", "machine-press", "pec-deck"].includes(category)) return ["chest", "shoulders", "triceps"];
  if (["lat-pulldown", "seated-row", "assisted-pull-up"].includes(category)) return ["back", "biceps"];
  if (["barbell-curl", "hammer-curl", "alternating-curl", "preacher-curl"].includes(category)) return ["biceps"];
  if (["triceps-pushdown", "assisted-dip"].includes(category)) return ["triceps", "shoulders"];
  if (["shoulder-press", "lateral-raise"].includes(category)) return ["shoulders"];
  if (["cable-crunch", "ab-crunch", "ab-wheel-rollout", "plank"].includes(category)) return ["core"];
  if (["romanian-deadlift", "leg-curl", "hip-thrust"].includes(category)) return ["glutes", "hamstrings"];
  if (["calf-raise"].includes(category)) return ["calves"];
  return ["quads", "glutes"];
}

function drawMuscleHighlights(pose: Joints, category: Exercise2DCategory) {
  const zones = getMuscleZones(category);
  const chestCenter = mid(pose.leftShoulder, pose.rightShoulder);
  const pelvisCenter = mid(pose.leftHip, pose.rightHip);
  return (
    <g opacity={0.95}>
      {zones.includes("chest") && <ellipse cx={chestCenter.x} cy={chestCenter.y + 10} rx={26} ry={16} fill={COLORS.highlight} />}
      {zones.includes("back") && <ellipse cx={chestCenter.x} cy={chestCenter.y + 12} rx={28} ry={18} fill={COLORS.highlight} />}
      {zones.includes("shoulders") && (
        <>
          <ellipse cx={pose.leftShoulder.x} cy={pose.leftShoulder.y + 6} rx={11} ry={9} fill={COLORS.highlight} />
          <ellipse cx={pose.rightShoulder.x} cy={pose.rightShoulder.y + 6} rx={11} ry={9} fill={COLORS.highlight} />
        </>
      )}
      {zones.includes("biceps") && (
        <>
          <ellipse cx={(pose.leftShoulder.x + pose.leftElbow.x) / 2} cy={(pose.leftShoulder.y + pose.leftElbow.y) / 2} rx={9} ry={9} fill={COLORS.highlight} />
          <ellipse cx={(pose.rightShoulder.x + pose.rightElbow.x) / 2} cy={(pose.rightShoulder.y + pose.rightElbow.y) / 2} rx={9} ry={9} fill={COLORS.highlight} />
        </>
      )}
      {zones.includes("triceps") && (
        <>
          <ellipse cx={(pose.leftShoulder.x + pose.leftElbow.x) / 2} cy={(pose.leftShoulder.y + pose.leftElbow.y) / 2} rx={10} ry={8} fill={COLORS.highlight} />
          <ellipse cx={(pose.rightShoulder.x + pose.rightElbow.x) / 2} cy={(pose.rightShoulder.y + pose.rightElbow.y) / 2} rx={10} ry={8} fill={COLORS.highlight} />
        </>
      )}
      {zones.includes("core") && <ellipse cx={pelvisCenter.x} cy={(chestCenter.y + pelvisCenter.y) / 2 + 6} rx={20} ry={26} fill={COLORS.highlight} />}
      {zones.includes("quads") && (
        <>
          <ellipse cx={(pose.leftHip.x + pose.leftKnee.x) / 2} cy={(pose.leftHip.y + pose.leftKnee.y) / 2} rx={11} ry={18} fill={COLORS.highlight} />
          <ellipse cx={(pose.rightHip.x + pose.rightKnee.x) / 2} cy={(pose.rightHip.y + pose.rightKnee.y) / 2} rx={11} ry={18} fill={COLORS.highlight} />
        </>
      )}
      {zones.includes("glutes") && (
        <>
          <ellipse cx={pose.leftHip.x + 4} cy={pose.leftHip.y + 8} rx={12} ry={10} fill={COLORS.highlight} />
          <ellipse cx={pose.rightHip.x - 4} cy={pose.rightHip.y + 8} rx={12} ry={10} fill={COLORS.highlight} />
        </>
      )}
      {zones.includes("hamstrings") && (
        <>
          <ellipse cx={(pose.leftHip.x + pose.leftKnee.x) / 2} cy={(pose.leftHip.y + pose.leftKnee.y) / 2 + 2} rx={10} ry={16} fill={COLORS.highlight} />
          <ellipse cx={(pose.rightHip.x + pose.rightKnee.x) / 2} cy={(pose.rightHip.y + pose.rightKnee.y) / 2 + 2} rx={10} ry={16} fill={COLORS.highlight} />
        </>
      )}
      {zones.includes("calves") && (
        <>
          <ellipse cx={(pose.leftKnee.x + pose.leftAnkle.x) / 2} cy={(pose.leftKnee.y + pose.leftAnkle.y) / 2} rx={9} ry={14} fill={COLORS.highlight} />
          <ellipse cx={(pose.rightKnee.x + pose.rightAnkle.x) / 2} cy={(pose.rightKnee.y + pose.rightAnkle.y) / 2} rx={9} ry={14} fill={COLORS.highlight} />
        </>
      )}
    </g>
  );
}

function Arrow({ from, to }: { from: Point; to: Point }) {
  return (
    <g>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={COLORS.arrow} strokeWidth={4} strokeLinecap="round" strokeDasharray="6 4" />
      <polygon
        points={`${to.x},${to.y} ${to.x - 8},${to.y - 4} ${to.x - 6},${to.y + 6}`}
        fill={COLORS.arrow}
        transform={`rotate(${Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI)} ${to.x} ${to.y})`}
      />
    </g>
  );
}

function drawMotionArrow(category: Exercise2DCategory, pose: Joints, stepIndex: 0 | 1 | 2) {
  if (stepIndex !== 1) return null;
  const pelvisCenter = mid(pose.leftHip, pose.rightHip);
  if (CURL_GROUP.has(category)) return <Arrow from={{ x: pose.leftWrist.x - 8, y: pose.leftWrist.y + 14 }} to={{ x: pose.leftWrist.x + 8, y: pose.leftWrist.y - 22 }} />;
  if (category === "lateral-raise") return <Arrow from={{ x: pose.rightWrist.x + 12, y: pose.rightWrist.y + 8 }} to={{ x: pose.rightWrist.x + 20, y: pose.rightWrist.y - 24 }} />;
  if (category === "shoulder-press") return <Arrow from={{ x: pose.rightWrist.x + 4, y: pose.rightWrist.y + 10 }} to={{ x: pose.rightWrist.x + 4, y: pose.rightWrist.y - 26 }} />;
  if (category === "lat-pulldown") return <Arrow from={{ x: pose.rightWrist.x + 2, y: pose.rightWrist.y - 40 }} to={{ x: pose.rightWrist.x + 2, y: pose.rightWrist.y - 6 }} />;
  if (category === "seated-row") return <Arrow from={{ x: pose.rightWrist.x + 26, y: pose.rightWrist.y }} to={{ x: pose.rightWrist.x - 6, y: pose.rightWrist.y }} />;
  if (["machine-press", "pec-deck", "bench-press", "incline-press"].includes(category)) return <Arrow from={{ x: pose.rightWrist.x - 24, y: pose.rightWrist.y }} to={{ x: pose.rightWrist.x + 12, y: pose.rightWrist.y - 2 }} />;
  if (["back-squat", "hack-squat", "split-squat"].includes(category)) return <Arrow from={{ x: pelvisCenter.x + 56, y: pelvisCenter.y - 12 }} to={{ x: pelvisCenter.x + 56, y: pelvisCenter.y + 24 }} />;
  if (category === "romanian-deadlift") return <Arrow from={{ x: pose.rightWrist.x + 12, y: pose.rightWrist.y - 26 }} to={{ x: pose.rightWrist.x + 12, y: pose.rightWrist.y + 12 }} />;
  if (category === "triceps-pushdown") return <Arrow from={{ x: pose.rightWrist.x + 10, y: pose.rightWrist.y - 20 }} to={{ x: pose.rightWrist.x + 10, y: pose.rightWrist.y + 14 }} />;
  if (["ab-wheel-rollout", "plank"].includes(category)) return <Arrow from={{ x: pose.leftWrist.x - 6, y: pose.leftWrist.y + 4 }} to={{ x: pose.leftWrist.x + 28, y: pose.leftWrist.y - 14 }} />;
  if (["leg-extension", "leg-curl", "calf-raise"].includes(category)) return <Arrow from={{ x: pose.rightAnkle.x + 14, y: pose.rightAnkle.y + 4 }} to={{ x: pose.rightAnkle.x + 14, y: pose.rightAnkle.y - 24 }} />;
  if (category === "treadmill-walk") return <Arrow from={{ x: pose.rightAnkle.x + 16, y: pose.rightAnkle.y - 6 }} to={{ x: pose.rightAnkle.x + 34, y: pose.rightAnkle.y - 14 }} />;
  if (["hip-thrust", "leg-press"].includes(category)) return <Arrow from={{ x: pelvisCenter.x + 8, y: pelvisCenter.y + 18 }} to={{ x: pelvisCenter.x + 8, y: pelvisCenter.y - 16 }} />;
  return null;
}

function drawEquipment(category: Exercise2DCategory, pose: Joints) {
  const wristsMid = mid(pose.leftWrist, pose.rightWrist);
  const seatY = pose.pelvis.y + 16;
  switch (category) {
    case "bench-press":
    case "incline-press":
      return (
        <g>
          <rect x={76} y={150} width={112} height={14} rx={7} fill={COLORS.equipment} />
          <rect x={80} y={164} width={10} height={28} rx={4} fill={COLORS.equipmentLight} />
          <rect x={174} y={164} width={10} height={28} rx={4} fill={COLORS.equipmentLight} />
        </g>
      );
    case "lat-pulldown":
      return (
        <g>
          <rect x={70} y={172} width={64} height={14} rx={7} fill={COLORS.equipment} />
          <rect x={98} y={118} width={10} height={56} rx={4} fill={COLORS.equipmentLight} />
          <line x1={64} y1={42} x2={256} y2={42} stroke={COLORS.equipment} strokeWidth={10} strokeLinecap="round" />
          <line x1={160} y1={42} x2={wristsMid.x} y2={wristsMid.y - 8} stroke={COLORS.equipmentLight} strokeWidth={3} />
          <line x1={112} y1={66} x2={208} y2={66} stroke={COLORS.equipmentLight} strokeWidth={8} strokeLinecap="round" />
        </g>
      );
    case "seated-row":
      return (
        <g>
          <rect x={76} y={seatY + 6} width={64} height={12} rx={6} fill={COLORS.equipment} />
          <rect x={68} y={seatY + 28} width={82} height={10} rx={5} fill={COLORS.equipmentLight} />
          <rect x={208} y={seatY + 22} width={48} height={16} rx={8} fill={COLORS.equipment} />
          <line x1={236} y1={seatY + 6} x2={wristsMid.x} y2={wristsMid.y} stroke={COLORS.equipmentLight} strokeWidth={3} />
        </g>
      );
    case "machine-press":
    case "pec-deck":
    case "shoulder-press":
    case "leg-extension":
    case "ab-crunch":
      return (
        <g>
          <rect x={118} y={seatY + 4} width={54} height={12} rx={6} fill={COLORS.equipment} />
          <rect x={126} y={seatY - 52} width={16} height={58} rx={8} fill={COLORS.equipmentLight} />
          <rect x={126} y={seatY - 64} width={64} height={14} rx={7} fill={COLORS.equipment} />
        </g>
      );
    case "assisted-pull-up":
      return (
        <g>
          <rect x={136} y={152} width={48} height={12} rx={6} fill={COLORS.equipment} />
          <line x1={102} y1={36} x2={218} y2={36} stroke={COLORS.equipment} strokeWidth={10} strokeLinecap="round" />
          <rect x={96} y={36} width={10} height={154} rx={5} fill={COLORS.equipmentLight} />
          <rect x={214} y={36} width={10} height={154} rx={5} fill={COLORS.equipmentLight} />
        </g>
      );
    case "assisted-dip":
      return (
        <g>
          <rect x={132} y={154} width={56} height={12} rx={6} fill={COLORS.equipment} />
          <rect x={102} y={62} width={10} height={126} rx={5} fill={COLORS.equipmentLight} />
          <rect x={208} y={62} width={10} height={126} rx={5} fill={COLORS.equipmentLight} />
          <line x1={112} y1={96} x2={132} y2={96} stroke={COLORS.equipment} strokeWidth={8} strokeLinecap="round" />
          <line x1={208} y1={96} x2={188} y2={96} stroke={COLORS.equipment} strokeWidth={8} strokeLinecap="round" />
        </g>
      );
    case "back-squat":
    case "hack-squat":
      return (
        <g>
          <line x1={64} y1={56} x2={64} y2={194} stroke={COLORS.equipmentLight} strokeWidth={8} strokeLinecap="round" />
          <line x1={256} y1={56} x2={256} y2={194} stroke={COLORS.equipmentLight} strokeWidth={8} strokeLinecap="round" />
          <line x1={94} y1={78} x2={226} y2={78} stroke={COLORS.equipment} strokeWidth={8} strokeLinecap="round" />
        </g>
      );
    case "leg-press":
      return (
        <g>
          <rect x={72} y={162} width={104} height={12} rx={6} fill={COLORS.equipment} />
          <polygon points="220,102 260,66 276,104 236,140" fill={COLORS.equipmentLight} />
        </g>
      );
    case "triceps-pushdown":
    case "cable-crunch":
      return (
        <g>
          <rect x={214} y={42} width={12} height={140} rx={6} fill={COLORS.equipmentLight} />
          <rect x={188} y={42} width={38} height={10} rx={5} fill={COLORS.equipment} />
          <line x1={194} y1={48} x2={wristsMid.x} y2={wristsMid.y} stroke={COLORS.equipmentLight} strokeWidth={3} />
        </g>
      );
    case "hip-thrust":
      return (
        <g>
          <rect x={92} y={126} width={42} height={14} rx={7} fill={COLORS.equipment} />
        </g>
      );
    case "treadmill-walk":
      return (
        <g>
          <rect x={64} y={176} width={196} height={16} rx={8} fill={COLORS.equipment} />
          <rect x={84} y={172} width={160} height={6} rx={3} fill={COLORS.equipmentLight} />
          <line x1={76} y1={72} x2={76} y2={176} stroke={COLORS.equipmentLight} strokeWidth={6} />
          <line x1={244} y1={72} x2={244} y2={176} stroke={COLORS.equipmentLight} strokeWidth={6} />
          <line x1={76} y1={72} x2={244} y2={72} stroke={COLORS.equipmentLight} strokeWidth={6} />
        </g>
      );
    case "ab-wheel-rollout":
      return (
        <g>
          <circle cx={wristsMid.x} cy={wristsMid.y + 8} r={12} fill={COLORS.equipment} />
          <line x1={wristsMid.x - 18} y1={wristsMid.y + 8} x2={wristsMid.x + 18} y2={wristsMid.y + 8} stroke={COLORS.equipmentLight} strokeWidth={4} strokeLinecap="round" />
        </g>
      );
    case "plank":
      return <rect x={84} y={174} width={152} height={10} rx={5} fill={COLORS.floorLine} />;
    default:
      return null;
  }
}

function drawDumbbell(point: Point) {
  return (
    <g>
      <line x1={point.x - 9} y1={point.y} x2={point.x + 9} y2={point.y} stroke={COLORS.equipmentLight} strokeWidth={4} strokeLinecap="round" />
      <rect x={point.x - 14} y={point.y - 8} width={5} height={16} rx={2} fill={COLORS.equipment} />
      <rect x={point.x + 9} y={point.y - 8} width={5} height={16} rx={2} fill={COLORS.equipment} />
    </g>
  );
}

function getLoadType(category: Exercise2DCategory): "dumbbell" | "barbell" | "none" {
  if (["hammer-curl", "alternating-curl", "lateral-raise", "shoulder-press"].includes(category)) return "dumbbell";
  if (["barbell-curl", "romanian-deadlift", "bench-press", "incline-press", "back-squat", "hip-thrust"].includes(category)) return "barbell";
  return "none";
}

function drawBarbell(pose: Joints) {
  const start = pose.leftWrist;
  const end = pose.rightWrist;
  return (
    <g>
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={COLORS.equipmentLight} strokeWidth={6} strokeLinecap="round" />
      <circle cx={start.x - 10} cy={start.y} r={8} fill={COLORS.equipment} />
      <circle cx={end.x + 10} cy={end.y} r={8} fill={COLORS.equipment} />
    </g>
  );
}

function drawCharacter(pose: Joints, category: Exercise2DCategory) {
  const loadType = getLoadType(category);
  const chestCenter = mid(pose.leftShoulder, pose.rightShoulder);
  const pelvisCenter = mid(pose.leftHip, pose.rightHip);
  return (
    <g>
      <ellipse cx={160} cy={196} rx={56} ry={10} fill={COLORS.shadow} />
      {drawMuscleHighlights(pose, category)}

      <polygon points={`${pose.leftShoulder.x},${pose.leftShoulder.y} ${pose.rightShoulder.x},${pose.rightShoulder.y} ${pose.rightHip.x},${pose.rightHip.y} ${pose.leftHip.x},${pose.leftHip.y}`} fill={COLORS.shirt} />
      <path d={`M ${pose.leftShoulder.x + 10} ${chestCenter.y + 2} Q ${chestCenter.x} ${chestCenter.y - 8} ${pose.rightShoulder.x - 10} ${chestCenter.y + 2}`} stroke={COLORS.shirtDark} strokeWidth={6} fill="none" strokeLinecap="round" />
      <polygon points={`${pose.leftHip.x},${pose.leftHip.y} ${pose.rightHip.x},${pose.rightHip.y} ${pose.rightHip.x - 4},${pose.rightHip.y + 22} ${pose.leftHip.x + 4},${pose.leftHip.y + 22}`} fill={COLORS.shorts} />

      <polyline points={`${pose.leftShoulder.x},${pose.leftShoulder.y} ${pose.leftElbow.x},${pose.leftElbow.y}`} fill="none" stroke={COLORS.skin} strokeWidth={15} strokeLinecap="round" />
      <polyline points={`${pose.leftElbow.x},${pose.leftElbow.y} ${pose.leftWrist.x},${pose.leftWrist.y}`} fill="none" stroke={COLORS.skin} strokeWidth={13} strokeLinecap="round" />
      <polyline points={`${pose.rightShoulder.x},${pose.rightShoulder.y} ${pose.rightElbow.x},${pose.rightElbow.y}`} fill="none" stroke={COLORS.skin} strokeWidth={15} strokeLinecap="round" />
      <polyline points={`${pose.rightElbow.x},${pose.rightElbow.y} ${pose.rightWrist.x},${pose.rightWrist.y}`} fill="none" stroke={COLORS.skin} strokeWidth={13} strokeLinecap="round" />
      <polyline points={`${pose.leftHip.x},${pose.leftHip.y} ${pose.leftKnee.x},${pose.leftKnee.y}`} fill="none" stroke={COLORS.skin} strokeWidth={18} strokeLinecap="round" />
      <polyline points={`${pose.leftKnee.x},${pose.leftKnee.y} ${pose.leftAnkle.x},${pose.leftAnkle.y}`} fill="none" stroke={COLORS.skin} strokeWidth={16} strokeLinecap="round" />
      <polyline points={`${pose.rightHip.x},${pose.rightHip.y} ${pose.rightKnee.x},${pose.rightKnee.y}`} fill="none" stroke={COLORS.skin} strokeWidth={18} strokeLinecap="round" />
      <polyline points={`${pose.rightKnee.x},${pose.rightKnee.y} ${pose.rightAnkle.x},${pose.rightAnkle.y}`} fill="none" stroke={COLORS.skin} strokeWidth={16} strokeLinecap="round" />

      <circle cx={pose.head.x} cy={pose.head.y} r={20} fill={COLORS.skin} />
      <path d={`M ${pose.head.x - 16} ${pose.head.y - 2} Q ${pose.head.x - 10} ${pose.head.y - 24} ${pose.head.x + 6} ${pose.head.y - 20} Q ${pose.head.x + 20} ${pose.head.y - 16} ${pose.head.x + 18} ${pose.head.y - 2} Q ${pose.head.x + 6} ${pose.head.y - 8} ${pose.head.x - 16} ${pose.head.y - 2}`} fill={COLORS.hair} />
      <circle cx={pose.head.x - 6} cy={pose.head.y - 2} r={1.7} fill="#111827" />
      <circle cx={pose.head.x + 6} cy={pose.head.y - 2} r={1.7} fill="#111827" />
      <path d={`M ${pose.head.x - 4} ${pose.head.y + 8} Q ${pose.head.x} ${pose.head.y + 10} ${pose.head.x + 4} ${pose.head.y + 8}`} fill="none" stroke="#8b5e3c" strokeWidth={1.8} strokeLinecap="round" />

      <path d={`M ${chestCenter.x - 8} ${chestCenter.y + 6} L ${chestCenter.x + 4} ${chestCenter.y + 2}`} stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
      <path d={`M ${chestCenter.x - 8} ${chestCenter.y + 6} L ${chestCenter.x - 2} ${chestCenter.y + 12}`} stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />

      <ellipse cx={pose.leftAnkle.x} cy={pose.leftAnkle.y + 5} rx={12} ry={6} fill={COLORS.shoe} />
      <ellipse cx={pose.rightAnkle.x} cy={pose.rightAnkle.y + 5} rx={12} ry={6} fill={COLORS.shoe} />
      <line x1={pose.leftAnkle.x - 8} y1={pose.leftAnkle.y + 7} x2={pose.leftAnkle.x + 8} y2={pose.leftAnkle.y + 7} stroke={COLORS.shoeSole} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={pose.rightAnkle.x - 8} y1={pose.rightAnkle.y + 7} x2={pose.rightAnkle.x + 8} y2={pose.rightAnkle.y + 7} stroke={COLORS.shoeSole} strokeWidth={2.5} strokeLinecap="round" />

      {loadType === "dumbbell" && drawDumbbell(pose.leftWrist)}
      {loadType === "dumbbell" && drawDumbbell(pose.rightWrist)}
      {loadType === "barbell" && drawBarbell(pose)}

      {LOWER_GROUP.has(category) && <ellipse cx={pelvisCenter.x} cy={pelvisCenter.y + 10} rx={18} ry={8} fill="rgba(15,23,42,0.06)" />}
    </g>
  );
}

function getStepLabel(stepIndex: 0 | 1 | 2, language: "id" | "en") {
  const labelsId = ["Awal", "Gerak", "Akhir"];
  const labelsEn = ["Start", "Move", "Finish"];
  return language === "id" ? labelsId[stepIndex] : labelsEn[stepIndex];
}

export default function Exercise2DScene({
  preset,
  stepIndex = 1,
  exerciseName,
  language = "id",
  className = "",
  compact = false,
  showLabels = true,
}: Exercise2DSceneProps) {
  const category = getExercise2DCategory(preset);
  const pose = getPose(category, stepIndex);
  const stepLabel = getStepLabel(stepIndex, language);

  return (
    <div
      role="img"
      aria-label={language === "id" ? `Panduan gerakan 2D untuk ${exerciseName}` : `2D movement guide for ${exerciseName}`}
      className={`relative overflow-hidden bg-[radial-gradient(circle_at_50%_18%,#ffffff_0%,#ecfdf5_52%,#dcfce7_100%)] ${className}`}
    >
      <svg viewBox="0 0 320 220" className="h-full w-full">
        <rect x={0} y={0} width={320} height={220} fill="transparent" />
        <path d="M0 176 C70 160 120 170 160 176 C200 182 250 172 320 180 L320 220 L0 220 Z" fill={COLORS.floor} />
        <line x1={28} y1={176} x2={292} y2={176} stroke={COLORS.floorLine} strokeWidth={2} />
        <line x1={58} y1={182} x2={88} y2={204} stroke={COLORS.floorLine} strokeWidth={1.6} />
        <line x1={118} y1={182} x2={148} y2={204} stroke={COLORS.floorLine} strokeWidth={1.6} />
        <line x1={178} y1={182} x2={208} y2={204} stroke={COLORS.floorLine} strokeWidth={1.6} />
        <line x1={238} y1={182} x2={268} y2={204} stroke={COLORS.floorLine} strokeWidth={1.6} />
        {drawEquipment(category, pose)}
        {drawCharacter(pose, category)}
        {drawMotionArrow(category, pose, stepIndex)}
      </svg>

      {showLabels && (
        <div className="absolute right-3 top-3 rounded-full border border-emerald-100 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 shadow-sm backdrop-blur">
          {stepLabel}
        </div>
      )}

      {!compact && (
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/80 bg-white/88 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 shadow-sm backdrop-blur">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          2D Guide
        </div>
      )}
    </div>
  );
}
