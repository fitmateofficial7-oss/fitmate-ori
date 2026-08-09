export type FitMateLanguage = "id" | "en";

const GOALS: Record<string, [string, string]> = {
  "membentuk otot": ["Membentuk Otot", "Build Muscle"],
  "build muscle": ["Membentuk Otot", "Build Muscle"],
  "mengurangi lemak": ["Mengurangi Lemak", "Lose Fat"],
  "lose fat": ["Mengurangi Lemak", "Lose Fat"],
  "fat loss": ["Mengurangi Lemak", "Lose Fat"],
  "menambah kekuatan": ["Menambah Kekuatan", "Gain Strength"],
  "gain strength": ["Menambah Kekuatan", "Gain Strength"],
  "strength": ["Menambah Kekuatan", "Gain Strength"],
  "menjaga kebugaran": ["Menjaga Kebugaran", "Stay Fit"],
  "stay fit": ["Menjaga Kebugaran", "Stay Fit"],
  "general fitness": ["Menjaga Kebugaran", "Stay Fit"],
};

const EXPERIENCE: Record<string, [string, string]> = {
  pemula: ["Pemula", "Beginner"],
  beginner: ["Pemula", "Beginner"],
  menengah: ["Menengah", "Intermediate"],
  intermediate: ["Menengah", "Intermediate"],
  berpengalaman: ["Berpengalaman", "Experienced"],
  experienced: ["Berpengalaman", "Experienced"],
  advanced: ["Berpengalaman", "Experienced"],
};

const GENDER: Record<string, [string, string]> = {
  male: ["Laki-laki", "Male"],
  "laki-laki": ["Laki-laki", "Male"],
  pria: ["Laki-laki", "Male"],
  female: ["Perempuan", "Female"],
  perempuan: ["Perempuan", "Female"],
  wanita: ["Perempuan", "Female"],
};

const DIFFICULTY: Record<string, [string, string]> = {
  easy: ["Mudah", "Easy"],
  mudah: ["Mudah", "Easy"],
  medium: ["Sedang", "Medium"],
  sedang: ["Sedang", "Medium"],
  hard: ["Sulit", "Hard"],
  sulit: ["Sulit", "Hard"],
};

function pick(pair: [string, string], language: FitMateLanguage) {
  return language === "id" ? pair[0] : pair[1];
}

function normalized(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function localizeGoal(value: string | null | undefined, language: FitMateLanguage) {
  const raw = (value || "").trim();
  if (!raw) return language === "id" ? "Belum diatur" : "Not set";
  return GOALS[normalized(value)] ? pick(GOALS[normalized(value)], language) : raw;
}

export function localizeExperience(value: string | null | undefined, language: FitMateLanguage) {
  const raw = (value || "").trim();
  if (!raw) return language === "id" ? "Belum diatur" : "Not set";
  return EXPERIENCE[normalized(value)] ? pick(EXPERIENCE[normalized(value)], language) : raw;
}

export function localizeGender(value: string | null | undefined, language: FitMateLanguage) {
  const raw = (value || "").trim();
  if (!raw) return language === "id" ? "Belum diatur" : "Not set";
  return GENDER[normalized(value)] ? pick(GENDER[normalized(value)], language) : raw;
}

export function localizeDifficulty(value: string | null | undefined, language: FitMateLanguage) {
  const raw = (value || "").trim();
  if (!raw) return language === "id" ? "Belum diatur" : "Not set";
  return DIFFICULTY[normalized(value)] ? pick(DIFFICULTY[normalized(value)], language) : raw;
}

export function localizeTrainingDays(value: string | null | undefined, language: FitMateLanguage) {
  const raw = (value || "").trim();
  if (!raw) return language === "id" ? "Belum diatur" : "Not set";
  const match = raw.match(/\d+/);
  if (!match) return raw;
  const count = Number(match[0]);
  if (!Number.isFinite(count)) return raw;
  return language === "id" ? `${count} Hari` : `${count} ${count === 1 ? "Day" : "Days"}`;
}

export function localizeWorkoutStatus(value: string | null | undefined, language: FitMateLanguage) {
  const normalizedValue = normalized(value);
  if (normalizedValue === "completed") return language === "id" ? "Selesai" : "Completed";
  if (normalizedValue === "in_progress") return language === "id" ? "Berjalan" : "In progress";
  if (normalizedValue === "cancelled" || normalizedValue === "canceled") return language === "id" ? "Dibatalkan" : "Cancelled";
  return (value || "").replaceAll("_", " ");
}


const INDONESIAN_PLAN_TEXT = /\b(?:rencana|latihan|hari|istirahat|pemulihan|kekuatan|kebugaran|dada|punggung|bahu|kaki|lengan|otot|tubuh|inti|atas|bawah|dorong|tarik|seluruh)\b/i;
const ENGLISH_PLAN_TEXT = /\b(?:plan|workout|training|day|rest|recovery|strength|fitness|chest|back|shoulders?|legs?|arms?|muscle|body|upper|lower|push|pull|full)\b/i;

export function localizePlanTitle(
  value: string | null | undefined,
  language: FitMateLanguage
) {
  const raw = (value || "").trim();
  if (!raw) return language === "id" ? "Rencana Latihan Anda" : "Your Workout Plan";
  if (language === "en" && INDONESIAN_PLAN_TEXT.test(raw)) return "Your Workout Plan";
  if (language === "id" && ENGLISH_PLAN_TEXT.test(raw)) return "Rencana Latihan Anda";
  return raw;
}

export function localizeWorkoutDayName(
  value: string | null | undefined,
  dayNumber: number,
  hasExercises: boolean,
  language: FitMateLanguage
) {
  const raw = (value || "").trim();
  const fallback = language === "id"
    ? hasExercises
      ? `Hari Latihan ${dayNumber}`
      : "Hari Istirahat"
    : hasExercises
      ? `Workout Day ${dayNumber}`
      : "Rest Day";
  if (!raw) return fallback;
  if (language === "en" && INDONESIAN_PLAN_TEXT.test(raw)) return fallback;
  if (language === "id" && ENGLISH_PLAN_TEXT.test(raw)) return fallback;
  return raw;
}

export function localizeWorkoutFocus(
  value: string | null | undefined,
  hasExercises: boolean,
  language: FitMateLanguage
) {
  const raw = (value || "").trim();
  const fallback = language === "id"
    ? hasExercises
      ? "Latihan Kekuatan"
      : "Pemulihan dan Istirahat"
    : hasExercises
      ? "Strength Training"
      : "Recovery and Rest";
  if (!raw) return fallback;
  if (language === "en" && INDONESIAN_PLAN_TEXT.test(raw)) return fallback;
  if (language === "id" && ENGLISH_PLAN_TEXT.test(raw)) return fallback;
  return raw;
}

export function localizeWorkoutSessionName(
  value: string | null | undefined,
  dayNumber: number,
  language: FitMateLanguage
) {
  return localizeWorkoutDayName(value, dayNumber, true, language);
}
