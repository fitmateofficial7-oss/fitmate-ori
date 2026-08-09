const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const config = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
const modelPath = path.join(
  root,
  "public/models/titan-physique-rigged-ultra-precision.glb"
);

if (!fs.existsSync(modelPath)) {
  throw new Error("Titan GLB is missing.");
}

if (!/img-src[^\n]*\bblob:/.test(config)) {
  throw new Error("CSP img-src must allow blob: for embedded GLB textures.");
}

if (!/connect-src[^\n]*\bblob:/.test(config)) {
  throw new Error(
    "CSP connect-src must allow blob: because Three.js ImageBitmapLoader uses fetch()."
  );
}

const model = fs.readFileSync(modelPath);
if (model.readUInt32LE(0) !== 0x46546c67) {
  throw new Error("Titan model is not a valid GLB container.");
}

const jsonLength = model.readUInt32LE(12);
const jsonType = model.readUInt32LE(16);
if (jsonType !== 0x4e4f534a) {
  throw new Error("GLB JSON chunk is missing.");
}

const jsonText = model
  .subarray(20, 20 + jsonLength)
  .toString("utf8")
  .replace(/[\u0000\u0020]+$/g, "");
const gltf = JSON.parse(jsonText);
const images = gltf.images ?? [];

if (images.length !== 4) {
  throw new Error(`Expected 4 embedded textures, found ${images.length}.`);
}

for (const [index, image] of images.entries()) {
  if (!Number.isInteger(image.bufferView)) {
    throw new Error(`Texture ${index} is not embedded through a bufferView.`);
  }
  if (image.mimeType !== "image/png") {
    throw new Error(`Texture ${index} has unexpected MIME type ${image.mimeType}.`);
  }
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      embeddedTextures: images.length,
      mimeTypes: [...new Set(images.map((image) => image.mimeType))],
      csp: {
        imageBlobAllowed: true,
        fetchBlobAllowed: true,
      },
    },
    null,
    2
  )
);
