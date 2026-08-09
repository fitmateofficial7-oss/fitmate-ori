import type { JoggingRoutePoint, JoggingStats } from "@/lib/jogging";
import { formatDuration, formatPace } from "@/lib/jogging";

export type JoggingShareLayout = {
  metricsX: number;
  metricsY: number;
  metricsScale: number;
  routeX: number;
  routeY: number;
  routeScale: number;
  brandX: number;
  brandY: number;
  brandScale: number;
  detailsX: number;
  detailsY: number;
  detailsScale: number;
};

export const DEFAULT_JOGGING_SHARE_LAYOUT: JoggingShareLayout = {
  metricsX: 50,
  metricsY: 23,
  metricsScale: 1,
  routeX: 50,
  routeY: 51,
  routeScale: 1,
  brandX: 50,
  brandY: 82,
  brandScale: 1,
  detailsX: 50,
  detailsY: 94,
  detailsScale: 1,
};

type ShareCardOptions = {
  title: string;
  dateLabel: string;
  stats: JoggingStats;
  points: JoggingRoutePoint[];
  mediaUrl?: string | null;
  layout?: JoggingShareLayout;
  language?: "id" | "en";
};

type ShareVideoResult = {
  blob: Blob;
  extension: "mp4" | "webm";
  mimeType: string;
};

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const BRAND_GREEN = "#38f28d";
const BRAND_GREEN_DARK = "#16c86f";
const BRAND_MINT = "#b9ffd7";
const BRAND_BLACK = "#030806";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image."));
    image.src = url;
  });
}

function sourceSize(source: CanvasImageSource) {
  if (source instanceof HTMLVideoElement) {
    return {
      width: source.videoWidth || STORY_WIDTH,
      height: source.videoHeight || STORY_HEIGHT,
    };
  }
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height };
  }
  return { width: STORY_WIDTH, height: STORY_HEIGHT };
}

