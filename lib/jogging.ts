export type JoggingRoutePoint = {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  timestamp: number;
};

export type JoggingSplit = {
  kilometer: number;
  seconds: number;
  paceSecondsPerKm: number;
};

export type JoggingStats = {
  distanceMeters: number;
  durationSeconds: number;
  averagePaceSecondsPerKm: number | null;
  averageSpeedKmh: number;
  currentPaceSecondsPerKm: number | null;
  caloriesKcal: number;
  elevationGainMeters: number;
  splits: JoggingSplit[];
};

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceMeters(
  left: Pick<JoggingRoutePoint, "latitude" | "longitude">,
  right: Pick<JoggingRoutePoint, "latitude" | "longitude">
) {
  const deltaLatitude = toRadians(right.latitude - left.latitude);
  const deltaLongitude = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function isUsableJoggingPoint(
  point: JoggingRoutePoint,
  previous?: JoggingRoutePoint
) {
  if (
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude) ||
    !Number.isFinite(point.accuracy) ||
    point.accuracy > 80
  ) {
    return false;
  }

  if (!previous) {
    return true;
  }

  const seconds = Math.max(
    0.25,
    (point.timestamp - previous.timestamp) / 1000
  );
  const distance = haversineDistanceMeters(previous, point);
  const speedMetersPerSecond = distance / seconds;

  // Filter GPS jumps while still allowing a fast sprint.
  return speedMetersPerSecond <= 12 && distance <= 250;
}

export function compactRoutePoints(
  points: JoggingRoutePoint[],
  minimumDistanceMeters = 3,
  minimumIntervalMs = 4_000
) {
  if (points.length <= 2) {
    return points;
  }

  const result: JoggingRoutePoint[] = [points[0]];
  let last = points[0];

  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index];
    const distance = haversineDistanceMeters(last, point);
    const elapsed = point.timestamp - last.timestamp;

    if (
      distance >= minimumDistanceMeters ||
      elapsed >= minimumIntervalMs
    ) {
      result.push(point);
      last = point;
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

function metForSpeed(speedKmh: number) {
  if (speedKmh < 3) return 2.8;
  if (speedKmh < 5) return 3.5;
  if (speedKmh < 6.5) return 5;
  if (speedKmh < 8) return 7;
  if (speedKmh < 10) return 9;
  if (speedKmh < 12) return 10.5;
  return 12.5;
}

function currentPace(points: JoggingRoutePoint[]) {
  if (points.length < 2) return null;

  const newest = points[points.length - 1];
  const cutoff = newest.timestamp - 60_000;
  let startIndex = points.length - 2;

  while (startIndex > 0 && points[startIndex].timestamp > cutoff) {
    startIndex -= 1;
  }

  let distance = 0;
  for (let index = startIndex + 1; index < points.length; index += 1) {
    distance += haversineDistanceMeters(
      points[index - 1],
      points[index]
    );
  }

  const seconds = Math.max(
    1,
    (newest.timestamp - points[startIndex].timestamp) / 1000
  );

  return distance >= 30 ? seconds / (distance / 1000) : null;
}

function buildSplits(points: JoggingRoutePoint[]) {
  const splits: JoggingSplit[] = [];
  if (points.length < 2) return splits;

  let distanceSinceSplit = 0;
  let splitStartTimestamp = points[0].timestamp;
  let kilometer = 1;

  for (let index = 1; index < points.length; index += 1) {
    distanceSinceSplit += haversineDistanceMeters(
      points[index - 1],
      points[index]
    );

    if (distanceSinceSplit >= 1000) {
      const seconds = Math.max(
        1,
        (points[index].timestamp - splitStartTimestamp) / 1000
      );
      splits.push({
        kilometer,
        seconds,
        paceSecondsPerKm: seconds,
      });
      kilometer += 1;
      distanceSinceSplit -= 1000;
      splitStartTimestamp = points[index].timestamp;
    }
  }

  return splits;
}

export function calculateJoggingStats(
  points: JoggingRoutePoint[],
  durationSeconds: number,
  weightKg: number
): JoggingStats {
  let distanceMeters = 0;
  let elevationGainMeters = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    distanceMeters += haversineDistanceMeters(previous, current);

    if (
      previous.altitude !== null &&
      current.altitude !== null
    ) {
      const gain = current.altitude - previous.altitude;
      if (gain > 1 && gain < 30) {
        elevationGainMeters += gain;
      }
    }
  }

  const distanceKm = distanceMeters / 1000;
  const safeDuration = Math.max(0, durationSeconds);
  const averageSpeedKmh =
    safeDuration > 0 ? distanceKm / (safeDuration / 3600) : 0;
  const averagePaceSecondsPerKm =
    distanceKm >= 0.05 ? safeDuration / distanceKm : null;
  const met = metForSpeed(averageSpeedKmh);
  const caloriesKcal =
    (met * 3.5 * Math.max(30, weightKg)) / 200 *
    (safeDuration / 60);

  return {
    distanceMeters,
    durationSeconds: safeDuration,
    averagePaceSecondsPerKm,
    averageSpeedKmh,
    currentPaceSecondsPerKm: currentPace(points),
    caloriesKcal,
    elevationGainMeters,
    splits: buildSplits(points),
  };
}

export function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatPace(secondsPerKm: number | null) {
  if (
    secondsPerKm === null ||
    !Number.isFinite(secondsPerKm) ||
    secondsPerKm <= 0
  ) {
    return "--:--";
  }

  const roundedSeconds = Math.round(secondsPerKm);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
