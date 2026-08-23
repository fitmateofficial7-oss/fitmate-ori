"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import FitMateIcon from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";
import { usePremiumAccess } from "@/hooks/use-premium-access";
import { calculateNutritionTargets } from "@/lib/prelaunch-fitness";
import { supabase } from "@/lib/supabase";

type NutritionEntry = {
  id: string;
  logged_at: string;
  meal_type: string;
  food_name: string;
  serving_description: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  source: "manual" | "ai_scan";
  notes: string | null;
};

type NutritionTarget = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

type EntryForm = {
  mealType: string;
  foodName: string;
  serving: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  notes: string;
};

type MacroTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

type NutritionAnalysis = {
  food_detected: boolean;
  dish_name: string;
  summary: string;
  items: Array<
    MacroTotals & {
      name: string;
      estimated_portion: string;
    }
  >;
  totals: MacroTotals;
  estimated_calorie_range: string;
  confidence: "low" | "medium" | "high";
  assumptions: string[];
  suggestions: string[];
  disclaimer: string;
};

type DailyUsage = {
  plan: "free" | "premium";
  isPremium: boolean;
  chat: {
    used: number;
    limit: number;
    remaining: number;
    period: "lifetime" | "day";
    resets_at: string | null;
  };
  nutrition: {
    used: number;
    limit: number;
    remaining: number;
    period: "lifetime" | "day";
    resets_at: string | null;
  };
  resets_at: string | null;
};

type CoachApiResponse = {
  success?: boolean;
  analysis?: NutritionAnalysis;
  usage?: DailyUsage;
  error?: string;
  code?: string;
  upgradeUrl?: string | null;
};

const EMPTY_FORM: EntryForm = {
  mealType: "meal",
  foodName: "",
  serving: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
  notes: "",
};

