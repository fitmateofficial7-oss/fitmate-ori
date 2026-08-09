# FitMate AI v14.22 — Embedded GLB Texture Fix

## Fixed

- Added `blob:` to the Content Security Policy `connect-src` directive.
- This allows Three.js `ImageBitmapLoader`/`fetch()` to read the temporary object URLs created by `GLTFLoader` for PNG textures embedded inside the Titan GLB.
- The Titan GLB contains four embedded textures. React development mode may mount the 3D component twice, which previously produced eight identical texture errors (`4 textures × 2 development mounts`).
- Existing `img-src blob:` support is retained for browsers that decode through image elements.

## Result

The embedded base-color, normal, metallic-roughness, and emissive textures can load without CSP rejection while preserving the existing security policy for remote connections.
