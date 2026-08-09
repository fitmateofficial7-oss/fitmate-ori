"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import PremiumFeatureGate from "@/components/premium-feature-gate";
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
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
  "sayur",
  "vegetable",
  "salad",
  "buah",
  "fruit",
  "oat",
  "oatmeal",
  "ikan",
  "fish",
  "salmon",
  "tuna",
  "ayam",
  "chicken",
  "telur",
  "egg",
  "tempe",
  "tofu",
  "tahu",
  "kacang",
  "beans",
  "lentil",
  "yogurt",
  "ubi",
  "sweet potato",
  "kentang rebus",
  "brown rice",
  "nasi merah",
];

const ULTRA_PROCESSED_TERMS = [
  "goreng",
  "fried",
  "burger",
  "pizza",
  "donat",
  "donut",
  "soda",
  "soft drink",
  "permen",
  "candy",
  "keripik",
  "chips",
  "mie instan",
  "instant noodle",
  "nugget",
  "sosis",
  "sausage",
  "fast food",
  "milkshake",
  "boba",
];

function calculateFoodHealthScore(input: FoodHealthInput) {
  const calories = Math.max(0, Number(input.calories) || 0);
  const protein = Math.max(0, Number(input.protein_g) || 0);
  const fat = Math.max(0, Number(input.fat_g) || 0);
  const fiber = Math.max(0, Number(input.fiber_g) || 0);
  const name = input.food_name.trim().toLowerCase();
  let score = 5;

  const wholeFoodHits = WHOLE_FOOD_TERMS.filter((term) =>
    name.includes(term)
  ).length;
  const processedHits = ULTRA_PROCESSED_TERMS.filter((term) =>
    name.includes(term)
  ).length;

  score += Math.min(2, wholeFoodHits * 0.8);
  score -= Math.min(3, processedHits * 1.25);

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

    if (calories > 1_200) score -= 1;
    else if (calories > 800) score -= 0.5;

    if (fiber >= 5 && protein >= 15) score += 0.5;
  }

  return Math.min(10, Math.max(1, Math.round(score)));
}

function getHealthScoreTone(score: number) {
  if (score >= 8) {
    return "border-green-200 bg-green-50 text-green-800 dark:border-green-400/20 dark:bg-green-400/10 dark:text-green-100";
  }
  if (score >= 6) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100";
  }
  if (score >= 4) {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100";
  }
  return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100";
}

