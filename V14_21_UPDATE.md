# FitMate v14.21 — Titan GLB Retargeting

## Primary character replacement

- Replaced the previous generated bodybuilder asset with `titan-physique-rigged-ultra-precision.glb`.
- The new GLB is used by every one of the 29 calibrated exercise presets.
- The old generated GLB and its generator script were removed to prevent accidental rollback.

## Humanoid rig adapter

- Added automatic mapping for the Titan hierarchy: Hips, Spine, arms, forearms, hands, upper legs, lower legs, and feet.
- Captures each joint's bind quaternion and bind direction before the exercise loop starts.
- Retargets FitMate's world-space motion vectors into the Titan skeleton's local joint space every frame.
- Corrects the Titan model's left/right X-axis convention without mirroring the mesh or textures.
- Keeps the model's source clips intact while the 29 exercise motions remain driven by FitMate's calibrated procedural engine.

## Scale and grounding

- Source mesh height: approximately 1.8 units.
- FitMate runtime target height: 4.72469839 units.
- Automatic normalization scale: approximately 2.624833.
- Model center is aligned to the scene and the sole is grounded at the standing root offset.
- Equipment contact now uses mapped joint world positions; upper-back and chest attachments no longer depend on the previous rig's local torso dimensions.

## Reliability

- Added `npm run audit:glb` to validate the binary header, node inventory, skin, joint count, clips, dimensions, and runtime scale.
- Updated motion/UI audits to require the new Titan asset.
- GLB audit result: 70 nodes, 68 skin joints, one skinned mesh, four source clips.
- Motion audit result: 29 calibrated guides and 29,000 sampled poses passed in the 100-cycle verification run.
- Independent retarget simulation across all presets measured a maximum mapped limb-direction deviation of about 0.321 degrees, caused only by intentional non-uniform torso scaling.
