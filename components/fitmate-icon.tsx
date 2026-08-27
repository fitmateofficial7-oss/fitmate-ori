import type { SVGProps } from "react";

export type FitMateIconName =
  | "activity"
  | "bookmark"
  | "camera"
  | "chart"
  | "check"
  | "chevron-up"
  | "coach"
  | "dumbbell"
  | "energy"
  | "food"
  | "handshake"
  | "list"
  | "location"
  | "lock"
  | "map"
  | "message"
  | "play"
  | "pause"
  | "stop"
  | "run"
  | "scale"
  | "settings"
  | "share"
  | "shield"
  | "timer"
  | "video"
  | "x";

export default function FitMateIcon({
  name,
  className = "h-5 w-5",
  ...props
}: { name: FitMateIconName } & Omit<SVGProps<SVGSVGElement>, "name">) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "activity":
      return <svg {...common}><path d="M3 12h4l2-6 4 12 2-6h6" /></svg>;
    case "bookmark":
      return <svg {...common}><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z" /></svg>;
    case "camera":
      return <svg {...common}><path d="M5 7h3l1.3-2h5.4L16 7h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="3.2" /></svg>;
    case "chart":
      return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /></svg>;
    case "check":
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case "chevron-up":
      return <svg {...common}><path d="m6 15 6-6 6 6" /></svg>;
    case "coach":
      return <svg {...common}><circle cx="12" cy="8" r="3" /><path d="M6 20c.8-4 3-6 6-6s5.2 2 6 6" /><path d="M18 5h3M19.5 3.5v3" /></svg>;
    case "dumbbell":
      return <svg {...common}><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" /></svg>;
    case "energy":
      return <svg {...common}><path d="m13 2-7 11h6l-1 9 7-12h-6l1-8Z" /></svg>;
    case "food":
      return <svg {...common}><path d="M12 7c-3-3-8-1-8 4 0 5 4 10 8 10s8-5 8-10c0-5-5-7-8-4Z" /><path d="M12 7c0-3 2-5 5-5" /></svg>;
    case "handshake":
      return <svg {...common}><path d="m8 12 3 3c.7.7 1.7.7 2.4 0l4.6-4.6" /><path d="m3 8 4-3 4 2 2-1 5 4" /><path d="m3 8 4 7 3 2M21 8l-3 6-3 3" /></svg>;
    case "list":
      return <svg {...common}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></svg>;
    case "location":
      return <svg {...common}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case "lock":
      return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
    case "map":
      return <svg {...common}><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z" /><path d="M8 3v15M16 6v15" /></svg>;
    case "message":
      return <svg {...common}><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-1-2V7a2 2 0 0 1 2-2Z" /></svg>;
    case "play":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></svg>;
    case "pause":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.5 9v6M14.5 9v6" /></svg>;
    case "stop":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>;
    case "run":
      return <svg {...common}><circle cx="13" cy="4" r="2" /><path d="m10 9 3-2 3 3 3 1M11 9l-2 5 4 2 2 5M9 14l-4 2-2 4M16 10l-2 4" /></svg>;
    case "scale":
      return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8 10a4 4 0 0 1 8 0" /><path d="m12 10 2-2" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a8 8 0 0 0-1.8-1L14.2 3h-4.4l-.4 3a8 8 0 0 0-1.8 1L5.1 6 3 9.4 5.1 11A7 7 0 0 0 5 12c0 .3 0 .7.1 1L3 14.6 5.1 18l2.5-1a8 8 0 0 0 1.8 1l.4 3h4.4l.4-3a8 8 0 0 0 1.8-1l2.5 1 2.1-3.4-2.1-1.6c.1-.3.1-.7.1-1Z" /></svg>;
    case "share":
      return <svg {...common}><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.5-4.4M8.2 13.2l7.5 4.4" /></svg>;
    case "shield":
      return <svg {...common}><path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-5" /></svg>;
    case "timer":
      return <svg {...common}><circle cx="12" cy="13" r="8" /><path d="M9 2h6M12 5v2M12 13l3-2" /></svg>;
    case "video":
      return <svg {...common}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>;
    case "x":
      return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  }
}