export default function NutritionPage() {
  const router = useRouter();
  const { tr } = useLanguage();
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
      setError(tr("Jalankan migrasi 202607280008_prelaunch_features.sql di Supabase.", "Run migration 202607280008_prelaunch_features.sql in Supabase."));
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
    void load();
  }, [load]);

  const todayEntries = useMemo(() => entries.filter((entry) => jakartaDay(new Date(entry.logged_at)) === jakartaDay()), [entries]);
  const totals = useMemo(() => todayEntries.reduce((result, entry) => ({
    calories: result.calories + Number(entry.calories || 0),
    protein_g: result.protein_g + Number(entry.protein_g || 0),
    carbs_g: result.carbs_g + Number(entry.carbs_g || 0),
    fat_g: result.fat_g + Number(entry.fat_g || 0),
    fiber_g: result.fiber_g + Number(entry.fiber_g || 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }), [todayEntries]);

  const remaining = useMemo(() => ({
    calories: Math.max(0, target.calories - totals.calories),
    protein: Math.max(0, target.protein_g - totals.protein_g),
    carbs: Math.max(0, target.carbs_g - totals.carbs_g),
    fat: Math.max(0, target.fat_g - totals.fat_g),
    fiber: Math.max(0, target.fiber_g - totals.fiber_g),
  }), [target, totals]);

  const mealSuggestions = useMemo(() => {
    const suggestions: Array<{ title: string; detail: string }> = [];
    if (remaining.protein >= 30) {
      suggestions.push({
        title: tr("Protein masih kurang", "Protein is still low"),
        detail: tr("Coba 150 g ayam/ikan, tahu-tempe, atau yogurt tinggi protein. Sesuaikan porsinya dengan sisa kalori.", "Try 150 g chicken/fish, tofu-tempeh, or high-protein yogurt. Adjust the serving to your remaining calories."),
      });
    }
    if (remaining.carbs >= 50 && remaining.calories >= 250) {
      suggestions.push({
        title: tr("Tambahkan energi latihan", "Add training energy"),
        detail: tr("Pilih nasi, kentang, oatmeal, atau buah sebagai sumber karbohidrat yang mudah diukur.", "Choose rice, potatoes, oats, or fruit as an easy-to-measure carbohydrate source."),
      });
    }
    if (remaining.fiber >= 8) {
      suggestions.push({
        title: tr("Serat belum tercapai", "Fiber is still low"),
        detail: tr("Tambahkan sayur, buah utuh, kacang, atau oatmeal dan cukupkan cairan.", "Add vegetables, whole fruit, legumes, or oats and keep fluids adequate."),
      });
    }
    if (suggestions.length === 0) {
      suggestions.push({
        title: tr("Target hampir tercapai", "Targets are nearly met"),
        detail: tr("Pilih makanan sederhana sesuai rasa lapar dan hindari memaksa makan hanya untuk mengejar angka.", "Choose a simple meal based on hunger and avoid forcing food only to chase numbers."),
      });
    }
    return suggestions.slice(0, 3);
  }, [remaining, tr]);

  const formHealthScore = useMemo(
    () =>
      calculateFoodHealthScore({
        food_name: form.foodName,
        calories: Number(form.calories) || 0,
        protein_g: Number(form.protein) || 0,
        carbs_g: Number(form.carbs) || 0,
        fat_g: Number(form.fat) || 0,
        fiber_g: Number(form.fiber) || 0,
      }),
    [form]
  );

  const showFormHealthScore = Boolean(
    form.foodName.trim() ||
      form.calories ||
      form.protein ||
      form.carbs ||
      form.fat ||
      form.fiber
  );

  const dailyHealthScore = useMemo(() => {
    if (todayEntries.length === 0) return null;

    const weighted = todayEntries.reduce(
      (result, entry) => {
        const weight = Math.max(1, Number(entry.calories) || 0);
        return {
          score:
            result.score +
            calculateFoodHealthScore(entry) * weight,
          weight: result.weight + weight,
        };
      },
      { score: 0, weight: 0 }
    );

    return weighted.weight > 0
      ? Math.round((weighted.score / weighted.weight) * 10) / 10
      : null;
  }, [todayEntries]);

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
    const { error: targetError } = await supabase.from("nutrition_targets").upsert({ user_id: userId, ...target, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (targetError) setError(targetError.message);
    else setMessage(tr("Target nutrisi tersimpan.", "Nutrition targets saved."));
    setSaving(false);
  }

  const macroCards = [
    { key: "calories" as const, label: tr("Kalori", "Calories"), unit: "kcal" },
    { key: "protein_g" as const, label: "Protein", unit: "g" },
    { key: "carbs_g" as const, label: tr("Karbo", "Carbs"), unit: "g" },
    { key: "fat_g" as const, label: tr("Lemak", "Fat"), unit: "g" },
    { key: "fiber_g" as const, label: "Fiber", unit: "g" },
  ];

  if (loading) {
    return (
      <main className="fitmate-app-page flex min-h-screen items-center justify-center bg-slate-50 p-8 text-slate-900 dark:bg-slate-950 dark:text-white">
        <p className="font-bold">{tr("Memuat nutrisi…", "Loading nutrition…")}</p>
      </main>
    );
  }

  const caloriePercent = Math.min(
    100,
    target.calories > 0 ? (totals.calories / target.calories) * 100 : 0
  );
  const primarySuggestion = mealSuggestions[0];

  return (
    <PremiumFeatureGate
      featureNameId="Nutrisi khusus Premium"
      featureNameEn="Premium nutrition tracking"
      descriptionId="Buka jurnal makanan, target makro, ringkasan nutrisi, dan rekomendasi harian dengan FitMate Premium."
      descriptionEn="Unlock the food journal, macro targets, nutrition summaries, and daily recommendations with FitMate Premium."
    >
      <main className="fitmate-app-page min-h-screen bg-slate-50 pb-40 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-green-600 dark:text-green-300">
              FitMate Nutrition
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">
              {tr("Nutrisi hari ini", "Today’s nutrition")}
            </h1>
          </div>
          <Link
            href="/coach"
            className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white shadow-sm"
          >
            {tr("Scan makanan", "Scan food")}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        {(error || message) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100"
                : "border-green-200 bg-green-50 text-green-800 dark:border-green-400/20 dark:bg-green-400/10 dark:text-green-100"
            }`}
          >
            {error || message}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[1.05fr_1.6fr]">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 to-emerald-500 p-5 text-white shadow-lg shadow-green-700/15 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-green-50">
                  {tr("Kalori", "Calories")}
                </p>
                <p className="mt-1 text-4xl font-black">
                  {Math.round(totals.calories)}
                </p>
                <p className="text-sm text-green-50/90">
                  {tr("dari", "of")} {Math.round(target.calories)} kcal
                </p>
              </div>
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/15">
                <div
                  className="absolute inset-2 rounded-full"
                  style={{
                    background: `conic-gradient(white ${caloriePercent}%, rgba(255,255,255,.18) ${caloriePercent}% 100%)`,
                  }}
                />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-sm font-black shadow-inner">
                  {Math.round(caloriePercent)}%
                </div>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/12 px-4 py-3">
              <span className="text-sm font-bold">{tr("Sisa hari ini", "Remaining")}</span>
              <span className="font-black">{Math.round(remaining.calories)} kcal</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {macroCards.slice(1).map((item) => {
                const used = Math.round(totals[item.key]);
                const limit = Math.round(target[item.key]);
                const percent = Math.min(100, limit > 0 ? (used / limit) * 100 : 0);

                return (
                  <div key={item.key} className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {item.label}
                      </p>
                      <span className="text-[10px] font-black text-slate-400">
                        {Math.round(percent)}%
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-black">
                      {used}
                      <span className="ml-1 text-xs font-bold text-slate-400">
                        /{limit} {item.unit}
                      </span>
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {primarySuggestion && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl bg-green-50 p-4 dark:bg-green-400/10">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white" aria-hidden="true">
                  ✦
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-green-900 dark:text-green-100">
                    {primarySuggestion.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-green-800 dark:text-green-200/80">
                    {primarySuggestion.detail}
                  </p>
                </div>
                {dailyHealthScore !== null && (
                  <div className="shrink-0 rounded-2xl border border-green-200 bg-white/80 px-3 py-2 text-center text-green-800 shadow-sm dark:border-green-400/20 dark:bg-slate-950/45 dark:text-green-100">
                    <p className="text-lg font-black leading-none">
                      {dailyHealthScore}/10
                    </p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-wide">
                      {tr("Rata-rata", "Average")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setOpenPanel((current) => (current === "food" ? null : "food"))}
            className={`rounded-2xl border px-4 py-4 text-left ${
              openPanel === "food"
                ? "border-green-500 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-400/10 dark:text-green-100"
                : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
            }`}
          >
            <span className="block text-lg font-black">＋</span>
            <span className="mt-1 block font-black">
              {editingId ? tr("Edit makanan", "Edit food") : tr("Tambah makanan", "Add food")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setOpenPanel((current) => (current === "targets" ? null : "targets"))}
            className={`rounded-2xl border px-4 py-4 text-left ${
              openPanel === "targets"
                ? "border-green-500 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-400/10 dark:text-green-100"
                : "border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
            }`}
          >
            <span className="block text-lg font-black">◎</span>
            <span className="mt-1 block font-black">{tr("Atur target", "Set targets")}</span>
          </button>
        </section>

        {openPanel === "food" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">
                {editingId ? tr("Edit makanan", "Edit food") : tr("Tambah makanan", "Add food")}
              </h2>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setOpenPanel(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-black text-slate-600 dark:bg-white/10 dark:text-white"
                aria-label={tr("Tutup formulir", "Close form")}
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select
                value={form.mealType}
                onChange={(event) => setForm((previous) => ({ ...previous, mealType: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
                <option value="pre_workout">Pre-workout</option>
                <option value="post_workout">Post-workout</option>
                <option value="meal">Meal</option>
              </select>
              <input
                value={form.foodName}
                onChange={(event) => setForm((previous) => ({ ...previous, foodName: event.target.value }))}
                placeholder={tr("Nama makanan", "Food name")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <input
              value={form.serving}
              onChange={(event) => setForm((previous) => ({ ...previous, serving: event.target.value }))}
              placeholder={tr("Porsi, misalnya 150 g", "Serving, e.g. 150 g")}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            />

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ["calories", "kcal"],
                ["protein", "protein g"],
                ["carbs", "carbs g"],
                ["fat", "fat g"],
                ["fiber", "fiber g"],
              ].map(([key, placeholder]) => (
                <input
                  key={key}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form[key as keyof EntryForm]}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, [key]: event.target.value }))
                  }
                  placeholder={placeholder}
                  className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                />
              ))}
            </div>

            {showFormHealthScore && (
              <div
                className={`mt-4 flex items-center gap-4 rounded-2xl border p-4 ${getHealthScoreTone(
                  formHealthScore
                )}`}
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/85 text-xl font-black shadow-sm dark:bg-slate-950/55">
                  {formHealthScore}/10
                </div>
                <div className="min-w-0">
                  <p className="font-black">
                    {tr("Rating kesehatan makanan", "Food health rating")}
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    {tr(
                      "Estimasi dari nama makanan dan data makro. Nilai 10 berarti pilihan sangat sehat.",
                      "Estimated from the food name and macros. A score of 10 means a very healthy choice."
                    )}
                  </p>
                </div>
              </div>
            )}

            <textarea
              value={form.notes}
              onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
              placeholder={tr("Catatan opsional", "Optional notes")}
              rows={2}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={saveEntry}
              disabled={!form.foodName.trim() || saving}
              className="mt-4 w-full rounded-2xl bg-green-600 py-3 font-black text-white disabled:opacity-40"
            >
              {editingId ? tr("Simpan perubahan", "Save changes") : tr("Tambahkan ke jurnal", "Add to journal")}
            </button>
          </section>
        )}

        {openPanel === "targets" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">{tr("Target harian", "Daily targets")}</h2>
              <button
                type="button"
                onClick={() => setOpenPanel(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-black text-slate-600 dark:bg-white/10 dark:text-white"
                aria-label={tr("Tutup target", "Close targets")}
              >
                ×
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {macroCards.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold dark:bg-white/5"
                >
                  <span>{item.label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={target[item.key]}
                      onChange={(event) =>
                        setTarget((previous) => ({
                          ...previous,
                          [item.key]: Math.max(0, Number(event.target.value) || 0),
                        }))
                      }
                      className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                    />
                    <span className="w-8 text-xs text-slate-400">{item.unit}</span>
                  </div>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={saveTargets}
              disabled={saving}
              className="mt-4 w-full rounded-2xl bg-slate-900 py-3 font-black text-white dark:bg-white dark:text-slate-950"
            >
              {tr("Simpan target", "Save targets")}
            </button>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black">{tr("Jurnal hari ini", "Today’s journal")}</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
              {todayEntries.length}
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-200 dark:divide-white/10">
            {todayEntries.length === 0 && (
              <div className="py-8 text-center">
                <p className="font-bold">{tr("Belum ada makanan", "No meals yet")}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {tr("Tambah manual atau scan dari Coach.", "Add one manually or scan it in Coach.")}
                </p>
              </div>
            )}

            {todayEntries.map((entry) => {
              const healthScore = calculateFoodHealthScore(entry);

              return (
                <article
                  key={entry.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 truncate font-black">{entry.food_name}</h3>
                      {entry.source === "ai_scan" && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700 dark:bg-violet-400/10 dark:text-violet-200">
                          AI
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${getHealthScoreTone(
                          healthScore
                        )}`}
                        title={tr(
                          "Estimasi berdasarkan nama makanan dan data makro yang tersedia.",
                          "Estimated from the food name and available macro data."
                        )}
                      >
                        {tr("Rating", "Rating")} {healthScore}/10
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatTime(entry.logged_at)} · {entry.meal_type}
                      {entry.serving_description ? ` · ${entry.serving_description}` : ""}
                    </p>
                    <p className="mt-2 text-sm font-bold text-green-700 dark:text-green-300">
                      {Math.round(entry.calories)} kcal · {Math.round(entry.protein_g)} g protein
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => editEntry(entry)}
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 dark:bg-white/10 dark:text-slate-200"
                    >
                      {tr("Edit", "Edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.id)}
                      className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-black text-rose-700 dark:bg-rose-400/10 dark:text-rose-200"
                    >
                      {tr("Hapus", "Delete")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
      </main>
    </PremiumFeatureGate>
  );
}
