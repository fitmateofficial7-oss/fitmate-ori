import type { ExerciseGuidePreset } from "@/lib/exercise-guides";

export type Exercise2DCategory =
  | "bench-press"
  | "incline-press"
  | "lat-pulldown"
  | "seated-row"
  | "back-squat"
  | "leg-press"
  | "romanian-deadlift"
  | "split-squat"
  | "shoulder-press"
  | "lateral-raise"
  | "barbell-curl"
  | "hammer-curl"
  | "triceps-pushdown"
  | "cable-crunch"
  | "machine-press"
  | "pec-deck"
  | "assisted-pull-up"
  | "hack-squat"
  | "leg-extension"
  | "leg-curl"
  | "hip-thrust"
  | "calf-raise"
  | "preacher-curl"
  | "assisted-dip"
  | "ab-crunch"
  | "ab-wheel-rollout"
  | "alternating-curl"
  | "treadmill-walk"
  | "plank"
  | "standing";

const PRESET_TO_CATEGORY: Record<ExerciseGuidePreset, Exercise2DCategory> = {
  "bench-press": "bench-press",
  "incline-press": "incline-press",
  "lat-pulldown": "lat-pulldown",
  "seated-row": "seated-row",
  "back-squat": "back-squat",
  "leg-press": "leg-press",
  "romanian-deadlift": "romanian-deadlift",
  "split-squat": "split-squat",
  "shoulder-press": "shoulder-press",
  "lateral-raise": "lateral-raise",
  "barbell-curl": "barbell-curl",
  "hammer-curl": "hammer-curl",
  "triceps-pushdown": "triceps-pushdown",
  "cable-crunch": "cable-crunch",
  "machine-press": "machine-press",
  "pec-deck": "pec-deck",
  "assisted-pull-up": "assisted-pull-up",
  "hack-squat": "hack-squat",
  "leg-extension": "leg-extension",
  "leg-curl": "leg-curl",
  "hip-thrust": "hip-thrust",
  "calf-raise": "calf-raise",
  "preacher-curl": "preacher-curl",
  "assisted-dip": "assisted-dip",
  "ab-crunch": "ab-crunch",
  "ab-wheel-rollout": "ab-wheel-rollout",
  "alternating-curl": "alternating-curl",
  "treadmill-walk": "treadmill-walk",
  plank: "plank",
  standing: "standing",
};

export function getExercise2DCategory(preset: ExerciseGuidePreset): Exercise2DCategory {
  return PRESET_TO_CATEGORY[preset] ?? "standing";
}
