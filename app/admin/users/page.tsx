"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import AdminNavigation from "@/components/admin-navigation";
import FitMateBrand from "@/components/fitmate-brand";
import { useLanguage } from "@/components/language-provider";
import { supabase } from "@/lib/supabase";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignInAt: string | null;
  isPremium: boolean;
  subscription: null | {
    id: string;
    status: string;
    amount: number;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    source: "manual" | "xendit";
  };
};

function getDurations(language: "id" | "en") {
  return [
    { value: 7, label: language === "id" ? "7 hari" : "7 days" },
    { value: 30, label: language === "id" ? "30 hari" : "30 days" },
    { value: 90, label: language === "id" ? "3 bulan" : "3 months" },
    { value: 180, label: language === "id" ? "6 bulan" : "6 months" },
    { value: 365, label: language === "id" ? "1 tahun" : "1 year" },
    { value: 0, label: language === "id" ? "Kustom" : "Custom" },
  ];
}

function formatDate(value: string | null, language: "id" | "en") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function initials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "U";
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export default function AdminUsersPage() {
  const { language, tr } = useLanguage();
  const durationsList = getDurations(language);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [customDays, setCustomDays] = useState<Record<string, number>>({});

  const loadUsers = useCallback(async (q = "") => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        window.location.assign("/login?redirect=/admin/users");
        return;
      }

      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json();

      if (response.status === 401) {
        window.location.assign("/login?redirect=/admin/users");
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(
          language === "en"
            ? "User data could not be loaded."
            : result.error || "Data pengguna belum dapat dimuat."
        );
      }

      setUsers(result.users || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tr("Data pengguna belum dapat dimuat.", "User data could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [language, tr]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const counts = useMemo(() => {
    const premium = users.filter((user) => user.isPremium).length;
    const manual = users.filter(
      (user) => user.isPremium && user.subscription?.source === "manual"
    ).length;
    return { total: users.length, premium, free: users.length - premium, manual };
  }, [users]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const normalized = query.trim();
    setSearch(normalized);
    void loadUsers(normalized);
  };

  const runAction = async (
    user: AdminUser,
    action: "grant" | "extend" | "revoke"
  ) => {
    if (
      action === "revoke" &&
      !window.confirm(tr(`Cabut Premium manual untuk ${user.email}?`, `Revoke manual Premium for ${user.email}?`))
    ) {
      return;
    }

    setNotice("");
    setError("");
    setBusyUserId(user.id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error(tr("Sesi admin telah berakhir.", "Your admin session has ended."));

      const selectedDuration = durations[user.id] ?? 30;
      const days = selectedDuration === 0 ? customDays[user.id] || 30 : selectedDuration;
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id, action, days }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(
          language === "en"
            ? "Premium changes could not be saved."
            : result.error || "Perubahan Premium gagal disimpan."
        );
      }

      const successMessage =
        action === "revoke"
          ? tr("Premium manual berhasil dicabut.", "Manual Premium revoked.")
          : action === "extend"
            ? tr(
                `Premium manual diperpanjang ${days} hari.`,
                `Manual Premium extended by ${days} days.`
              )
            : tr(
                `Premium manual aktif selama ${days} hari.`,
                `Manual Premium enabled for ${days} days.`
              );
      setNotice(`${user.email}: ${successMessage}`);
      await loadUsers(search);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tr("Perubahan Premium gagal disimpan.", "Premium changes could not be saved."));
    } finally {
      setBusyUserId(null);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.assign("/login");
  };

  return (
    <main className="fitmate-app-page min-h-screen bg-slate-50 px-4 py-6 text-slate-950 dark:bg-[#07110c] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1511] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <FitMateBrand href="/dashboard" size="sm" showCompany />
              <div className="mt-5">
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">Admin</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight">{tr("Kelola pengguna", "Manage users")}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {tr("Cari akun, cek akses, dan kelola Premium manual.", "Search accounts, check access, and manage manual Premium.")}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <AdminNavigation />
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                {tr("Keluar", "Log out")}
              </button>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [tr("Pengguna ditampilkan", "Users shown"), counts.total],
            ["Premium", counts.premium],
            ["Free", counts.free],
            [tr("Premium manual", "Manual Premium"), counts.manual],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b1511]">
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b1511] sm:p-5">
          <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tr("Cari email atau nama pengguna", "Search email or user name")}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 dark:border-slate-700 dark:bg-slate-900"
            />
            <button type="submit" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
              {tr("Cari", "Search")}
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearch("");
                  void loadUsers("");
                }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Reset
              </button>
            )}
          </form>

          {notice && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200">
              {notice}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
            </div>
          )}
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0b1511]">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-bold">{tr("Daftar pengguna", "User list")}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {tr("Premium manual bernilai Rp0 dan tidak dihitung sebagai pendapatan.", "Manual Premium is Rp0 and is excluded from payment revenue.")}
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">{tr("Memuat data pengguna...", "Loading users...")}</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">{tr("Tidak ada pengguna yang cocok.", "No matching users.")}</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((user) => {
                const source = user.subscription?.source;
                const isPaid = user.isPremium && source === "xendit";
                const busy = busyUserId === user.id;

                return (
                  <article key={user.id} className="p-4 sm:p-5">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {initials(user.name, user.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold">{user.name || user.email.split("@")[0]}</h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                user.isPremium
                                  ? source === "manual"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                                    : "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {user.isPremium
                                ? source === "manual"
                                  ? tr("Premium manual", "Manual Premium")
                                  : "Premium Xendit"
                                : "Free"}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span>{tr("Daftar", "Joined")} {formatDate(user.createdAt, language)}</span>
                            <span>{tr("Login terakhir", "Last login")} {formatDate(user.lastSignInAt, language)}</span>
                            {user.subscription?.currentPeriodEnd && (
                              <span>{tr("Akses sampai", "Access until")} {formatDate(user.subscription.currentPeriodEnd, language)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
                        {!isPaid && (
                          <>
                            <select
                              value={durations[user.id] ?? 30}
                              onChange={(event) =>
                                setDurations((current) => ({
                                  ...current,
                                  [user.id]: Number(event.target.value),
                                }))
                              }
                              disabled={busy}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
                            >
                              {durationsList.map((duration) => (
                                <option key={duration.value} value={duration.value}>
                                  {duration.label}
                                </option>
                              ))}
                            </select>
                            {(durations[user.id] ?? 30) === 0 && (
                              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                                <input
                                  type="number"
                                  min={1}
                                  max={730}
                                  value={customDays[user.id] || 30}
                                  onChange={(event) =>
                                    setCustomDays((current) => ({
                                      ...current,
                                      [user.id]: Math.max(1, Math.min(730, Number(event.target.value) || 1)),
                                    }))
                                  }
                                  disabled={busy}
                                  className="w-16 bg-transparent text-sm font-semibold outline-none"
                                  aria-label={tr(`Durasi Premium kustom untuk ${user.email}`, `Custom Premium duration for ${user.email}`)}
                                />
                                <span className="text-xs text-slate-500">{tr("hari", "days")}</span>
                              </label>
                            )}
                          </>
                        )}

                        {isPaid ? (
                          <Link
                            href="/admin/monitoring"
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                          >
                            {tr("Lihat monitoring", "View monitoring")}
                          </Link>
                        ) : user.isPremium && source === "manual" ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runAction(user, "extend")}
                              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
                            >
                              {busy ? tr("Menyimpan...", "Saving...") : tr("Perpanjang", "Extend")}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void runAction(user, "revoke")}
                              className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-300"
                            >
                              {tr("Cabut Premium", "Revoke Premium")}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void runAction(user, "grant")}
                            className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {busy ? tr("Menyimpan...", "Saving...") : tr("Jadikan Premium", "Make Premium")}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
