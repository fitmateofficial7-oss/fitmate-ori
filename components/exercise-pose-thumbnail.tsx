import type { Exercise2DPreset } from "@/lib/exercise-guides";

type Point = {
  x: number;
  y: number;
};

type FigurePose = {
  head: Point;
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

type ExercisePoseThumbnailProps = {
  exerciseName: string;
  preset: Exercise2DPreset;
  language?: "id" | "en";
  mode?: "comparison" | "start" | "finish";
};

const point = (x: number, y: number): Point => ({
  x,
  y,
});

function standingPose(): FigurePose {
  return {
    head: point(70, 22),
    leftShoulder: point(55, 49),
    rightShoulder: point(85, 49),
    leftElbow: point(51, 77),
    rightElbow: point(89, 77),
    leftWrist: point(50, 104),
    rightWrist: point(90, 104),
    leftHip: point(61, 89),
    rightHip: point(79, 89),
    leftKnee: point(58, 120),
    rightKnee: point(82, 120),
    leftAnkle: point(55, 150),
    rightAnkle: point(85, 150),
  };
}

function seatedPose(): FigurePose {
  return {
    ...standingPose(),
    leftHip: point(62, 89),
    rightHip: point(78, 89),
    leftKnee: point(91, 111),
    rightKnee: point(100, 116),
    leftAnkle: point(91, 148),
    rightAnkle: point(103, 148),
  };
}

function lyingPose(incline = false): FigurePose {
  if (incline) {
    return {
      head: point(42, 54),
      leftShoulder: point(57, 69),
      rightShoulder: point(61, 76),
      leftElbow: point(51, 94),
      rightElbow: point(70, 97),
      leftWrist: point(53, 115),
      rightWrist: point(75, 113),
      leftHip: point(88, 105),
      rightHip: point(91, 111),
      leftKnee: point(111, 126),
      rightKnee: point(119, 132),
      leftAnkle: point(111, 151),
      rightAnkle: point(124, 151),
    };
  }

  return {
    head: point(28, 94),
    leftShoulder: point(49, 91),
    rightShoulder: point(50, 100),
    leftElbow: point(50, 69),
    rightElbow: point(63, 69),
    leftWrist: point(50, 45),
    rightWrist: point(65, 45),
    leftHip: point(87, 96),
    rightHip: point(88, 104),
    leftKnee: point(111, 114),
    rightKnee: point(118, 119),
    leftAnkle: point(131, 143),
    rightAnkle: point(137, 147),
  };
}

function poseFor(
  preset: Exercise2DPreset,
  finish: boolean
): FigurePose {
  if (preset === "bench-press") {
    const pose = lyingPose();
    if (finish) {
      pose.leftElbow = point(52, 67);
      pose.rightElbow = point(64, 66);
      pose.leftWrist = point(52, 38);
      pose.rightWrist = point(64, 38);
    } else {
      pose.leftElbow = point(44, 96);
      pose.rightElbow = point(65, 98);
      pose.leftWrist = point(52, 76);
      pose.rightWrist = point(62, 76);
    }
    return pose;
  }

  if (preset === "incline-press") {
    const pose = lyingPose(true);
    if (finish) {
      pose.leftElbow = point(55, 61);
      pose.rightElbow = point(68, 62);
      pose.leftWrist = point(58, 36);
      pose.rightWrist = point(72, 37);
    }
    return pose;
  }

  if (preset === "plank") {
    return {
      head: point(29, 78),
      leftShoulder: point(48, 88),
      rightShoulder: point(50, 96),
      leftElbow: point(51, 115),
      rightElbow: point(59, 118),
      leftWrist: point(39, 121),
      rightWrist: point(51, 124),
      leftHip: point(87, 93 - (finish ? 2 : 0)),
      rightHip: point(89, 101 - (finish ? 2 : 0)),
      leftKnee: point(113, 107),
      rightKnee: point(117, 113),
      leftAnkle: point(137, 116),
      rightAnkle: point(139, 123),
    };
  }

  if (preset === "ab-wheel-rollout") {
    return finish
      ? {
          head: point(43, 82),
          leftShoulder: point(58, 88),
          rightShoulder: point(61, 95),
          leftElbow: point(84, 105),
          rightElbow: point(87, 111),
          leftWrist: point(112, 119),
          rightWrist: point(115, 125),
          leftHip: point(91, 103),
          rightHip: point(94, 110),
          leftKnee: point(116, 137),
          rightKnee: point(121, 143),
          leftAnkle: point(91, 151),
          rightAnkle: point(97, 156),
        }
      : {
          head: point(57, 55),
          leftShoulder: point(67, 72),
          rightShoulder: point(71, 78),
          leftElbow: point(83, 94),
          rightElbow: point(87, 100),
          leftWrist: point(98, 119),
          rightWrist: point(102, 125),
          leftHip: point(82, 101),
          rightHip: point(87, 107),
          leftKnee: point(76, 137),
          rightKnee: point(82, 143),
          leftAnkle: point(52, 151),
          rightAnkle: point(58, 156),
        };
  }

  const seatedPresets: Exercise2DPreset[] = [
    "lat-pulldown",
    "seated-row",
    "leg-press",
    "machine-press",
    "pec-deck",
    "leg-extension",
    "leg-curl",
    "preacher-curl",
    "ab-crunch",
  ];
  const pose = seatedPresets.includes(preset)
    ? seatedPose()
    : standingPose();

  switch (preset) {
    case "lat-pulldown":
      pose.leftElbow = finish
        ? point(49, 60)
        : point(43, 28);
      pose.rightElbow = finish
        ? point(91, 60)
        : point(97, 28);
      pose.leftWrist = finish
        ? point(48, 43)
        : point(56, 17);
      pose.rightWrist = finish
        ? point(92, 43)
        : point(84, 17);
      break;
    case "seated-row":
      pose.leftElbow = finish
        ? point(47, 73)
        : point(84, 72);
      pose.rightElbow = finish
        ? point(52, 80)
        : point(94, 78);
      pose.leftWrist = finish
        ? point(69, 76)
        : point(111, 73);
      pose.rightWrist = finish
        ? point(72, 81)
        : point(116, 79);
      break;
    case "back-squat":
    case "hack-squat":
      if (finish) {
        pose.head.y += 24;
        pose.leftShoulder.y += 24;
        pose.rightShoulder.y += 24;
        pose.leftHip = point(60, 111);
        pose.rightHip = point(80, 111);
        pose.leftKnee = point(45, 130);
        pose.rightKnee = point(95, 130);
      }
      pose.leftElbow = point(46, 61);
      pose.rightElbow = point(94, 61);
      pose.leftWrist = point(57, 48);
      pose.rightWrist = point(83, 48);
      break;
    case "leg-press":
      pose.leftKnee = finish
        ? point(119, 116)
        : point(86, 111);
      pose.rightKnee = finish
        ? point(124, 123)
        : point(94, 119);
      pose.leftAnkle = finish
        ? point(137, 88)
        : point(118, 93);
      pose.rightAnkle = finish
        ? point(140, 97)
        : point(123, 101);
      break;
    case "romanian-deadlift":
      if (finish) {
        pose.head = point(103, 63);
        pose.leftShoulder = point(88, 69);
        pose.rightShoulder = point(91, 76);
        pose.leftHip = point(66, 91);
        pose.rightHip = point(78, 96);
        pose.leftElbow = point(100, 89);
        pose.rightElbow = point(106, 96);
        pose.leftWrist = point(107, 112);
        pose.rightWrist = point(113, 117);
      }
      break;
    case "split-squat":
      pose.leftKnee = finish
        ? point(48, 128)
        : point(57, 120);
      pose.leftAnkle = point(35, 150);
      pose.rightHip = point(79, 91);
      pose.rightKnee = finish
        ? point(99, 132)
        : point(104, 118);
      pose.rightAnkle = point(119, 150);
      break;
    case "shoulder-press":
      pose.leftElbow = finish
        ? point(53, 35)
        : point(45, 58);
      pose.rightElbow = finish
        ? point(87, 35)
        : point(95, 58);
      pose.leftWrist = finish
        ? point(57, 12)
        : point(58, 40);
      pose.rightWrist = finish
        ? point(83, 12)
        : point(82, 40);
      break;
    case "lateral-raise":
      if (finish) {
        pose.leftElbow = point(27, 51);
        pose.rightElbow = point(113, 51);
        pose.leftWrist = point(7, 55);
        pose.rightWrist = point(133, 55);
      }
      break;
    case "barbell-curl":
    case "hammer-curl":
    case "preacher-curl":
      if (finish) {
        pose.leftElbow = point(52, 78);
        pose.rightElbow = point(88, 78);
        pose.leftWrist = point(57, 56);
        pose.rightWrist = point(83, 56);
      }
      break;
    case "alternating-curl":
      pose.leftElbow = point(52, 78);
      pose.rightElbow = point(88, 78);
      pose.leftWrist = finish
        ? point(50, 104)
        : point(57, 55);
      pose.rightWrist = finish
        ? point(83, 55)
        : point(90, 104);
      break;
    case "triceps-pushdown":
      pose.leftElbow = point(53, 70);
      pose.rightElbow = point(87, 70);
      pose.leftWrist = finish
        ? point(51, 101)
        : point(61, 82);
      pose.rightWrist = finish
        ? point(89, 101)
        : point(79, 82);
      break;
    case "cable-crunch":
      pose.leftKnee = point(52, 130);
      pose.rightKnee = point(88, 130);
      pose.leftAnkle = point(49, 151);
      pose.rightAnkle = point(91, 151);
      pose.leftWrist = point(55, 35);
      pose.rightWrist = point(85, 35);
      if (finish) {
        pose.head = point(89, 69);
        pose.leftShoulder = point(76, 75);
        pose.rightShoulder = point(91, 79);
      }
      break;
    case "machine-press":
      pose.leftWrist = finish
        ? point(116, 67)
        : point(84, 68);
      pose.rightWrist = finish
        ? point(120, 75)
        : point(88, 76);
      pose.leftElbow = finish
        ? point(88, 62)
        : point(62, 65);
      pose.rightElbow = finish
        ? point(92, 70)
        : point(65, 75);
      break;
    case "pec-deck":
      pose.leftElbow = finish
        ? point(84, 64)
        : point(31, 55);
      pose.rightElbow = finish
        ? point(89, 74)
        : point(109, 55);
      pose.leftWrist = finish
        ? point(105, 67)
        : point(18, 62);
      pose.rightWrist = finish
        ? point(108, 76)
        : point(122, 62);
      break;
    case "assisted-pull-up":
      pose.leftElbow = finish
        ? point(49, 47)
        : point(49, 25);
      pose.rightElbow = finish
        ? point(91, 47)
        : point(91, 25);
      pose.leftWrist = point(42, 13);
      pose.rightWrist = point(98, 13);
      if (finish) {
        pose.head.y -= 18;
        pose.leftShoulder.y -= 18;
        pose.rightShoulder.y -= 18;
        pose.leftHip.y -= 18;
        pose.rightHip.y -= 18;
      }
      pose.leftKnee = point(58, 120);
      pose.rightKnee = point(82, 120);
      pose.leftAnkle = point(68, 140);
      pose.rightAnkle = point(72, 140);
      break;
    case "leg-extension":
      if (finish) {
        pose.leftKnee = point(94, 108);
        pose.rightKnee = point(102, 114);
        pose.leftAnkle = point(132, 108);
        pose.rightAnkle = point(139, 116);
      }
      break;
    case "leg-curl":
      pose.leftKnee = point(92, 111);
      pose.rightKnee = point(101, 117);
      pose.leftAnkle = finish
        ? point(84, 86)
        : point(128, 143);
      pose.rightAnkle = finish
        ? point(93, 91)
        : point(137, 148);
      break;
    case "hip-thrust":
      if (finish) {
        pose.head = point(37, 84);
        pose.leftShoulder = point(53, 89);
        pose.rightShoulder = point(55, 97);
        pose.leftHip = point(84, 82);
        pose.rightHip = point(87, 90);
        pose.leftKnee = point(105, 112);
        pose.rightKnee = point(113, 117);
        pose.leftAnkle = point(111, 148);
        pose.rightAnkle = point(122, 149);
      } else {
        return lyingPose();
      }
      break;
    case "calf-raise":
      if (finish) {
        pose.head.y -= 5;
        pose.leftShoulder.y -= 5;
        pose.rightShoulder.y -= 5;
        pose.leftHip.y -= 5;
        pose.rightHip.y -= 5;
        pose.leftKnee.y -= 5;
        pose.rightKnee.y -= 5;
        pose.leftAnkle.y -= 5;
        pose.rightAnkle.y -= 5;
      }
      break;
    case "assisted-dip":
      pose.leftElbow = finish
        ? point(48, 69)
        : point(45, 53);
      pose.rightElbow = finish
        ? point(92, 69)
        : point(95, 53);
      pose.leftWrist = point(42, 82);
      pose.rightWrist = point(98, 82);
      if (finish) {
        pose.head.y += 10;
        pose.leftShoulder.y += 10;
        pose.rightShoulder.y += 10;
        pose.leftHip.y += 10;
        pose.rightHip.y += 10;
      }
      break;
    case "ab-crunch":
      if (finish) {
        pose.head = point(96, 66);
        pose.leftShoulder = point(84, 71);
        pose.rightShoulder = point(91, 78);
      }
      break;
    case "treadmill-walk":
      pose.leftElbow = finish
        ? point(60, 76)
        : point(45, 75);
      pose.rightElbow = finish
        ? point(95, 75)
        : point(80, 76);
      pose.leftWrist = finish
        ? point(78, 93)
        : point(51, 99);
      pose.rightWrist = finish
        ? point(89, 99)
        : point(62, 93);
      pose.leftKnee = finish
        ? point(74, 119)
        : point(48, 120);
      pose.rightKnee = finish
        ? point(92, 120)
        : point(70, 119);
      pose.leftAnkle = finish
        ? point(52, 150)
        : point(73, 150);
      pose.rightAnkle = finish
        ? point(96, 150)
        : point(112, 150);
      break;
    default:
      break;
  }

  return pose;
}

function Figure({
  pose,
  opacity = 1,
}: {
  pose: FigurePose;
  opacity?: number;
}) {
  const line = (
    start: Point,
    end: Point,
    key: string
  ) => (
    <line
      key={key}
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke="currentColor"
      strokeWidth="7"
      strokeLinecap="round"
    />
  );
  const shoulderCenter = point(
    (pose.leftShoulder.x + pose.rightShoulder.x) / 2,
    (pose.leftShoulder.y + pose.rightShoulder.y) / 2
  );
  const hipCenter = point(
    (pose.leftHip.x + pose.rightHip.x) / 2,
    (pose.leftHip.y + pose.rightHip.y) / 2
  );

  return (
    <g
      className="text-emerald-500"
      opacity={opacity}
    >
      {line(shoulderCenter, hipCenter, "torso")}
      {line(
        pose.leftShoulder,
        pose.leftElbow,
        "left-upper-arm"
      )}
      {line(
        pose.leftElbow,
        pose.leftWrist,
        "left-forearm"
      )}
      {line(
        pose.rightShoulder,
        pose.rightElbow,
        "right-upper-arm"
      )}
      {line(
        pose.rightElbow,
        pose.rightWrist,
        "right-forearm"
      )}
      {line(pose.leftHip, pose.leftKnee, "left-thigh")}
      {line(
        pose.leftKnee,
        pose.leftAnkle,
        "left-shin"
      )}
      {line(
        pose.rightHip,
        pose.rightKnee,
        "right-thigh"
      )}
      {line(
        pose.rightKnee,
        pose.rightAnkle,
        "right-shin"
      )}
      <line
        x1={pose.leftShoulder.x}
        y1={pose.leftShoulder.y}
        x2={pose.rightShoulder.x}
        y2={pose.rightShoulder.y}
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <line
        x1={pose.leftHip.x}
        y1={pose.leftHip.y}
        x2={pose.rightHip.x}
        y2={pose.rightHip.y}
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle
        cx={pose.head.x}
        cy={pose.head.y}
        r="11"
        className="fill-emerald-200 stroke-emerald-600"
        strokeWidth="3"
      />
    </g>
  );
}

function Equipment({
  pose,
  preset,
}: {
  pose: FigurePose;
  preset: Exercise2DPreset;
}) {
  const isBarbell = [
    "bench-press",
    "back-squat",
    "romanian-deadlift",
    "barbell-curl",
    "preacher-curl",
  ].includes(preset);
  const isDumbbell = [
    "incline-press",
    "split-squat",
    "shoulder-press",
    "lateral-raise",
    "hammer-curl",
    "alternating-curl",
  ].includes(preset);
  const isBench = [
    "bench-press",
    "incline-press",
    "hip-thrust",
  ].includes(preset);
  const isCable = [
    "lat-pulldown",
    "seated-row",
    "triceps-pushdown",
    "cable-crunch",
  ].includes(preset);
  const isMachine = [
    "leg-press",
    "machine-press",
    "pec-deck",
    "assisted-pull-up",
    "hack-squat",
    "leg-extension",
    "leg-curl",
    "calf-raise",
    "assisted-dip",
    "ab-crunch",
  ].includes(preset);

  return (
    <g
      className="stroke-slate-500 dark:stroke-slate-400"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isBench && (
        <path
          d={
            preset === "incline-press"
              ? "M22 111 L105 151 M43 120 L36 153 M91 145 L99 156"
              : "M17 111 H126 M35 111 V151 M109 111 V151"
          }
          strokeWidth="7"
        />
      )}
      {isCable && (
        <>
          <path
            d="M119 15 H134 V151 H119"
            strokeWidth="6"
          />
          <line
            x1="126"
            y1="17"
            x2={
              (pose.leftWrist.x + pose.rightWrist.x) / 2
            }
            y2={
              (pose.leftWrist.y + pose.rightWrist.y) / 2
            }
            strokeWidth="2.5"
          />
        </>
      )}
      {isMachine && (
        <path
          d="M22 151 H126 M112 151 V24 H126 M96 93 H120"
          strokeWidth="6"
          opacity="0.82"
        />
      )}
      {preset === "treadmill-walk" && (
        <path
          d="M17 151 H127 L117 139 H28 Z M108 140 V74 L126 57"
          strokeWidth="6"
        />
      )}
      {preset === "plank" && (
        <line
          x1="17"
          y1="130"
          x2="132"
          y2="130"
          className="stroke-emerald-700"
          strokeWidth="8"
        />
      )}
      {preset === "ab-wheel-rollout" && (
        <>
          <line
            x1="17"
            y1="157"
            x2="132"
            y2="157"
            className="stroke-emerald-700"
            strokeWidth="7"
          />
          <circle
            cx={
              (pose.leftWrist.x + pose.rightWrist.x) / 2
            }
            cy={
              (pose.leftWrist.y + pose.rightWrist.y) / 2 +
              8
            }
            r="11"
            className="fill-slate-800 stroke-amber-500"
            strokeWidth="4"
          />
          <line
            x1={pose.leftWrist.x - 7}
            y1={
              (pose.leftWrist.y + pose.rightWrist.y) / 2
            }
            x2={pose.rightWrist.x + 7}
            y2={
              (pose.leftWrist.y + pose.rightWrist.y) / 2
            }
            className="stroke-slate-300"
            strokeWidth="4"
          />
        </>
      )}
      {isBarbell && (
        <>
          <line
            x1={Math.min(
              pose.leftWrist.x,
              pose.rightWrist.x
            ) - 16}
            y1={
              (pose.leftWrist.y + pose.rightWrist.y) / 2
            }
            x2={Math.max(
              pose.leftWrist.x,
              pose.rightWrist.x
            ) + 16}
            y2={
              (pose.leftWrist.y + pose.rightWrist.y) / 2
            }
            className="stroke-slate-700 dark:stroke-slate-300"
            strokeWidth="4"
          />
          <circle
            cx={
              Math.min(
                pose.leftWrist.x,
                pose.rightWrist.x
              ) - 13
            }
            cy={
              (pose.leftWrist.y + pose.rightWrist.y) / 2
            }
            r="6"
            className="fill-amber-400 stroke-amber-600"
            strokeWidth="3"
          />
          <circle
            cx={
              Math.max(
                pose.leftWrist.x,
                pose.rightWrist.x
              ) + 13
            }
            cy={
              (pose.leftWrist.y + pose.rightWrist.y) / 2
            }
            r="6"
            className="fill-amber-400 stroke-amber-600"
            strokeWidth="3"
          />
        </>
      )}
      {isDumbbell &&
        [pose.leftWrist, pose.rightWrist].map(
          (wrist, index) => (
            <g
              key={`${wrist.x}-${wrist.y}-${index}`}
              className="stroke-blue-600"
              strokeWidth="5"
            >
              <line
                x1={wrist.x - 7}
                y1={wrist.y}
                x2={wrist.x + 7}
                y2={wrist.y}
              />
              <line
                x1={wrist.x - 8}
                y1={wrist.y - 5}
                x2={wrist.x - 8}
                y2={wrist.y + 5}
              />
              <line
                x1={wrist.x + 8}
                y1={wrist.y - 5}
                x2={wrist.x + 8}
                y2={wrist.y + 5}
              />
            </g>
          )
        )}
    </g>
  );
}

