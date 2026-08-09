"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useLanguage } from "@/components/language-provider";
import LiveIcon from "@/components/live-icon";

type Mood = "lazy" | "tired" | "ready";

type Motivation = {
  mood: Mood;
  emoji: string;
  id: string;
  en: string;
};

const MOTIVATIONS: Motivation[] = [
  {
    mood: "lazy",
    emoji: "🛋️",
    id: "Sofa memang setia, tapi ototmu juga sedang menunggu kabar.",
    en: "The sofa is loyal, but your muscles are waiting to hear from you.",
  },
  {
    mood: "lazy",
    emoji: "🦥",
    id: "Tidak perlu langsung hebat. Pakai sepatu dulu—sisanya biar momentum yang bekerja.",
    en: "You do not need to be amazing yet. Put your shoes on first and let momentum do the rest.",
  },
  {
    mood: "lazy",
    emoji: "🥔",
    id: "Mode kentang boleh, asal setelah ini kentangnya pergi latihan.",
    en: "Potato mode is allowed, as long as this potato trains afterward.",
  },
  {
    mood: "lazy",
    emoji: "🚪",
    id: "Target hari ini sederhana: datang. Latihan bagus sering dimulai dari sekadar melewati pintu gym.",
    en: "Today's goal is simple: show up. Great workouts often start by walking through the gym door.",
  },
  {
    mood: "lazy",
    emoji: "🤏",
    id: "Lakukan versi kecilnya. Sepuluh menit tetap lebih kuat daripada nol menit.",
    en: "Do the small version. Ten minutes is still stronger than zero minutes.",
  },
  {
    mood: "lazy",
    emoji: "👟",
    id: "Kalau motivasi belum datang, jemput dia sambil pakai sepatu.",
    en: "If motivation has not arrived, go meet it while putting on your shoes.",
  },
  {
    mood: "lazy",
    emoji: "🧠",
    id: "Otakmu bilang nanti. Jadwalmu bilang sekarang. Kita dengarkan yang lebih disiplin.",
    en: "Your brain says later. Your schedule says now. Let us trust the disciplined one.",
  },
  {
    mood: "lazy",
    emoji: "⏳",
    id: "Mulai dua menit saja. Biasanya tubuhmu akan minta lanjut sendiri.",
    en: "Start with two minutes. Your body will usually ask to keep going.",
  },
  {
    mood: "lazy",
    emoji: "🪜",
    id: "Tidak perlu melompat jauh. Naik satu anak tangga latihan hari ini.",
    en: "You do not need a huge leap. Climb one training step today.",
  },
  {
    mood: "lazy",
    emoji: "🎧",
    id: "Putar satu lagu favorit, lalu selesaikan pemanasan sebelum lagunya habis.",
    en: "Play one favorite song and finish the warm-up before it ends.",
  },
  {
    mood: "lazy",
    emoji: "📍",
    id: "Hari ini bukan soal performa sempurna. Cukup hadir di titik mulai.",
    en: "Today is not about perfect performance. Just arrive at the starting point.",
  },
  {
    mood: "lazy",
    emoji: "🧩",
    id: "Satu sesi kecil tetap menjadi bagian penting dari hasil besarmu.",
    en: "One small session is still an important piece of your bigger result.",
  },
  {
    mood: "tired",
    emoji: "🔋",
    id: "Capek bukan gagal. Atur beban, jaga teknik, lalu kumpulkan satu kemenangan kecil.",
    en: "Tired is not failure. Adjust the load, protect your form, and collect one small win.",
  },
  {
    mood: "tired",
    emoji: "🐢",
    id: "Pelan tetap bergerak. Bahkan kura-kura punya hari latihan.",
    en: "Slow is still moving. Even turtles have training days.",
  },
  {
    mood: "tired",
    emoji: "🌱",
    id: "Tubuhmu tidak meminta sempurna; tubuhmu meminta konsisten dan cukup istirahat.",
    en: "Your body is not asking for perfection; it is asking for consistency and enough rest.",
  },
  {
    mood: "tired",
    emoji: "🧃",
    id: "Minum, tarik napas, dan cek kondisi. Latihan cerdas juga tahu kapan harus mengurangi tempo.",
    en: "Hydrate, breathe, and check in. Smart training also knows when to lower the pace.",
  },
  {
    mood: "tired",
    emoji: "🌙",
    id: "Kalau tubuh benar-benar butuh pulih, istirahat adalah bagian program—bukan bolos.",
    en: "If your body truly needs recovery, rest is part of the program—not skipping it.",
  },
  {
    mood: "tired",
    emoji: "💧",
    id: "Coba minum dulu. Kadang pahlawan latihan hanya sedang kurang cairan.",
    en: "Drink some water first. Sometimes the workout hero is simply under-hydrated.",
  },
  {
    mood: "tired",
    emoji: "🫁",
    id: "Ambil tiga napas panjang. Kita mulai setelah tubuhmu merasa didengarkan.",
    en: "Take three deep breaths. We begin after your body feels heard.",
  },
  {
    mood: "tired",
    emoji: "🎚️",
    id: "Turunkan beban, bukan semangat. Sesi ringan tetap sesi yang sah.",
    en: "Lower the load, not your spirit. A light session still counts.",
  },
  {
    mood: "tired",
    emoji: "🛡️",
    id: "Teknik yang aman hari ini lebih berharga daripada ego yang berat.",
    en: "Safe technique today is worth more than a heavy ego.",
  },
  {
    mood: "tired",
    emoji: "🧘",
    id: "Kalau tenaga tipis, pilih mobilitas dan pemulihan. Tubuh tetap mendapat manfaat.",
    en: "If energy is low, choose mobility and recovery. Your body still benefits.",
  },
  {
    mood: "tired",
    emoji: "🍌",
    id: "Cek makan dan tidurmu. Kadang performa hanya meminta bahan bakar yang cukup.",
    en: "Check your food and sleep. Sometimes performance only needs enough fuel.",
  },
  {
    mood: "tired",
    emoji: "🧭",
    id: "Dengarkan sinyal tubuh, lalu pilih arah yang membuatmu bisa latihan lagi besok.",
    en: "Listen to your body and choose the path that lets you train again tomorrow.",
  },
  {
    mood: "ready",
    emoji: "🔥",
    id: "Energi sudah hadir. Sekarang ubah niat menjadi satu set pertama.",
    en: "The energy is here. Turn intention into your first set.",
  },
  {
    mood: "ready",
    emoji: "🚀",
    id: "Tidak harus memecahkan rekor hari ini. Cukup buktikan bahwa kamu datang lagi.",
    en: "You do not need to break a record today. Just prove that you showed up again.",
  },
  {
    mood: "ready",
    emoji: "🦁",
    id: "Teknik rapi, napas teratur, ego disimpan. Ayo latihan.",
    en: "Clean form, steady breathing, ego parked. Let's train.",
  },
  {
    mood: "ready",
    emoji: "⚡",
    id: "Versi masa depanmu sedang memberi tepuk tangan dari jauh. Jangan bikin dia menunggu.",
    en: "Your future self is cheering from a distance. Do not keep them waiting.",
  },
  {
    mood: "ready",
    emoji: "🏆",
    id: "Kemenangan hari ini bukan angka terbesar—melainkan keputusan untuk tetap hadir.",
    en: "Today's win is not the biggest number—it is the decision to keep showing up.",
  },
  {
    mood: "ready",
    emoji: "🎯",
    id: "Pilih satu target teknik hari ini dan buat setiap repetisi mengarah ke sana.",
    en: "Pick one technique goal today and make every repetition move toward it.",
  },
  {
    mood: "ready",
    emoji: "🏁",
    id: "Pemanasan adalah garis start, bukan formalitas. Ayo mulai dengan rapi.",
    en: "The warm-up is the starting line, not a formality. Begin with purpose.",
  },
  {
    mood: "ready",
    emoji: "🧱",
    id: "Set demi set adalah batu bata. Hari ini kita bangun tubuh yang lebih kuat.",
    en: "Set by set is brick by brick. Today we build a stronger body.",
  },
  {
    mood: "ready",
    emoji: "🦾",
    id: "Kuat itu bukan terburu-buru. Kuat itu mengontrol beban dari awal sampai akhir.",
    en: "Strength is not rushing. Strength is controlling the load from start to finish.",
  },
  {
    mood: "ready",
    emoji: "📈",
    id: "Tidak perlu naik drastis. Progres kecil yang tercatat tetap progres nyata.",
    en: "You do not need a huge jump. Small recorded progress is still real progress.",
  },
  {
    mood: "ready",
    emoji: "🔔",
    id: "Waktunya tiba: fokus aktif, notifikasi lain nanti saja.",
    en: "It is time: focus on, other notifications can wait.",
  },
  {
    mood: "ready",
    emoji: "🌟",
    id: "Datang dengan energi, pulang dengan bangga. Jaga teknik dan nikmati prosesnya.",
    en: "Arrive with energy, leave with pride. Protect your form and enjoy the process.",
  },
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

const MOODS: Array<{
  value: Mood;
  emoji: string;
  id: string;
  en: string;
}> = [
  {
    value: "lazy",
    emoji: "🥱",
    id: "Lagi mager",
    en: "Feeling lazy",
  },
  {
    value: "tired",
    emoji: "😮‍💨",
    id: "Lagi capek",
    en: "Feeling tired",
  },
  {
    value: "ready",
    emoji: "😤",
    id: "Siap gas",
    en: "Ready to go",
  },
];

export default function MotivationPage() {
  const { language, tr } = useLanguage();
  const [mood, setMood] = useState<Mood>("ready");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [boosts, setBoosts] = useState(0);
  const [shownQuoteIds, setShownQuoteIds] = useState<
    Set<string>
  >(() => new Set([MOTIVATIONS.find((item) => item.mood === "ready")!.id]));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(
          BOOST_STORAGE_KEY
        );
        const saved = raw
          ? (JSON.parse(raw) as {
              date?: string;
              count?: number;
              shown?: string[];
            })
          : null;

        if (saved?.date === getJakartaDateKey()) {
          setBoosts(
            Math.min(
              BOOST_LIMIT,
              Math.max(0, Math.round(saved.count || 0))
            )
          );
          if (Array.isArray(saved.shown)) {
            setShownQuoteIds(new Set(saved.shown));
          }
        } else {
          window.localStorage.removeItem(BOOST_STORAGE_KEY);
        }
      } catch {
        try {
          window.localStorage.removeItem(BOOST_STORAGE_KEY);
        } catch {
          // Storage can be unavailable in strict privacy modes.
        }
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const matchingQuotes = useMemo(
    () => MOTIVATIONS.filter((item) => item.mood === mood),
    [mood]
  );
  const quote =
    matchingQuotes[quoteIndex % matchingQuotes.length];
  const quoteText = language === "en" ? quote.en : quote.id;

  const chooseMood = (nextMood: Mood) => {
    const nextQuotes = MOTIVATIONS.filter(
      (item) => item.mood === nextMood
    );
    const nextQuote =
      nextQuotes.find((item) => !shownQuoteIds.has(item.id)) ||
      nextQuotes[0];

    setMood(nextMood);
    setQuoteIndex(nextQuotes.indexOf(nextQuote));
    setShownQuoteIds((current) => {
      const updated = new Set(current);
      updated.add(nextQuote.id);
      return updated;
    });
    setCopied(false);
  };

  const boostMe = () => {
    if (boosts >= BOOST_LIMIT) {
      return;
    }

    const unseenQuotes = matchingQuotes.filter(
      (item) => !shownQuoteIds.has(item.id)
    );
    const candidates =
      unseenQuotes.length > 0
        ? unseenQuotes
        : matchingQuotes.filter((item) => item.id !== quote.id);
    const nextQuote =
      candidates[
        Math.floor(Math.random() * candidates.length)
      ] || quote;
    const nextShown = new Set(shownQuoteIds);
    nextShown.add(nextQuote.id);
    const nextBoosts = boosts + 1;

    setQuoteIndex(matchingQuotes.indexOf(nextQuote));
    setShownQuoteIds(nextShown);
    setBoosts(nextBoosts);
    window.localStorage.setItem(
      BOOST_STORAGE_KEY,
      JSON.stringify({
        date: getJakartaDateKey(),
        count: nextBoosts,
        shown: [...nextShown],
      })
    );
    setCopied(false);
  };

  const shareQuote = async () => {
    const text = `"${quoteText}" — FitMate AI`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: tr(
            "Semangat dari FitMate",
            "A boost from FitMate"
          ),
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen bg-white pb-32 text-slate-900">
      <section className="overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 px-6 py-10 text-white shadow-2xl shadow-green-500/20 sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-yellow-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-teal-950/30 blur-3xl" />

          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_220px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-100">
                {tr(
                  "FITMATE MOOD BOOSTER",
                  "FITMATE MOOD BOOSTER"
                )}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                {tr(
                  "Butuh sedikit dorongan?",
                  "Need a little boost?"
                )}
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-green-50">
                {tr(
                  "Pilih suasana hati Anda. FitMate akan memberi semangat yang jujur, ringan, dan sedikit usil.",
                  "Choose your mood. FitMate will give you an honest, lighthearted, slightly cheeky boost."
                )}
              </p>
            </div>

            <div className="mx-auto flex h-44 w-44 rotate-3 items-center justify-center rounded-[2.25rem] border border-white/30 bg-white/15 text-8xl shadow-2xl backdrop-blur sm:h-48 sm:w-48">
              <LiveIcon
                variant="float"
                active
                className="text-8xl"
              >
                {quote.emoji}
              </LiveIcon>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm">
            {MOODS.map((item) => {
              const active = mood === item.value;

              return (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => chooseMood(item.value)}
                  className={`rounded-[1.1rem] px-2 py-3 text-xs font-black transition sm:text-sm ${
                    active
                      ? "bg-green-600 text-white shadow-lg shadow-green-600/20"
                      : "text-slate-600 hover:bg-green-50 hover:text-green-700"
                  }`}
                >
                  <LiveIcon
                    variant="pop"
                    active={active}
                    className="mr-1 sm:mr-2"
                  >
                    {item.emoji}
                  </LiveIcon>
                  {tr(item.id, item.en)}
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-[2rem] border border-green-100 bg-green-50 p-6 text-center shadow-xl shadow-green-100/70 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-green-700">
              {tr("PESAN UNTUKMU", "A MESSAGE FOR YOU")}
            </p>
            <blockquote className="mx-auto mt-5 max-w-3xl text-2xl font-black leading-relaxed text-slate-900 sm:text-3xl">
              “{quoteText}”
            </blockquote>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={boostMe}
                disabled={boosts >= BOOST_LIMIT}
                className="rounded-2xl bg-green-600 px-6 py-4 font-black text-white shadow-lg shadow-green-600/20 transition hover:-translate-y-1 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
              >
                <LiveIcon
                  variant="pop"
                  active={boosts < BOOST_LIMIT}
                  className="mr-2"
                >
                  🎲
                </LiveIcon>
                {boosts >= BOOST_LIMIT
                  ? tr(
                      "Batas hari ini tercapai",
                      "Daily limit reached"
                    )
                  : tr(
                      "Kasih semangat lagi",
                      "Give me another boost"
                    )}
              </button>
              <button
                type="button"
                onClick={() => void shareQuote()}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-4 font-black text-slate-700 transition hover:-translate-y-1 hover:border-green-400"
              >
                {copied
                  ? tr("✓ Sudah dibagikan", "✓ Shared")
                  : tr("Bagikan semangat", "Share this boost")}
              </button>
            </div>

            <p className="mt-5 text-xs font-bold text-green-700">
              {boosts >= BOOST_LIMIT
                ? tr(
                    "Kamu sudah memakai 10 Boost hari ini. Kembali lagi besok untuk pesan baru.",
                    "You have used all 10 Boosts today. Come back tomorrow for new messages."
                  )
                : tr(
                    `Sisa ${BOOST_LIMIT - boosts} dari 10 Boost hari ini.`,
                    `${BOOST_LIMIT - boosts} of 10 Boosts remaining today.`
                  )}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Link
              href="/workout"
              className="group rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl transition hover:-translate-y-1"
            >
              <LiveIcon
                variant="pulse"
                className="text-3xl"
              >
                🏋️
              </LiveIcon>
              <h2 className="mt-4 text-xl font-black">
                {tr(
                  "Oke, saya latihan sekarang",
                  "Okay, I will train now"
                )}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {tr(
                  "Buka rencana latihan dan mulai dari gerakan pertama.",
                  "Open your workout plan and begin with the first exercise."
                )}
              </p>
              <p className="mt-4 font-black text-green-400">
                {tr("Mulai latihan →", "Start workout →")}
              </p>
            </Link>

            <Link
              href="/coach"
              className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-lg transition hover:-translate-y-1 hover:border-green-300"
            >
              <LiveIcon
                variant="wiggle"
                className="text-3xl"
              >
                🤝
              </LiveIcon>
              <h2 className="mt-4 text-xl font-black">
                {tr(
                  "Masih butuh teman bicara?",
                  "Still need someone to talk to?"
                )}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {tr(
                  "Tanyakan hambatan latihan atau pola pemulihan kepada FitMate Coach.",
                  "Ask FitMate Coach about training obstacles or recovery."
                )}
              </p>
              <p className="mt-4 font-black text-green-600">
                {tr("Buka Coach →", "Open Coach →")}
              </p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
