"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import CompanySignature from "@/components/company-signature";
import FitMateBrand from "@/components/fitmate-brand";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type ProfileSafety = {
  injury_history: string[] | null;
  movement_limitations: string[] | null;
  pain_areas: string[] | null;
  available_equipment: string[] | null;
  preferred_training_time: string | null;
  medical_clearance_required: boolean | null;
};

type ReminderPreferences = {
  enabled: boolean;
  workout_days: number[];
  workout_time: string;
  timezone: string;
  missed_workout: boolean;
  weekly_review: boolean;
  measurement_reminder: boolean;
  notification_permission: "default" | "granted" | "denied" | "unsupported";
};

const DEFAULT_REMINDERS: ReminderPreferences = {
  enabled: false,
  workout_days: [1, 3, 5],
  workout_time: "18:00",
  timezone: "Asia/Jakarta",
  missed_workout: true,
  weekly_review: true,
  measurement_reminder: true,
  notification_permission: "default",
};

const DAYS = [
  { value: 1, id: "Sen", en: "Mon" },
  { value: 2, id: "Sel", en: "Tue" },
  { value: 3, id: "Rab", en: "Wed" },
  { value: 4, id: "Kam", en: "Thu" },
  { value: 5, id: "Jum", en: "Fri" },
  { value: 6, id: "Sab", en: "Sat" },
  { value: 7, id: "Min", en: "Sun" },
];

