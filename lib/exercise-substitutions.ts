export type SubstitutionExercise = {
  id: string | number;
  name: string;
  category?: string | null;
  target_muscle?: string | null;
  secondary_muscles?: string[] | null;
  equipment?: string | null;
  difficulty?: string | null;
  movement_pattern?: string | null;
};

function normalize(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ");
}

export function getMuscleGroup(value?: string | null) {
  const muscle = normalize(value);

  if (
    muscle.includes("pectoralis") ||
    muscle.includes("chest")
  ) {
    return "chest";
  }

  if (
    muscle.includes("latissimus") ||
    muscle.includes("middle back") ||
    muscle.includes("rhomboid") ||
    muscle === "back"
  ) {
    return "back";
  }

  if (muscle.includes("quadricep")) {
    return "quadriceps";
  }

  if (muscle.includes("hamstring")) {
    return "hamstrings";
  }

  if (muscle.includes("glute")) {
    return "glutes";
  }

  if (muscle.includes("calf") || muscle.includes("calves")) {
    return "calves";
  }

  if (
    muscle.includes("bicep") ||
    muscle.includes("brachialis")
  ) {
    return "biceps";
  }

  if (muscle.includes("tricep")) {
    return "triceps";
  }

  if (
    muscle.includes("deltoid") ||
    muscle.includes("shoulder")
  ) {
    return "shoulders";
  }

  if (
    muscle.includes("abdominis") ||
    muscle.includes("oblique") ||
    muscle.includes("core")
  ) {
    return "core";
  }

  if (
    muscle.includes("cardiovascular") ||
    muscle.includes("cardio")
  ) {
    return "cardio";
  }

  return muscle;
}

function targetsMuscleGroup(
  exercise: SubstitutionExercise,
  muscleGroup: string
) {
  if (!muscleGroup) {
    return false;
  }

  if (getMuscleGroup(exercise.target_muscle) === muscleGroup) {
    return true;
  }

  return (exercise.secondary_muscles || []).some(
    (muscle) => getMuscleGroup(muscle) === muscleGroup
  );
}

export function getExerciseReplacementCandidates<
  T extends SubstitutionExercise
>(
  original: T | null,
  library: T[],
  maximum = 4
) {
  if (!original) {
    return [];
  }

  const targetGroup = getMuscleGroup(original.target_muscle);
  const originalName = normalize(original.name);
  const originalEquipment = normalize(original.equipment);
  const originalPattern = normalize(original.movement_pattern);
  const originalCategory = normalize(original.category);

  return library
    .filter(
      (candidate) =>
        normalize(candidate.name) !== originalName &&
        targetsMuscleGroup(candidate, targetGroup)
    )
    .map((candidate) => {
      const exactPrimaryTarget =
        getMuscleGroup(candidate.target_muscle) === targetGroup;
      const differentEquipment =
        normalize(candidate.equipment) !== originalEquipment;
      const samePattern =
        Boolean(originalPattern) &&
        normalize(candidate.movement_pattern) === originalPattern;
      const sameCategory =
        Boolean(originalCategory) &&
        normalize(candidate.category) === originalCategory;

      return {
        candidate,
        score:
          (exactPrimaryTarget ? 100 : 55) +
          (differentEquipment ? 35 : 0) +
          (samePattern ? 20 : 0) +
          (sameCategory ? 10 : 0),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.candidate.name.localeCompare(b.candidate.name)
    )
    .slice(0, maximum)
    .map(({ candidate }) => candidate);
}