export default function ExercisePoseThumbnail({
  exerciseName,
  preset,
  language = "id",
  mode = "comparison",
}: ExercisePoseThumbnailProps) {
  const startPose = poseFor(preset, false);
  const finishPose = poseFor(preset, true);
  const singlePose = mode === "finish" ? finishPose : startPose;
  const singleLabel = mode === "finish"
    ? language === "en" ? "Finish position" : "Posisi akhir"
    : language === "en" ? "Start position" : "Posisi awal";

  if (mode !== "comparison") {
    return (
      <svg
        viewBox="0 0 320 180"
        role="img"
        aria-label={`${singleLabel} ${exerciseName}`}
        className="h-full w-full"
      >
        <rect
          width="320"
          height="180"
          rx="22"
          className="fill-emerald-50 dark:fill-emerald-950"
        />
        <circle
          cx="52"
          cy="35"
          r="62"
          className="fill-emerald-100/80 dark:fill-emerald-900/50"
        />
        <circle
          cx="275"
          cy="145"
          r="74"
          className="fill-white/70 dark:fill-slate-900/50"
        />
        <g transform="translate(88 5) scale(1.03)">
          <Equipment pose={singlePose} preset={preset} />
          <Figure pose={singlePose} />
        </g>
        <rect
          x="104"
          y="151"
          width="112"
          height="21"
          rx="10.5"
          className="fill-white/90 stroke-emerald-200 dark:fill-slate-900/90 dark:stroke-emerald-800"
        />
        <text
          x="160"
          y="165"
          textAnchor="middle"
          className="fill-emerald-700 text-[10px] font-bold uppercase tracking-wider dark:fill-emerald-300"
        >
          {singleLabel}
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 320 180"
      role="img"
      aria-label={
        language === "en"
          ? `Start and finish positions for ${exerciseName}`
          : `Posisi awal dan akhir ${exerciseName}`
      }
      className="h-full w-full"
    >
      <rect
        width="320"
        height="180"
        rx="22"
        className="fill-emerald-50 dark:fill-emerald-950"
      />
      <circle
        cx="37"
        cy="30"
        r="48"
        className="fill-emerald-100/80 dark:fill-emerald-900/50"
      />
      <circle
        cx="284"
        cy="152"
        r="61"
        className="fill-white/70 dark:fill-slate-900/50"
      />
      <g transform="translate(5 8) scale(.94)">
        <Equipment
          pose={startPose}
          preset={preset}
        />
        <Figure
          pose={startPose}
          opacity={0.55}
        />
      </g>
      <g
        transform="translate(171 8) scale(.94)"
        className="text-emerald-500"
      >
        <Equipment
          pose={finishPose}
          preset={preset}
        />
        <Figure pose={finishPose} />
      </g>
      <g className="fill-emerald-700 dark:fill-emerald-300">
        <path d="M145 82 H165 V76 L176 90 L165 104 V98 H145 Z" />
      </g>
      <text
        x="15"
        y="171"
        className="fill-slate-500 text-[10px] font-bold uppercase tracking-wider dark:fill-slate-400"
      >
        {language === "en" ? "Start" : "Mulai"}
      </text>
      <text
        x="275"
        y="171"
        className="fill-emerald-700 text-[10px] font-bold uppercase tracking-wider dark:fill-emerald-300"
      >
        {language === "en" ? "Finish" : "Akhir"}
      </text>
    </svg>
  );
}
