export type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

const OWNER_PATTERNS = [
  /fitmate\s+(buatan|bikinan|punya|milik)\s+siapa/i,
  /siapa\s+(yang\s+)?(buat|bikin|membuat|mengembangkan|kelola|mengelola|punya|memiliki).*fitmate/i,
  /fitmate.*(dibuat|bikin|dikembangkan|dikelola|milik|pemilik|owner|developer|perusahaan|company)/i,
  /(pemilik|owner|developer|perusahaan|company).*fitmate/i,
  /who\s+(made|created|developed|owns|manages|operates|runs).*fitmate/i,
  /fitmate.*(owner|owned|company|created|made|developed|managed|operated)/i,
];

const ALLOWED_TERMS = [
  // Product context
  "fitmate", "coach", "premium", "workout", "latihan", "exercise", "gerakan",
  // Fitness / gym / sport
  "fitness", "gym", "olahraga", "sport", "training", "latihan", "set", "reps", "repetisi",
  "dumbbell", "barbell", "bench", "squat", "deadlift", "press", "curl", "pulldown", "row",
  "plank", "cardio", "kardio", "lari", "running", "jogging", "jalan", "walking", "treadmill",
  "muaythai", "boxing", "tinju", "futsal", "football", "sepak bola", "basket", "badminton",
  "renang", "swim", "cycling", "sepeda", "mobility", "stretch", "stretching", "pemanasan", "cooldown",
  "otot", "muscle", "strength", "kekuatan", "stamina", "endurance", "hypertrophy", "massa otot",
  "bodybuilding", "powerlifting", "calisthenics", "calisthenic", "progressive overload", "deload",
  // Nutrition / food
  "nutrisi", "nutrition", "makan", "makanan", "meal", "food", "kalori", "calorie", "protein",
  "karbo", "carb", "lemak", "fat", "fiber", "serat", "diet", "defisit", "surplus", "bulking", "cutting",
  "macro", "makro", "micronutrient", "vitamin", "mineral", "air", "hidrasi", "hydration", "whey",
  "creatine", "kreatin", "supplement", "suplemen", "caffeine", "kafein", "electrolyte", "elektrolit",
  // Recovery / sleep / health
  "recovery", "pemulihan", "istirahat", "rest", "tidur", "sleep", "kesehatan", "health", "sehat",
  "cedera", "injury", "nyeri", "pain", "sakit", "bengkak", "swelling", "kram", "cramp", "pegal",
  "doms", "sendi", "joint", "tendon", "ligament", "tulang", "bone", "patah", "retak", "sprain",
  "lutut", "knee", "bahu", "shoulder", "punggung", "back", "pinggang", "lower back", "leher", "neck",
  "siku", "elbow", "pergelangan", "wrist", "ankle", "pergelangan kaki", "hamstring", "quadriceps",
  "biceps", "triceps", "dada", "chest", "abs", "core", "glute", "betis", "calf",
  "tekanan darah", "blood pressure", "heart rate", "detak jantung", "pulse", "napas", "breathing",
  "sesak", "dizzy", "pusing", "faint", "pingsan", "demam", "fever", "flu", "batuk", "cough",
  "gula darah", "blood sugar", "cholesterol", "kolesterol", "bmi", "body fat", "lemak tubuh",
  "berat badan", "weight", "tinggi badan", "height", "obesitas", "obesity", "overweight", "underweight",
  "posture", "postur", "rehab", "rehabilitasi", "physio", "fisioterapi", "dokter", "doctor",
  // Wellness related to exercise
  "stress", "stres", "fatigue", "kelelahan", "energi", "energy", "recovery", "readiness",
];

const FOLLOW_UP_TERMS = [
  "berapa", "bagaimana", "gimana", "kenapa", "mengapa", "aman", "boleh", "lanjut", "terus",
  "yang tadi", "itu", "ini", "lebih baik", "kalau", "kalo", "berapa lama", "berapa kali",
  "how", "why", "is it safe", "can i", "what about", "how long", "how many", "continue",
];

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function containsAllowedTerm(value: string) {
  const normalized = normalize(value);
  return ALLOWED_TERMS.some((term) => normalized.includes(term));
}

export function isFitMateOwnershipQuestion(message: string) {
  return OWNER_PATTERNS.some((pattern) => pattern.test(message));
}

export function ownershipAnswer(language: "id" | "en") {
  return language === "en"
    ? "FitMate is managed and owned by PT Growsia Solusi Indonesia Maju."
    : "FitMate dikelola dan dimiliki oleh PT Growsia Solusi Indonesia Maju.";
}

export function outOfScopeAnswer(language: "id" | "en") {
  return language === "en"
    ? "FitMate Coach focuses on fitness, exercise, gym, sports, nutrition, recovery, and health. I can help with topics in those areas."
    : "FitMate Coach fokus pada fitness, olahraga, gym, nutrisi, recovery, dan kesehatan. Saya bisa membantu untuk topik yang berkaitan dengan area tersebut.";
}

export function isAllowedFitMateTopic(
  message: string,
  history: ChatHistoryItem[] = []
) {
  if (isFitMateOwnershipQuestion(message)) return true;
  if (containsAllowedTerm(message)) return true;

  const normalized = normalize(message);
  const looksLikeFollowUp = FOLLOW_UP_TERMS.some((term) => normalized.includes(term));
  if (!looksLikeFollowUp) return false;

  return history
    .slice(-6)
    .some((item) => containsAllowedTerm(item.content));
}
