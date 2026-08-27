export type ExerciseVideoAsset = {
  slug: string;
  src: string;
  posterSrc: string;
};

const VIDEO_SLUG_ALIASES: Record<string, string> = {
  "ab-crunch-machine": "ab-crunch-machine",
  "ab-wheel-rollout": "ab-wheel-rollout",
  "wheel-rollout": "ab-wheel-rollout",
  "alternating-dumbbell-curl": "alternating-dumbbell-curl",
  "assisted-dip-machine": "assisted-dip-machine",
  "assisted-pull-up": "assisted-pull-up",
  "barbell-back-squat": "barbell-back-squat",
  "barbell-bench-press": "barbell-bench-press",
  "barbell-curl": "barbell-curl",
  "bulgarian-split-squat": "bulgarian-split-squat",
  "cable-crunch": "cable-crunch",
  "dumbbell-lateral-raise": "dumbbell-lateral-raise",
  "dumbbell-shoulder": "dumbbell-shoulder-press",
  "dumbbell-shoulder-press": "dumbbell-shoulder-press",
  "dumbel-bench-press": "dumbbell-bench-press",
  "dumbbell-bench-press": "dumbbell-bench-press",
  // FitMate previously used the incline name for this dumbbell-press slot.
  // Keep it mapped so every existing exercise opens the supplied video.
  "incline-dumbbell-press": "dumbbell-bench-press",
  "forearm-plank": "plank",
  "plank": "plank",
  "hack-squat-machine": "hack-squat-machine",
  "hammer-curl": "hammer-curl",
  "hip-thrust-machine": "hip-thrust-machine",
  "lat-pulldown": "lat-pulldown",
  "leg-extension-machine": "leg-extension-machine",
  "leg-press": "leg-press",
  "machine-chest-press": "machine-chest-press",
  "pec-deck-fly": "pec-deck-fly",
  "preacher-curl-machine": "preacher-curl-machine",
  "romanian-deadlift": "romanian-deadlift",
  "rope-triceps-pushdown": "rope-triceps-pushdown",
  "seated-cable-row": "seated-cable-row",
  "seated-leg-curl-machine": "seated-leg-curl-machine",
  "standing-calf-raise-machine": "standing-calf-raise-machine",
  "treadmill-walk": "treadmill-walk",
  "treadmill-walking": "treadmill-walk",
};

function normalizeExerciseKey(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/dumbel/g, "dumbbell")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getExerciseVideoAsset(
  slug: string | null | undefined,
  name: string | null | undefined
): ExerciseVideoAsset | null {
  const candidates = [normalizeExerciseKey(slug), normalizeExerciseKey(name)];

  for (const candidate of candidates) {
    const videoSlug = VIDEO_SLUG_ALIASES[candidate];
    if (videoSlug) {
      return {
        slug: videoSlug,
        src: `/exercise-videos/${videoSlug}.mp4`,
        posterSrc: `/exercise-video-posters/${videoSlug}.webp`,
      };
    }
  }

  return null;
}

export const EXERCISE_VIDEO_COUNT = 29;
