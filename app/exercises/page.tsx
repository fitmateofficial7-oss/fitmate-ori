"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FitMateIcon from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";
import { getExerciseGuide } from "@/lib/exercise-guides";
import { getExerciseVideoAsset } from "@/lib/exercise-video-assets";
import ExerciseMuscleMap from "@/components/exercise-muscle-map";
import LiveIcon from "@/components/live-icon";
import { usePremiumAccess } from "@/hooks/use-premium-access";
import { TIKTOK_STANDARD_EVENTS, trackTikTokEvent, trackTikTokExerciseView, trackTikTokExerciseWishlist } from "@/lib/tiktok-business";

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

function ExerciseMovementVideo({
  src,
  label,
  openLabel,
  closeLabel,
}: {
  src: string;
  label: string;
  openLabel: string;
  closeLabel: string;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isFullscreen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsFullscreen(true)}
        className="group relative h-full w-full bg-black"
        aria-label={openLabel}
      >
        <video
          key={src}
          src={src}
          aria-label={label}
          className="h-full w-full bg-black object-contain"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
        />
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/90 backdrop-blur-sm">
          <FitMateIcon name="video" className="h-4 w-4" />
        </span>
      </button>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setIsFullscreen(false)}
        >
          <video
            key={`${src}-fullscreen`}
            src={src}
            aria-label={label}
            className="h-full w-full object-contain"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/65 text-2xl font-light text-white shadow-lg backdrop-blur-md active:scale-95"
            aria-label={closeLabel}
          >
            <FitMateIcon name="x" className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}

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
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("fitmate:saved-exercises");
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setSavedSlugs(new Set(parsed.filter((item) => typeof item === "string")));
    } catch {
      // Saved exercises are optional; ignore storage failures.
    }
  }, []);

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

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) return;

    const timer = window.setTimeout(() => {
      void trackTikTokEvent(TIKTOK_STANDARD_EVENTS.SEARCH);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!selectedExercise) return;
    void trackTikTokExerciseView(selectedExercise);
  }, [selectedExercise]);

  const selectedGuide = selectedExercise
    ? getExerciseGuide(
        selectedExercise.slug,
        selectedExercise.name,
        language
      )
    : null;

  const selectedVideoAsset = selectedExercise
    ? getExerciseVideoAsset(selectedExercise.slug, selectedExercise.name)
    : null;

  const relatedExercises = selectedExercise
    ? exercises
        .filter(
          (exercise) =>
            String(exercise.id) !== String(selectedExercise.id) &&
            exercise.category === selectedExercise.category
        )
        .slice(0, 3)
    : [];

  const isExerciseLocked = (exercise: Exercise) =>
    !isPremium && !freeExerciseIds.has(String(exercise.id));

  const toggleSavedExercise = (slug: string) => {
    setSavedSlugs((current) => {
      const next = new Set(current);
      const wasSaved = next.has(slug);
      if (wasSaved) next.delete(slug);
      else next.add(slug);
      try {
        window.localStorage.setItem(
          "fitmate:saved-exercises",
          JSON.stringify(Array.from(next))
        );
      } catch {
        // Keep the in-memory state even if storage is unavailable.
      }

      if (!wasSaved) {
        const exercise = exercises.find((item) => item.slug === slug);
        if (exercise) void trackTikTokExerciseWishlist(exercise);
      }
      return next;
    });
  };

  return (
    <main className="fitmate-app-page fitmate-exercises-page min-h-screen bg-white pb-28 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">

        {/* HEADER */}

        <div className="fitmate-exercises-header mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-green-700">
              <FitMateIcon name="activity" className="h-4 w-4" />
              {tr("Panduan video gerakan", "Movement video guide")}
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

        <div className="fitmate-exercises-filters mb-8 grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">

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
            <div className="fitmate-exercises-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

              {filteredExercises.map((exercise) => {
                const guide = getExerciseGuide(
                  exercise.slug,
                  exercise.name,
                  language
                );
                const shortDescription = guide.motionLabel;
                const isLocked = isExerciseLocked(exercise);
                const videoAsset = getExerciseVideoAsset(exercise.slug, exercise.name);

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
                            "Lihat panduan video",
                            "View video guide"
                          )} ${exercise.name}`
                    }
                    className="fitmate-exercise-card group relative flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-green-400 hover:shadow-lg hover:shadow-green-100/70"
                  >
                    <div
                      className={`relative h-44 w-full overflow-hidden border-b border-green-100 bg-green-50 transition ${
                        isLocked ? "blur-[5px] opacity-35" : ""
                      }`}
                    >
                      {videoAsset ? (
                        <img
                          src={videoAsset.posterSrc}
                          alt={`${exercise.name} ${tr("thumbnail video", "video thumbnail")}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full bg-[#0a1410]" />
                      )}
                      <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300 shadow-sm backdrop-blur-sm">
                        {tr("Video gerakan", "Movement video")}
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
                            "Lihat panduan video",
                            "View video guide"
                          )}
                        </span>
                        <LiveIcon
                          variant="float"
                          className="transition group-hover:translate-x-1"
                        >
                          <span className="text-lg leading-none">→</span>
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


        {/* MOBILE-FIRST EXERCISE DETAIL */}

        {selectedExercise && selectedGuide && (
          <div
            className="fixed inset-0 z-50 bg-black/70 sm:flex sm:items-center sm:justify-center sm:p-6"
            onClick={() => setSelectedExercise(null)}
          >
            <article
              role="dialog"
              aria-modal="true"
              aria-labelledby="exercise-guide-title"
              className="fitmate-exercise-detail-mobile h-[100dvh] w-full overflow-y-auto bg-[#07100c] text-white sm:h-[92vh] sm:max-w-[480px] sm:rounded-[30px] sm:border sm:border-emerald-400/15 sm:shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-white/5 bg-[#07100c]/95 px-3 backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setSelectedExercise(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-green-400 active:bg-white/5"
                  aria-label={tr("Kembali", "Back")}
                >
                  <span className="text-2xl leading-none">‹</span>
                </button>

                <p className="text-[15px] font-black">
                  {tr("Panduan Gerakan", "Exercise Guide")}
                </p>

                <button
                  type="button"
                  onClick={() => toggleSavedExercise(selectedExercise.slug)}
                  aria-pressed={savedSlugs.has(selectedExercise.slug)}
                  aria-label={
                    savedSlugs.has(selectedExercise.slug)
                      ? tr("Hapus dari tersimpan", "Remove from saved")
                      : tr("Simpan gerakan", "Save exercise")
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full text-green-400 active:bg-white/5"
                >
                  <FitMateIcon
                    name="bookmark"
                    className={`h-5 w-5 ${savedSlugs.has(selectedExercise.slug) ? "fill-current" : ""}`}
                  />
                </button>
              </header>

              <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-3">
                <section className="mb-3">
                  <h2
                    id="exercise-guide-title"
                    className="text-[21px] font-black leading-tight tracking-tight"
                  >
                    {selectedExercise.name}
                  </h2>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] font-bold text-green-400">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span>{selectedExercise.category}</span>
                    <span className="text-white/20">•</span>
                    <span className="text-white/45">{selectedExercise.target_muscle}</span>
                  </div>
                </section>

                <ExerciseMuscleMap
                  primary={selectedExercise.target_muscle}
                  secondary={selectedExercise.secondary_muscles}
                />

                <section className="mt-4 rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-3">
                  <h3 className="text-[14px] font-black text-green-400">
                    {tr("Langkah Gerakan", "Movement Steps")}
                  </h3>

                  <div className="mt-3 grid grid-cols-[minmax(0,1fr)_104px] gap-3">
                    <ol className="space-y-2.5">
                      {selectedGuide.phases.slice(0, 3).map((step, index) => (
                        <li
                          key={`${step}-${index}`}
                          className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-[12px] font-semibold leading-[1.35] text-white/75"
                        >
                          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-white/10 bg-black/30 text-[10px] font-black text-white">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>

                    <div className="relative h-[160px] overflow-hidden rounded-[14px] border border-white/10 bg-black">
                      {selectedVideoAsset ? (
                        <ExerciseMovementVideo
                          src={selectedVideoAsset.src}
                          label={`${selectedExercise.name} ${tr("video gerakan", "movement video")}`}
                          openLabel={tr("Buka video layar penuh", "Open full-screen video")}
                          closeLabel={tr("Tutup video", "Close video")}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black px-3 text-center text-[10px] font-bold text-white/40">
                          {tr("Video belum tersedia", "Video not available")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <span className="shrink-0 rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-black text-green-400">
                      {selectedExercise.equipment}
                    </span>
                    <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black capitalize text-white/55">
                      {selectedExercise.difficulty === "easy"
                        ? tr("Mudah", "Easy")
                        : selectedExercise.difficulty === "medium"
                          ? tr("Sedang", "Medium")
                          : tr("Sulit", "Hard")}
                    </span>
                  </div>
                </section>

                {relatedExercises.length > 0 && (
                  <section className="mt-4">
                    <h3 className="px-0.5 text-[14px] font-black text-green-400">
                      {tr("Latihan Terkait", "Related Exercises")}
                    </h3>

                    <div className="mt-2 space-y-1.5">
                      {relatedExercises.map((exercise) => {
                        const locked = isExerciseLocked(exercise);

                        return (
                          <button
                            type="button"
                            key={exercise.id}
                            onClick={() => {
                              if (locked) {
                                router.push(
                                  "/premium?from=exercises&feature=full-3d-library"
                                );
                                return;
                              }
                              setSelectedExercise(exercise);
                            }}
                            className="grid w-full grid-cols-[48px_minmax(0,1fr)_24px] items-center gap-3 rounded-[15px] border border-white/[0.06] bg-white/[0.025] px-2.5 py-2 text-left active:bg-white/[0.06]"
                          >
                            <div className="relative h-12 w-12 overflow-hidden rounded-[10px] bg-[#101b16]">
                              {(() => {
                                const relatedVideoAsset = getExerciseVideoAsset(exercise.slug, exercise.name);
                                return relatedVideoAsset ? (
                                  <img
                                    src={relatedVideoAsset.posterSrc}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : null;
                              })()}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-black text-white/90">
                                {exercise.name}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] font-bold text-green-400/80">
                                {exercise.target_muscle}
                              </p>
                            </div>

                            <span className="text-xl font-light text-green-400">
                              {locked ? "⌾" : "›"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-white/35">
                      {tr("Fokus", "Focus")}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-white/70">
                      {selectedGuide.formFocus}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/coach")}
                    className="rounded-[14px] border border-green-500/15 bg-green-500/10 px-3 py-2.5 text-left active:bg-green-500/15"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-green-400/70">
                      Coach
                    </p>
                    <p className="mt-1 text-[11px] font-black leading-4 text-green-300">
                      {tr("Tanya teknik gerakan", "Ask about technique")}
                    </p>
                  </button>
                </section>
              </div>
            </article>
          </div>
        )}


      </div>
    </main>
  );
}