function jakartaDay(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatTime(value: string, language: "id" | "en") {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function mealTypeLabel(value: string, language: "id" | "en") {
  const labels: Record<string, [string, string]> = {
    breakfast: ["Sarapan", "Breakfast"],
    lunch: ["Makan siang", "Lunch"],
    dinner: ["Makan malam", "Dinner"],
    snack: ["Camilan", "Snack"],
    pre_workout: ["Sebelum latihan", "Pre-workout"],
    post_workout: ["Setelah latihan", "Post-workout"],
    meal: ["Makanan", "Meal"],
    meal_scan: ["Hasil scan", "Meal scan"],
  };
  const pair = labels[value];
  return pair ? (language === "id" ? pair[0] : pair[1]) : value.replaceAll("_", " ");
}

type FoodHealthInput = {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

const WHOLE_FOOD_TERMS = [
  "sayur", "vegetable", "salad", "buah", "fruit", "oat", "oatmeal", "ikan",
  "fish", "salmon", "tuna", "ayam", "chicken", "telur", "egg", "tempe",
  "tofu", "tahu", "kacang", "beans", "lentil", "yogurt", "ubi", "sweet potato",
  "kentang rebus", "brown rice", "nasi merah",
];

const ULTRA_PROCESSED_TERMS = [
  "goreng", "fried", "burger", "pizza", "donat", "donut", "soda", "soft drink",
  "permen", "candy", "keripik", "chips", "mie instan", "instant noodle", "nugget",
  "sosis", "sausage", "fast food", "milkshake", "boba",
];

function calculateFoodHealthScore(input: FoodHealthInput) {
  const calories = Math.max(0, Number(input.calories) || 0);
  const protein = Math.max(0, Number(input.protein_g) || 0);
  const fat = Math.max(0, Number(input.fat_g) || 0);
  const fiber = Math.max(0, Number(input.fiber_g) || 0);
  const name = input.food_name.trim().toLowerCase();
  let score = 5;

  score += Math.min(2, WHOLE_FOOD_TERMS.filter((term) => name.includes(term)).length * 0.8);
  score -= Math.min(3, ULTRA_PROCESSED_TERMS.filter((term) => name.includes(term)).length * 1.25);

  if (calories > 0) {
    const proteinPer100Calories = (protein / calories) * 100;
    const fiberPer100Calories = (fiber / calories) * 100;
    const fatCalorieShare = (fat * 9) / calories;

    if (fiberPer100Calories >= 2) score += 2;
    else if (fiberPer100Calories >= 1) score += 1.25;
    else if (fiberPer100Calories >= 0.5) score += 0.5;
    else if (fiberPer100Calories < 0.15) score -= 0.75;

    if (proteinPer100Calories >= 12) score += 1.5;
    else if (proteinPer100Calories >= 8) score += 1;
    else if (proteinPer100Calories >= 4) score += 0.4;

    if (fatCalorieShare > 0.65) score -= 1.25;
    else if (fatCalorieShare > 0.5) score -= 0.6;

    if (calories > 1200) score -= 1;
    else if (calories > 800) score -= 0.5;

    if (fiber >= 5 && protein >= 15) score += 0.5;
  }

  return Math.min(10, Math.max(1, Math.round(score)));
}

function getHealthScoreTone(score: number) {
  if (score >= 8) return "border-green-200 bg-green-50 text-green-800 dark:border-green-400/20 dark:bg-green-400/10 dark:text-green-100";
  if (score >= 6) return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100";
  if (score >= 4) return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100";
  return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100";
}

function HealthStars({ score }: { score: number }) {
  const filled = Math.min(5, Math.max(1, Math.round(score / 2)));
  return (
    <span className="inline-flex gap-0.5" aria-label={`${filled} of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < filled ? "text-amber-400" : "text-slate-300 dark:text-slate-600"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function NutritionPage() {
  const router = useRouter();
  const { language, tr } = useLanguage();
  const { isPremium, loading: premiumLoading } = usePremiumAccess();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [target, setTarget] = useState<NutritionTarget>({ calories: 2000, protein_g: 120, carbs_g: 250, fat_g: 65, fiber_g: 30 });
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<"food" | "targets" | null>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);

  const [usage, setUsage] = useState<DailyUsage | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<NutritionAnalysis | null>(null);
  const [scanning, setScanning] = useState(false);

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      router.replace("/login?redirect=%2Fnutrition");
      throw new Error(tr("Sesi sudah berakhir.", "Your session has ended."));
    }
    return session.access_token;
  }, [router, tr]);

  const loadUsage = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/coach", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = (await response.json()) as CoachApiResponse;
      if (response.ok && payload.success && payload.usage) setUsage(payload.usage);
    } catch {
      // The nutrition page can still show saved data if usage status is temporarily unavailable.
    }
  }, [getAccessToken]);

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login?redirect=%2Fnutrition");
      return;
    }
    setUserId(user.id);

    const [entryResult, targetResult, profileResult] = await Promise.all([
      supabase.from("nutrition_entries").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(300),
      supabase.from("nutrition_targets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("fitness_profiles").select("weight, goal").eq("user_id", user.id).maybeSingle(),
    ]);

    if (entryResult.error) {
      setError(tr("Data nutrisi belum siap. Periksa migrasi Supabase.", "Nutrition data is not ready. Check the Supabase migration."));
    }
    setEntries((entryResult.data || []) as NutritionEntry[]);

    if (targetResult.data) {
      setTarget(targetResult.data as NutritionTarget);
    } else if (profileResult.data) {
      const generated = calculateNutritionTargets({
        weightKg: Number(profileResult.data.weight) || 70,
        goal: profileResult.data.goal || "",
      });
      const generatedTarget = {
        calories: generated.calories,
        protein_g: generated.proteinG,
        carbs_g: generated.carbsG,
        fat_g: generated.fatG,
        fiber_g: generated.fiberG,
      };
      setTarget(generatedTarget);
      await supabase.from("nutrition_targets").upsert({ user_id: user.id, ...generatedTarget }, { onConflict: "user_id" });
    }

    setLoading(false);
  }, [router, tr]);

  useEffect(() => {
    void Promise.all([load(), loadUsage()]);
  }, [load, loadUsage]);

  useEffect(() => {
    return () => {
      if (scanPreview) URL.revokeObjectURL(scanPreview);
    };
  }, [scanPreview]);

  const todayEntries = useMemo(
    () => entries.filter((entry) => jakartaDay(new Date(entry.logged_at)) === jakartaDay()),
    [entries]
  );

  const totals = useMemo(
    () => todayEntries.reduce(
      (result, entry) => ({
        calories: result.calories + Number(entry.calories || 0),
        protein_g: result.protein_g + Number(entry.protein_g || 0),
        carbs_g: result.carbs_g + Number(entry.carbs_g || 0),
        fat_g: result.fat_g + Number(entry.fat_g || 0),
        fiber_g: result.fiber_g + Number(entry.fiber_g || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
    ),
    [todayEntries]
  );

  const formHealthScore = useMemo(
    () => calculateFoodHealthScore({
      food_name: form.foodName,
      calories: Number(form.calories) || 0,
      protein_g: Number(form.protein) || 0,
      carbs_g: Number(form.carbs) || 0,
      fat_g: Number(form.fat) || 0,
      fiber_g: Number(form.fiber) || 0,
    }),
    [form]
  );

  const showFormHealthScore = Boolean(form.foodName.trim() || form.calories || form.protein || form.carbs || form.fat || form.fiber);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function saveEntry() {
    if (!userId || !form.foodName.trim()) return;
    setSaving(true);
    setError("");
    const payload = {
      user_id: userId,
      meal_type: form.mealType,
      food_name: form.foodName.trim(),
      serving_description: form.serving.trim() || null,
      calories: Math.max(0, Number(form.calories) || 0),
      protein_g: Math.max(0, Number(form.protein) || 0),
      carbs_g: Math.max(0, Number(form.carbs) || 0),
      fat_g: Math.max(0, Number(form.fat) || 0),
      fiber_g: Math.max(0, Number(form.fiber) || 0),
      source: "manual",
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await supabase.from("nutrition_entries").update(payload).eq("id", editingId).eq("user_id", userId)
      : await supabase.from("nutrition_entries").insert({ ...payload, logged_at: new Date().toISOString() });

    if (result.error) setError(result.error.message);
    else {
      setMessage(editingId ? tr("Entri diperbarui.", "Entry updated.") : tr("Makanan ditambahkan.", "Food added."));
      resetForm();
      setOpenPanel(null);
      await load();
    }
    setSaving(false);
  }

  function editEntry(entry: NutritionEntry) {
    setEditingId(entry.id);
    setOpenPanel("food");
    setForm({
      mealType: entry.meal_type,
      foodName: entry.food_name,
      serving: entry.serving_description || "",
      calories: String(entry.calories),
      protein: String(entry.protein_g),
      carbs: String(entry.carbs_g),
      fat: String(entry.fat_g),
      fiber: String(entry.fiber_g),
      notes: entry.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEntry(id: string) {
    const { error: deleteError } = await supabase.from("nutrition_entries").delete().eq("id", id).eq("user_id", userId);
    if (deleteError) setError(deleteError.message);
    else await load();
  }

  async function saveTargets() {
    if (!userId) return;
    setSaving(true);
    const { error: targetError } = await supabase.from("nutrition_targets").upsert(
      { user_id: userId, ...target, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (targetError) setError(targetError.message);
    else {
      setMessage(tr("Target nutrisi tersimpan.", "Nutrition targets saved."));
      setOpenPanel(null);
    }
    setSaving(false);
  }

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(tr("Gunakan foto JPG, PNG, atau WebP.", "Use a JPG, PNG, or WebP photo."));
      event.target.value = "";
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError(tr("Ukuran foto maksimal 8 MB.", "The photo must be no larger than 8 MB."));
      event.target.value = "";
      return;
    }

    if (scanPreview) URL.revokeObjectURL(scanPreview);
    setScanFile(file);
    setScanPreview(URL.createObjectURL(file));
    setScanResult(null);
    setError("");
    setMessage("");
  };

  const openPhotoPicker = (source: "camera" | "gallery") => {
    if (usage?.nutrition.remaining === 0) {
      if (usage.plan === "free") {
        router.push("/premium?from=nutrition&feature=meal-scan");
      } else {
        setError(tr("Batas 10 scan hari ini sudah habis.", "You have used all 10 meal scans today."));
      }
      return;
    }
    (source === "camera" ? cameraInputRef : galleryInputRef).current?.click();
  };

  const analyzePhoto = async () => {
    if (!scanFile || scanning) return;

    if (usage?.nutrition.remaining === 0) {
      openPhotoPicker("camera");
      return;
    }

    setScanning(true);
    setError("");
    setMessage("");

    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append("image", scanFile);
      formData.append("language", language);

      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = (await response.json()) as CoachApiResponse;

      if (data.usage) setUsage(data.usage);

      if (!response.ok || !data.success || !data.analysis) {
        if (data.code === "PREMIUM_REQUIRED" || data.upgradeUrl) {
          router.push(`${data.upgradeUrl || "/premium"}?from=nutrition&feature=meal-scan`);
          return;
        }
        throw new Error(data.error || tr("Foto belum dapat dianalisis.", "The photo could not be analyzed."));
      }

      setScanResult(data.analysis);
      setMessage(tr("Hasil foto sudah masuk ke jurnal nutrisi.", "The meal scan was added to your nutrition journal."));
      await load();
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : tr("Foto belum dapat dianalisis.", "The photo could not be analyzed.")
      );
    } finally {
      setScanning(false);
    }
  };

  const macroCards = [
    { key: "calories" as const, label: tr("Kalori", "Calories"), unit: "kcal" },
    { key: "protein_g" as const, label: "Protein", unit: "g" },
    { key: "carbs_g" as const, label: tr("Karbo", "Carbs"), unit: "g" },
    { key: "fat_g" as const, label: tr("Lemak", "Fat"), unit: "g" },
    { key: "fiber_g" as const, label: "Fiber", unit: "g" },
  ];

  const scanHealthScore = scanResult?.food_detected
    ? calculateFoodHealthScore({ food_name: scanResult.dish_name, ...scanResult.totals })
    : null;

  const displayedEntries = showAllEntries ? todayEntries : todayEntries.slice(0, 3);

  if (loading) {
    return (
      <main className="fitmate-app-page flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
        <p className="text-sm font-bold">{tr("Memuat nutrisi…", "Loading nutrition…")}</p>
      </main>
    );
  }

  return (
    <main className="fitmate-app-page fitmate-nutrition-page min-h-screen bg-slate-50 pb-32 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-3 py-2.5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 sm:px-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-green-600 dark:text-green-300">FitMate Nutrition</p>
            <h1 className="truncate text-lg font-black">{tr("Nutrisi", "Nutrition")}</h1>
          </div>
          <Link href="/coach" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-black dark:bg-white/10">
            <FitMateIcon name="message" className="h-4 w-4" />
            Coach
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-3 px-3 py-3 sm:px-5 sm:py-5">
        {(error || message) && (
          <div className={`rounded-xl border px-3 py-2 text-xs font-bold ${
            error
              ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100"
              : "border-green-200 bg-green-50 text-green-800 dark:border-green-400/20 dark:bg-green-400/10 dark:text-green-100"
          }`}>
            {error || message}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-green-200 bg-white dark:border-green-400/20 dark:bg-white/[0.04]">
          <div className="flex items-center justify-between gap-3 px-3 pt-3">
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">{tr("Foto makanan", "Meal photo")}</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {usage
                  ? usage.plan === "free"
                    ? tr(`${usage.nutrition.remaining}/${usage.nutrition.limit} scan gratis tersisa`, `${usage.nutrition.remaining}/${usage.nutrition.limit} free scan left`)
                    : tr(`${usage.nutrition.remaining}/${usage.nutrition.limit} scan tersisa hari ini`, `${usage.nutrition.remaining}/${usage.nutrition.limit} scans left today`)
                  : tr("Estimasi makro dari foto", "Estimate macros from a photo")}
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-300">
              <FitMateIcon name="camera" className="h-4 w-4" />
            </span>
          </div>

          <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handlePhoto} className="hidden" />
          <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />

          {!scanPreview ? (
            <div className="grid grid-cols-[1fr_auto] gap-2 p-3">
              <button
                type="button"
                onClick={() => openPhotoPicker("camera")}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-black text-white"
              >
                <FitMateIcon name={usage?.plan === "free" && usage.nutrition.remaining === 0 ? "lock" : "camera"} className="h-4 w-4" />
                {usage?.plan === "free" && usage.nutrition.remaining === 0
                  ? tr("Upgrade untuk scan", "Upgrade to scan")
                  : tr("Foto makanan", "Take meal photo")}
              </button>
              <button
                type="button"
                onClick={() => openPhotoPicker("gallery")}
                className="h-12 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-slate-100"
              >
                {tr("Galeri", "Gallery")}
              </button>
            </div>
          ) : (
            <div className="p-3">
              <div className="grid grid-cols-[84px_1fr] gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scanPreview} alt={tr("Foto makanan", "Meal photo")} className="h-20 w-20 rounded-xl object-cover" />
                <div className="flex min-w-0 flex-col justify-center">
                  <p className="truncate text-xs font-black">{scanFile?.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {tr("Siap dianalisis.", "Ready to analyze.")}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={analyzePhoto}
                      disabled={scanning}
                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                    >
                      {scanning ? tr("Menganalisis…", "Analyzing…") : tr("Analisis", "Analyze")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openPhotoPicker("gallery")}
                      disabled={scanning}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black dark:bg-white/10"
                    >
                      {tr("Ganti", "Change")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {scanResult && (
          <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
            {scanResult.food_detected ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-green-600 dark:text-green-300">{tr("Hasil", "Result")}</p>
                    <h2 className="mt-1 truncate text-lg font-black">{scanResult.dish_name}</h2>
                    {scanHealthScore !== null && (
                      <div className="mt-1 flex items-center gap-2 text-sm font-black">
                        <HealthStars score={scanHealthScore} />
                        <span className="text-xs text-slate-500 dark:text-slate-400">{scanHealthScore}/10</span>
                      </div>
                    )}
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-white/10 dark:text-slate-300">
                    {scanResult.confidence}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {[
                    [tr("Kalori", "Calories"), Math.round(scanResult.totals.calories), "kcal"],
                    ["Protein", Math.round(scanResult.totals.protein_g), "g"],
                    [tr("Karbo", "Carbs"), Math.round(scanResult.totals.carbs_g), "g"],
                    [tr("Lemak", "Fat"), Math.round(scanResult.totals.fat_g), "g"],
                    ["Fiber", Math.round(scanResult.totals.fiber_g), "g"],
                  ].map(([label, value, unit]) => (
                    <div key={String(label)} className="min-w-0 rounded-xl bg-slate-50 px-1.5 py-2 text-center dark:bg-white/5">
                      <p className="truncate text-[9px] font-bold text-slate-500 dark:text-slate-400">{label}</p>
                      <p className="mt-0.5 text-sm font-black">{value}</p>
                      <p className="text-[9px] text-slate-400">{unit}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{scanResult.summary}</p>
                {scanResult.suggestions[0] && (
                  <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-[11px] font-semibold text-green-800 dark:bg-green-400/10 dark:text-green-200">
                    {scanResult.suggestions[0]}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center">
                <p className="font-black">{tr("Makanan belum terbaca", "Food not recognized")}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{scanResult.summary}</p>
              </div>
            )}
          </section>
        )}

        {!premiumLoading && isPremium ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black">{tr("Hari ini", "Today")}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{tr("Target hari ini", "Today’s targets")}</p>
                </div>
                <button type="button" onClick={() => setOpenPanel((current) => current === "targets" ? null : "targets")} className="rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-black dark:bg-white/10">
                  {tr("Target", "Targets")}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {macroCards.map((item) => {
                  const used = Math.round(totals[item.key]);
                  const limit = Math.round(target[item.key]);
                  return (
                    <div key={item.key} className="min-w-0 rounded-xl bg-slate-50 px-1.5 py-2 text-center dark:bg-white/5">
                      <p className="truncate text-[9px] font-bold text-slate-500 dark:text-slate-400">{item.label}</p>
                      <p className="mt-0.5 text-sm font-black">{used}</p>
                      <p className="truncate text-[9px] text-slate-400">/{limit} {item.unit}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOpenPanel((current) => current === "food" ? null : "food")}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-black ${openPanel === "food" ? "border-green-500 bg-green-50 text-green-800 dark:bg-green-400/10 dark:text-green-100" : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]"}`}
              >
                <FitMateIcon name="food" className="h-4 w-4" />
                {editingId ? tr("Edit makanan", "Edit food") : tr("Tambah manual", "Add manually")}
              </button>
              <button
                type="button"
                onClick={() => setShowAllEntries((value) => !value)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-black dark:border-white/10 dark:bg-white/[0.04]"
              >
                <FitMateIcon name="list" className="h-4 w-4" />
                {tr("Jurnal", "Journal")} ({todayEntries.length})
              </button>
            </section>

            {openPanel === "food" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-black">{editingId ? tr("Edit makanan", "Edit food") : tr("Tambah makanan manual", "Add food manually")}</h2>
                  <button type="button" onClick={() => { resetForm(); setOpenPanel(null); }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10" aria-label={tr("Tutup", "Close")}>
                    <FitMateIcon name="x" className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <select value={form.mealType} onChange={(event) => setForm((previous) => ({ ...previous, mealType: event.target.value }))} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-slate-900">
                    <option value="breakfast">{tr("Sarapan", "Breakfast")}</option>
                    <option value="lunch">{tr("Makan siang", "Lunch")}</option>
                    <option value="dinner">{tr("Makan malam", "Dinner")}</option>
                    <option value="snack">{tr("Camilan", "Snack")}</option>
                    <option value="pre_workout">{tr("Sebelum latihan", "Pre-workout")}</option>
                    <option value="post_workout">{tr("Setelah latihan", "Post-workout")}</option>
                    <option value="meal">{tr("Makanan", "Meal")}</option>
                  </select>
                  <input value={form.foodName} onChange={(event) => setForm((previous) => ({ ...previous, foodName: event.target.value }))} placeholder={tr("Nama makanan", "Food name")} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-slate-900" />
                </div>

                <input value={form.serving} onChange={(event) => setForm((previous) => ({ ...previous, serving: event.target.value }))} placeholder={tr("Porsi, mis. 150 g", "Serving, e.g. 150 g")} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-slate-900" />

                <div className="mt-2 grid grid-cols-5 gap-1.5">
                  {[
                    ["calories", "kcal"], ["protein", "protein"], ["carbs", "karbo"], ["fat", "lemak"], ["fiber", "fiber"],
                  ].map(([key, placeholder]) => (
                    <input key={key} type="number" min="0" step="0.1" value={form[key as keyof EntryForm]} onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))} placeholder={placeholder} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-2 text-center text-[11px] dark:border-white/10 dark:bg-slate-900" />
                  ))}
                </div>

                {showFormHealthScore && (
                  <div className={`mt-2 flex items-center justify-between rounded-xl border px-3 py-2 ${getHealthScoreTone(formHealthScore)}`}>
                    <span className="text-xs font-black">{tr("Rating kesehatan", "Health rating")}</span>
                    <span className="flex items-center gap-2 text-xs font-black"><HealthStars score={formHealthScore} /> {formHealthScore}/10</span>
                  </div>
                )}

                <textarea value={form.notes} onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))} placeholder={tr("Catatan opsional", "Optional notes")} rows={1} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-white/10 dark:bg-slate-900" />
                <button type="button" onClick={saveEntry} disabled={!form.foodName.trim() || saving} className="mt-2 w-full rounded-xl bg-green-600 py-2.5 text-xs font-black text-white disabled:opacity-40">
                  {editingId ? tr("Simpan perubahan", "Save changes") : tr("Tambahkan ke jurnal", "Add to journal")}
                </button>
              </section>
            )}

            {openPanel === "targets" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-black">{tr("Target harian", "Daily targets")}</h2>
                  <button type="button" onClick={() => setOpenPanel(null)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10"><FitMateIcon name="x" className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {macroCards.map((item) => (
                    <label key={item.key} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold dark:bg-white/5">
                      <span>{item.label}</span>
                      <div className="flex items-center gap-1">
                        <input type="number" min="0" value={target[item.key]} onChange={(event) => setTarget((previous) => ({ ...previous, [item.key]: Math.max(0, Number(event.target.value) || 0) }))} className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-xs dark:border-white/10 dark:bg-slate-900" />
                        <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </div>
                    </label>
                  ))}
                </div>
                <button type="button" onClick={saveTargets} disabled={saving} className="mt-2 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-black text-white dark:bg-white dark:text-slate-950">{tr("Simpan target", "Save targets")}</button>
              </section>
            )}

            {(showAllEntries || todayEntries.length > 0) && (
              <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-black">{tr("Jurnal hari ini", "Today’s journal")}</h2>
                  {todayEntries.length > 3 && (
                    <button type="button" onClick={() => setShowAllEntries((value) => !value)} className="text-[11px] font-black text-green-700 dark:text-green-300">
                      {showAllEntries ? tr("Ringkas", "Collapse") : tr("Lihat semua", "View all")}
                    </button>
                  )}
                </div>
                <div className="mt-2 divide-y divide-slate-200 dark:divide-white/10">
                  {todayEntries.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">{tr("Belum ada makanan hari ini.", "No meals logged today.")}</p>
                  ) : displayedEntries.map((entry) => {
                    const score = calculateFoodHealthScore(entry);
                    return (
                      <article key={entry.id} className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <h3 className="truncate text-xs font-black">{entry.food_name}</h3>
                            {entry.source === "ai_scan" && <span className="rounded-md bg-green-50 px-1.5 py-0.5 text-[9px] font-black text-green-700 dark:bg-green-400/10 dark:text-green-300">AI</span>}
                          </div>
                          <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{formatTime(entry.logged_at, language)} · {mealTypeLabel(entry.meal_type, language)} · {Math.round(entry.calories)} kcal · {Math.round(entry.protein_g)}g protein</p>
                          <HealthStars score={score} />
                        </div>
                        <button type="button" onClick={() => editEntry(entry)} className="rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-black dark:bg-white/10">{tr("Edit", "Edit")}</button>
                        <button type="button" onClick={() => deleteEntry(entry.id)} className="rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-black text-rose-700 dark:bg-rose-400/10 dark:text-rose-200">{tr("Hapus", "Delete")}</button>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        ) : !premiumLoading ? (
          <section className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-950/30"><FitMateIcon name="lock" className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black">{tr("Tracking Premium", "Premium tracking")}</p>
              <p className="mt-0.5 text-[11px] opacity-80">{tr("Scan foto tetap tersedia.", "Meal scan stays available.")}</p>
            </div>
            <Link href="/premium?from=nutrition" className="rounded-lg bg-amber-400 px-2.5 py-2 text-[10px] font-black text-slate-950">Premium</Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}
