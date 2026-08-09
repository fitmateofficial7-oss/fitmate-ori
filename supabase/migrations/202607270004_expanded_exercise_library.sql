-- Expand the exercise library with common commercial-gym machines.
create index if not exists coach_messages_daily_usage_idx
  on public.coach_messages (
    user_id,
    mode,
    role,
    created_at desc
  );

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
    'Machine Chest Press',
    'machine-chest-press',
    'Chest',
    'Pectoralis Major',
    array['Triceps', 'Front Deltoids'],
    'Chest Press Machine',
    'easy',
    'Horizontal Push',
    'Latihan dada dengan jalur gerak mesin yang stabil dan ramah untuk pemula.',
    array[
      'Atur kursi hingga handle sejajar dengan bagian tengah dada.',
      'Tempelkan punggung pada bantalan dan pijakkan kedua kaki.',
      'Dorong handle ke depan tanpa mengunci siku secara kasar.',
      'Kembalikan handle perlahan hingga dada terasa meregang nyaman.'
    ],
    array[
      'Jaga bahu tetap turun dan menempel pada bantalan.',
      'Gunakan beban yang memungkinkan sisi kanan dan kiri bergerak seimbang.'
    ],
    true
  ),
  (
    'Pec Deck Fly',
    'pec-deck-fly',
    'Chest',
    'Pectoralis Major',
    array['Front Deltoids'],
    'Pec Deck Machine',
    'easy',
    'Horizontal Adduction',
    'Gerakan fly dengan bantalan lengan untuk melatih kontraksi otot dada.',
    array[
      'Atur kursi hingga siku sejajar dengan dada.',
      'Letakkan lengan pada bantalan dengan punggung tetap menempel.',
      'Satukan bantalan di depan dada secara halus.',
      'Buka kembali secara perlahan tanpa memantulkan beban.'
    ],
    array[
      'Gunakan rentang gerak yang nyaman untuk bahu.',
      'Pertahankan sedikit tekukan pada siku.'
    ],
    true
  ),
  (
    'Assisted Pull-Up',
    'assisted-pull-up',
    'Back',
    'Latissimus Dorsi',
    array['Biceps', 'Rhomboids'],
    'Assisted Pull-Up Machine',
    'easy',
    'Vertical Pull',
    'Pull-up dengan bantuan platform agar gerakan dapat dilakukan secara terkontrol.',
    array[
      'Pilih bantuan yang cukup lalu tempatkan lutut pada platform.',
      'Pegang handle dengan posisi yang nyaman.',
      'Tarik dada ke arah handle dengan menggerakkan siku ke bawah.',
      'Turunkan tubuh perlahan hingga lengan kembali panjang.'
    ],
    array[
      'Semakin besar angka bantuan, semakin ringan gerakannya.',
      'Hindari mengayunkan tubuh.'
    ],
    true
  ),
  (
    'Hack Squat Machine',
    'hack-squat-machine',
    'Legs',
    'Quadriceps',
    array['Glutes', 'Hamstrings'],
    'Hack Squat Machine',
    'medium',
    'Squat',
    'Squat pada sled miring dengan dukungan punggung dan jalur gerak yang tetap.',
    array[
      'Letakkan punggung dan bahu pada bantalan sled.',
      'Posisikan kedua kaki stabil pada platform.',
      'Buka pengaman lalu turunkan tubuh dengan menekuk lutut.',
      'Dorong platform hingga berdiri tanpa mengunci lutut secara kasar.'
    ],
    array[
      'Jaga tumit tetap menempel pada platform.',
      'Pastikan lutut mengikuti arah jari kaki.'
    ],
    true
  ),
  (
    'Leg Extension Machine',
    'leg-extension-machine',
    'Legs',
    'Quadriceps',
    array[]::text[],
    'Leg Extension Machine',
    'easy',
    'Knee Extension',
    'Latihan isolasi quadriceps menggunakan roller pada tulang kering.',
    array[
      'Sejajarkan sendi lutut dengan titik putar mesin.',
      'Tempatkan roller sedikit di atas pergelangan kaki.',
      'Luruskan lutut secara halus hingga quadriceps berkontraksi.',
      'Turunkan roller perlahan ke posisi awal.'
    ],
    array[
      'Jangan menendang atau mengangkat pinggul dari kursi.',
      'Hindari mengunci lutut dengan keras.'
    ],
    true
  ),
  (
    'Seated Leg Curl Machine',
    'seated-leg-curl-machine',
    'Legs',
    'Hamstrings',
    array['Calves'],
    'Seated Leg Curl Machine',
    'easy',
    'Knee Flexion',
    'Latihan isolasi hamstring dengan posisi duduk dan paha yang ditahan bantalan.',
    array[
      'Sejajarkan lutut dengan titik putar mesin.',
      'Kunci bantalan paha dan tempatkan roller di atas tumit.',
      'Tekuk lutut untuk membawa roller ke bawah kursi.',
      'Kembalikan kaki perlahan tanpa menjatuhkan beban.'
    ],
    array[
      'Jaga pinggul tetap menempel pada kursi.',
      'Gunakan tempo perlahan pada fase kembali.'
    ],
    true
  ),
  (
    'Hip Thrust Machine',
    'hip-thrust-machine',
    'Legs',
    'Glutes',
    array['Hamstrings', 'Core'],
    'Hip Thrust Machine',
    'medium',
    'Hip Extension',
    'Latihan glute dengan bantalan beban yang bergerak mengikuti ekstensi pinggul.',
    array[
      'Tempatkan punggung atas pada bantalan dan kaki pada platform.',
      'Atur sabuk atau bantalan tepat di lipatan pinggul.',
      'Dorong melalui tumit hingga pinggul terangkat.',
      'Kencangkan glute di atas lalu turunkan secara terkontrol.'
    ],
    array[
      'Jaga tulang rusuk tidak terangkat berlebihan.',
      'Hindari mendorong dari ujung jari kaki.'
    ],
    true
  ),
  (
    'Standing Calf Raise Machine',
    'standing-calf-raise-machine',
    'Legs',
    'Calves',
    array[]::text[],
    'Standing Calf Raise Machine',
    'easy',
    'Ankle Plantar Flexion',
    'Latihan betis berdiri dengan bantalan bahu dan platform kaki.',
    array[
      'Tempatkan bahu di bawah bantalan dan ujung kaki pada platform.',
      'Turunkan tumit secara perlahan untuk mendapatkan peregangan.',
      'Dorong melalui bola kaki hingga tubuh terangkat.',
      'Berhenti singkat di atas lalu turunkan kembali.'
    ],
    array[
      'Jangan memantulkan tumit.',
      'Pertahankan lutut sedikit rileks.'
    ],
    true
  ),
  (
    'Preacher Curl Machine',
    'preacher-curl-machine',
    'Arms',
    'Biceps',
    array['Brachialis', 'Forearms'],
    'Preacher Curl Machine',
    'easy',
    'Elbow Flexion',
    'Curl dengan lengan atas ditopang bantalan agar biceps bekerja lebih terisolasi.',
    array[
      'Atur kursi hingga ketiak berada tepat di atas bantalan.',
      'Pegang handle dan pertahankan lengan atas menempel.',
      'Tekuk siku untuk membawa handle mendekati bahu.',
      'Turunkan perlahan tanpa melepaskan tegangan.'
    ],
    array[
      'Jangan mengangkat lengan atas dari bantalan.',
      'Hindari memaksa siku terkunci pada posisi bawah.'
    ],
    true
  ),
  (
    'Assisted Dip Machine',
    'assisted-dip-machine',
    'Arms',
    'Triceps',
    array['Chest', 'Front Deltoids'],
    'Assisted Dip Machine',
    'easy',
    'Vertical Push',
    'Dip dengan bantuan platform untuk melatih triceps dan dada secara aman.',
    array[
      'Pilih bantuan yang sesuai lalu tempatkan lutut pada platform.',
      'Pegang handle dan stabilkan bahu.',
      'Turunkan tubuh dengan menekuk siku dalam rentang nyaman.',
      'Dorong handle hingga tubuh kembali naik.'
    ],
    array[
      'Jaga bahu menjauh dari telinga.',
      'Gunakan bantuan lebih besar bila tubuh sulit dikontrol.'
    ],
    true
  ),
  (
    'Ab Crunch Machine',
    'ab-crunch-machine',
    'Core',
    'Rectus Abdominis',
    array['Obliques'],
    'Ab Crunch Machine',
    'easy',
    'Spinal Flexion',
    'Crunch duduk dengan resistensi mesin untuk melatih otot perut.',
    array[
      'Atur kursi dan bantalan dada sesuai tinggi tubuh.',
      'Kunci kaki dan pegang handle secara ringan.',
      'Dekatkan tulang rusuk ke panggul dengan mengencangkan perut.',
      'Kembali perlahan tanpa membiarkan beban terbanting.'
    ],
    array[
      'Jangan menarik handle hanya dengan lengan.',
      'Gunakan gerakan pendek dan terkontrol dari batang tubuh.'
    ],
    true
  ),
  (
    'Treadmill Walk',
    'treadmill-walk',
    'Cardio',
    'Cardiovascular System',
    array['Quadriceps', 'Hamstrings', 'Calves'],
    'Treadmill',
    'easy',
    'Walking',
    'Latihan kardio berjalan dengan kecepatan dan kemiringan yang dapat disesuaikan.',
    array[
      'Berdiri di sisi belt dan pasang klip pengaman.',
      'Mulai pada kecepatan rendah sebelum melangkah ke belt.',
      'Berjalan tegak di bagian tengah treadmill.',
      'Turunkan kecepatan bertahap sebelum berhenti.'
    ],
    array[
      'Gunakan pegangan hanya bila membutuhkan keseimbangan.',
      'Tingkatkan kecepatan atau incline secara bertahap.'
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
