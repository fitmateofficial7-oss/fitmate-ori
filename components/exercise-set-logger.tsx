"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/components/language-provider";
import { queueOfflineMutation } from "@/components/pwa-manager";
import {
  recommendProgression,
  type SetPerformance,
} from "@/lib/prelaunch-fitness";
import { supabase } from "@/lib/supabase";

type SetType = "warmup" | "working" | "failure" | "drop" | "backoff";

type SetRow = {
  id?: string;
  set_number: number;
  set_type: SetType;
  load_kg: string;
  reps: string;
  rir: string;
  rpe: string;
  completed: boolean;
  notes: string;
};

type Props = {
  userId: string;
  workoutSessionId: string | number;
  workoutExerciseLogId: string | number;
  exerciseId?: string | number | null;
  exerciseName: string;
  plannedSets: number;
  plannedReps?: string | null;
};

function parseRepRange(value?: string | null) {
  const numbers = (value || "").match(/\d+/g)?.map(Number) || [];
  if (numbers.length >= 2) return { min: Math.min(numbers[0], numbers[1]), max: Math.max(numbers[0], numbers[1]) };
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
  return { min: 8, max: 12 };
}

function emptyRows(count: number, plannedReps?: string | null): SetRow[] {
  const range = parseRepRange(plannedReps);
  return Array.from({ length: Math.max(1, Math.min(20, count)) }, (_, index) => ({
    set_number: index + 1,
    set_type: "working",
    load_kg: "",
    reps: String(range.min),
    rir: "2",
    rpe: "8",
    completed: false,
    notes: "",
  }));
}