function drawCoverSource(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number
) {
  const size = sourceSize(source);
  const scale = Math.max(width / size.width, height / size.height);
  const drawWidth = size.width * scale;
  const drawHeight = size.height * scale;
  context.drawImage(
    source,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
}

function drawDefaultBackground(context: CanvasRenderingContext2D) {
  const gradient = context.createLinearGradient(0, 0, STORY_WIDTH, STORY_HEIGHT);
  gradient.addColorStop(0, "#03110a");
  gradient.addColorStop(0.35, "#063f24");
  gradient.addColorStop(0.7, "#0e6b3d");
  gradient.addColorStop(1, "#021009");
  context.fillStyle = gradient;
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const glow = context.createRadialGradient(180, 220, 20, 180, 220, 620);
  glow.addColorStop(0, "rgba(56,242,141,0.34)");
  glow.addColorStop(1, "rgba(56,242,141,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  context.strokeStyle = "rgba(185,255,215,0.08)";
  context.lineWidth = 2;
  for (let index = 0; index < 8; index += 1) {
    const y = 180 + index * 210;
    context.beginPath();
    context.moveTo(-80, y);
    context.bezierCurveTo(260, y - 100, 760, y + 120, 1160, y - 40);
    context.stroke();
  }
}

function drawMediaOverlay(context: CanvasRenderingContext2D) {
  const topShade = context.createLinearGradient(0, 0, 0, 720);
  topShade.addColorStop(0, "rgba(0,0,0,0.72)");
  topShade.addColorStop(0.72, "rgba(0,0,0,0.22)");
  topShade.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = topShade;
  context.fillRect(0, 0, STORY_WIDTH, 760);

  const bottomShade = context.createLinearGradient(0, 1060, 0, STORY_HEIGHT);
  bottomShade.addColorStop(0, "rgba(0,0,0,0)");
  bottomShade.addColorStop(0.42, "rgba(0,0,0,0.32)");
  bottomShade.addColorStop(1, "rgba(0,0,0,0.88)");
  context.fillStyle = bottomShade;
  context.fillRect(0, 1040, STORY_WIDTH, STORY_HEIGHT - 1040);

  const vignette = context.createRadialGradient(
    STORY_WIDTH / 2,
    STORY_HEIGHT / 2,
    460,
    STORY_WIDTH / 2,
    STORY_HEIGHT / 2,
    1180
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.38)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
}

function drawCornerGuides(context: CanvasRenderingContext2D) {
  context.strokeStyle = "rgba(255,255,255,0.72)";
  context.lineWidth = 5;
  context.lineCap = "round";
  const margin = 42;
  const length = 50;
  const corners = [
    [margin, margin, 1, 1],
    [STORY_WIDTH - margin, margin, -1, 1],
    [margin, STORY_HEIGHT - margin, 1, -1],
    [STORY_WIDTH - margin, STORY_HEIGHT - margin, -1, -1],
  ] as const;

  for (const [x, y, dx, dy] of corners) {
    context.beginPath();
    context.moveTo(x + dx * length, y);
    context.lineTo(x, y);
    context.lineTo(x, y + dy * length);
    context.stroke();
  }
}

function fitFont(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  weight = 900
) {
  let size = startSize;
  while (size > 24) {
    context.font = `${weight} ${size}px Arial`;
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

function drawMetricStack(
  context: CanvasRenderingContext2D,
  stats: JoggingStats,
  centerX: number,
  centerY: number,
  elementScale: number
) {
  const distance = `${(stats.distanceMeters / 1000).toFixed(2)} km`;
  const pace = `${formatPace(stats.averagePaceSecondsPerKm)} /km`;
  const time = formatDuration(stats.durationSeconds);
  const rows = [
    { label: "DISTANCE", value: distance },
    { label: "PACE", value: pace },
    { label: "TIME", value: time },
  ];
  const rowHeight = 154;
  const totalHeight = rowHeight * rows.length;
  const top = -totalHeight / 2;

  context.save();
  context.translate(centerX, centerY);
  context.scale(elementScale, elementScale);
  context.textAlign = "center";

  rows.forEach((row, index) => {
    const y = top + index * rowHeight;
    context.fillStyle = "rgba(255,255,255,0.84)";
    context.font = "800 24px Arial";
    context.letterSpacing = "4px";
    context.fillText(row.label, 0, y + 26);
    context.letterSpacing = "0px";

    context.fillStyle = "#ffffff";
    fitFont(context, row.value, 780, 72);
    context.shadowColor = "rgba(0,0,0,0.35)";
    context.shadowBlur = 12;
    context.fillText(row.value, 0, y + 100);
    context.shadowBlur = 0;

    if (index < rows.length - 1) {
      context.strokeStyle = BRAND_GREEN;
      context.lineWidth = 7;
      context.beginPath();
      context.moveTo(-20, y + 132);
      context.lineTo(20, y + 132);
      context.stroke();
    }
  });

  context.restore();
}

function projectRoute(
  points: JoggingRoutePoint[],
  box: { x: number; y: number; width: number; height: number }
) {
  if (points.length < 2) return [];
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minimumLatitude = Math.min(...latitudes);
  const maximumLatitude = Math.max(...latitudes);
  const minimumLongitude = Math.min(...longitudes);
  const maximumLongitude = Math.max(...longitudes);
  const latitudeSpan = Math.max(0.00001, maximumLatitude - minimumLatitude);
  const longitudeSpan = Math.max(0.00001, maximumLongitude - minimumLongitude);
  const padding = 34;
  const usableWidth = box.width - padding * 2;
  const usableHeight = box.height - padding * 2;
  const scale = Math.min(
    usableWidth / longitudeSpan,
    usableHeight / latitudeSpan
  );
  const routeWidth = longitudeSpan * scale;
  const routeHeight = latitudeSpan * scale;
  const offsetX = box.x + (box.width - routeWidth) / 2;
  const offsetY = box.y + (box.height - routeHeight) / 2;
  return points.map((point) => ({
    x: offsetX + (point.longitude - minimumLongitude) * scale,
    y: offsetY + (maximumLatitude - point.latitude) * scale,
  }));
}

function traceRoute(
  context: CanvasRenderingContext2D,
  projected: { x: number; y: number }[]
) {
  context.beginPath();
  projected.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
}

function drawRoute(
  context: CanvasRenderingContext2D,
  points: JoggingRoutePoint[],
  centerX: number,
  centerY: number,
  routeScale: number,
  language: "id" | "en" = "id"
) {
  const width = 500 * routeScale;
  const height = 430 * routeScale;
  const box = {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
  const projected = projectRoute(points, box);

  if (projected.length < 2) {
    context.textAlign = "center";
    context.fillStyle = "rgba(255,255,255,0.78)";
    context.font = "800 25px Arial";
    context.fillText(
      language === "id" ? "Rute GPS belum tersedia" : "GPS route not available yet",
      centerX,
      centerY
    );
    context.textAlign = "left";
    return;
  }

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  traceRoute(context, projected);
  context.strokeStyle = "rgba(255,255,255,0.92)";
  context.lineWidth = 26 * routeScale;
  context.shadowColor = "rgba(56,242,141,0.42)";
  context.shadowBlur = 34 * routeScale;
  context.stroke();
  context.shadowBlur = 0;

  traceRoute(context, projected);
  const gradient = context.createLinearGradient(
    box.x,
    box.y,
    box.x + box.width,
    box.y + box.height
  );
  gradient.addColorStop(0, BRAND_MINT);
  gradient.addColorStop(0.5, BRAND_GREEN);
  gradient.addColorStop(1, BRAND_GREEN_DARK);
  context.strokeStyle = gradient;
  context.lineWidth = 14 * routeScale;
  context.stroke();

  traceRoute(context, projected);
  context.strokeStyle = "rgba(255,255,255,0.82)";
  context.lineWidth = 3 * routeScale;
  context.setLineDash([2 * routeScale, 14 * routeScale]);
  context.stroke();
  context.setLineDash([]);

  const start = projected[0];
  const finish = projected[projected.length - 1];
  [
    { point: start, fill: BRAND_GREEN, radius: 15 * routeScale },
    { point: finish, fill: "#ffffff", radius: 17 * routeScale },
  ].forEach(({ point, fill, radius }) => {
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = BRAND_BLACK;
    context.lineWidth = 4 * routeScale;
    context.stroke();
  });
  context.restore();
}

function drawFallbackLogo(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  roundedRect(context, x, y, size, size, size * 0.22);
  context.fillStyle = "rgba(3,8,6,0.88)";
  context.fill();
  context.strokeStyle = BRAND_GREEN;
  context.lineWidth = 4;
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = `900 ${size * 0.64}px Arial`;
  context.textAlign = "center";
  context.fillText("F", x + size / 2, y + size * 0.72);
  context.textAlign = "left";
}

function drawBrand(
  context: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  centerX: number,
  centerY: number,
  title: string,
  dateLabel: string,
  elementScale: number
) {
  const logoSize = 84;
  const name = "FITMATE";
  const ai = "AI";

  context.save();
  context.translate(centerX, centerY);
  context.scale(elementScale, elementScale);

  context.font = "900 54px Arial";
  const nameWidth = context.measureText(name).width;
  const aiWidth = context.measureText(ai).width;
  const totalWidth = logoSize + 24 + nameWidth + aiWidth;
  const startX = -totalWidth / 2;
  const logoY = -logoSize / 2;

  if (logo) {
    context.drawImage(logo, startX, logoY, logoSize, logoSize);
  } else {
    drawFallbackLogo(context, startX, logoY, logoSize);
  }

  const textX = startX + logoSize + 24;
  context.fillStyle = "#ffffff";
  context.font = "900 54px Arial";
  context.fillText(name, textX, 13);
  context.fillStyle = BRAND_GREEN;
  context.fillText(ai, textX + nameWidth, 13);

  context.textAlign = "center";
  context.fillStyle = "rgba(255,255,255,0.76)";
  context.font = "700 20px Arial";
  context.fillText(title.slice(0, 34), 0, 62);
  context.fillStyle = "rgba(185,255,215,0.82)";
  context.font = "700 18px Arial";
  context.fillText(dateLabel, 0, 94);
  context.restore();
}

function drawBottomDetails(
  context: CanvasRenderingContext2D,
  stats: JoggingStats,
  centerX: number,
  centerY: number,
  elementScale: number,
  language: "id" | "en" = "id"
) {
  const labels = [
    `${Math.round(stats.caloriesKcal)} KCAL`,
    `${stats.averageSpeedKmh.toFixed(1)} ${language === "id" ? "KM/J" : "KM/H"}`,
    `${language === "id" ? "ELEVASI" : "ELEVATION"} ${Math.round(stats.elevationGainMeters)} M`,
  ];

  context.save();
  context.translate(centerX, centerY);
  context.scale(elementScale, elementScale);
  context.textAlign = "center";
  context.fillStyle = "rgba(255,255,255,0.72)";
  context.font = "800 18px Arial";
  labels.forEach((label, index) => {
    context.fillText(label, -324 + index * 324, 0);
  });
  context.restore();
}

async function loadBrandLogo() {
  try {
    return await loadImage("/brand/fitmate-mark.png");
  } catch {
    return null;
  }
}

function normalizedLayout(layout?: JoggingShareLayout): JoggingShareLayout {
  const value = layout ?? DEFAULT_JOGGING_SHARE_LAYOUT;
  return {
    metricsX: clamp(value.metricsX, 2, 98),
    metricsY: clamp(value.metricsY, 2, 98),
    metricsScale: clamp(value.metricsScale ?? 1, 0.5, 1.8),
    routeX: clamp(value.routeX, 2, 98),
    routeY: clamp(value.routeY, 2, 98),
    routeScale: clamp(value.routeScale, 0.45, 2),
    brandX: clamp(value.brandX, 2, 98),
    brandY: clamp(value.brandY, 2, 98),
    brandScale: clamp(value.brandScale ?? 1, 0.5, 1.8),
    detailsX: clamp(value.detailsX ?? 50, 2, 98),
    detailsY: clamp(value.detailsY ?? 94, 2, 98),
    detailsScale: clamp(value.detailsScale ?? 1, 0.5, 1.8),
  };
}

function drawShareFrame({
  context,
  source,
  logo,
  options,
}: {
  context: CanvasRenderingContext2D;
  source?: CanvasImageSource | null;
  logo: HTMLImageElement | null;
  options: ShareCardOptions;
}) {
  context.clearRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  if (source) drawCoverSource(context, source, STORY_WIDTH, STORY_HEIGHT);
  else drawDefaultBackground(context);
  drawMediaOverlay(context);

  const layout = normalizedLayout(options.layout);
  const metricsX = (layout.metricsX / 100) * STORY_WIDTH;
  const metricsY = (layout.metricsY / 100) * STORY_HEIGHT;
  const routeX = (layout.routeX / 100) * STORY_WIDTH;
  const routeY = (layout.routeY / 100) * STORY_HEIGHT;
  const brandX = (layout.brandX / 100) * STORY_WIDTH;
  const brandY = (layout.brandY / 100) * STORY_HEIGHT;
  const detailsX = (layout.detailsX / 100) * STORY_WIDTH;
  const detailsY = (layout.detailsY / 100) * STORY_HEIGHT;

  drawMetricStack(
    context,
    options.stats,
    metricsX,
    metricsY,
    layout.metricsScale
  );
  drawRoute(
    context,
    options.points,
    routeX,
    routeY,
    layout.routeScale,
    options.language
  );
  drawBrand(
    context,
    logo,
    brandX,
    brandY,
    options.title,
    options.dateLabel,
    layout.brandScale
  );
  drawBottomDetails(
    context,
    options.stats,
    detailsX,
    detailsY,
    layout.detailsScale,
    options.language
  );
  drawCornerGuides(context);
}

export async function createJoggingShareCard(options: ShareCardOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available.");

  const [logo, source] = await Promise.all([
    loadBrandLogo(),
    options.mediaUrl
      ? loadImage(options.mediaUrl).catch(() => null)
      : Promise.resolve(null),
  ]);

  drawShareFrame({ context, source, logo, options });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to export the jogging card."));
      },
      "image/png",
      0.96
    );
  });
}

function loadVideo(url: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.playsInline = true;
    video.muted = true;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("Unable to load video."));
    video.src = url;
    video.load();
  });
}

