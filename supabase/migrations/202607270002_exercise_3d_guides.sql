begin;

alter table public.exercises
  add column if not exists model_3d_url text,
  add column if not exists model_animation text;

comment on column public.exercises.model_3d_url is
  'Optional public GLB or glTF URL. When empty, FitMate uses its built-in procedural 3D exercise animation.';

comment on column public.exercises.model_animation is
  'Verified animation clip marker in the format fitmate-calibrated:<clip-name>. Unverified custom clips do not replace the calibrated built-in guide.';

commit;
