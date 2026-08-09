insert into public.exercises (
  name,
  slug,
  category,
  target_muscle,
  secondary_muscles,
  equipment,
  difficulty,
  movement_pattern,
  description,
  instructions,
  tips,
  is_active
)
values
  (
    'Barbell Bench Press',
    'barbell-bench-press',
    'Chest',
    'Pectoralis Major',
    array['Triceps', 'Front Deltoids'],
    'Barbell and Bench',
    'medium',
    'Horizontal Push',
    'A compound upper-body press for chest, triceps, and anterior shoulder strength.',
    array[
      'Lie on the bench with your eyes under the bar and feet planted firmly.',
      'Grip the bar slightly wider than shoulder width and brace your upper back.',
      'Lower the bar with control toward the lower chest.',
      'Press the bar upward while keeping your shoulders stable.'
    ],
    array[
      'Keep your wrists stacked over your forearms.',
      'Use a spotter or safety arms for challenging sets.'
    ],
    true
  ),
  (
    'Incline Dumbbell Press',
    'incline-dumbbell-press',
    'Chest',
    'Upper Chest',
    array['Triceps', 'Front Deltoids'],
    'Dumbbells and Incline Bench',
    'medium',
    'Incline Push',
    'A pressing movement that emphasizes the upper chest while training the shoulders and triceps.',
    array[
      'Set the bench to a low-to-moderate incline.',
      'Hold the dumbbells beside your upper chest with stable wrists.',
      'Press upward without letting the shoulders shrug.',
      'Lower slowly until the elbows are just below the torso.'
    ],
    array[
      'Avoid using an excessively steep bench angle.',
      'Keep both dumbbells moving evenly.'
    ],
    true
  ),
  (
    'Lat Pulldown',
    'lat-pulldown',
    'Back',
    'Latissimus Dorsi',
    array['Biceps', 'Rhomboids'],
    'Cable Machine',
    'easy',
    'Vertical Pull',
    'A vertical pulling exercise for developing the lats and improving upper-body pulling strength.',
    array[
      'Sit securely with your thighs under the pads.',
      'Grip the bar and keep your chest tall.',
      'Pull the bar toward the upper chest by driving the elbows down.',
      'Return to the top with control and a full stretch.'
    ],
    array[
      'Do not pull the bar behind your neck.',
      'Avoid using momentum from the torso.'
    ],
    true
  ),
  (
    'Seated Cable Row',
    'seated-cable-row',
    'Back',
    'Middle Back',
    array['Latissimus Dorsi', 'Biceps', 'Rear Deltoids'],
    'Cable Machine',
    'easy',
    'Horizontal Pull',
    'A controlled rowing exercise for the middle back, lats, and elbow flexors.',
    array[
      'Sit tall with a neutral spine and slightly bent knees.',
      'Pull the handle toward your torso while keeping the elbows close.',
      'Squeeze the shoulder blades without shrugging.',
      'Extend the arms slowly without rounding the lower back.'
    ],
    array[
      'Keep the torso mostly still.',
      'Lead the movement with your elbows.'
    ],
    true
  ),
  (
    'Barbell Back Squat',
    'barbell-back-squat',
    'Legs',
    'Quadriceps',
    array['Glutes', 'Hamstrings', 'Core'],
    'Barbell and Rack',
    'hard',
    'Squat',
    'A compound lower-body exercise that develops leg strength and whole-body stability.',
    array[
      'Position the bar securely on the upper back and brace your trunk.',
      'Unrack the bar and establish a stable stance.',
      'Descend by bending the hips and knees while keeping the feet planted.',
      'Drive through the floor to return to standing.'
    ],
    array[
      'Use safety arms at an appropriate height.',
      'Choose a depth you can control with a neutral spine.'
    ],
    true
  ),
  (
    'Leg Press',
    'leg-press',
    'Legs',
    'Quadriceps',
    array['Glutes', 'Hamstrings'],
    'Leg Press Machine',
    'easy',
    'Squat',
    'A machine-based compound exercise for training the quadriceps and glutes.',
    array[
      'Place your feet securely on the platform.',
      'Release the safety and lower the platform under control.',
      'Stop before the lower back rounds away from the pad.',
      'Press the platform away without locking the knees aggressively.'
    ],
    array[
      'Keep your hips and lower back against the pad.',
      'Use a controlled range of motion.'
    ],
    true
  ),
  (
    'Romanian Deadlift',
    'romanian-deadlift',
    'Legs',
    'Hamstrings',
    array['Glutes', 'Spinal Erectors'],
    'Barbell',
    'medium',
    'Hip Hinge',
    'A hip-hinge exercise that develops the hamstrings, glutes, and posterior-chain strength.',
    array[
      'Stand tall with the bar close to your thighs.',
      'Push the hips backward while keeping a slight bend in the knees.',
      'Lower until you feel a strong hamstring stretch without rounding the back.',
      'Drive the hips forward to return to standing.'
    ],
    array[
      'Keep the bar close to the legs.',
      'The movement comes from the hips, not a deep knee bend.'
    ],
    true
  ),
  (
    'Bulgarian Split Squat',
    'bulgarian-split-squat',
    'Legs',
    'Quadriceps',
    array['Glutes', 'Hamstrings'],
    'Dumbbells and Bench',
    'hard',
    'Lunge',
    'A single-leg squat variation for leg strength, balance, and side-to-side control.',
    array[
      'Place the rear foot on a bench and establish a stable front-foot position.',
      'Lower the rear knee toward the floor while keeping the front foot planted.',
      'Maintain control through the bottom position.',
      'Drive through the front leg to stand.'
    ],
    array[
      'Start with body weight until balance is reliable.',
      'Adjust the stance so the front heel stays down.'
    ],
    true
  ),
  (
    'Dumbbell Shoulder Press',
    'dumbbell-shoulder-press',
    'Shoulders',
    'Deltoids',
    array['Triceps'],
    'Dumbbells',
    'medium',
    'Vertical Push',
    'An overhead press for shoulder and triceps strength.',
    array[
      'Hold the dumbbells at shoulder height with a braced trunk.',
      'Press overhead without excessively arching the lower back.',
      'Finish with the arms controlled above the shoulders.',
      'Lower the dumbbells slowly to the starting position.'
    ],
    array[
      'Keep the ribs down and avoid shrugging.',
      'Use a seated bench if additional torso support is needed.'
    ],
    true
  ),
  (
    'Dumbbell Lateral Raise',
    'dumbbell-lateral-raise',
    'Shoulders',
    'Lateral Deltoids',
    array['Upper Traps'],
    'Dumbbells',
    'easy',
    'Shoulder Abduction',
    'An isolation exercise that emphasizes the side deltoids.',
    array[
      'Stand tall with light dumbbells beside your body.',
      'Raise the arms outward with a slight elbow bend.',
      'Stop near shoulder height without shrugging.',
      'Lower the weights slowly.'
    ],
    array[
      'Use light weights and controlled repetitions.',
      'Lead with the elbows rather than the hands.'
    ],
    true
  ),
  (
    'Barbell Curl',
    'barbell-curl',
    'Arms',
    'Biceps',
    array['Brachialis', 'Forearms'],
    'Barbell',
    'easy',
    'Elbow Flexion',
    'A bilateral curl for biceps and elbow-flexor strength.',
    array[
      'Stand tall with the bar held at arm length.',
      'Keep the elbows close to your sides.',
      'Curl the bar without swinging the torso.',
      'Lower the bar to full elbow extension with control.'
    ],
    array[
      'Use a weight that allows a still torso.',
      'Do not let the elbows drift far forward.'
    ],
    true
  ),
  (
    'Hammer Curl',
    'hammer-curl',
    'Arms',
    'Brachialis',
    array['Biceps', 'Forearms'],
    'Dumbbells',
    'easy',
    'Elbow Flexion',
    'A neutral-grip curl for the brachialis, biceps, and forearms.',
    array[
      'Hold the dumbbells with palms facing each other.',
      'Curl while keeping the elbows near the torso.',
      'Pause briefly near the top.',
      'Lower under control.'
    ],
    array[
      'Keep the wrists neutral.',
      'Avoid swinging the dumbbells.'
    ],
    true
  ),
  (
    'Rope Triceps Pushdown',
    'rope-triceps-pushdown',
    'Arms',
    'Triceps',
    array[]::text[],
    'Cable Machine',
    'easy',
    'Elbow Extension',
    'A cable isolation movement for the triceps.',
    array[
      'Stand with the elbows pinned near your sides.',
      'Extend the elbows and move the rope downward.',
      'Separate the rope ends slightly at the bottom.',
      'Return slowly without letting the shoulders roll forward.'
    ],
    array[
      'Keep the upper arms still.',
      'Use a full but comfortable elbow range.'
    ],
    true
  ),
  (
    'Cable Crunch',
    'cable-crunch',
    'Core',
    'Rectus Abdominis',
    array['Obliques'],
    'Cable Machine',
    'medium',
    'Spinal Flexion',
    'A loaded abdominal exercise using a cable for consistent resistance.',
    array[
      'Kneel below a high cable while holding the rope near your head.',
      'Brace the hips and curl the rib cage toward the pelvis.',
      'Pause in the contracted position.',
      'Return slowly without turning the movement into a hip hinge.'
    ],
    array[
      'Move through the trunk rather than pulling with the arms.',
      'Use controlled resistance.'
    ],
    true
  ),
  (
    'Plank',
    'plank',
    'Core',
    'Core',
    array['Glutes', 'Shoulders'],
    'Body Weight',
    'easy',
    'Anti-Extension',
    'An isometric core exercise for trunk stability.',
    array[
      'Place the forearms on the floor with elbows under the shoulders.',
      'Extend the legs and form a straight line from head to heels.',
      'Brace the abdomen and squeeze the glutes.',
      'Hold while breathing steadily.'
    ],
    array[
      'Stop the set when the hips begin to sag.',
      'Keep the neck in a neutral position.'
    ],
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  target_muscle = excluded.target_muscle,
  secondary_muscles = excluded.secondary_muscles,
  equipment = excluded.equipment,
  difficulty = excluded.difficulty,
  movement_pattern = excluded.movement_pattern,
  description = excluded.description,
  instructions = excluded.instructions,
  tips = excluded.tips,
  is_active = excluded.is_active,
  updated_at = now();