function chooseRecorderMimeType() {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((value) => MediaRecorder.isTypeSupported(value)) ?? "";
}

export async function createJoggingShareVideo(
  options: ShareCardOptions & { mediaUrl: string }
): Promise<ShareVideoResult> {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context || typeof canvas.captureStream !== "function") {
    throw new Error("VIDEO_EXPORT_UNSUPPORTED");
  }
  if (typeof MediaRecorder === "undefined") {
    throw new Error("VIDEO_EXPORT_UNSUPPORTED");
  }

  const [logo, video] = await Promise.all([
    loadBrandLogo(),
    loadVideo(options.mediaUrl),
  ]);

  const canvasStream = canvas.captureStream(30);
  const capturableVideo = video as HTMLVideoElement & {
    captureStream?: () => MediaStream;
    mozCaptureStream?: () => MediaStream;
  };
  const sourceStream =
    capturableVideo.captureStream?.() ?? capturableVideo.mozCaptureStream?.();
  sourceStream?.getAudioTracks().forEach((track) => {
    canvasStream.addTrack(track);
  });

  const mimeType = chooseRecorderMimeType();
  const recorder = new MediaRecorder(canvasStream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: 8_000_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const result = new Promise<ShareVideoResult>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Unable to export video."));
    recorder.onstop = () => {
      const finalMime = recorder.mimeType || mimeType || "video/webm";
      resolve({
        blob: new Blob(chunks, { type: finalMime }),
        extension: finalMime.includes("mp4") ? "mp4" : "webm",
        mimeType: finalMime,
      });
    };
  });

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (recorder.state !== "inactive") recorder.stop();
    video.pause();
    canvasStream.getTracks().forEach((track) => track.stop());
  };

  const maximumSeconds = Math.min(
    Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 60,
    60
  );
  video.currentTime = 0;
  recorder.start(250);
  await video.play();
  const startedAt = performance.now();

  const render = () => {
    drawShareFrame({ context, source: video, logo, options });
    const elapsed = (performance.now() - startedAt) / 1000;
    if (video.ended || elapsed >= maximumSeconds) {
      stop();
      return;
    }
    requestAnimationFrame(render);
  };
  render();

  return result;
}
