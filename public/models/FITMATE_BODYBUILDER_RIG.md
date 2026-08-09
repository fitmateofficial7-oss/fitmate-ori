# FitMate Titan Physique Rig

`Titan_Physique_Rigged_Ultra_Precision(1).glb` has been installed in the app as:

`public/models/titan-physique-rigged-ultra-precision.glb`

This file is now the primary character for every calibrated 3D exercise guide.

## Rig profile

- glTF 2.0 binary skinned character.
- One detailed body mesh with PBR textures.
- One humanoid skin with 68 joints.
- Full torso, head, arm, hand/finger, leg, foot, and toe hierarchy.
- Included source clips: `Idle_Breath`, `Rig_Check_Arms`, `Rig_Check_Legs`, and `Rig_Check_Fingers`.

## Runtime calibration

FitMate does not rely on clip-name matching for exercise execution. The app maps the new humanoid bones to the existing 29 exercise presets and drives them with its procedural movement system. This keeps movement timing and equipment contact consistent across all exercises.

At load time, the adapter:

1. validates the required Titan bones;
2. normalizes the source height from about 1.8 units to the calibrated FitMate height of 4.72469839 units;
3. aligns the character center and places the feet on the floor at the standing root offset;
4. captures each limb's bind direction and quaternion before animation;
5. converts FitMate world-space pose vectors into the Titan skeleton's local joint space;
6. corrects the model's left/right X-axis convention;
7. keeps the skinned mesh active while barbell, dumbbell, cable, bench, and machine equipment follow the mapped hands and feet.

## Validation

Run:

```bash
npm run audit:glb
npm run audit:motion
```

The GLB audit writes `reports/bodybuilder-glb-validation.json`.
