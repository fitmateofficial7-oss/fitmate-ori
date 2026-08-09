# FitMate v14.24 — AccuRig Character for All Exercises

## Character

- Replaced the Titan GLB runtime model with the supplied AccuRig FBX character.
- Uses `catwalk-loop-378982.fbx` only as the skinned character/rig source; the catwalk clip is not played in exercise views.
- Resets every skinned mesh to its bind pose before procedural exercise retargeting.
- Maps the full `CC_Base_*` humanoid hierarchy for torso, clavicles, arms, hands, thighs, calves, feet, toes, middle fingers, and thumbs.

## Precision

- Adds clavicle elevation calibration for overhead and pulling movements.
- Uses finger/hand orientation to calculate grip anchors instead of wrist positions alone.
- Adds calibrated finger curling for every exercise that holds a bar, dumbbell, cable, wheel, or machine handle.
- Keeps the previous hand and foot direction calibration.
- Normalizes the character to the FitMate exercise scene height so the existing benches and machines share one physical scale.

## Equipment

- Dumbbell size follows forearm length.
- Barbell size follows shoulder width.
- Pull-up and dip handles align to both calibrated grip anchors.
- Knee, leg, hip, hack-squat, and calf platforms adapt to hip or shoulder width.
- Equipment remains hidden until the FBX is ready; the old model no longer flashes during loading.

## Validation

- Adds `npm run audit:character`.
- Updates motion and UI audits to require the AccuRig FBX integration across all 29 exercise presets.
