# FitMate Exercise Compatibility Report

## Directly calibrated exercise guides (native)
The project contains 29 calibrated native 3D exercise guides:

- Barbell Bench Press
- Incline Dumbbell Press
- Lat Pulldown
- Seated Cable Row
- Barbell Back Squat
- Leg Press
- Romanian Deadlift
- Bulgarian Split Squat
- Dumbbell Shoulder Press
- Dumbbell Lateral Raise
- Barbell Curl
- Hammer Curl
- Rope Triceps Pushdown
- Cable Crunch
- Machine Chest Press
- Pec Deck Fly
- Assisted Pull-Up
- Hack Squat Machine
- Leg Extension Machine
- Seated Leg Curl Machine
- Hip Thrust Machine
- Standing Calf Raise Machine
- Preacher Curl Machine
- Assisted Dip Machine
- Ab Crunch Machine
- Ab Wheel Rollout
- Alternating Dumbbell Curl
- Treadmill Walk
- Plank

## Alias-resolved / substitution-based exercises
These exercise names are now forced away from the static standing pose and mapped to the closest calibrated motion:

- Barbell Rack Pull -> Romanian Deadlift
- Rack Pull -> Romanian Deadlift
- Barbell Shrug / Shrugs -> Barbell Curl (closest upright bar motion)
- Bear Crawl -> Treadmill Walk
- Bird Dog -> Plank
- Bench Dip -> Assisted Dip Machine
- Burpee -> Barbell Back Squat
- Butt Kicks -> Treadmill Walk
- Cable Front Raise -> Dumbbell Lateral Raise
- Cable Glute Kickback / Donkey Kick -> Bulgarian Split Squat
- Cable Overhead Tricep Extension / Overhead Triceps Extension -> Rope Triceps Pushdown
- Cable Pull Through / Pull Through -> Romanian Deadlift
- Cat Cow Stretch -> Cable Crunch
- Chest Doorway Stretch / Doorway Stretch -> Pec Deck Fly
- Close Grip Push Up / Push Up -> Barbell Bench Press
- Cycling / Stationary Bike / Bike -> Treadmill Walk
- Dead Bug / Bicycle Crunch -> Ab Crunch Machine
- Decline Barbell Bench Press -> Barbell Bench Press
- Decline Dumbbell Press -> Incline Dumbbell Press
- Jumping Jack -> Treadmill Walk
- Mountain Climber -> Plank

## Exercises that should be manually reviewed first
The following substitutions are animated and no longer static, but they are only approximate and should be reviewed visually first if exact 1:1 motion fidelity is required:

- Bear Crawl
- Bird Dog
- Burpee
- Butt Kicks
- Cat Cow Stretch
- Chest Doorway Stretch
- Cycling
- Dead Bug
- Jumping Jack
- Mountain Climber

## Equipment alignment improvements in this release
Per-exercise equipment fine-tuning has been added for:

- Bench Press
- Incline Press
- Lat Pulldown
- Seated Row
- Back Squat
- Leg Press
- Split Squat
- Shoulder Press
- Barbell Curl
- Hammer Curl
- Triceps Pushdown
- Cable Crunch
- Machine Press
- Pec Deck
- Assisted Pull-Up
- Hack Squat
- Leg Extension
- Leg Curl
- Hip Thrust
- Calf Raise
- Preacher Curl
- Assisted Dip
- Ab Crunch
- Ab Wheel Rollout
- Alternating Curl
