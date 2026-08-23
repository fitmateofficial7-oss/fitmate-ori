"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language-provider";
import PremiumFeatureGate from "@/components/premium-feature-gate";
import {
  calculateReadiness,
  estimateOneRepMax,
  localizeStoredProgressionReason,
} from "@/lib/prelaunch-fitness";
import { getExerciseGuide } from "@/lib/exercise-guides";
import { localizeWorkoutSessionName } from "@/lib/fitness-i18n";
import { supabase } from "@/lib/supabase";

type ReadinessLog = {
  id: string;
  log_date: string;
  sleep_hours: number;
  energy: number;
  soreness: number;
  stress: number;
  pain_level: number;
  pain_areas: string[];
  available_minutes: number;
  readiness_score: number;
  recommendation: string;
  volume_modifier: number;
  intensity_modifier: number;
};

type BodyMeasurement = {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  hips_cm: number | null;
  notes: string | null;
};

type ProgressPhoto = {
  id: string;
  storage_path: string;
  pose: "front" | "side" | "back" | "other";
  captured_at: string;
  notes: string | null;
  signed_url?: string;
};

type WorkoutSession = {
  id: string | number;
  workout_name: string;
  workout_day: number;
  status: string;
  started_at: string;
  completed_at: string | null;
};

type WorkoutSetLog = {
  id: string;
  exercise_name: string;
  set_type: string;
  load_kg: number | null;
  reps: number | null;
  completed: boolean;
  created_at: string;
};

type Recommendation = {
  id: string;
  exercise_name: string;
  action: "increase" | "maintain" | "reduce" | "deload" | "technique";
  recommended_load_kg: number | null;
  recommended_reps_min: number | null;
  recommended_reps_max: number | null;
  reason: string;
  confidence: string;
  created_at: string;
};

type ReadinessForm = {
  sleepHours: string;
  energy: number;
  soreness: number;
  stress: number;
  painLevel: number;
  painAreas: string;
  availableMinutes: string;
};

type MeasurementForm = {
  weight: string;
  bodyFat: string;
  waist: string;
  chest: string;
  arm: string;
  thigh: string;
  hips: string;
  notes: string;
};

const EMPTY_READINESS: ReadinessForm = {
  sleepHours: "7",
  energy: 7,
  soreness: 4,
  stress: 4,
  painLevel: 0,
  painAreas: "",
  availableMinutes: "60",
};

const EMPTY_MEASUREMENT: MeasurementForm = {
  weight: "",
  bodyFat: "",
  waist: "",
  chest: "",
  arm: "",
  thigh: "",
  hips: "",
  notes: "",
};