export default function ExerciseSetLogger({
  userId,
  workoutSessionId,
  workoutExerciseLogId,
  exerciseId,
  exerciseName,
  plannedSets,
  plannedReps,
}: Props) {
  const { tr } = useLanguage();
  const [rows, setRows] = useState<SetRow[]>(() => emptyRows(plannedSets, plannedReps));
  const [loading, setLoading] = useState(true);
  const [savingNumber, setSavingNumber] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const range = useMemo(() => parseRepRange(plannedReps), [plannedReps]);

  const loadRows = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("workout_set_logs")
      .select("id, set_number, set_type, load_kg, reps, rir, rpe, completed, notes")
      .eq("workout_exercise_log_id", workoutExerciseLogId)
      .order("set_number", { ascending: true });

    if (loadError) {
      setError(
        tr(
          "Set logger memerlukan migrasi pre-launch terbaru.",
          "The set logger requires the latest pre-launch migration."
        )
      );
    } else if (data && data.length > 0) {
      setRows(
        data.map((row) => ({
          id: row.id,
          set_number: row.set_number,
          set_type: row.set_type as SetType,
          load_kg: row.load_kg == null ? "" : String(row.load_kg),
          reps: row.reps == null ? "" : String(row.reps),
          rir: row.rir == null ? "" : String(row.rir),
          rpe: row.rpe == null ? "" : String(row.rpe),
          completed: Boolean(row.completed),
          notes: row.notes || "",
        }))
      );
    }
    setLoading(false);
  }, [tr, workoutExerciseLogId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  function updateRow(setNumber: number, patch: Partial<SetRow>) {
    setRows((previous) => previous.map((row) => row.set_number === setNumber ? { ...row, ...patch } : row));
  }

  async function generateRecommendation(nextRows: SetRow[]) {
    const completedRows = nextRows.filter((row) => row.completed && row.set_type !== "warmup");
    if (completedRows.length < Math.max(2, plannedSets)) return;

    const performance: SetPerformance[] = completedRows.map((row) => ({
      loadKg: Math.max(0, Number(row.load_kg) || 0),
      reps: Math.max(0, Number(row.reps) || 0),
      rir: row.rir === "" ? null : Number(row.rir),
      rpe: row.rpe === "" ? null : Number(row.rpe),
      setType: row.set_type,
    }));
    const recommendation = recommendProgression({
      sets: performance,
      plannedRepsMin: range.min,
      plannedRepsMax: range.max,
    });

    const payload = {
      user_id: userId,
      exercise_id: exerciseId ?? null,
      exercise_name: exerciseName,
      recommended_load_kg: recommendation.recommendedLoadKg,
      recommended_reps_min: recommendation.recommendedRepsMin,
      recommended_reps_max: recommendation.recommendedRepsMax,
      recommended_sets: recommendation.recommendedSets,
      action: recommendation.action,
      reason: tr(recommendation.reasonId, recommendation.reasonEn),
      confidence: recommendation.confidence,
      source_session_id: workoutSessionId,
    };

    if (!navigator.onLine) {
      queueOfflineMutation({ table: "adaptive_recommendations", operation: "insert", payload });
      return;
    }

    await supabase
      .from("adaptive_recommendations")
      .delete()
      .eq("user_id", userId)
      .eq("source_session_id", workoutSessionId)
      .eq("exercise_name", exerciseName);
    await supabase.from("adaptive_recommendations").insert(payload);
  }

  async function saveRow(row: SetRow, completed = row.completed) {
    setSavingNumber(row.set_number);
    setError("");
    setMessage("");

    const load = row.load_kg.trim() ? Number(row.load_kg) : null;
    const reps = row.reps.trim() ? Number(row.reps) : null;
    const rir = row.rir.trim() ? Number(row.rir) : null;
    const rpe = row.rpe.trim() ? Number(row.rpe) : null;

    if ((load != null && (!Number.isFinite(load) || load < 0 || load > 1500)) ||
        (reps != null && (!Number.isInteger(reps) || reps < 0 || reps > 500)) ||
        (rir != null && (!Number.isInteger(rir) || rir < 0 || rir > 10)) ||
        (rpe != null && (!Number.isFinite(rpe) || rpe < 1 || rpe > 10))) {
      setError(tr("Periksa kembali beban, repetisi, RIR, dan RPE.", "Check load, reps, RIR, and RPE."));
      setSavingNumber(null);
      return;
    }

    const payload = {
      user_id: userId,
      workout_session_id: workoutSessionId,
      workout_exercise_log_id: workoutExerciseLogId,
      exercise_id: exerciseId ?? null,
      exercise_name: exerciseName,
      set_number: row.set_number,
      set_type: row.set_type,
      load_kg: load,
      reps,
      rir,
      rpe,
      completed,
      notes: row.notes.trim() || null,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const nextRows = rows.map((item) => item.set_number === row.set_number ? { ...item, completed } : item);
    setRows(nextRows);

    if (!navigator.onLine) {
      queueOfflineMutation({ table: "workout_set_logs", operation: "upsert", payload });
      setMessage(tr("Disimpan offline. Akan disinkronkan saat internet kembali.", "Saved offline. It will sync when you are online."));
      await generateRecommendation(nextRows);
      setSavingNumber(null);
      return;
    }

    const { data, error: saveError } = await supabase
      .from("workout_set_logs")
      .upsert(payload, { onConflict: "workout_exercise_log_id,set_number" })
      .select("id")
      .single();

    if (saveError) {
      setError(saveError.message);
      updateRow(row.set_number, { completed: row.completed });
    } else {
      updateRow(row.set_number, { id: data.id, completed });
      setMessage(completed ? tr(`Set ${row.set_number} selesai.`, `Set ${row.set_number} completed.`) : tr("Set diperbarui.", "Set updated."));
      await generateRecommendation(nextRows);
    }
    setSavingNumber(null);
  }

  function addSet() {
    if (rows.length >= 20) return;
    setRows((previous) => [...previous, {
      set_number: previous.length + 1,
      set_type: "working",
      load_kg: previous.at(-1)?.load_kg || "",
      reps: previous.at(-1)?.reps || String(range.min),
      rir: "2",
      rpe: "8",
      completed: false,
      notes: "",
    }]);
  }

  const completedCount = rows.filter((row) => row.completed).length;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
      <button type="button" onClick={() => setExpanded((value) => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div><p className="text-sm font-black text-white">{tr("Catat tiap set", "Log every set")}</p><p className="mt-0.5 text-[11px] text-slate-400">{completedCount}/{rows.length} {tr("set selesai", "sets completed")}</p></div>
        <span className="text-lg text-green-400">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="border-t border-white/10 p-3">
          {loading ? <p className="py-3 text-center text-xs text-slate-400">{tr("Memuat set…", "Loading sets…")}</p> : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.set_number} className={`rounded-xl border p-3 ${row.completed ? "border-green-500/30 bg-green-500/10" : "border-white/10 bg-white/5"}`}>
                  <div className="flex items-center justify-between gap-3"><p className="text-xs font-black text-white">Set {row.set_number}</p><select value={row.set_type} onChange={(event) => updateRow(row.set_number, { set_type: event.target.value as SetType })} className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-slate-200"><option value="warmup">Warm-up</option><option value="working">Working</option><option value="failure">Failure</option><option value="drop">Drop</option><option value="backoff">Back-off</option></select></div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="text-[10px] font-bold text-slate-400">kg<input type="number" min="0" max="1500" step="0.5" value={row.load_kg} onChange={(event) => updateRow(row.set_number, { load_kg: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-sm text-white" /></label>
                    <label className="text-[10px] font-bold text-slate-400">Reps<input type="number" min="0" max="500" value={row.reps} onChange={(event) => updateRow(row.set_number, { reps: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-sm text-white" /></label>
                    <label className="text-[10px] font-bold text-slate-400">RIR<input type="number" min="0" max="10" value={row.rir} onChange={(event) => updateRow(row.set_number, { rir: event.target.value, rpe: event.target.value === "" ? row.rpe : String(Math.max(1, 10 - Number(event.target.value))) })} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-sm text-white" /></label>
                    <label className="text-[10px] font-bold text-slate-400">RPE<input type="number" min="1" max="10" step="0.5" value={row.rpe} onChange={(event) => updateRow(row.set_number, { rpe: event.target.value })} className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-sm text-white" /></label>
                  </div>
                  <input value={row.notes} onChange={(event) => updateRow(row.set_number, { notes: event.target.value })} placeholder={tr("Catatan teknik", "Technique note")} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-xs text-white" />
                  <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => saveRow(row, row.completed)} disabled={savingNumber === row.set_number} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{tr("Simpan", "Save")}</button><button type="button" onClick={() => saveRow(row, !row.completed)} disabled={savingNumber === row.set_number} className={`rounded-lg px-3 py-2 text-xs font-black ${row.completed ? "bg-green-500/15 text-green-300" : "bg-green-600 text-white"}`}>{savingNumber === row.set_number ? "…" : row.completed ? tr("Selesai ✓", "Completed ✓") : tr("Selesaikan set", "Complete set")}</button></div>
                </div>
              ))}
            </div>
          )}
          {error && <p className="mt-3 rounded-lg bg-rose-500/10 p-2 text-xs text-rose-200">{error}</p>}
          {message && <p className="mt-3 rounded-lg bg-green-500/10 p-2 text-xs text-green-200">{message}</p>}
          <button type="button" onClick={addSet} className="mt-3 w-full rounded-xl border border-dashed border-white/20 py-2 text-xs font-black text-slate-300">+ {tr("Tambah set", "Add set")}</button>
        </div>
      )}
    </div>
  );
}
