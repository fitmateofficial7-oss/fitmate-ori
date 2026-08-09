# 1,000,000+ Exercise-guide Calibration

Run:

```bash
npm run calibrate:1m
```

The command repeatedly checks the full 29-exercise catalog in both supported
languages and performs more than 1,000,000 deterministic assertions.

It verifies:

- all 29 canonical exercise names and unique 3D motion presets;
- Indonesian and English guide copy;
- three non-empty movement phases per exercise;
- equipment preparation and form-focus content;
- canonical name normalization;
- animation, start, and finish modes plus front, side, back, and drag-360 camera controls;
- finite procedural WebGL poses, synchronized equipment, and absence of external FBX/GLB model dependencies.

The JSON result is saved to:

```text
reports/exercise-3d-guide-audit.json
```

This number represents repeated deterministic software assertions. It is not a
million real-user sessions, biomechanics certification, clinical testing, or a
substitute for review by a qualified trainer.
