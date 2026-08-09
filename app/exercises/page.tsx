"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import FitMateIcon from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";
import { getExerciseGuide } from "@/lib/exercise-guides";
import LiveIcon from "@/components/live-icon";
import { usePremiumAccess } from "@/hooks/use-premium-access";

type Exercise = {
  id: number | string;
  name: string;
  slug: string;
  category: string;
  target_muscle: string;
  secondary_muscles: string[] | null;
  equipment: string;
  difficulty: "easy" | "medium" | "hard";
  movement_pattern: string | null;
  description: string | null;
  instructions: string[] | null;
  tips: string[] | null;
  animation_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
};

const FREE_EXERCISE_LIMIT = 10;

const Exercise3DGuide = dynamic(
  () => import("@/components/exercise-3d-guide"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] animate-pulse rounded-3xl border border-emerald-100 bg-emerald-50/70 dark:border-emerald-400/10 dark:bg-emerald-950/20" />
    ),
  }
);

const Exercise3DPreview = dynamic(
  () => import("@/components/exercise-3d-preview"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-emerald-50 dark:bg-emerald-950/20" />
    ),
  }
);

export default function ExercisesPage() {
  const router = useRouter();
  const { language, tr } = useLanguage();
  const { isPremium, loading: premiumLoading } = usePremiumAccess();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [equipment, setEquipment] = useState("All");

  const [selectedExercise, setSelectedExercise] =
    useState<Exercise | null>(null);

  useEffect(() => {
    async function fetchExercises() {
      setLoading(true);

      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Failed to fetch exercises:", error);
      } else {
        setExercises(data || []);
      }

      setLoading(false);
    }

    fetchExercises();
  }, []);

  useEffect(() => {
    if (!selectedExercise) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedExercise(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedExercise]);

  const categories = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(exercises.map((exercise) => exercise.category))
      ).sort(),
    ];
  }, [exercises]);

  const difficulties = [
    "All",
    "easy",
    "medium",
    "hard",
  ];

  const equipmentOptions = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(exercises.map((exercise) => exercise.equipment))
      ).sort(),
    ];
  }, [exercises]);

  const freeExerciseIds = useMemo(
    () =>
      new Set(
        exercises
          .slice(0, FREE_EXERCISE_LIMIT)
          .map((exercise) => String(exercise.id))
      ),
    [exercises]
  );

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      const searchMatch =
        exercise.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        exercise.target_muscle
          .toLowerCase()
          .includes(search.toLowerCase());

      const categoryMatch =
        category === "All" ||
        exercise.category === category;

      const difficultyMatch =
        difficulty === "All" ||
        exercise.difficulty === difficulty;

      const equipmentMatch =
        equipment === "All" ||
        exercise.equipment === equipment;

      return (
        searchMatch &&
        categoryMatch &&
        difficultyMatch &&
        equipmentMatch
      );
    });
  }, [
    exercises,
    search,
    category,
    difficulty,
    equipment,
  ]);

  const selectedGuide = selectedExercise
    ? getExerciseGuide(
        selectedExercise.slug,
        selectedExercise.name,
        language
      )
    : null;

  return (
    <main className="fitmate-app-page min-h-screen bg-white pb-28 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">

        {/* HEADER */}

        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-green-700">
              <FitMateIcon name="activity" className="h-4 w-4" />
              {tr("Panduan gerakan 2D", "2D movement guide")}
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              {tr("Panduan Latihan", "Exercise Guide")}
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-600">
              {tr(
                "Pilih gerakan untuk melihat panduannya.",
                "Choose an exercise to see the guide."
              )}
            </p>
          </div>

          <Link
            href="/coach"
            className="inline-flex items-center justify-center rounded-2xl bg-green-600 px-5 py-3 font-black text-white shadow-lg shadow-green-600/20 transition hover:-translate-y-1 hover:bg-green-700"
          >
            {tr("Tanya Coach", "Ask Coach")}
          </Link>
        </div>


        {/* FILTERS */}

        <div className="mb-8 grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">

          <input
            type="text"
            placeholder={tr(
              "Cari nama gerakan atau otot...",
              "Search exercise name or muscle..."
            )}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All"
                  ? tr("Semua kategori", "All categories")
                  : item}
              </option>
            ))}
          </select>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            {difficulties.map((item) => (
              <option key={item} value={item}>
                {item === "All"
                  ? tr("Semua tingkat", "All levels")
                  : item === "easy"
                    ? tr("Mudah", "Easy")
                    : item === "medium"
                      ? tr("Sedang", "Medium")
                      : tr("Sulit", "Hard")}
              </option>
            ))}
          </select>

          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            {equipmentOptions.map((item) => (
              <option key={item} value={item}>
                {item === "All"
                  ? tr("Semua alat", "All equipment")
                  : item}
              </option>
            ))}
          </select>

        </div>


        {/* RESULT COUNT */}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">
              {tr("Ditemukan", "Found")}{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {filteredExercises.length}
              </span>{" "}
              {tr("gerakan", "exercises")}
            </p>
            {!isPremium && !premiumLoading && (
              <p className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-300">
                {tr(
                  `Paket Free membuka ${FREE_EXERCISE_LIMIT} gerakan. Gerakan lainnya terkunci.`,
                  `The Free plan includes ${FREE_EXERCISE_LIMIT} exercises. The rest are available with Premium.`
                )}
              </p>
            )}
          </div>
          {!isPremium && !premiumLoading && (
            <Link
              href="/premium"
              className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 shadow-sm"
            >
              {tr("Lihat Premium", "View Premium")}
            </Link>
          )}
        </div>


        {/* LOADING */}

        {(loading || premiumLoading) && (
          <div className="py-20 text-center text-slate-500">
            {tr("Memuat gerakan...", "Loading exercises...")}
          </div>
        )}


        {/* EMPTY */}

        {!loading &&
          !premiumLoading &&
          filteredExercises.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center">
              <h2 className="text-xl font-semibold">
                {tr("Gerakan tidak ditemukan", "No exercises found")}
              </h2>

              <p className="mt-2 text-slate-500">
                {tr(
                  "Coba ubah kata pencarian atau filter.",
                  "Try changing your search term or filters."
                )}
              </p>
            </div>
          )}


        {/* EXERCISE GRID */}

        {!loading &&
          !premiumLoading &&
          filteredExercises.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {filteredExercises.map((exercise) => {
                const guide = getExerciseGuide(
                  exercise.slug,
                  exercise.name,
                  language
                );
                const shortDescription = guide.motionLabel;
                const isLocked =
                  !isPremium &&
                  !freeExerciseIds.has(String(exercise.id));

                return (
                  <button
                    key={exercise.id}
                    onClick={() => {
                      if (isLocked) {
                        router.push(
                          "/premium?from=exercises&feature=full-3d-library"
                        );
                        return;
                      }
                      setSelectedExercise(exercise);
                    }}
                    aria-label={
                      isLocked
                        ? `${tr("Tersedia di Premium", "Available with Premium")}: ${exercise.name}`
                        : `${tr(
                            "Lihat panduan 2D",
                            "View 2D guide"
                          )} ${exercise.name}`
                    }
                    className="fitmate-exercise-card group relative flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-green-400 hover:shadow-lg hover:shadow-green-100/70"
                  >
                    <div
                      className={`relative h-44 w-full overflow-hidden border-b border-green-100 bg-green-50 transition ${
                        isLocked ? "blur-[5px] opacity-35" : ""
                      }`}
                    >
                      <Exercise3DPreview
                        exerciseName={exercise.name}
                        preset={guide.preset}
                        language={language}
                      />
                      <span className="absolute right-3 top-3 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-green-700 shadow-sm">
                        {tr("Contoh gerakan", "Movement preview")}
                      </span>
                    </div>

                    <div
                      className={`flex flex-1 flex-col p-5 transition ${
                        isLocked ? "blur-[5px] opacity-35" : ""
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="truncate rounded-xl bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                          {exercise.category}
                        </span>
                        <span className="shrink-0 text-xs capitalize text-slate-500">
                          {exercise.difficulty === "easy"
                            ? tr("Mudah", "Easy")
                            : exercise.difficulty === "medium"
                              ? tr("Sedang", "Medium")
                              : tr("Sulit", "Hard")}
                        </span>
                      </div>

                      <h2 className="font-bold text-slate-900">
                        {exercise.name}
                      </h2>

                      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
                        {shortDescription}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
                        <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-slate-600">
                          {exercise.target_muscle}
                        </span>
                        <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-slate-600">
                          {exercise.equipment}
                        </span>
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-black text-green-700">
                        <span>
                          {tr(
                            "Lihat panduan 2D",
                            "View 2D guide"
                          )}
                        </span>
                        <LiveIcon
                          variant="float"
                          className="transition group-hover:translate-x-1"
                        >
                         
                        </LiveIcon>
                      </div>
                    </div>

                    {isLocked && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/30 p-4 backdrop-blur-[1px] dark:bg-slate-950/35">
                        <div className="rounded-2xl border border-white/80 bg-white/95 px-5 py-4 text-center text-slate-950 shadow-xl dark:border-white/10 dark:bg-slate-900/95 dark:text-white">
                          <FitMateIcon name="lock" className="mx-auto h-5 w-5" />
                          <p className="mt-1 text-sm font-black">
                            {tr("Khusus Premium", "Premium only")}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                            {tr("Lihat akses Premium", "View Premium access")}
                          </p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}

            </div>
          )}


        {/* DETAIL MODAL */}

        {selectedExercise && (

          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-6"
            onClick={() =>
              setSelectedExercise(null)
            }
          >

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="exercise-guide-title"
              className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:p-8"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="mb-6 flex items-start justify-between">

                <div>

                  <p className="text-sm font-semibold text-green-600">
                    {selectedExercise.category}
                  </p>

                  <h2 className="mt-1 text-3xl font-bold">
                    <span id="exercise-guide-title">
                      {selectedExercise.name}
                    </span>
                  </h2>

                </div>

                <button
                  onClick={() =>
                    setSelectedExercise(null)
                  }
                  className="rounded-full bg-slate-100 px-4 py-2 text-slate-600 hover:bg-slate-200"
                >
                  <FitMateIcon name="x" className="h-4 w-4" />
                </button>

              </div>

              <Exercise3DGuide
                key={selectedExercise.slug}
                exerciseName={selectedExercise.name}
                exerciseSlug={selectedExercise.slug}
                equipment={selectedExercise.equipment}
                targetMuscle={selectedExercise.target_muscle}
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-3">

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    {tr("Otot utama", "Primary muscle")}
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedExercise.target_muscle}
                  </p>
                </div>


                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    {tr("Alat", "Equipment")}
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedExercise.equipment}
                  </p>
                </div>


                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    {tr("Tingkat", "Level")}
                  </p>

                  <p className="mt-1 font-medium capitalize">
                    {selectedExercise.difficulty === "easy"
                      ? tr("Mudah", "Easy")
                      : selectedExercise.difficulty === "medium"
                        ? tr("Sedang", "Medium")
                        : tr("Sulit", "Hard")}
                  </p>
                </div>

              </div>

              {selectedGuide && (
                <div className="mt-8 grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
                    <h3 className="text-lg font-semibold">
                      {tr(
                        "Tentang gerakan",
                        "About this movement"
                      )}
                    </h3>
                    <p className="mt-2 leading-7 text-slate-600">
                      {selectedGuide.motionLabel}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold">
                      {tr("Persiapan alat", "Equipment setup")}
                    </h3>
                    <ol className="mt-4 space-y-3">
                      {selectedGuide.equipmentSetup.map(
                        (step, index) => (
                          <li
                            key={step}
                            className="flex gap-3 text-sm leading-6 text-slate-700"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                              {index + 1}
                            </span>
                            {step}
                          </li>
                        )
                      )}
                    </ol>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-lg font-semibold">
                      {tr(
                        "Cara melakukan",
                        "How to perform it"
                      )}
                    </h3>
                    <ol className="mt-4 space-y-3">
                      {selectedGuide.phases.map(
                        (step, index) => (
                          <li
                            key={step}
                            className="flex gap-3 text-sm leading-6 text-slate-700"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                              {index + 1}
                            </span>
                            {step}
                          </li>
                        )
                      )}
                    </ol>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-300">
                      {tr("Fokus gerakan", "Movement focus")}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {selectedGuide.formFocus}
                    </p>
                    <p className="mt-4 text-xs leading-5 text-slate-500">
                      {tr(
                        "Gunakan panduan ini sebagai referensi. Berhenti jika terasa sakit.",
                        "Use this guide as a reference. Stop if you feel pain."
                      )}
                    </p>
                  </div>
                </div>
              )}


              {/* SECONDARY MUSCLES */}

              {selectedExercise.secondary_muscles &&
                selectedExercise.secondary_muscles.length >
                  0 && (

                  <div className="mt-8">

                    <h3 className="text-lg font-semibold">
                      {tr("Otot pendukung", "Supporting muscles")}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-2">

                      {selectedExercise.secondary_muscles.map(
                        (muscle) => (

                          <span
                            key={muscle}
                            className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                          >
                            {muscle}
                          </span>

                        )
                      )}

                    </div>

                  </div>

                )}

            </div>

          </div>

        )}

      </div>
    </main>
  );
}
