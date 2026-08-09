"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import FitMateIcon from "@/components/fitmate-icon";
import { useLanguage } from "@/components/language-provider";

type Mood = "lazy" | "tired" | "ready";

type Motivation = {
  mood: Mood;
  id: string;
  en: string;
};

const MOTIVATIONS: Motivation[] = [
  { mood: "lazy", id: "Tidak perlu menunggu motivasi penuh. Mulai dari pemanasan lima menit.", en: "You do not need full motivation. Start with a five-minute warm-up." },
  { mood: "lazy", id: "Target hari ini cukup sederhana: datang dan mulai gerakan pertama.", en: "Keep today simple: show up and start the first movement." },
  { mood: "lazy", id: "Kalau sesi penuh terasa berat, kerjakan versi singkatnya. Konsistensi tetap dihitung.", en: "If a full session feels heavy, do a shorter version. Consistency still counts." },
  { mood: "lazy", id: "Jangan pikirkan seluruh latihan sekaligus. Fokus pada satu set berikutnya.", en: "Do not think about the whole workout at once. Focus on the next set." },
  { mood: "lazy", id: "Persiapkan sepatu, air minum, dan mulai. Biasanya momentum datang setelah bergerak.", en: "Get your shoes and water ready, then start. Momentum usually follows movement." },
  { mood: "lazy", id: "Mulai dari satu gerakan yang paling mudah. Setelah itu, nilai lagi apakah kamu ingin lanjut.", en: "Start with the easiest movement. Then decide whether you want to continue." },
  { mood: "lazy", id: "Buat target yang kecil dan jelas: pemanasan, satu latihan utama, lalu lihat kondisimu.", en: "Set a small, clear target: warm up, do one main exercise, then reassess." },
  { mood: "lazy", id: "Sesi yang tidak sempurna tetap lebih berguna daripada terus menunda.", en: "An imperfect session is still more useful than another delay." },
  { mood: "lazy", id: "Kurangi keputusan sebelum latihan. Siapkan perlengkapan dan ikuti rencana yang sudah ada.", en: "Reduce decisions before training. Prepare your gear and follow the plan you already have." },
  { mood: "lazy", id: "Beri dirimu sepuluh menit untuk mulai. Kamu boleh menyesuaikan sesi setelah itu.", en: "Give yourself ten minutes to begin. You can adjust the session after that." },
  { mood: "lazy", id: "Hari ini tidak harus menjadi sesi terbaik. Cukup jaga kebiasaan tetap berjalan.", en: "Today does not need to be your best session. Just keep the habit moving." },
  { mood: "lazy", id: "Pilih satu alasan praktis untuk latihan hari ini, lalu mulai sebelum terlalu banyak berpikir.", en: "Choose one practical reason to train today, then start before overthinking it." },
  { mood: "tired", id: "Kalau energi turun, kurangi beban dan jaga teknik. Latihan ringan tetap berguna.", en: "If energy is low, reduce the load and keep your form clean. A light session still helps." },
  { mood: "tired", id: "Cek tidur, makan, dan hidrasi sebelum memaksa intensitas tinggi.", en: "Check sleep, food, and hydration before pushing high intensity." },
  { mood: "tired", id: "Hari pemulihan juga bagian dari program. Dengarkan kondisi tubuhmu hari ini.", en: "Recovery days are part of the program too. Pay attention to how your body feels today." },
  { mood: "tired", id: "Mulai dengan mobilitas dan pemanasan. Putuskan intensitas setelah tubuh terasa lebih siap.", en: "Start with mobility and a warm-up. Decide the intensity after your body feels more ready." },
  { mood: "tired", id: "Tidak perlu mengejar angka. Selesaikan sesi dengan kontrol dan pulang dalam kondisi lebih baik.", en: "You do not need to chase numbers. Finish with control and leave feeling better." },
  { mood: "tired", id: "Kalau pemanasan terasa berat, pertimbangkan sesi pendek atau recovery aktif.", en: "If the warm-up feels unusually hard, consider a shorter session or active recovery." },
  { mood: "tired", id: "Turunkan volume sebelum menurunkan kualitas gerakan. Beberapa set yang rapi sudah cukup.", en: "Reduce volume before movement quality. A few clean sets can be enough." },
  { mood: "tired", id: "Jaga jeda antar set sedikit lebih panjang bila napas dan fokus belum pulih.", en: "Take slightly longer rests if your breathing and focus have not recovered." },
  { mood: "tired", id: "Pilih gerakan yang familiar hari ini agar energi tidak habis untuk mencoba terlalu banyak hal baru.", en: "Choose familiar movements today so your energy is not spent learning too many new things." },
  { mood: "tired", id: "Kalau badan terasa tidak biasa, prioritaskan pemulihan daripada memaksakan target latihan.", en: "If your body feels unusually off, prioritize recovery instead of forcing the workout target." },
  { mood: "tired", id: "Selesaikan bagian yang paling penting dulu. Aksesori bisa dikurangi bila energi tidak cukup.", en: "Do the most important work first. Accessories can be reduced if energy is limited." },
  { mood: "tired", id: "Hari dengan energi rendah tetap bisa produktif kalau intensitasnya disesuaikan dengan kondisi.", en: "A low-energy day can still be productive when intensity matches your condition." },
  { mood: "ready", id: "Energi sudah ada. Pilih target utama hari ini dan jaga setiap repetisi tetap rapi.", en: "The energy is there. Pick one main target and keep every repetition clean." },
  { mood: "ready", id: "Mulai kuat, tapi tetap terukur. Teknik yang konsisten lebih penting dari ego.", en: "Start strong, but stay measured. Consistent technique matters more than ego." },
  { mood: "ready", id: "Catat beban dan repetisi hari ini. Progres kecil lebih mudah terlihat kalau tercatat.", en: "Log today's load and reps. Small progress is easier to see when it is recorded." },
  { mood: "ready", id: "Fokus pada set berikutnya, bukan seluruh sesi. Satu pekerjaan pada satu waktu.", en: "Focus on the next set, not the entire session. One job at a time." },
  { mood: "ready", id: "Pakai energi hari ini untuk kualitas gerakan, bukan sekadar menambah beban.", en: "Use today's energy for movement quality, not just heavier weight." },
  { mood: "ready", id: "Tentukan satu indikator progres hari ini: repetisi, beban, tempo, atau teknik.", en: "Choose one progress marker today: reps, load, tempo, or technique." },
  { mood: "ready", id: "Simpan tenaga untuk set utama. Pemanasan harus menyiapkan tubuh, bukan menghabiskan energi.", en: "Save energy for your main sets. Warm-ups should prepare you, not drain you." },
  { mood: "ready", id: "Kalau performa terasa bagus, naikkan tantangan secara kecil dan tetap terkendali.", en: "If performance feels good, increase the challenge in a small, controlled step." },
  { mood: "ready", id: "Jaga standar teknik yang sama dari repetisi pertama sampai terakhir.", en: "Keep the same technique standard from the first rep to the last." },
  { mood: "ready", id: "Gunakan jeda antar set untuk memulihkan napas dan menyiapkan set berikutnya.", en: "Use rest periods to recover your breathing and prepare for the next set." },
  { mood: "ready", id: "Selesaikan latihan dengan catatan singkat agar sesi berikutnya lebih mudah direncanakan.", en: "Finish with a short note so the next session is easier to plan." },
  { mood: "ready", id: "Energi tinggi tidak berarti harus terburu-buru. Pertahankan tempo yang membuat setiap set tetap berkualitas.", en: "High energy does not mean rushing. Keep a pace that preserves set quality." },
];