function parseLines(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function toLines(value: string[] | null | undefined) {
  return (value || []).join("\n");
}

export default function SettingsPage() {
  const router = useRouter();
  const { language, tr } = useLanguage();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [injuries, setInjuries] = useState("");
  const [limitations, setLimitations] = useState("");
  const [painAreas, setPainAreas] = useState("");
  const [equipment, setEquipment] = useState("");
  const [preferredTime, setPreferredTime] = useState("18:00");
  const [medicalClearance, setMedicalClearance] = useState(false);
  const [reminders, setReminders] = useState<ReminderPreferences>(DEFAULT_REMINDERS);
  const [deleteText, setDeleteText] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const notificationSupported = useMemo(
    () => typeof window !== "undefined" && "Notification" in window,
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login?redirect=%2Fsettings");
      return;
    }

    setUserId(user.id);
    setEmail(user.email || "");

    const [profileResult, reminderResult] = await Promise.all([
      supabase
        .from("fitness_profiles")
        .select(
          "injury_history, movement_limitations, pain_areas, available_equipment, preferred_training_time, medical_clearance_required"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("reminder_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      setError(
        tr(
          "Fitur keselamatan belum siap di database.",
          "Safety features are not ready in the database."
        )
      );
    } else if (profileResult.data) {
      const profile = profileResult.data as ProfileSafety;
      setInjuries(toLines(profile.injury_history));
      setLimitations(toLines(profile.movement_limitations));
      setPainAreas(toLines(profile.pain_areas));
      setEquipment(toLines(profile.available_equipment));
      setPreferredTime(profile.preferred_training_time?.slice(0, 5) || "18:00");
      setMedicalClearance(Boolean(profile.medical_clearance_required));
    }

    if (!reminderResult.error && reminderResult.data) {
      const row = reminderResult.data as ReminderPreferences;
      setReminders({
        ...DEFAULT_REMINDERS,
        ...row,
        workout_time: row.workout_time?.slice(0, 5) || "18:00",
      });
    }

    setLoading(false);
  }, [router, tr]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Session expired.");
    return session.access_token;
  }

  async function saveSettings() {
    if (!userId) return;
    setSaving(true);
    setError("");
    setMessage("");

    const permission: ReminderPreferences["notification_permission"] =
      notificationSupported
        ? Notification.permission
        : "unsupported";

    const [profileResult, reminderResult] = await Promise.all([
      supabase
        .from("fitness_profiles")
        .update({
          injury_history: parseLines(injuries),
          movement_limitations: parseLines(limitations),
          pain_areas: parseLines(painAreas),
          available_equipment: parseLines(equipment),
          preferred_training_time: preferredTime,
          medical_clearance_required: medicalClearance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId),
      supabase.from("reminder_preferences").upsert(
        {
          user_id: userId,
          ...reminders,
          workout_time: reminders.workout_time,
          notification_permission: permission,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      ),
    ]);

    if (profileResult.error || reminderResult.error) {
      setError(profileResult.error?.message || reminderResult.error?.message || "Save failed.");
    } else {
      setMessage(tr("Pengaturan tersimpan.", "Settings saved."));
    }
    setSaving(false);
  }

  const deleteConfirmationText = language === "id" ? "HAPUS AKUN" : "DELETE ACCOUNT";

  async function enableNotifications() {
    if (!notificationSupported) {
      setError(tr("Browser ini tidak mendukung notifikasi.", "This browser does not support notifications."));
      return;
    }

    const permission = await Notification.requestPermission();
    setReminders((previous) => ({
      ...previous,
      enabled: permission === "granted",
      notification_permission: permission,
    }));

    if (permission === "granted") {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(tr("FitMate siap mengingatkan", "FitMate reminders are ready"), {
        body: tr(
          "Jadwal latihanmu akan tampil saat aplikasi dibuka atau terpasang sebagai PWA.",
          "Your workout schedule can appear when FitMate is open or installed as a PWA."
        ),
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: "/workout" },
      });
    }
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function exportData() {
    setExporting(true);
    setError("");
    try {
      const token = await getToken();
      const response = await fetch("/api/account/export", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `fitmate-data-${new Date().toISOString().slice(0, 10)}.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (deleteText !== deleteConfirmationText) return;
    setDeleting(true);
    setError("");
    try {
      const token = await getToken();
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ confirmation: "HAPUS AKUN", reason: deleteReason }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error || "Deletion failed.");
      await supabase.auth.signOut();
      router.replace("/?account=deleted");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Deletion failed.");
      setDeleting(false);
    }
  }

  if (loading) {
    return <main className="fitmate-app-page min-h-screen bg-slate-950 p-8 text-white">{tr("Memuat pengaturan…", "Loading settings…")}</main>;
  }

  return (
    <main className="fitmate-app-page fitmate-settings-page min-h-screen bg-slate-50 pb-32 text-slate-900 dark:bg-slate-950 dark:text-white">
      <header className="border-b border-slate-200 bg-white px-5 py-6 dark:border-white/10 dark:bg-slate-950 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-green-600">{tr("Pengaturan FitMate", "FitMate Settings")}</p>
            <h1 className="mt-2 text-3xl font-black">{tr("Keamanan & Pengaturan", "Safety & Settings")}</h1>
            <p className="mt-2 text-sm text-slate-500">{email}</p>
          </div>
          <FitMateBrand href="/dashboard" size="sm" showCompany />
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8">
        {(error || message) && (
          <div className={`rounded-2xl p-4 text-sm font-semibold ${error ? "bg-rose-100 text-rose-800" : "bg-green-100 text-green-800"}`}>
            {error || message}
          </div>
        )}

        <section className="overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-green-50 p-5 shadow-sm dark:border-amber-400/20 dark:from-amber-500/10 dark:via-white/5 dark:to-green-500/10 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-600">FitMate Premium</p>
              <h2 className="mt-2 text-xl font-black">{tr("FitMate Premium", "FitMate Premium")}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                {tr(
                  "10 konsultasi, 10 scan makanan per hari, dan generate ulang program.",
                  "10 consultations, 10 meal scans per day, and workout-plan regeneration."
                )}
              </p>
            </div>
            <Link href="/premium" className="shrink-0 rounded-2xl bg-slate-950 px-5 py-3 text-center font-black text-white shadow-lg dark:bg-white dark:text-slate-950">
              {tr("Kelola Premium", "Manage Premium")}
            </Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
          <h2 className="text-xl font-black">{tr("Cedera & keterbatasan", "Injuries & limitations")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {tr("Satu kondisi per baris.", "This data is used to avoid unsuitable movements. Enter one item per line.")}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              { label: tr("Riwayat cedera", "Injury history"), value: injuries, setter: setInjuries, placeholder: tr("Cedera bahu kanan 2024", "Right shoulder injury, 2024") },
              { label: tr("Gerakan yang dibatasi", "Movement limitations"), value: limitations, setter: setLimitations, placeholder: tr("Hindari overhead press berat", "Avoid heavy overhead pressing") },
              { label: tr("Area yang sering nyeri", "Frequent pain areas"), value: painAreas, setter: setPainAreas, placeholder: tr("Lutut kiri", "Left knee") },
              { label: tr("Alat yang tersedia", "Available equipment"), value: equipment, setter: setEquipment, placeholder: tr("Dumbbell\nCable machine", "Dumbbells\nCable machine") },
            ].map((field) => (
              <label key={field.label} className="block">
                <span className="text-sm font-bold">{field.label}</span>
                <textarea
                  value={field.value}
                  onChange={(event) => field.setter(event.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-green-500 dark:border-white/10 dark:bg-slate-900"
                />
              </label>
            ))}
          </div>
          <label className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
            <input type="checkbox" checked={medicalClearance} onChange={(event) => setMedicalClearance(event.target.checked)} className="mt-1" />
            <span>{tr("Saya perlu persetujuan tenaga kesehatan sebelum latihan intensif.", "I may need healthcare clearance before intensive exercise.")}</span>
          </label>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">{tr("Jadwal & notifikasi", "Schedule & notifications")}</h2>
              <p className="mt-2 text-sm text-slate-500">{tr("Pengingat PWA bekerja paling baik setelah FitMate dipasang di HP.", "PWA reminders work best after FitMate is installed on your phone.")}</p>
            </div>
            <button type="button" onClick={enableNotifications} className="rounded-2xl bg-green-600 px-4 py-2.5 text-sm font-black text-white">
              {tr("Izinkan notifikasi", "Allow notifications")}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const active = reminders.workout_days.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() =>
                    setReminders((previous) => ({
                      ...previous,
                      workout_days: active
                        ? previous.workout_days.filter((value) => value !== day.value)
                        : [...previous.workout_days, day.value].sort(),
                    }))
                  }
                  className={`h-11 min-w-11 rounded-xl px-3 text-sm font-black ${active ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}
                >
                  {tr(day.id, day.en)}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-sm font-bold">{tr("Waktu latihan", "Workout time")}</span>
              <input
                type="time"
                value={reminders.workout_time}
                onChange={(event) => setReminders((previous) => ({ ...previous, workout_time: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-900"
              />
            </label>
            <label>
              <span className="text-sm font-bold">{tr("Waktu latihan pilihan", "Preferred training time")}</span>
              <input
                type="time"
                value={preferredTime}
                onChange={(event) => setPreferredTime(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-900"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: "missed_workout" as const, id: "Latihan terlewat", en: "Missed workout" },
              { key: "weekly_review" as const, id: "Review mingguan", en: "Weekly review" },
              { key: "measurement_reminder" as const, id: "Ukur tubuh", en: "Body measurement" },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold dark:bg-white/5">
                <input
                  type="checkbox"
                  checked={reminders[item.key]}
                  onChange={(event) => setReminders((previous) => ({ ...previous, [item.key]: event.target.checked }))}
                />
                {tr(item.id, item.en)}
              </label>
            ))}
          </div>

          {installPrompt && (
            <button type="button" onClick={installApp} className="mt-5 w-full rounded-2xl border border-green-500 bg-green-50 py-3 font-black text-green-700 dark:bg-green-500/10 dark:text-green-300">
              {tr("Pasang FitMate di perangkat", "Install FitMate on this device")}
            </button>
          )}
        </section>

        <button type="button" onClick={saveSettings} disabled={saving} className="w-full rounded-2xl bg-green-600 py-4 text-lg font-black text-white disabled:opacity-50">
          {saving ? tr("Menyimpan…", "Saving…") : tr("Simpan semua pengaturan", "Save all settings")}
        </button>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            <FitMateBrand size="lg" showCompany />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-green-600">
                {tr("Tentang FitMate", "About FitMate")}
              </p>
              <h2 className="mt-2 text-xl font-black">
                {tr("Produk resmi Growsia", "An official Growsia product")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {tr(
                  "FitMate dikelola PT Growsia Solusi Indonesia Maju.",
                  "FitMate is developed and operated by PT Growsia Solusi Indonesia Maju."
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
                <a href="https://growsia.id" target="_blank" rel="noreferrer" className="rounded-xl bg-green-50 px-4 py-2 text-green-700 dark:bg-green-500/10 dark:text-green-300">
                  growsia.id
                </a>
                <span className="rounded-xl bg-slate-100 px-4 py-2 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  FitMate v14.75
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-7">
          <h2 className="text-xl font-black">{tr("Data & akun", "Data & account")}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={exportData} disabled={exporting} className="rounded-2xl bg-slate-900 px-4 py-3 font-black text-white dark:bg-white dark:text-slate-950">
              {exporting ? tr("Mengekspor…", "Exporting…") : tr("Download data saya", "Download my data")}
            </button>
            <Link href="/privacy" className="rounded-2xl bg-slate-100 px-4 py-3 text-center font-black dark:bg-white/10">{tr("Kebijakan Privasi", "Privacy Policy")}</Link>
            <Link href="/terms" className="rounded-2xl bg-slate-100 px-4 py-3 text-center font-black dark:bg-white/10">{tr("Ketentuan", "Terms")}</Link>
            <Link href="/subscription-terms" className="rounded-2xl bg-slate-100 px-4 py-3 text-center font-black dark:bg-white/10">{tr("Ketentuan Langganan", "Subscription Terms")}</Link>
            <Link href="/refund" className="rounded-2xl bg-slate-100 px-4 py-3 text-center font-black dark:bg-white/10">{tr("Pembatalan & Refund", "Cancellation & Refund")}</Link>
          </div>

          <div className="mt-7 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            <h3 className="font-black">{tr("Hapus akun permanen", "Permanently delete account")}</h3>
            <p className="mt-2 text-sm leading-6">{tr("Akun dan data FitMate akan dihapus permanen.", "Your FitMate account and data will be deleted permanently.")}</p>
            <textarea value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} placeholder={tr("Alasan (opsional)", "Reason (optional)")} rows={2} className="mt-4 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-slate-900" />
            <p className="mt-3 text-xs font-semibold">{tr(`Ketik ${deleteConfirmationText} untuk konfirmasi.`, `Type ${deleteConfirmationText} to confirm.`)}</p>
            <input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder={deleteConfirmationText} className="mt-3 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-slate-900" />
            <button type="button" onClick={deleteAccount} disabled={deleteText !== deleteConfirmationText || deleting} className="mt-3 w-full rounded-xl bg-rose-600 py-3 font-black text-white disabled:opacity-40">
              {deleting ? tr("Menghapus…", "Deleting…") : tr("Hapus akun saya", "Delete my account")}
            </button>
          </div>
        </section>

        <CompanySignature className="py-4" />
      </div>
    </main>
  );
}
