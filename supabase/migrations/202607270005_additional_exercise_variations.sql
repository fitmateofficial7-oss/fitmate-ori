-- Add exercise variations that have dedicated, calibrated previews and 3D motion.
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
    'Ab Wheel Rollout',
    'ab-wheel-rollout',
    'Core',
    'Rectus Abdominis',
    array['Transverse Abdominis', 'Obliques', 'Shoulders'],
    'Ab Wheel',
    'hard',
    'Anti-Extension',
    'A kneeling rollout that challenges the core to resist lower-back extension.',
    array[
      'Kneel on a non-slip pad and place the wheel below the shoulders.',
      'Brace the abs and glutes before moving.',
      'Roll forward only as far as the trunk stays controlled.',
      'Pull the wheel back by tightening the core without sitting abruptly.'
    ],
    array[
      'Shorten the range when the lower back begins to arch.',
      'Keep the movement slow and the wheel traveling straight.'
    ],
    true
  ),
  (
    'Alternating Dumbbell Curl',
    'alternating-dumbbell-curl',
    'Arms',
    'Biceps',
    array['Brachialis', 'Forearms'],
    'Dumbbells',
    'easy',
    'Elbow Flexion',
    'A curl variation that alternates sides while the torso remains still.',
    array[
      'Stand tall with one dumbbell in each hand.',
      'Curl one dumbbell while keeping the opposite arm controlled.',
      'Lower the first dumbbell without dropping it.',
      'Repeat on the opposite side without swinging the torso.'
    ],
    array[
      'Keep both elbows close to the ribs.',
      'Use the same controlled tempo on both sides.'
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