const BOOST_LIMIT = 10;
const BOOST_STORAGE_KEY = "fitmate_mood_boost_daily";

function getJakartaDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const MOODS: Array<{ value: Mood; id: string; en: string; descriptionId: string; descriptionEn: string }> = [
  { value: "lazy", id: "Sulit mulai", en: "Hard to start", descriptionId: "Butuh dorongan ringan", descriptionEn: "Need a gentle push" },
  { value: "tired", id: "Energi rendah", en: "Low energy", descriptionId: "Atur ritme dan pemulihan", descriptionEn: "Manage pace and recovery" },
  { value: "ready", id: "Siap latihan", en: "Ready to train", descriptionId: "Fokus dan mulai sesi", descriptionEn: "Focus and begin" },
];

export default function MotivationPage() {
  const { language, tr } = useLanguage();
  const [mood, setMood] = useState<Mood>("ready");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [boosts, setBoosts] = useState(0);
  const [shownQuoteIds, setShownQuoteIds] = useState<Set<string>>(
    () => new Set([MOTIVATIONS.find((item) => item.mood === "ready")!.id])
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(BOOST_STORAGE_KEY);
        const saved = raw
          ? (JSON.parse(raw) as { date?: string; count?: number; shown?: string[] })
          : null;

        if (saved?.date === getJakartaDateKey()) {
          setBoosts(Math.min(BOOST_LIMIT, Math.max(0, Math.round(saved.count || 0))));
          if (Array.isArray(saved.shown)) setShownQuoteIds(new Set(saved.shown));
        } else {
          window.localStorage.removeItem(BOOST_STORAGE_KEY);
        }
      } catch {
        try { window.localStorage.removeItem(BOOST_STORAGE_KEY); } catch {}
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const matchingQuotes = useMemo(
    () => MOTIVATIONS.filter((item) => item.mood === mood),
    [mood]
  );
  const quote = matchingQuotes[quoteIndex % matchingQuotes.length];
  const quoteText = language === "en" ? quote.en : quote.id;

  const chooseMood = (nextMood: Mood) => {
    const nextQuotes = MOTIVATIONS.filter((item) => item.mood === nextMood);
    const nextQuote = nextQuotes.find((item) => !shownQuoteIds.has(item.id)) || nextQuotes[0];
    setMood(nextMood);
    setQuoteIndex(nextQuotes.indexOf(nextQuote));
    setShownQuoteIds((current) => new Set([...current, nextQuote.id]));
    setCopied(false);
  };

  const boostMe = () => {
    if (boosts >= BOOST_LIMIT) return;
    const unseenQuotes = matchingQuotes.filter((item) => !shownQuoteIds.has(item.id));
    const candidates = unseenQuotes.length
      ? unseenQuotes
      : matchingQuotes.filter((item) => item.id !== quote.id);
    const nextQuote = candidates[Math.floor(Math.random() * candidates.length)] || quote;
    const nextShown = new Set(shownQuoteIds);
    nextShown.add(nextQuote.id);
    const nextBoosts = boosts + 1;

    setQuoteIndex(matchingQuotes.indexOf(nextQuote));
    setShownQuoteIds(nextShown);
    setBoosts(nextBoosts);
    window.localStorage.setItem(
      BOOST_STORAGE_KEY,
      JSON.stringify({ date: getJakartaDateKey(), count: nextBoosts, shown: [...nextShown] })
    );
    setCopied(false);
  };

  const shareQuote = async () => {
    const text = `"${quoteText}" — FitMate`;
    try {
      if (navigator.share) {
        await navigator.share({ title: tr("Catatan dari FitMate", "A note from FitMate"), text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="fitmate-app-page min-h-screen bg-slate-50 pb-32 text-slate-950 dark:bg-[#07110c] dark:text-slate-100">
      <section className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1511] sm:p-10">
          <div className="flex max-w-3xl items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300">
              <FitMateIcon name="activity" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">{tr("Persiapan latihan", "Workout prep")}</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                {tr("Sesuaikan sesi dengan kondisimu hari ini", "Match the session to how you feel today")}
              </h1>
              <p className="mt-3 leading-7 text-slate-500 dark:text-slate-400">
                {tr(
                  "Pilih kondisimu hari ini.",
                  "Choose how you feel today for a short note before training."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-3 sm:grid-cols-3">
            {MOODS.map((item) => {
              const active = mood === item.value;
              return (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => chooseMood(item.value)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-green-500 bg-green-50 shadow-sm dark:bg-green-950/30"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-[#0b1511]"
                  }`}
                >
                  <p className={`font-semibold ${active ? "text-green-800 dark:text-green-200" : ""}`}>{tr(item.id, item.en)}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr(item.descriptionId, item.descriptionEn)}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b1511] sm:p-9">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{tr("Catatan untuk sesi ini", "Note for this session")}</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {BOOST_LIMIT - boosts} {tr("tersisa", "left")}
              </span>
            </div>
            <blockquote className="mt-5 max-w-3xl text-2xl font-semibold leading-relaxed tracking-tight sm:text-3xl">
              {quoteText}
            </blockquote>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={boostMe}
                disabled={boosts >= BOOST_LIMIT}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950"
              >
                <FitMateIcon name="activity" className="h-4 w-4" />
                {boosts >= BOOST_LIMIT
                  ? tr("Batas hari ini tercapai", "Daily limit reached")
                  : tr("Tampilkan catatan lain", "Show another note")}
              </button>
              <button
                type="button"
                onClick={() => void shareQuote()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <FitMateIcon name={copied ? "check" : "share"} className="h-4 w-4" />
                {copied ? tr("Sudah dibagikan", "Shared") : tr("Bagikan", "Share")}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Link href="/workout" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-green-300 dark:border-slate-800 dark:bg-[#0b1511]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300">
                <FitMateIcon name="dumbbell" className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{tr("Mulai latihan", "Start workout")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {tr("Buka sesi hari ini dan mulai dari gerakan pertama.", "Open today's session and begin with the first exercise.")}
              </p>
            </Link>

            <Link href="/coach" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-green-300 dark:border-slate-800 dark:bg-[#0b1511]">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <FitMateIcon name="message" className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">{tr("Tanya Coach", "Ask Coach")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {tr("Bahas kendala latihan, recovery, atau penyesuaian program.", "Discuss training, recovery, or program adjustments.")}
              </p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
