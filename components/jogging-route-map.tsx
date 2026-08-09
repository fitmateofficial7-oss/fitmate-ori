"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { JoggingRoutePoint } from "@/lib/jogging";

type JoggingRouteMapProps = {
  points: JoggingRoutePoint[];
  className?: string;
  showTiles?: boolean;
  isLive?: boolean;
};

type MapDimensions = {
  width: number;
  height: number;
};

type Tile = {
  x: number;
  y: number;
  wrappedX: number;
  left: number;
  top: number;
  key: string;
};

type DecorativeBlob = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: number;
  fill: string;
  opacity: number;
};

type DecorativePath = {
  d: string;
  stroke: string;
  width: number;
  opacity: number;
  dasharray?: string;
};

const TILE_SIZE = 256;
const DEFAULT_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ??
  "© OpenStreetMap contributors";

function clampLatitude(latitude: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, latitude));
}

function worldPixel(latitude: number, longitude: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const safeLatitude = clampLatitude(latitude);
  const sinLatitude = Math.sin((safeLatitude * Math.PI) / 180);

  return {
    x: ((longitude + 180) / 360) * scale,
    y:
      (0.5 -
        Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
      scale,
  };
}

function chooseViewport(points: JoggingRoutePoint[], dimensions: MapDimensions) {
  const fallback = {
    centerLatitude: -6.2,
    centerLongitude: 106.816666,
    zoom: 5,
  };

  if (!points.length || dimensions.width <= 0 || dimensions.height <= 0) {
    return fallback;
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minimumLatitude = Math.min(...latitudes);
  const maximumLatitude = Math.max(...latitudes);
  const minimumLongitude = Math.min(...longitudes);
  const maximumLongitude = Math.max(...longitudes);
  const centerLatitude = (minimumLatitude + maximumLatitude) / 2;
  const centerLongitude = (minimumLongitude + maximumLongitude) / 2;

  if (points.length === 1) {
    return { centerLatitude, centerLongitude, zoom: 16 };
  }

  const padding = 56;
  let selectedZoom = 3;

  for (let zoom = 18; zoom >= 3; zoom -= 1) {
    const northWest = worldPixel(maximumLatitude, minimumLongitude, zoom);
    const southEast = worldPixel(minimumLatitude, maximumLongitude, zoom);
    const routeWidth = Math.abs(southEast.x - northWest.x);
    const routeHeight = Math.abs(southEast.y - northWest.y);

    if (
      routeWidth <= dimensions.width - padding * 2 &&
      routeHeight <= dimensions.height - padding * 2
    ) {
      selectedZoom = zoom;
      break;
    }
  }

  return {
    centerLatitude,
    centerLongitude,
    zoom: selectedZoom,
  };
}

function tileUrl(template: string, zoom: number, x: number, y: number) {
  return template
    .replace("{z}", String(zoom))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createSeed(points: JoggingRoutePoint[]) {
  return points.reduce((seed, point, index) => {
    const lat = Math.round(point.latitude * 10000);
    const lng = Math.round(point.longitude * 10000);
    return (seed + lat * 31 + lng * 17 + index * 13) >>> 0;
  }, 20260731);
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDecorativeScene(
  width: number,
  height: number,
  seedValue: number
): {
  blobs: DecorativeBlob[];
  roads: DecorativePath[];
  contourPaths: DecorativePath[];
} {
  const random = mulberry32(seedValue);
  const blobs: DecorativeBlob[] = [];
  const roads: DecorativePath[] = [];
  const contourPaths: DecorativePath[] = [];

  const blobColors = ["#d8fbe8", "#c2f5e1", "#bff6eb", "#d7f7d4"];

  for (let index = 0; index < 5; index += 1) {
    blobs.push({
      cx: 20 + random() * 60,
      cy: 10 + random() * 80,
      rx: 12 + random() * 18,
      ry: 8 + random() * 16,
      rotate: -20 + random() * 40,
      fill: blobColors[index % blobColors.length],
      opacity: 0.18 + random() * 0.1,
    });
  }

  for (let index = 0; index < 3; index += 1) {
    const direction = index % 2 === 0 ? 1 : -1;
    const startY = 12 + random() * 76;
    const ctrl1X = 16 + random() * 28;
    const ctrl2X = 58 + random() * 24;
    const endY = clamp(startY + direction * (6 + random() * 18), 8, 92);
    roads.push({
      d: `M -5 ${startY.toFixed(1)} C ${ctrl1X.toFixed(1)} ${(startY + 8).toFixed(
        1
      )}, ${ctrl2X.toFixed(1)} ${(endY - 8).toFixed(1)}, 105 ${endY.toFixed(1)}`,
      stroke: index % 2 === 0 ? "rgba(255,255,255,0.22)" : "rgba(20,184,166,0.14)",
      width: index % 2 === 0 ? 2.2 : 1.8,
      opacity: 0.45,
      dasharray: index % 2 === 0 ? "10 12" : undefined,
    });
  }

  for (let index = 0; index < 4; index += 1) {
    const y = 8 + index * 12 + random() * 4;
    contourPaths.push({
      d: `M 0 ${y.toFixed(1)} Q 20 ${(y + 5 + random() * 3).toFixed(1)}, 40 ${y.toFixed(
        1
      )} T 80 ${(y + 2 + random() * 3).toFixed(1)} T 100 ${y.toFixed(1)}`,
      stroke: "rgba(15,118,110,0.09)",
      width: 1.6,
      opacity: 0.8,
      dasharray: "4 10",
    });
  }

  // Use dimensions to avoid linter complaints and make future adjustments easier.
  void width;
  void height;

  return { blobs, roads, contourPaths };
}


function FitMateMascotFace({
  finish = false,
  compact = false,
}: {
  finish?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full border border-white/80 bg-gradient-to-br ${
        finish
          ? "from-slate-800 via-slate-700 to-slate-950"
          : "from-emerald-300 via-teal-400 to-teal-600"
      } ${compact ? "h-7 w-7" : "h-10 w-10"} shadow-inner`}
      aria-hidden="true"
    >
      <span
        className={`relative rounded-full bg-[#dffcf3] ${
          compact ? "h-[1.125rem] w-[1.125rem]" : "h-6 w-6"
        }`}
      >
        <span className="absolute left-[24%] top-[31%] h-[18%] w-[18%] rounded-full bg-slate-800" />
        <span className="absolute right-[24%] top-[31%] h-[18%] w-[18%] rounded-full bg-slate-800" />
        <span className="absolute bottom-[22%] left-1/2 h-[12%] w-[42%] -translate-x-1/2 rounded-b-full border-b-2 border-slate-700" />
      </span>
      {!compact && (
        <span
          className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border-2 border-white text-[8px] font-black text-white ${
            finish ? "bg-amber-500" : "bg-emerald-600"
          }`}
        >
          {finish ? "✓" : "▶"}
        </span>
      )}
    </span>
  );
}

function FitMateRouteMarker({
  finish = false,
  live = false,
}: {
  finish?: boolean;
  live?: boolean;
}) {
  return (
    <span className="relative flex flex-col items-center">
      <span
        className={`rounded-full border-[4px] border-white p-1 shadow-[0_10px_24px_rgba(15,118,110,0.28)] ${
          finish ? "bg-slate-900" : live ? "bg-emerald-500" : "bg-teal-500"
        }`}
      >
        <FitMateMascotFace finish={finish} />
      </span>
      <span
        className={`mt-1 rounded-full border border-white/90 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-white shadow ${
          finish ? "bg-slate-900" : live ? "bg-emerald-600" : "bg-teal-600"
        }`}
      >
        {finish ? "Finish" : live ? "Live" : "Start"}
      </span>
    </span>
  );
}

function sampleEnergyDots(route: { x: number; y: number }[]) {
  if (route.length < 2) {
    return route;
  }

  const sampled: { x: number; y: number }[] = [];
  const step = Math.max(1, Math.floor(route.length / 18));

  for (let index = 0; index < route.length; index += step) {
    sampled.push(route[index]);
  }

  const lastPoint = route[route.length - 1];
  if (sampled[sampled.length - 1] !== lastPoint) {
    sampled.push(lastPoint);
  }

  return sampled;
}

export default function JoggingRouteMap({
  points,
  className = "",
  showTiles = true,
  isLive = false,
}: JoggingRouteMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<MapDimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setDimensions({
        width: Math.max(1, entry.contentRect.width),
        height: Math.max(1, entry.contentRect.height),
      });
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const effectiveShowTiles = showTiles && points.length > 0;

  const projection = useMemo(() => {
    const viewport = chooseViewport(points, dimensions);
    const center = worldPixel(
      viewport.centerLatitude,
      viewport.centerLongitude,
      viewport.zoom
    );
    const originX = center.x - dimensions.width / 2;
    const originY = center.y - dimensions.height / 2;
    const worldTiles = 2 ** viewport.zoom;
    const minimumTileX = Math.floor(originX / TILE_SIZE) - 1;
    const maximumTileX = Math.floor((originX + dimensions.width) / TILE_SIZE) + 1;
    const minimumTileY = Math.max(0, Math.floor(originY / TILE_SIZE) - 1);
    const maximumTileY = Math.min(
      worldTiles - 1,
      Math.floor((originY + dimensions.height) / TILE_SIZE) + 1
    );
    const tiles: Tile[] = [];

    for (let y = minimumTileY; y <= maximumTileY; y += 1) {
      for (let x = minimumTileX; x <= maximumTileX; x += 1) {
        const wrappedX = ((x % worldTiles) + worldTiles) % worldTiles;
        tiles.push({
          x,
          y,
          wrappedX,
          left: x * TILE_SIZE - originX,
          top: y * TILE_SIZE - originY,
          key: `${viewport.zoom}-${x}-${y}`,
        });
      }
    }

    const route = points.map((point) => {
      const pixel = worldPixel(point.latitude, point.longitude, viewport.zoom);
      return {
        x: pixel.x - originX,
        y: pixel.y - originY,
      };
    });

    return { ...viewport, tiles, route };
  }, [dimensions, points]);

  const routeValue = projection.route
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");
  const start = projection.route[0];
  const finish = projection.route[projection.route.length - 1];
  const decorativeScene = useMemo(
    () =>
      buildDecorativeScene(
        dimensions.width,
        dimensions.height,
        createSeed(points)
      ),
    [dimensions.height, dimensions.width, points]
  );
  const energyDots = useMemo(
    () => sampleEnergyDots(projection.route),
    [projection.route]
  );

  return (
    <div
      ref={hostRef}
      className={`relative isolate overflow-hidden rounded-[2rem] border border-emerald-200/80 bg-[#eafcf4] shadow-[0_14px_36px_rgba(16,185,129,0.12)] dark:border-white/10 dark:bg-slate-900 ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_35%),radial-gradient(circle_at_100%_0%,rgba(110,231,183,0.35),transparent_32%),linear-gradient(180deg,#effff7_0%,#dffaf0_46%,#d0f5eb_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_100%_0%,rgba(45,212,191,0.16),transparent_26%),linear-gradient(180deg,#082f34_0%,#0b3b44_46%,#0f172a_100%)]" />

      {effectiveShowTiles && dimensions.width > 0 &&
        projection.tiles.map((tile) => (
          // The map tiles are decorative; route and statistics remain accessible.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.key}
            src={tileUrl(DEFAULT_TILE_URL, projection.zoom, tile.wrappedX, tile.y)}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute max-w-none select-none opacity-[0.14] saturate-[0.5] hue-rotate-[10deg] contrast-[1.02] brightness-[1.06] dark:opacity-[0.12] dark:brightness-[0.72] dark:contrast-[1.04] dark:saturate-[0.4]"
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              left: tile.left,
              top: tile.top,
            }}
          />
        ))}

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {decorativeScene.blobs.map((blob, index) => (
          <ellipse
            key={`blob-${index}`}
            cx={blob.cx}
            cy={blob.cy}
            rx={blob.rx}
            ry={blob.ry}
            fill={blob.fill}
            fillOpacity={blob.opacity}
            transform={`rotate(${blob.rotate} ${blob.cx} ${blob.cy})`}
          />
        ))}
        {decorativeScene.roads.map((road, index) => (
          <path
            key={`road-${index}`}
            d={road.d}
            fill="none"
            stroke={road.stroke}
            strokeWidth={road.width}
            strokeOpacity={road.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={road.dasharray}
          />
        ))}
        {decorativeScene.contourPaths.map((path, index) => (
          <path
            key={`contour-${index}`}
            d={path.d}
            fill="none"
            stroke={path.stroke}
            strokeWidth={path.width}
            strokeOpacity={path.opacity}
            strokeLinecap="round"
            strokeDasharray={path.dasharray}
          />
        ))}
      </svg>

      {!showTiles && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.18),transparent_22%),radial-gradient(circle_at_85%_12%,rgba(110,231,183,0.28),transparent_18%),linear-gradient(180deg,rgba(6,78,59,0.18),rgba(6,78,59,0.12))]" />
      )}

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${Math.max(1, dimensions.width)} ${Math.max(1, dimensions.height)}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="fitmate-route-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="fitmate-route-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="55%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
        </defs>

        {routeValue && (
          <>
            <polyline
              points={routeValue}
              fill="none"
              stroke="rgba(255,255,255,0.72)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#fitmate-route-glow)"
            />
            <polyline
              points={routeValue}
              fill="none"
              stroke="url(#fitmate-route-gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={routeValue}
              fill="none"
              stroke="rgba(232,255,247,0.9)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1 12"
            />
          </>
        )}

        {energyDots.map((dot, index) => (
          <circle
            key={`energy-dot-${index}`}
            cx={dot.x}
            cy={dot.y}
            r={index % 3 === 0 ? 3.2 : 2.4}
            fill={index % 3 === 0 ? "#ecfeff" : "#99f6e4"}
            opacity={0.88 - (index / Math.max(1, energyDots.length)) * 0.22}
          />
        ))}
      </svg>

      <div className="absolute left-2.5 top-2.5 z-20 flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-teal-800 shadow-md backdrop-blur sm:left-3 sm:top-3 sm:px-3 sm:py-2 sm:text-[10px] dark:border-white/10 dark:bg-slate-950/78 dark:text-teal-200">
        <FitMateMascotFace compact />
        <span className="hidden min-[360px]:inline">FitMate Trail</span>
        <span className="min-[360px]:hidden">Trail</span>
      </div>

      <div className="absolute right-3 top-3 z-20 hidden rounded-2xl border border-white/70 bg-white/86 px-3 py-2 text-right shadow-md backdrop-blur sm:block dark:border-white/10 dark:bg-slate-950/76">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
          Mode
        </p>
        <p className="text-xs font-black text-teal-700 dark:text-teal-200">
          FitMate Map
        </p>
      </div>

      {start && (
        <span
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: start.x, top: start.y }}
          aria-label="Titik mulai"
        >
          <FitMateRouteMarker />
        </span>
      )}
      {finish && projection.route.length > 1 && (
        <span
          className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 ${
            isLive ? "animate-[pulse_1.8s_ease-in-out_infinite]" : ""
          }`}
          style={{ left: finish.x, top: finish.y }}
          aria-label={isLive ? "Posisi saat ini" : "Titik akhir"}
        >
          <FitMateRouteMarker finish={!isLive} live={isLive} />
        </span>
      )}

      {!points.length && (
        <div className="absolute inset-0 z-20 grid place-items-center p-5 text-center">
          <div className="max-w-md rounded-[1.75rem] border border-white/70 bg-white/94 px-5 py-4 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-950/86">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/15">
              <FitMateMascotFace />
            </div>
            <p className="mt-3 text-base font-black text-slate-900 dark:text-white">
              Rute akan muncul setelah GPS mendapatkan lokasi
            </p>
            <p className="mt-1 text-sm font-semibold text-teal-700 dark:text-teal-200">
              Setelah jogging dimulai, FitMate akan menampilkan track secara live
            </p>
          </div>
        </div>
      )}

      {effectiveShowTiles && (
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-2 right-2 z-20 rounded-full bg-white/88 px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow backdrop-blur dark:bg-slate-950/80 dark:text-slate-300"
        >
          {DEFAULT_ATTRIBUTION}
        </a>
      )}
    </div>
  );
}
