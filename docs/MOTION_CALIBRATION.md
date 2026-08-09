# FitMate 3D Motion Calibration

## Coverage

- 29 exercise presets are mapped directly to the FitMate exercise library, plus an animated `standing` fallback for unmatched names.
- Every preset is sampled at 1,000 unique points across one complete motion cycle.
- The audit checks joint continuity, limb length, planted-foot drift, equipment contact, endpoint movement, visible pauses, and semantic direction.
- External 3D clips that do not contain enough visible joint rotation automatically fall back to FitMate's procedural calibrated motion.

## Breathing cues

- Exhale during the effort phase.
- Inhale during the easier or return phase.
- Planks use a continuous normal-breathing cue.
- Treadmill walking uses a steady rhythmic-breathing cue.

## Reference libraries

Movement names and joint-action patterns were reviewed against:

- ACE Exercise Library: https://www.acefitness.org/resources/everyone/exercise-library/
- NASM Exercise Library: https://www.nasm.org/exercise-library
- ACSM free-weight guidance: https://www.acsm.org/docs/default-source/files-for-resource-library/performing-free-weight-exercises.pdf

## Latest motion and pre-launch audits

See `reports/motion-calibration-1000.json` and `reports/prelaunch-calibration-1000000.json`.

Key result:

- Status: PASS
- Calibration cycles: 1,000
- Unique sampled phases per preset: 1,000
- Total sampled poses: 29,000
- Maximum visible endpoint pause: 200 ms
- Fixed-foot drift: 0 m
- Equipment-contact drift: 0 m