function numericOrNull(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function formatDate(value: string, language: "id" | "en") {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function muscleForExercise(name: string) {
  const preset = getExerciseGuide(name, name, "en").preset;
  if (["bench-press", "incline-press", "machine-press", "pec-deck"].includes(preset)) return "Chest";
  if (["lat-pulldown", "seated-row", "assisted-pull-up"].includes(preset)) return "Back";
  if (["shoulder-press", "lateral-raise"].includes(preset)) return "Shoulders";
  if (["barbell-curl", "hammer-curl", "preacher-curl", "alternating-curl", "triceps-pushdown", "assisted-dip"].includes(preset)) return "Arms";
  if (["back-squat", "leg-press", "romanian-deadlift", "split-squat", "hack-squat", "leg-extension", "leg-curl", "hip-thrust", "calf-raise"].includes(preset)) return "Legs";
  if (["cable-crunch", "ab-crunch", "ab-wheel-rollout", "plank"].includes(preset)) return "Core";
  if (preset === "treadmill-walk") return "Cardio";
  return "Other";
}

function actionStyle(action: Recommendation["action"]) {
  if (action === "increase") return "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-200";
  if (action === "reduce" || action === "deload") return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-100";
  if (action === "technique") return "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-100";
  return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200";
}

export default function ProgressPage() {
  const router = useRouter();
  const { language, tr } = useLanguage();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [readiness, setReadiness] = useState<ReadinessLog[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [sets, setSets] = useState<WorkoutSetLog[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [readinessForm, setReadinessForm] = useState<ReadinessForm>(EMPTY_READINESS);
  const [measurementForm, setMeasurementForm] = useState<MeasurementForm>(EMPTY_MEASUREMENT);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPose, setPhotoPose] = useState<ProgressPhoto["pose"]>("front");
  const [photoNote, setPhotoNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login?redirect=%2Fprogress");
      return;
    }

    setUserId(user.id);
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [readinessResult, measurementResult, photoResult, sessionResult, setResult, recommendationResult] =
      await Promise.all([
        supabase.from("readiness_logs").select("*").eq("user_id", user.id).order("log_date", { ascending: false }).limit(30),
        supabase.from("body_measurements").select("*").eq("user_id", user.id).order("measured_at", { ascending: false }).limit(50),
        supabase.from("progress_photos").select("*").eq("user_id", user.id).order("captured_at", { ascending: false }).limit(30),
        supabase.from("workout_sessions").select("id, workout_name, workout_day, status, started_at, completed_at").eq("user_id", user.id).gte("started_at", since).order("started_at", { ascending: false }),
        supabase.from("workout_set_logs").select("id, exercise_name, set_type, load_kg, reps, completed, created_at").eq("user_id", user.id).gte("created_at", since).order("created_at", { ascending: false }).limit(3000),
        supabase.from("adaptive_recommendations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);

    const migrationError = [readinessResult, measurementResult, photoResult, setResult, recommendationResult].find((result) => result.error)?.error;
    if (migrationError) {
      setError(tr("Fitur progres belum siap di database.", "Run migration 202607280008_prelaunch_features.sql in Supabase first."));
    }

    setReadiness((readinessResult.data || []) as ReadinessLog[]);
    setMeasurements((measurementResult.data || []) as BodyMeasurement[]);
    setSessions((sessionResult.data || []) as WorkoutSession[]);
    setSets((setResult.data || []) as WorkoutSetLog[]);
    setRecommendations((recommendationResult.data || []) as Recommendation[]);

    const photoRows = (photoResult.data || []) as ProgressPhoto[];
    const withUrls = await Promise.all(
      photoRows.map(async (photo) => {
        const { data } = await supabase.storage.from("progress-photos").createSignedUrl(photo.storage_path, 60 * 60);
        return { ...photo, signed_url: data?.signedUrl };
      })
    );
    setPhotos(withUrls);
    setLoading(false);
  }, [router, tr]);

  useEffect(() => {
    void load();
  }, [load]);

  const [analysisNow] = useState(() => Date.now());
  const todayReadiness = readiness.find((item) => item.log_date === dateKey(new Date()));
  const readinessPreview = useMemo(() => {
    return calculateReadiness({
      sleepHours: Number(readinessForm.sleepHours) || 0,
      energy: readinessForm.energy,
      soreness: readinessForm.soreness,
      stress: readinessForm.stress,
      painLevel: readinessForm.painLevel,
      availableMinutes: Number(readinessForm.availableMinutes) || 60,
    });
  }, [readinessForm]);

  const weekly = useMemo(() => {
    const start = analysisNow - 7 * 24 * 60 * 60 * 1000;
    const weeklySessions = sessions.filter((session) => new Date(session.started_at).getTime() >= start);
    const weeklySets = sets.filter((set) => set.completed && new Date(set.created_at).getTime() >= start && set.set_type !== "warmup");
    const volume = weeklySets.reduce((total, set) => total + (set.load_kg || 0) * (set.reps || 0), 0);
    const exerciseCount = new Set(weeklySets.map((set) => set.exercise_name)).size;
    return {
      workouts: weeklySessions.filter((session) => session.status === "completed").length,
      sets: weeklySets.length,
      volume,
      exerciseCount,
    };
  }, [analysisNow, sessions, sets]);

  const calendarDays = useMemo(() => {
    const sessionMap = new Map(sessions.map((session) => [dateKey(session.started_at), session]));
    return Array.from({ length: 28 }, (_, index) => {
      const date = new Date(analysisNow - (27 - index) * 24 * 60 * 60 * 1000);
      const key = dateKey(date);
      return { date, key, session: sessionMap.get(key) };
    });
  }, [analysisNow, sessions]);

  const exerciseVolume = useMemo(() => {
    const map = new Map<string, number>();
    sets.filter((set) => set.completed && set.set_type !== "warmup").forEach((set) => {
      map.set(set.exercise_name, (map.get(set.exercise_name) || 0) + (set.load_kg || 0) * (set.reps || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [sets]);

  const muscleBalance = useMemo(() => {
    const start = analysisNow - 7 * 24 * 60 * 60 * 1000;
    const map = new Map<string, { sets: number; volume: number }>();
    sets
      .filter((set) => set.completed && set.set_type !== "warmup" && new Date(set.created_at).getTime() >= start)
      .forEach((set) => {
        const group = muscleForExercise(set.exercise_name);
        const current = map.get(group) || { sets: 0, volume: 0 };
        current.sets += 1;
        current.volume += (set.load_kg || 0) * (set.reps || 0);
        map.set(group, current);
      });
    return [...map.entries()].sort((left, right) => right[1].sets - left[1].sets);
  }, [analysisNow, sets]);

  const personalRecords = useMemo(() => {
    const map = new Map<string, { estimatedMax: number; load: number; reps: number }>();
    sets
      .filter((set) => set.completed && set.set_type !== "warmup" && (set.load_kg || 0) > 0 && (set.reps || 0) > 0)
      .forEach((set) => {
        const estimatedMax = estimateOneRepMax(set.load_kg || 0, set.reps || 0);
        const previous = map.get(set.exercise_name);
        if (!previous || estimatedMax > previous.estimatedMax) {
          map.set(set.exercise_name, { estimatedMax, load: set.load_kg || 0, reps: set.reps || 0 });
        }
      });
    return [...map.entries()].sort((left, right) => right[1].estimatedMax - left[1].estimatedMax).slice(0, 6);
  }, [sets]);

  const weeklyReview = useMemo(() => {
    const now = analysisNow;
    const currentStart = now - 7 * 24 * 60 * 60 * 1000;
    const previousStart = now - 14 * 24 * 60 * 60 * 1000;
    const validSets = sets.filter((set) => set.completed && set.set_type !== "warmup");
    const volumeFor = (start: number, end: number) => validSets
      .filter((set) => {
        const time = new Date(set.created_at).getTime();
        return time >= start && time < end;
      })
      .reduce((total, set) => total + (set.load_kg || 0) * (set.reps || 0), 0);
    const currentVolume = volumeFor(currentStart, now + 1);
    const previousVolume = volumeFor(previousStart, currentStart);
    const volumeChange = previousVolume > 0
      ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100)
      : null;
    const currentReadiness = readiness.filter(
      (item) => new Date(`${item.log_date}T12:00:00`).getTime() >= currentStart
    );
    const averageReadiness = currentReadiness.length
      ? Math.round(currentReadiness.reduce((total, item) => total + item.readiness_score, 0) / currentReadiness.length)
      : null;
    const weakest = muscleBalance.length > 1
      ? [...muscleBalance].sort((left, right) => left[1].sets - right[1].sets)[0]
      : null;
    return { volumeChange, averageReadiness, weakest };
  }, [analysisNow, sets, readiness, muscleBalance]);

  async function saveReadiness() {
    if (!userId) return;
    setSaving(true);
    setError("");
    setMessage("");
    const result = readinessPreview;
    const { error: saveError } = await supabase.from("readiness_logs").upsert(
      {
        user_id: userId,
        log_date: dateKey(new Date()),
        sleep_hours: Number(readinessForm.sleepHours),
        energy: readinessForm.energy,
        soreness: readinessForm.soreness,
        stress: readinessForm.stress,
        pain_level: readinessForm.painLevel,
        pain_areas: readinessForm.painAreas.split(/,|\n/).map((item) => item.trim()).filter(Boolean),
        available_minutes: Number(readinessForm.availableMinutes),
        readiness_score: result.score,
        recommendation: tr(result.recommendationId, result.recommendationEn),
        volume_modifier: result.volumeModifier,
        intensity_modifier: result.intensityModifier,
      },
      { onConflict: "user_id,log_date" }
    );
    if (saveError) setError(saveError.message);
    else {
      setMessage(tr("Readiness hari ini tersimpan.", "Today's readiness is saved."));
      await load();
    }
    setSaving(false);
  }

  async function saveMeasurement() {
    if (!userId) return;
    const values = Object.values(measurementForm).filter((value) => value.trim());
    if (values.length === 0) return;
    setSaving(true);
    setError("");
    const { error: saveError } = await supabase.from("body_measurements").insert({
      user_id: userId,
      measured_at: new Date().toISOString(),
      weight_kg: numericOrNull(measurementForm.weight),
      body_fat_pct: numericOrNull(measurementForm.bodyFat),
      waist_cm: numericOrNull(measurementForm.waist),
      chest_cm: numericOrNull(measurementForm.chest),
      arm_cm: numericOrNull(measurementForm.arm),
      thigh_cm: numericOrNull(measurementForm.thigh),
      hips_cm: numericOrNull(measurementForm.hips),
      notes: measurementForm.notes || null,
    });
    if (saveError) setError(saveError.message);
    else {
      setMeasurementForm(EMPTY_MEASUREMENT);
      setMessage(tr("Ukuran tubuh tersimpan.", "Body measurements saved."));
      await load();
    }
    setSaving(false);
  }

  async function uploadPhoto() {
    if (!userId || !photoFile) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(photoFile.type) || photoFile.size > 8 * 1024 * 1024) {
      setError(tr("Gunakan JPG, PNG, atau WebP maksimal 8 MB.", "Use JPG, PNG, or WebP up to 8 MB."));
      return;
    }
    setSaving(true);
    setError("");
    const extension = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("progress-photos").upload(path, photoFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: photoFile.type,
    });
    if (uploadError) {
      setError(uploadError.message);
      setSaving(false);
      return;
    }
    const { error: rowError } = await supabase.from("progress_photos").insert({
      user_id: userId,
      storage_path: path,
      pose: photoPose,
      notes: photoNote || null,
    });
    if (rowError) {
      await supabase.storage.from("progress-photos").remove([path]);
      setError(rowError.message);
    } else {
      setPhotoFile(null);
      setPhotoNote("");
      setMessage(tr("Foto progres tersimpan secara privat.", "Progress photo saved privately."));
      await load();
    }
    setSaving(false);
  }

  async function deletePhoto(photo: ProgressPhoto) {
    if (!confirm(tr("Hapus foto progres ini?", "Delete this progress photo?"))) return;
    const [storageResult, rowResult] = await Promise.all([
      supabase.storage.from("progress-photos").remove([photo.storage_path]),
      supabase.from("progress_photos").delete().eq("id", photo.id).eq("user_id", userId),
    ]);
    if (storageResult.error || rowResult.error) setError(storageResult.error?.message || rowResult.error?.message || "Delete failed.");
    else await load();
  }

  if (loading) {
    return <main className="fitmate-app-page min-h-screen bg-slate-950 p-8 text-white">{tr("Memuat progres…", "Loading progress…")}</main>;
  }

  return (
    <PremiumFeatureGate
      featureNameId="Progres khusus Premium"
      featureNameEn="Premium progress tracking"
      descriptionId="Analisis progres, readiness, pengukuran tubuh, foto progres, dan rekomendasi adaptif tersedia di FitMate Premium."
      descriptionEn="Progress analytics, readiness, body measurements, progress photos, and adaptive recommendations are available with FitMate Premium."
    >
      <main className="fitmate-app-page fitmate-progress-page min-h-screen bg-slate-50 pb-32 text-slate-900 dark:bg-slate-950 dark:text-white">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-600 dark:text-green-300">
            FitMate Progress
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            {tr("Progres", "Progress")}
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8">
        {(error || message) && <div className={`rounded-2xl p-4 text-sm font-bold ${error ? "bg-rose-100 text-rose-800" : "bg-green-100 text-green-800"}`}>{error || message}</div>}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: tr("Workout 7 hari", "7-day workouts"), value: weekly.workouts },
            { label: tr("Set kerja", "Working sets"), value: weekly.sets },
            { label: tr("Volume", "Volume"), value: `${Math.round(weekly.volume).toLocaleString(language === "id" ? "id-ID" : "en-US")} kg` },
            { label: tr("Gerakan aktif", "Active exercises"), value: weekly.exerciseCount },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-sm font-bold text-slate-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-black">{stat.value}</p>
            </div>
          ))}
        </section>

        <details className="fitmate-mobile-details">
          <summary>{tr("Analisis minggu ini", "This week")}</summary>
          <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
            <h2 className="text-xl font-black">{tr("Review mingguan", "Weekly review")}</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>{tr("Workout selesai", "Completed workouts")}: <strong>{weekly.workouts}</strong></p>
              <p>{tr("Perubahan volume", "Volume change")}: <strong>{weeklyReview.volumeChange == null ? tr("Belum ada pembanding", "No comparison yet") : `${weeklyReview.volumeChange >= 0 ? "+" : ""}${weeklyReview.volumeChange}%`}</strong></p>
              <p>{tr("Readiness rata-rata", "Average readiness")}: <strong>{weeklyReview.averageReadiness == null ? "—" : `${weeklyReview.averageReadiness}/100`}</strong></p>
              {weeklyReview.weakest && <p className="rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">{tr("Volume relatif paling rendah", "Relatively lowest volume")}: {weeklyReview.weakest[0]} ({weeklyReview.weakest[1].sets} set).</p>}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
            <h2 className="text-xl font-black">{tr("Keseimbangan otot", "Muscle balance")}</h2>
            <div className="mt-4 space-y-3">
              {muscleBalance.length === 0 && <p className="text-sm text-slate-500">{tr("Belum ada set kerja minggu ini.", "No working sets this week.")}</p>}
              {muscleBalance.map(([group, data]) => {
                const maximum = muscleBalance[0]?.[1].sets || 1;
                return <div key={group}><div className="flex justify-between text-xs font-bold"><span>{group}</span><span>{data.sets} set</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-green-500" style={{ width: `${Math.max(5, (data.sets / maximum) * 100)}%` }} /></div></div>;
              })}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
            <h2 className="text-xl font-black">{tr("Personal record", "Personal records")}</h2>
            <div className="mt-4 space-y-3">
              {personalRecords.length === 0 && <p className="text-sm text-slate-500">{tr("Catat beban dan repetisi untuk melihat estimasi 1RM.", "Log load and reps to see estimated 1RM.")}</p>}
              {personalRecords.map(([name, record]) => <div key={name} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><p className="truncate text-xs font-bold text-slate-500">{name}</p><p className="mt-1 font-black">{record.estimatedMax} kg <span className="text-xs font-medium text-slate-400">e1RM · {record.load}×{record.reps}</span></p></div>)}
            </div>
          </article>
        </section>
        </details>

        <details className="fitmate-mobile-details">
          <summary>{tr("Kesiapan latihan", "Readiness")}</summary>
          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-2xl font-black">{tr("Daily readiness", "Daily readiness")}</h2><p className="mt-2 text-sm text-slate-500">{tr("Cek sebelum latihan.", "Check before training.")}</p></div>
              {todayReadiness && <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-black text-green-800">{todayReadiness.readiness_score}/100</span>}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">{tr("Tidur (jam)", "Sleep (hours)")}<input type="number" min="0" max="24" step="0.5" value={readinessForm.sleepHours} onChange={(event) => setReadinessForm((previous) => ({ ...previous, sleepHours: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-slate-900" /></label>
              <label className="text-sm font-bold">{tr("Waktu tersedia (menit)", "Available time (minutes)")}<input type="number" min="10" max="300" value={readinessForm.availableMinutes} onChange={(event) => setReadinessForm((previous) => ({ ...previous, availableMinutes: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-slate-900" /></label>
            </div>
            <div className="mt-5 space-y-4">
              {[
                { key: "energy" as const, label: tr("Energi", "Energy") },
                { key: "soreness" as const, label: tr("Nyeri otot", "Muscle soreness") },
                { key: "stress" as const, label: tr("Stres", "Stress") },
                { key: "painLevel" as const, label: tr("Nyeri tajam/sendiri", "Pain level") },
              ].map((field) => (
                <label key={field.key} className="block text-sm font-bold">
                  <span className="flex justify-between"><span>{field.label}</span><span>{readinessForm[field.key]}/10</span></span>
                  <input type="range" min={field.key === "painLevel" ? 0 : 1} max="10" value={readinessForm[field.key]} onChange={(event) => setReadinessForm((previous) => ({ ...previous, [field.key]: Number(event.target.value) }))} className="mt-2 w-full accent-green-600" />
                </label>
              ))}
            </div>
            <input value={readinessForm.painAreas} onChange={(event) => setReadinessForm((previous) => ({ ...previous, painAreas: event.target.value }))} placeholder={tr("Area nyeri, pisahkan dengan koma", "Pain areas, separated by commas")} className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-slate-900" />
            <div className={`mt-5 rounded-2xl p-4 ${readinessPreview.action === "stop" ? "bg-rose-100 text-rose-900" : readinessPreview.action === "recovery" ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-900"}`}>
              <p className="text-2xl font-black">{readinessPreview.score}/100</p>
              <p className="mt-2 text-sm leading-6">{tr(readinessPreview.recommendationId, readinessPreview.recommendationEn)}</p>
              <p className="mt-2 text-xs font-bold">Volume × {readinessPreview.volumeModifier} · Intensity × {readinessPreview.intensityModifier}</p>
            </div>
            <button type="button" onClick={saveReadiness} disabled={saving} className="mt-5 w-full rounded-2xl bg-green-600 py-3 font-black text-white disabled:opacity-50">{tr("Simpan readiness", "Save readiness")}</button>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
            <h2 className="text-2xl font-black">{tr("28 hari terakhir", "Last 28 days")}</h2>
            <div className="mt-5 grid grid-cols-7 gap-2">
              {calendarDays.map((day) => (
                <div key={day.key} title={`${day.key}${day.session ? ` · ${localizeWorkoutSessionName(day.session.workout_name, day.session.workout_day, language)}` : ""}`} className={`aspect-square rounded-lg border ${day.session?.status === "completed" ? "border-green-500 bg-green-500" : day.session ? "border-amber-400 bg-amber-300" : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"}`}>
                  <span className={`flex h-full items-center justify-center text-[10px] font-black ${day.session ? "text-white" : "text-slate-400"}`}>{day.date.getDate()}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <h3 className="font-black">{tr("Volume terbesar", "Top training volume")}</h3>
              <div className="mt-3 space-y-3">
                {exerciseVolume.length === 0 && <p className="text-sm text-slate-500">{tr("Catat set latihan untuk melihat statistik.", "Log workout sets to see statistics.")}</p>}
                {exerciseVolume.map(([name, volume], index) => {
                  const max = exerciseVolume[0]?.[1] || 1;
                  return <div key={name}><div className="flex justify-between gap-3 text-xs font-bold"><span className="truncate">{name}</span><span>{Math.round(volume).toLocaleString(language === "id" ? "id-ID" : "en-US")} kg</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-green-500" style={{ width: `${Math.max(6, volume / max * 100)}%` }} /></div>{index === 0 && <p className="mt-1 text-[10px] text-green-600">{tr("Volume tertinggi", "Top volume")}</p>}</div>;
                })}
              </div>
            </div>
          </div>
        </section>
        </details>

        <details className="fitmate-mobile-details">
          <summary>{tr("Rekomendasi", "Recommendations")}</summary>
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
          <h2 className="text-2xl font-black">{tr("Sesi berikutnya", "Next session")}</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {recommendations.length === 0 && <p className="text-sm text-slate-500">{tr("Selesaikan latihan untuk mendapat rekomendasi beban.", "Complete workout sets to generate progressive-overload recommendations.")}</p>}
            {recommendations.slice(0, 8).map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4 dark:border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-black">{item.exercise_name}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${actionStyle(item.action)}`}>{item.action}</span></div>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{localizeStoredProgressionReason(item.reason, language)}</p>
                <p className="mt-3 text-xs font-bold text-green-600">{item.recommended_load_kg != null ? `${item.recommended_load_kg} kg · ` : ""}{item.recommended_reps_min || 0}–{item.recommended_reps_max || 0} reps</p>
              </article>
            ))}
          </div>
        </section>
        </details>

        <details className="fitmate-mobile-details">
          <summary>{tr("Tubuh & foto", "Body & photos")}</summary>
          <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
            <h2 className="text-2xl font-black">{tr("Ukuran tubuh", "Body measurements")}</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["weight", tr("Berat kg", "Weight kg")], ["bodyFat", tr("Lemak %", "Body fat %")], ["waist", tr("Pinggang cm", "Waist cm")], ["chest", tr("Dada cm", "Chest cm")], ["arm", tr("Lengan cm", "Arm cm")], ["thigh", tr("Paha cm", "Thigh cm")], ["hips", tr("Pinggul cm", "Hips cm")],
              ].map(([key, label]) => <label key={key} className="text-xs font-bold">{label}<input type="number" min="0" step="0.1" value={measurementForm[key as keyof MeasurementForm]} onChange={(event) => setMeasurementForm((previous) => ({ ...previous, [key]: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-slate-900" /></label>)}
            </div>
            <textarea value={measurementForm.notes} onChange={(event) => setMeasurementForm((previous) => ({ ...previous, notes: event.target.value }))} placeholder={tr("Catatan", "Notes")} rows={2} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-slate-900" />
            <button type="button" onClick={saveMeasurement} disabled={saving} className="mt-4 w-full rounded-2xl bg-slate-900 py-3 font-black text-white dark:bg-white dark:text-slate-950">{tr("Simpan pengukuran", "Save measurement")}</button>
            <div className="mt-5 space-y-2">
              {measurements.slice(0, 5).map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/5"><span className="font-bold">{formatDate(item.measured_at, language)}</span><span>{item.weight_kg ? `${item.weight_kg} kg` : ""} {item.waist_cm ? `· ${item.waist_cm} cm waist` : ""}</span></div>)}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
            <h2 className="text-2xl font-black">{tr("Foto progres", "Progress photos")}</h2>
            <p className="mt-2 text-sm text-slate-500">{tr("Privat untuk akunmu.", "Private to your account.")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10" />
              <select value={photoPose} onChange={(event) => setPhotoPose(event.target.value as ProgressPhoto["pose"])} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-slate-900"><option value="front">Front</option><option value="side">Side</option><option value="back">Back</option><option value="other">Other</option></select>
            </div>
            <input value={photoNote} onChange={(event) => setPhotoNote(event.target.value)} placeholder={tr("Catatan foto", "Photo note")} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-slate-900" />
            <button type="button" onClick={uploadPhoto} disabled={!photoFile || saving} className="mt-4 w-full rounded-2xl bg-green-600 py-3 font-black text-white disabled:opacity-40">{tr("Upload foto", "Upload photo")}</button>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.slice(0, 9).map((photo) => <figure key={photo.id} className="group relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/5">{photo.signed_url ? <Image src={photo.signed_url} alt={`${photo.pose} progress`} width={360} height={480} unoptimized className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4]" />}<figcaption className="p-2 text-[10px] font-bold">{photo.pose} · {formatDate(photo.captured_at, language)}</figcaption><button type="button" onClick={() => deletePhoto(photo)} className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-black text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100">×</button></figure>)}
            </div>
          </div>
        </section>
        </details>
      </div>
      </main>
    </PremiumFeatureGate>
  );
}
