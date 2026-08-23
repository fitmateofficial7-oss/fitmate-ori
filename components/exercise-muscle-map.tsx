"use client";

import { useMemo, type ReactNode } from "react";
import { useLanguage } from "@/components/language-provider";

type MuscleKey =
  | "chest"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core"
  | "back"
  | "lats"
  | "traps"
  | "lowerBack"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves";

type Props = {
  primary: string;
  secondary?: string[] | null;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function muscleKey(value: string): MuscleKey | null {
  const name = normalize(value);
  if (/pector|chest/.test(name)) return "chest";
  if (/latissimus|\blats?\b/.test(name)) return "lats";
  if (/middle back|rhomboid/.test(name)) return "back";
  if (/spinal|erector|lower back/.test(name)) return "lowerBack";
  if (/trap/.test(name)) return "traps";
  if (/deltoid|shoulder/.test(name)) return "shoulders";
  if (/bicep/.test(name)) return "biceps";
  if (/tricep/.test(name)) return "triceps";
  if (/quadricep|\bquad/.test(name)) return "quads";
  if (/hamstring/.test(name)) return "hamstrings";
  if (/glute/.test(name)) return "glutes";
  if (/calf|calves|gastrocnemius|soleus/.test(name)) return "calves";
  if (/core|abdom|\babs\b|oblique/.test(name)) return "core";
  return null;
}

function MuscleShape({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <g
      fill={active ? "#22c55e" : "#5f6d67"}
      stroke={active ? "#4ade80" : "#7c8b84"}
      strokeWidth="1.2"
      opacity={active ? 1 : 0.68}
      style={{ transition: "fill .2s ease, opacity .2s ease" }}
    >
      {children}
    </g>
  );
}

function BodyFront({ active }: { active: Set<MuscleKey> }) {
  return (
    <svg viewBox="0 0 150 330" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="fmFrontSkin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a9b4af" />
          <stop offset="1" stopColor="#596660" />
        </linearGradient>
      </defs>
      <g fill="url(#fmFrontSkin)" stroke="#a8b4ae" strokeWidth="1.1" opacity=".82">
        <ellipse cx="75" cy="27" rx="20" ry="24" />
        <path d="M52 54 Q75 45 98 54 L108 125 Q98 151 75 158 Q52 151 42 125Z" />
        <path d="M44 59 Q29 66 24 91 L13 151 Q11 163 21 166 Q30 167 34 155 L46 103Z" />
        <path d="M106 59 Q121 66 126 91 L137 151 Q139 163 129 166 Q120 167 116 155 L104 103Z" />
        <path d="M55 151 Q44 179 46 219 L51 294 Q53 309 63 309 Q73 308 71 292 L72 223 L75 172Z" />
        <path d="M95 151 Q106 179 104 219 L99 294 Q97 309 87 309 Q77 308 79 292 L78 223 L75 172Z" />
      </g>

      <MuscleShape active={active.has("shoulders")}>
        <ellipse cx="44" cy="68" rx="13" ry="12" />
        <ellipse cx="106" cy="68" rx="13" ry="12" />
      </MuscleShape>
      <MuscleShape active={active.has("chest")}>
        <path d="M55 67 Q67 58 74 68 L72 94 Q57 98 49 87Z" />
        <path d="M95 67 Q83 58 76 68 L78 94 Q93 98 101 87Z" />
      </MuscleShape>
      <MuscleShape active={active.has("biceps")}>
        <ellipse cx="32" cy="105" rx="8" ry="19" />
        <ellipse cx="118" cy="105" rx="8" ry="19" />
      </MuscleShape>
      <MuscleShape active={active.has("core")}>
        <path d="M61 96 Q75 102 89 96 L88 142 Q75 151 62 142Z" />
        <path d="M60 100 L90 100 M60 116 L90 116 M61 132 L89 132 M75 99 L75 144" fill="none" />
      </MuscleShape>
      <MuscleShape active={active.has("quads")}>
        <path d="M54 161 Q65 153 73 171 L69 224 Q61 239 51 222 L49 184Z" />
        <path d="M96 161 Q85 153 77 171 L81 224 Q89 239 99 222 L101 184Z" />
      </MuscleShape>
      <MuscleShape active={active.has("calves")}>
        <path d="M52 232 Q62 225 68 240 L64 288 Q58 300 52 288Z" />
        <path d="M98 232 Q88 225 82 240 L86 288 Q92 300 98 288Z" />
      </MuscleShape>
    </svg>
  );
}

function BodyBack({ active }: { active: Set<MuscleKey> }) {
  return (
    <svg viewBox="0 0 150 330" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="fmBackSkin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a9b4af" />
          <stop offset="1" stopColor="#596660" />
        </linearGradient>
      </defs>
      <g fill="url(#fmBackSkin)" stroke="#a8b4ae" strokeWidth="1.1" opacity=".82">
        <ellipse cx="75" cy="27" rx="20" ry="24" />
        <path d="M52 54 Q75 45 98 54 L108 125 Q98 151 75 158 Q52 151 42 125Z" />
        <path d="M44 59 Q29 66 24 91 L13 151 Q11 163 21 166 Q30 167 34 155 L46 103Z" />
        <path d="M106 59 Q121 66 126 91 L137 151 Q139 163 129 166 Q120 167 116 155 L104 103Z" />
        <path d="M55 151 Q44 179 46 219 L51 294 Q53 309 63 309 Q73 308 71 292 L72 223 L75 172Z" />
        <path d="M95 151 Q106 179 104 219 L99 294 Q97 309 87 309 Q77 308 79 292 L78 223 L75 172Z" />
      </g>

      <MuscleShape active={active.has("shoulders")}>
        <ellipse cx="44" cy="68" rx="13" ry="12" />
        <ellipse cx="106" cy="68" rx="13" ry="12" />
      </MuscleShape>
      <MuscleShape active={active.has("traps")}>
        <path d="M58 54 Q75 46 92 54 L84 78 L75 88 L66 78Z" />
      </MuscleShape>
      <MuscleShape active={active.has("back")}>
        <path d="M58 76 Q75 86 92 76 L93 116 Q75 130 57 116Z" />
      </MuscleShape>
      <MuscleShape active={active.has("lats")}>
        <path d="M51 78 Q61 86 68 93 L65 126 Q55 129 46 118Z" />
        <path d="M99 78 Q89 86 82 93 L85 126 Q95 129 104 118Z" />
      </MuscleShape>
      <MuscleShape active={active.has("lowerBack")}>
        <path d="M66 112 Q75 118 84 112 L87 145 Q75 151 63 145Z" />
      </MuscleShape>
      <MuscleShape active={active.has("triceps")}>
        <ellipse cx="31" cy="105" rx="8" ry="20" />
        <ellipse cx="119" cy="105" rx="8" ry="20" />
      </MuscleShape>
      <MuscleShape active={active.has("glutes")}>
        <ellipse cx="62" cy="163" rx="17" ry="17" />
        <ellipse cx="88" cy="163" rx="17" ry="17" />
      </MuscleShape>
      <MuscleShape active={active.has("hamstrings")}>
        <path d="M51 181 Q61 168 72 184 L69 225 Q60 237 51 223Z" />
        <path d="M99 181 Q89 168 78 184 L81 225 Q90 237 99 223Z" />
      </MuscleShape>
      <MuscleShape active={active.has("calves")}>
        <path d="M52 232 Q62 225 68 240 L64 288 Q58 300 52 288Z" />
        <path d="M98 232 Q88 225 82 240 L86 288 Q92 300 98 288Z" />
      </MuscleShape>
    </svg>
  );
}

export default function ExerciseMuscleMap({ primary, secondary = [] }: Props) {
  const { tr } = useLanguage();
  const labels = useMemo(() => {
    const cleanSecondary = (secondary ?? []).filter(Boolean).slice(0, 3);
    return [{ name: primary, primary: true }, ...cleanSecondary.map((name) => ({ name, primary: false }))];
  }, [primary, secondary]);

  const active = useMemo(() => {
    const set = new Set<MuscleKey>();
    labels.forEach((item) => {
      const key = muscleKey(item.name);
      if (key) set.add(key);
    });
    return set;
  }, [labels]);

  return (
    <section className="relative overflow-hidden rounded-[22px] border border-emerald-400/15 bg-[#06110c] px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(34,197,94,.10),transparent_52%)]" />
      <div className="relative grid grid-cols-[minmax(0,1fr)_112px] items-center gap-1">
        <div className="grid h-[270px] grid-cols-2 gap-0 sm:h-[315px]">
          <BodyFront active={active} />
          <BodyBack active={active} />
        </div>

        <div className="space-y-4 pr-1">
          {labels.map((item, index) => (
            <div key={`${item.name}-${index}`} className="relative pl-4">
              <span className="absolute left-0 top-[7px] h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,.7)]" />
              <p className="text-[11px] font-black leading-4 text-slate-100">{item.name}</p>
              <p className={`mt-0.5 text-[10px] font-bold ${item.primary ? "text-green-400" : "text-green-300/70"}`}>
                {item.primary ? tr("Utama", "Primary") : tr("Pendukung", "Secondary")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
