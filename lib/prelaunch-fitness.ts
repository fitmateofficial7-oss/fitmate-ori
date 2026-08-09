export type ReadinessInput = {
  sleepHours: number;
  energy: number;
  soreness: number;
  stress: number;
  painLevel: number;
  availableMinutes: number;
};

export type ReadinessResult = {
  score: number;
  volumeModifier: number;
  intensityModifier: number;
  action: "normal" | "reduced" | "recovery" | "stop";
  recommendationId: string;
  recommendationEn: string;
};

export type SetPerformance = {
  loadKg: number;
  reps: number;
  rir?: number | null;
  rpe?: number | null;
  setType?: "warmup" | "working" | "failure" | "drop" | "backoff";
};

export type ProgressionRecommendation = {
  action: "increase" | "maintain" | "reduce" | "deload" | "technique";
  recommendedLoadKg: number | null;
  recommendedRepsMin: number;
  recommendedRepsMax: number;
  recommendedSets: number;
  confidence: "low" | "medium" | "high";
  reasonId: string;
  reasonEn: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function roundToIncrement(value: number, increment = 0.5) {
  if (!Number.isFinite(value) || increment <= 0) {
    return 0;
  }

  return Math.round(value / increment) * increment;
}

export function estimateOneRepMax(loadKg: number, reps: number) {
  if (!Number.isFinite(loadKg) || !Number.isFinite(reps) || loadKg <= 0 || reps <= 0) {
    return 0;
  }

  const safeReps = clamp(Math.round(reps), 1, 30);
  return roundToIncrement(loadKg * (1 + safeReps / 30), 0.1);
}

export function calculateReadiness(input: ReadinessInput): ReadinessResult {
  const sleepScore = clamp(input.sleepHours / 8, 0, 1) * 25;
  const energyScore = clamp(input.energy / 10, 0, 1) * 25;
  const sorenessScore = (1 - clamp((input.soreness - 1) / 9, 0, 1)) * 18;
  const stressScore = (1 - clamp((input.stress - 1) / 9, 0, 1)) * 17;
  const painScore = (1 - clamp(input.painLevel / 10, 0, 1)) * 15;
  const timePenalty = input.availableMinutes < 30 ? 8 : input.availableMinutes < 45 ? 4 : 0;
  const score = Math.round(clamp(
    sleepScore + energyScore + sorenessScore + stressScore + painScore - timePenalty,
    0,
    100
  ));

  if (input.painLevel >= 7) {
    return {
      score,
      volumeModifier: 0.25,
      intensityModifier: 0.25,
      action: "stop",
      recommendationId:
        "Nyeri yang kamu laporkan cukup tinggi. Jangan lanjutkan latihan yang memicu nyeri dan pertimbangkan pemeriksaan tenaga kesehatan.",
      recommendationEn:
        "Your reported pain is high. Do not continue movements that trigger pain and consider evaluation by a healthcare professional.",
    };
  }

  if (score < 40) {
    return {
      score,
      volumeModifier: 0.5,
      intensityModifier: 0.65,
      action: "recovery",
      recommendationId:
        "Fokus pemulihan hari ini. Pilih mobilitas ringan, jalan santai, atau latihan teknik dengan beban sangat ringan.",
      recommendationEn:
        "Prioritize recovery today. Choose light mobility, an easy walk, or technique practice with very light loads.",
    };
  }

  if (score < 70) {
    return {
      score,
      volumeModifier: 0.8,
      intensityModifier: 0.85,
      action: "reduced",
      recommendationId:
        "Kondisi cukup, tetapi belum optimal. Kurangi sekitar 20% set dan hindari latihan sampai gagal.",
      recommendationEn:
        "You are ready enough to train, but not at your best. Reduce sets by about 20% and avoid training to failure.",
    };
  }

  return {
    score,
    volumeModifier: 1,
    intensityModifier: 1,
    action: "normal",
    recommendationId:
      "Kondisimu siap untuk latihan normal. Tetap gunakan teknik yang stabil dan hentikan gerakan jika terasa sakit.",
    recommendationEn:
      "You are ready for a normal session. Keep your technique stable and stop any movement that causes pain.",
  };
}

export function recommendProgression({
  sets,
  plannedRepsMin = 8,
  plannedRepsMax = 12,
}: {
  sets: SetPerformance[];
  plannedRepsMin?: number;
  plannedRepsMax?: number;
}): ProgressionRecommendation {
  const workingSets = sets.filter(
    (set) => set.setType !== "warmup" && set.loadKg >= 0 && set.reps > 0
  );

  if (workingSets.length === 0) {
    return {
      action: "maintain",
      recommendedLoadKg: null,
      recommendedRepsMin: plannedRepsMin,
      recommendedRepsMax: plannedRepsMax,
      recommendedSets: 3,
      confidence: "low",
      reasonId: "Belum ada set kerja yang cukup untuk membuat rekomendasi.",
      reasonEn: "There are not enough working sets to make a recommendation yet.",
    };
  }

  const averageLoad =
    workingSets.reduce((total, set) => total + set.loadKg, 0) / workingSets.length;
  const averageReps =
    workingSets.reduce((total, set) => total + set.reps, 0) / workingSets.length;
  const averageRir =
    workingSets.reduce((total, set) => {
      if (typeof set.rir === "number") return total + set.rir;
      if (typeof set.rpe === "number") return total + clamp(10 - set.rpe, 0, 9);
      return total + 2;
    }, 0) / workingSets.length;
  const completedAll = workingSets.length >= 2;
  const estimatedMax = Math.max(
    ...workingSets.map((set) => estimateOneRepMax(set.loadKg, set.reps))
  );

  if (workingSets.length >= 4 && averageReps < plannedRepsMin && averageRir < 1) {
    return {
      action: "deload",
      recommendedLoadKg: averageLoad > 0 ? roundToIncrement(averageLoad * 0.9) : null,
      recommendedRepsMin: plannedRepsMin,
      recommendedRepsMax: plannedRepsMax,
      recommendedSets: Math.max(2, workingSets.length - 1),
      confidence: "medium",
      reasonId:
        "Beberapa set kerja berada di bawah target dengan cadangan repetisi rendah. Gunakan sesi deload: kurangi sekitar 10% beban dan satu set sebelum membangun kembali progres.",
      reasonEn:
        "Several working sets fell below target with little reserve. Use a deload session: reduce load by about 10% and remove one set before building progress again.",
    };
  }

  if (!completedAll || averageReps < plannedRepsMin - 1 || averageRir <= 0.25) {
    const nextLoad = averageLoad > 0 ? roundToIncrement(averageLoad * 0.95) : null;
    return {
      action: averageRir <= 0.25 ? "technique" : "reduce",
      recommendedLoadKg: nextLoad,
      recommendedRepsMin: plannedRepsMin,
      recommendedRepsMax: plannedRepsMax,
      recommendedSets: Math.max(2, workingSets.length),
      confidence: "medium",
      reasonId:
        "Repetisi atau cadangan repetisi belum stabil. Turunkan sedikit beban dan prioritaskan teknik sebelum menaikkan progres.",
      reasonEn:
        "Reps or reps-in-reserve were not stable. Reduce the load slightly and prioritize technique before progressing.",
    };
  }

  if (averageReps >= plannedRepsMax && averageRir >= 1.5) {
    const increaseRate = averageLoad >= 80 ? 1.025 : 1.05;
    return {
      action: "increase",
      recommendedLoadKg: roundToIncrement(averageLoad * increaseRate),
      recommendedRepsMin: plannedRepsMin,
      recommendedRepsMax: plannedRepsMax,
      recommendedSets: workingSets.length,
      confidence: "high",
      reasonId: `Semua set mencapai batas atas repetisi dengan cadangan yang cukup. Estimasi 1RM terbaik sekitar ${estimatedMax} kg.`,
      reasonEn: `All working sets reached the top of the rep range with enough reserve. Best estimated 1RM is about ${estimatedMax} kg.`,
    };
  }

  return {
    action: "maintain",
    recommendedLoadKg: averageLoad > 0 ? roundToIncrement(averageLoad) : null,
    recommendedRepsMin: plannedRepsMin,
    recommendedRepsMax: plannedRepsMax,
    recommendedSets: workingSets.length,
    confidence: "high",
    reasonId:
      "Beban sudah sesuai. Pertahankan sampai seluruh set mencapai batas atas repetisi dengan teknik yang konsisten.",
    reasonEn:
      "The current load is appropriate. Keep it until every set reaches the top of the rep range with consistent form.",
  };
}

export function calculateNutritionTargets({
  weightKg,
  goal,
}: {
  weightKg: number;
  goal: string;
}) {
  const safeWeight = clamp(weightKg, 30, 300);
  const lowerGoal = goal.toLowerCase();
  const proteinPerKg = lowerGoal.includes("otot") || lowerGoal.includes("muscle") ? 2 : 1.8;
  const caloriesPerKg = lowerGoal.includes("lemak") || lowerGoal.includes("fat") ? 27 : lowerGoal.includes("otot") || lowerGoal.includes("muscle") ? 34 : 30;
  const calories = Math.round(safeWeight * caloriesPerKg / 50) * 50;
  const protein = Math.round(safeWeight * proteinPerKg);
  const fat = Math.round(safeWeight * 0.8);
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    calories,
    proteinG: protein,
    carbsG: carbs,
    fatG: fat,
    fiberG: Math.max(25, Math.round(calories / 1000) * 14),
  };
}
