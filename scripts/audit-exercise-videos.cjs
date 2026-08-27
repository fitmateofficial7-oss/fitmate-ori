#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const videosDir = path.join(root, "public", "exercise-videos");
const postersDir = path.join(root, "public", "exercise-video-posters");
const videoAssets = fs.readFileSync(
  path.join(root, "lib", "exercise-video-assets.ts"),
  "utf8"
);
const exercisePage = fs.readFileSync(
  path.join(root, "app", "exercises", "page.tsx"),
  "utf8"
);
const guides = fs.readFileSync(
  path.join(root, "lib", "exercise-guides.ts"),
  "utf8"
);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const videoFiles = fs
  .readdirSync(videosDir)
  .filter((name) => name.endsWith(".mp4"));
const posterFiles = fs
  .readdirSync(postersDir)
  .filter((name) => name.endsWith(".webp"));

assert(videoFiles.length === 29, `Expected 29 exercise videos, found ${videoFiles.length}.`);
assert(posterFiles.length === 29, `Expected 29 video-derived thumbnails, found ${posterFiles.length}.`);

for (const file of videoFiles) {
  const stat = fs.statSync(path.join(videosDir, file));
  assert(stat.size > 100_000, `${file} looks empty or incomplete.`);
}

const guideBlock = guides
  .split("const GUIDES: Record<string, ExerciseGuide> = {")[1]
  .split("const ENGLISH_GUIDES")[0];
const guideSlugs = [...guideBlock.matchAll(/^  \"?([a-z0-9-]+)\"?: \{\n    slug: \"([a-z0-9-]+)\"/gm)].map(
  (match) => match[2]
);
const aliases = Object.fromEntries(
  [...videoAssets.matchAll(/^  \"([a-z0-9-]+)\": \"([a-z0-9-]+)\",/gm)].map((match) => [match[1], match[2]])
);

assert(guideSlugs.length === 29, `Expected 29 canonical guides, found ${guideSlugs.length}.`);
for (const slug of guideSlugs) {
  const videoSlug = aliases[slug];
  assert(videoSlug, `No exercise-video mapping for ${slug}.`);
  assert(
    fs.existsSync(path.join(videosDir, `${videoSlug}.mp4`)),
    `Mapped video is missing for ${slug}: ${videoSlug}.mp4`
  );
  assert(
    fs.existsSync(path.join(postersDir, `${videoSlug}.webp`)),
    `Video thumbnail is missing for ${slug}: ${videoSlug}.webp`
  );
}

for (const token of [
  "getExerciseVideoAsset",
  "selectedVideoAsset",
  "<video",
  "autoPlay",
  "muted",
  "loop",
  "playsInline",
  "preload=\"auto\"",
  "setIsFullscreen(true)",
  "posterSrc",
]) {
  assert(exercisePage.includes(token), `Exercise Guide is missing ${token}.`);
}

assert(!exercisePage.includes("poster={"), "Exercise detail must not flash a legacy image before the video loads.");
console.log(`PASS ${videoFiles.length}/29 exercise videos and ${posterFiles.length}/29 video-derived thumbnails are bundled and mapped.`);
