# FitMate AccuRig Character

Primary exercise character:

`public/models/fitmate-accurig/fitmate-accurig.fbx`

The character uses the Reallusion AccuRig `CC_Base_*` humanoid hierarchy. At runtime FitMate resets the skeleton to its bind pose, normalizes character height, maps the major upper/lower body joints, calibrates clavicles, hands, feet, and retargets all 29 procedural exercise presets.

Textures are resolved from the same model directory:

- `Material_001_Diffuse.jpg`
- `Material_001_Normal.jpg`

Validation:

```bash
npm run audit:character
npm run audit:motion
```
