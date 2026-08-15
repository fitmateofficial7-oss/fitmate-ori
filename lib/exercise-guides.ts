export type ExerciseGuidePreset =
  | "bench-press"
  | "incline-press"
  | "lat-pulldown"
  | "seated-row"
  | "back-squat"
  | "leg-press"
  | "romanian-deadlift"
  | "split-squat"
  | "shoulder-press"
  | "lateral-raise"
  | "barbell-curl"
  | "hammer-curl"
  | "triceps-pushdown"
  | "cable-crunch"
  | "machine-press"
  | "pec-deck"
  | "assisted-pull-up"
  | "hack-squat"
  | "leg-extension"
  | "leg-curl"
  | "hip-thrust"
  | "calf-raise"
  | "preacher-curl"
  | "assisted-dip"
  | "ab-crunch"
  | "ab-wheel-rollout"
  | "alternating-curl"
  | "treadmill-walk"
  | "plank"
  | "standing";

// Backward-compatible alias for newer/legacy 2D exercise components.
// Keep ExerciseGuidePreset as the canonical preset type.
export type Exercise2DPreset = ExerciseGuidePreset;

export type ExerciseGuide = {
  slug: string;
  preset: ExerciseGuidePreset;
  motionLabel: string;
  phases: [string, string, string];
  equipmentSetup: string[];
  formFocus: string;
};

type ExerciseGuideCopy = Pick<
  ExerciseGuide,
  "motionLabel" | "phases" | "equipmentSetup" | "formFocus"
>;

const GUIDES: Record<string, ExerciseGuide> = {
  "barbell-bench-press": {
    slug: "barbell-bench-press",
    preset: "bench-press",
    motionLabel: "Turunkan bar ke dada bawah, lalu dorong lurus ke atas",
    phases: ["Posisi stabil", "Turunkan perlahan", "Dorong ke atas"],
    equipmentSetup: [
      "Letakkan bench di dalam rack dengan bar sedikit di atas mata.",
      "Atur kait agar siku masih sedikit menekuk saat bar diangkat.",
      "Gunakan safety arm atau pendamping untuk beban berat.",
    ],
    formFocus: "Jaga kepala, bahu, bokong, dan kedua kaki tetap menempel.",
  },
  "incline-dumbbell-press": {
    slug: "incline-dumbbell-press",
    preset: "incline-press",
    motionLabel: "Dorong dumbbell ke atas dan sedikit ke dalam",
    phases: ["Atur bench", "Turunkan perlahan", "Dorong seimbang"],
    equipmentSetup: [
      "Atur kemiringan bench sekitar 30–45 derajat.",
      "Letakkan dumbbell di paha sebelum bersandar.",
      "Pastikan bench stabil dan siku punya ruang untuk turun.",
    ],
    formFocus: "Jaga bahu tetap turun dan jangan mendorong terlalu tegak.",
  },
  "lat-pulldown": {
    slug: "lat-pulldown",
    preset: "lat-pulldown",
    motionLabel: "Tarik siku ke bawah hingga bar mendekati dada atas",
    phases: ["Kunci paha", "Tarik ke dada", "Kembali perlahan"],
    equipmentSetup: [
      "Atur bantalan paha agar tubuh tidak ikut terangkat.",
      "Pilih beban lalu genggam bar sedikit lebih lebar dari bahu.",
      "Posisikan kursi agar kabel tepat di atas tubuh.",
    ],
    formFocus: "Tarik di depan tubuh, jaga badan tegak, dan jangan mengayun.",
  },
  "seated-cable-row": {
    slug: "seated-cable-row",
    preset: "seated-row",
    motionLabel: "Tarik pegangan ke rusuk bawah, lalu luruskan kembali",
    phases: ["Punggung netral", "Tarik siku", "Luruskan perlahan"],
    equipmentSetup: [
      "Pasang pegangan row dan pilih beban yang mudah dikontrol.",
      "Letakkan kedua kaki kuat di platform dengan lutut rileks.",
      "Duduk cukup jauh agar kabel tetap tegang saat lengan lurus.",
    ],
    formFocus: "Jaga badan tetap stabil dan rapatkan tulang belikat di akhir tarikan.",
  },
  "barbell-back-squat": {
    slug: "barbell-back-squat",
    preset: "back-squat",
    motionLabel: "Turunkan pinggul seperti duduk, lalu berdiri kembali",
    phases: ["Kunci badan", "Turun terkontrol", "Berdiri tegak"],
    equipmentSetup: [
      "Atur J-hook sedikit di bawah tinggi bahu.",
      "Letakkan safety arm sedikit di bawah titik squat terendah.",
      "Seimbangkan bar dan kunci plate dengan collar.",
    ],
    formFocus: "Jaga seluruh telapak menapak dan arahkan lutut mengikuti jari kaki.",
  },
  "leg-press": {
    slug: "leg-press",
    preset: "leg-press",
    motionLabel: "Dekatkan platform ke tubuh, lalu dorong dengan kaki",
    phases: ["Atur kaki", "Tekuk lutut", "Dorong platform"],
    equipmentSetup: [
      "Atur kursi agar pinggul dan punggung bawah menempel pada bantalan.",
      "Letakkan kedua kaki seimbang sebelum melepas pengaman.",
      "Pastikan kedua pengaman berfungsi sebelum menambah beban.",
    ],
    formFocus: "Berhenti turun sebelum panggul terangkat dari bantalan.",
  },
  "romanian-deadlift": {
    slug: "romanian-deadlift",
    preset: "romanian-deadlift",
    motionLabel: "Dorong pinggul ke belakang sambil menjaga bar dekat kaki",
    phases: ["Berdiri stabil", "Tekuk dari pinggul", "Dorong pinggul"],
    equipmentSetup: [
      "Pasang beban seimbang dan kunci kedua sisi dengan collar.",
      "Mulai dari rack atau angkat bar dengan aman ke posisi berdiri.",
      "Kosongkan area agar bar bisa bergerak dekat dengan kaki.",
    ],
    formFocus: "Jaga punggung netral dan berhenti saat paha belakang terasa tertarik.",
  },
  "bulgarian-split-squat": {
    slug: "bulgarian-split-squat",
    preset: "split-squat",
    motionLabel: "Turunkan lutut belakang, lalu dorong dengan kaki depan",
    phases: ["Posisi seimbang", "Turun lurus", "Dorong kaki depan"],
    equipmentSetup: [
      "Gunakan bench stabil setinggi lutut atau sedikit lebih rendah.",
      "Majukan kaki depan hingga tumit bisa tetap menapak.",
      "Ambil dumbbell setelah posisi tanpa beban sudah seimbang.",
    ],
    formFocus: "Dorong terutama dengan kaki depan, bukan kaki belakang.",
  },
  "dumbbell-shoulder-press": {
    slug: "dumbbell-shoulder-press",
    preset: "shoulder-press",
    motionLabel: "Dorong dumbbell ke atas tanpa melengkungkan punggung",
    phases: ["Dumbbell di bahu", "Dorong ke atas", "Turunkan seimbang"],
    equipmentSetup: [
      "Pilih dumbbell dengan berat sama dan kosongkan ruang di atas.",
      "Untuk posisi duduk, atur sandaran hampir tegak.",
      "Bantu angkat dumbbell ke bahu menggunakan paha.",
    ],
    formFocus: "Jaga rusuk tidak terangkat dan akhiri beban tepat di atas bahu.",
  },
  "dumbbell-lateral-raise": {
    slug: "dumbbell-lateral-raise",
    preset: "lateral-raise",
    motionLabel: "Angkat lengan ke samping setinggi bahu, lalu turunkan",
    phases: ["Beban siap", "Angkat ke samping", "Turunkan perlahan"],
    equipmentSetup: [
      "Pilih dumbbell ringan yang bisa dikontrol tanpa mengayun.",
      "Sisakan ruang cukup di kedua sisi tubuh.",
      "Mulai dengan dumbbell di samping paha dan pergelangan netral.",
    ],
    formFocus: "Pimpin gerakan dengan siku dan berhenti setinggi bahu.",
  },
  "barbell-curl": {
    slug: "barbell-curl",
    preset: "barbell-curl",
    motionLabel: "Tekuk siku membawa bar ke dada tanpa mengayun",
    phases: ["Berdiri tegak", "Tekuk siku", "Turunkan perlahan"],
    equipmentSetup: [
      "Pasang beban seimbang di kedua sisi dan gunakan collar.",
      "Genggam selebar bahu dengan telapak ke atas dan pergelangan lurus.",
      "Kosongkan ruang di depan tubuh untuk jalur bar.",
    ],
    formFocus: "Jaga siku dekat rusuk dan jangan menyandarkan tubuh ke belakang.",
  },
  "hammer-curl": {
    slug: "hammer-curl",
    preset: "hammer-curl",
    motionLabel: "Tekuk siku dengan telapak saling menghadap",
    phases: ["Genggaman netral", "Tekuk siku", "Luruskan perlahan"],
    equipmentSetup: [
      "Pilih dumbbell yang bisa diangkat tanpa mengayunkan badan.",
      "Pegang dumbbell dengan kedua telapak saling menghadap.",
      "Berdiri tegak dengan lengan bebas dan pergelangan lurus.",
    ],
    formFocus: "Jaga pergelangan netral dan lengan atas dekat dengan tubuh.",
  },
  "rope-triceps-pushdown": {
    slug: "rope-triceps-pushdown",
    preset: "triceps-pushdown",
    motionLabel: "Dorong rope ke bawah lalu pisahkan ujungnya",
    phases: ["Posisi stabil", "Dorong ke bawah", "Kembali perlahan"],
    equipmentSetup: [
      "Pasang rope pada pulley atas dan pastikan pin terkunci.",
      "Berdiri cukup dekat agar kabel hampir tegak.",
      "Mulai dengan siku menekuk dan tetap dekat rusuk.",
    ],
    formFocus: "Gerakkan hanya lengan bawah; bahu dan lengan atas tetap diam.",
  },
  "cable-crunch": {
    slug: "cable-crunch",
    preset: "cable-crunch",
    motionLabel: "Dekatkan tulang rusuk ke panggul melawan tarikan kabel",
    phases: ["Berlutut stabil", "Tekuk tubuh", "Kembali perlahan"],
    equipmentSetup: [
      "Pasang rope pada pulley atas dan letakkan alas untuk lutut.",
      "Berlutut cukup jauh agar kabel selalu tegang.",
      "Tahan rope di sisi kepala tanpa menariknya dengan lengan.",
    ],
    formFocus: "Tekuk bagian perut, bukan hanya mendorong pinggul ke belakang.",
  },
  "machine-chest-press": {
    slug: "machine-chest-press",
    preset: "machine-press",
    motionLabel: "Dorong pegangan ke depan, lalu kembali perlahan",
    phases: ["Atur kursi", "Dorong ke depan", "Kembali terkontrol"],
    equipmentSetup: [
      "Atur kursi agar pegangan sejajar dengan tengah dada.",
      "Pilih beban yang mudah dikontrol dan jaga kaki menapak.",
      "Atur posisi awal agar siku tidak terlalu jauh ke belakang.",
    ],
    formFocus: "Jaga punggung menempel dan jangan mengunci siku terlalu keras.",
  },
  "pec-deck-fly": {
    slug: "pec-deck-fly",
    preset: "pec-deck",
    motionLabel: "Rapatkan kedua bantalan lengan, lalu buka perlahan",
    phases: ["Atur kursi", "Rapatkan lengan", "Buka perlahan"],
    equipmentSetup: [
      "Atur kursi hingga siku atau lengan bawah sejajar dengan dada.",
      "Pilih posisi awal yang meregangkan dada tanpa menekan bahu.",
      "Jaga punggung dan kepala tetap menempel pada bantalan.",
    ],
    formFocus: "Jaga siku sedikit menekuk dan hindari gerakan memantul.",
  },
  "assisted-pull-up": {
    slug: "assisted-pull-up",
    preset: "assisted-pull-up",
    motionLabel: "Tarik tubuh ke atas sambil mendorong siku ke bawah",
    phases: ["Lutut di bantalan", "Tarik tubuh", "Turun perlahan"],
    equipmentSetup: [
      "Pilih bantuan yang cukup agar repetisi tetap terkontrol.",
      "Letakkan kedua lutut kuat di bantalan sebelum melepas berat badan.",
      "Gunakan genggaman nyaman dan kosongkan area di bawah pegangan.",
    ],
    formFocus: "Jangan mengayun; mulai tarikan dengan mendorong siku ke arah rusuk.",
  },
  "hack-squat-machine": {
    slug: "hack-squat-machine",
    preset: "hack-squat",
    motionLabel: "Turunkan sled dengan punggung menempel, lalu dorong naik",
    phases: ["Punggung menempel", "Turun terkontrol", "Dorong ke atas"],
    equipmentSetup: [
      "Letakkan bahu di bawah bantalan dan punggung menempel pada sled.",
      "Posisikan kaki seimbang dan periksa safety stop.",
      "Pilih posisi kaki yang membuat tumit tetap menapak.",
    ],
    formFocus: "Arahkan lutut mengikuti jari kaki dan jaga panggul tetap menempel.",
  },
  "leg-extension-machine": {
    slug: "leg-extension-machine",
    preset: "leg-extension",
    motionLabel: "Luruskan lutut melawan roller, lalu turunkan perlahan",
    phases: ["Sejajarkan lutut", "Luruskan kaki", "Turunkan perlahan"],
    equipmentSetup: [
      "Sejajarkan poros mesin dengan sendi lutut.",
      "Letakkan roller di atas pergelangan kaki dan atur sandaran.",
      "Pilih beban yang tidak membuat kaki menendang atau pinggul terangkat.",
    ],
    formFocus: "Jaga pinggul menempel dan luruskan lutut dengan terkontrol.",
  },
  "seated-leg-curl-machine": {
    slug: "seated-leg-curl-machine",
    preset: "leg-curl",
    motionLabel: "Tekuk lutut membawa roller ke bawah kursi",
    phases: ["Lutut sejajar", "Tekuk kaki", "Luruskan perlahan"],
    equipmentSetup: [
      "Sejajarkan poros mesin dengan lutut dan kunci bantalan paha.",
      "Letakkan roller sedikit di atas tumit.",
      "Atur sandaran agar pinggul tetap tertahan kuat.",
    ],
    formFocus: "Jaga paha tetap tertahan dan jangan melengkungkan punggung bawah.",
  },
  "hip-thrust-machine": {
    slug: "hip-thrust-machine",
    preset: "hip-thrust",
    motionLabel: "Dorong pinggul ke atas, tahan, lalu turunkan",
    phases: ["Pad di pinggul", "Dorong dari tumit", "Kunci pinggul"],
    equipmentSetup: [
      "Tempelkan punggung atas dengan kuat pada bantalan.",
      "Letakkan belt atau bantalan di lipatan pinggul, bukan perut.",
      "Atur kaki agar tulang kering hampir tegak saat di atas.",
    ],
    formFocus: "Kencangkan bokong di atas sambil menjaga rusuk dan punggung netral.",
  },
  "standing-calf-raise-machine": {
    slug: "standing-calf-raise-machine",
    preset: "calf-raise",
    motionLabel: "Angkat tumit setinggi mungkin, lalu turunkan perlahan",
    phases: ["Bahu di bantalan", "Angkat tumit", "Turunkan tumit"],
    equipmentSetup: [
      "Atur bantalan bahu agar lutut tetap sedikit rileks.",
      "Letakkan bagian depan telapak kaki kuat di platform.",
      "Pastikan safety stop mudah dijangkau.",
    ],
    formFocus: "Gerakkan pergelangan kaki tanpa memantul atau menekuk lutut.",
  },
  "preacher-curl-machine": {
    slug: "preacher-curl-machine",
    preset: "preacher-curl",
    motionLabel: "Tekuk siku sambil menjaga lengan atas di bantalan",
    phases: ["Atur kursi", "Tekuk siku", "Turunkan perlahan"],
    equipmentSetup: [
      "Atur kursi agar ketiak berada sedikit di atas bantalan.",
      "Jaga lengan atas menempel dan gunakan genggaman nyaman.",
      "Pilih beban yang memungkinkan siku lurus tanpa membanting beban.",
    ],
    formFocus: "Jaga lengan atas di bantalan dan jangan memaksa siku terkunci.",
  },
  "assisted-dip-machine": {
    slug: "assisted-dip-machine",
    preset: "assisted-dip",
    motionLabel: "Dorong tubuh ke atas di antara pegangan, lalu turun",
    phases: ["Lutut di bantalan", "Dorong tubuh", "Turun terkontrol"],
    equipmentSetup: [
      "Pilih bantuan yang cukup agar bahu tetap stabil.",
      "Letakkan lutut kuat di platform dan genggam kedua handle seimbang.",
      "Pastikan jalur platform bebas sebelum menumpukan berat badan.",
    ],
    formFocus: "Jauhkan bahu dari telinga dan turun hanya sejauh yang nyaman.",
  },
  "ab-crunch-machine": {
    slug: "ab-crunch-machine",
    preset: "ab-crunch",
    motionLabel: "Tekuk tubuh mendekatkan rusuk ke panggul",
    phases: ["Duduk stabil", "Tekuk tubuh", "Kembali perlahan"],
    equipmentSetup: [
      "Atur kursi dan bantalan dada agar poros mesin sesuai dengan tubuh.",
      "Kunci kaki dan pilih beban sedang.",
      "Pegang handle dengan ringan tanpa menarik menggunakan lengan.",
    ],
    formFocus: "Dekatkan rusuk ke panggul, bukan hanya menekuk di pinggul.",
  },
  "ab-wheel-rollout": {
    slug: "ab-wheel-rollout",
    preset: "ab-wheel-rollout",
    motionLabel:
      "Dorong roda ke depan sambil menjaga badan kencang, lalu tarik kembali",
    phases: ["Berlutut stabil", "Roll ke depan", "Tarik dengan core"],
    equipmentSetup: [
      "Gunakan alas lutut yang tidak licin dan periksa roda berputar mulus.",
      "Pegang handle roda dengan kedua tangan tepat di bawah bahu.",
      "Sisakan ruang lurus di depan agar roda tidak membentur benda lain.",
    ],
    formFocus:
      "Kencangkan perut dan glute; hentikan rollout sebelum punggung bawah melengkung.",
  },
  "alternating-dumbbell-curl": {
    slug: "alternating-dumbbell-curl",
    preset: "alternating-curl",
    motionLabel:
      "Tekuk satu siku bergantian sambil lengan satunya tetap terkontrol",
    phases: ["Dumbbell di sisi", "Curl satu lengan", "Ganti sisi"],
    equipmentSetup: [
      "Pilih sepasang dumbbell dengan berat sama.",
      "Berdiri tegak dengan telapak menghadap ke depan atau sedikit ke dalam.",
      "Pastikan kedua sisi tubuh memiliki ruang untuk bergerak.",
    ],
    formFocus:
      "Jaga siku dekat rusuk dan jangan mengayunkan badan saat berganti sisi.",
  },
  "treadmill-walk": {
    slug: "treadmill-walk",
    preset: "treadmill-walk",
    motionLabel: "Berjalan alami di bagian tengah belt",
    phases: ["Atur kecepatan", "Langkah alami", "Turunkan kecepatan"],
    equipmentSetup: [
      "Berdiri di rel samping sebelum menyalakan belt dengan kecepatan rendah.",
      "Pasang safety clip dan naikkan kecepatan secara bertahap.",
      "Pastikan tombol berhenti darurat mudah dijangkau.",
    ],
    formFocus: "Berjalan tegak dan alami; pegang rel hanya bila perlu.",
  },
  plank: {
    slug: "plank",
    preset: "plank",
    motionLabel: "Tahan tubuh tetap lurus sambil bernapas teratur",
    phases: ["Siku di bawah bahu", "Kunci seluruh tubuh", "Jaga posisi"],
    equipmentSetup: [
      "Gunakan matras atau permukaan yang tidak licin.",
      "Letakkan lengan bawah sejajar dengan siku tepat di bawah bahu.",
      "Luruskan kaki setelah tubuh bagian atas stabil.",
    ],
    formFocus: "Jaga pinggul sejajar bahu dan berhenti jika punggung mulai turun.",
  },
};

const ENGLISH_GUIDES: Record<string, ExerciseGuideCopy> = {
  "barbell-bench-press": {
    motionLabel:
      "Lower the bar to the lower chest, then press it straight up",
    phases: ["Stable setup", "Lower slowly", "Press upward"],
    equipmentSetup: [
      "Place the bench inside the rack with the bar slightly above eye level.",
      "Set the hooks so the elbows stay slightly bent when unracking.",
      "Use safety arms or a spotter for challenging weight.",
    ],
    formFocus:
      "Keep the head, shoulders, glutes, and both feet supported.",
  },
  "incline-dumbbell-press": {
    motionLabel:
      "Press the dumbbells upward and slightly inward",
    phases: ["Set the bench", "Lower slowly", "Press evenly"],
    equipmentSetup: [
      "Set the bench to an incline of about 30–45 degrees.",
      "Rest the dumbbells on the thighs before leaning back.",
      "Keep the bench stable and leave room for both elbows.",
    ],
    formFocus:
      "Keep the shoulders down and avoid pressing too vertically.",
  },
  "lat-pulldown": {
    motionLabel:
      "Drive the elbows down until the bar nears the upper chest",
    phases: ["Lock the thighs", "Pull to chest", "Return slowly"],
    equipmentSetup: [
      "Adjust the thigh pad so the body cannot lift.",
      "Select the weight and grip slightly wider than shoulder width.",
      "Position the seat so the cable stays above the torso.",
    ],
    formFocus:
      "Pull in front of the body, stay tall, and avoid swinging.",
  },
  "seated-cable-row": {
    motionLabel:
      "Pull the handle to the lower ribs, then extend again",
    phases: ["Neutral back", "Pull the elbows", "Extend slowly"],
    equipmentSetup: [
      "Attach the row handle and choose a manageable weight.",
      "Place both feet firmly on the platform with soft knees.",
      "Sit far enough back to keep the cable under tension.",
    ],
    formFocus:
      "Keep the torso stable and squeeze the shoulder blades at the finish.",
  },
  "barbell-back-squat": {
    motionLabel:
      "Lower the hips as if sitting, then stand back up",
    phases: ["Brace", "Lower with control", "Stand tall"],
    equipmentSetup: [
      "Set the J-hooks slightly below shoulder height.",
      "Place safety arms just below the lowest squat position.",
      "Center the bar and secure the plates with collars.",
    ],
    formFocus:
      "Keep the whole foot planted and track the knees with the toes.",
  },
  "leg-press": {
    motionLabel:
      "Bring the platform toward the body, then press it away",
    phases: ["Set the feet", "Bend the knees", "Press the platform"],
    equipmentSetup: [
      "Adjust the seat so the hips and lower back stay supported.",
      "Place both feet evenly before releasing the safety.",
      "Check both safety catches before adding weight.",
    ],
    formFocus:
      "Stop before the pelvis lifts away from the back pad.",
  },
  "romanian-deadlift": {
    motionLabel:
      "Push the hips back while keeping the bar close to the legs",
    phases: ["Stand stable", "Hinge at the hips", "Drive the hips"],
    equipmentSetup: [
      "Load both sides evenly and secure them with collars.",
      "Start from a rack or lift the bar safely to standing.",
      "Clear the floor so the bar can stay close to the legs.",
    ],
    formFocus:
      "Keep the spine neutral and stop at a strong hamstring stretch.",
  },
  "bulgarian-split-squat": {
    motionLabel:
      "Lower the rear knee, then drive through the front leg",
    phases: ["Find balance", "Lower straight down", "Drive the front leg"],
    equipmentSetup: [
      "Use a stable bench at knee height or slightly lower.",
      "Move the front foot forward enough to keep the heel down.",
      "Add dumbbells only after the bodyweight stance feels stable.",
    ],
    formFocus:
      "Let the front leg do most of the work and avoid pushing off the rear foot.",
  },
  "dumbbell-shoulder-press": {
    motionLabel:
      "Press overhead without arching the lower back",
    phases: ["Weights at shoulders", "Press overhead", "Lower evenly"],
    equipmentSetup: [
      "Choose matching dumbbells and clear the space overhead.",
      "Set the backrest nearly upright for a seated press.",
      "Use the thighs to help bring the dumbbells to shoulder level.",
    ],
    formFocus:
      "Keep the ribs down and finish with the weights over the shoulders.",
  },
  "dumbbell-lateral-raise": {
    motionLabel:
      "Raise the arms to shoulder height, then lower slowly",
    phases: ["Weights ready", "Raise to the sides", "Lower slowly"],
    equipmentSetup: [
      "Choose light dumbbells that can be controlled without swinging.",
      "Leave enough room on both sides of the body.",
      "Start beside the thighs with neutral wrists.",
    ],
    formFocus:
      "Lead with the elbows and stop around shoulder height.",
  },
  "barbell-curl": {
    motionLabel:
      "Curl the bar toward the chest without swinging",
    phases: ["Stand tall", "Curl the elbows", "Lower slowly"],
    equipmentSetup: [
      "Load both sides evenly and use collars.",
      "Use a shoulder-width underhand grip with straight wrists.",
      "Clear the space in front of the body.",
    ],
    formFocus:
      "Keep the elbows near the ribs and avoid leaning backward.",
  },
  "hammer-curl": {
    motionLabel:
      "Curl with the palms facing each other",
    phases: ["Neutral grip", "Curl the elbows", "Extend slowly"],
    equipmentSetup: [
      "Choose dumbbells that do not require body momentum.",
      "Hold the dumbbells with the palms facing each other.",
      "Stand tall with neutral wrists.",
    ],
    formFocus:
      "Keep the wrists neutral and the upper arms close to the body.",
  },
  "rope-triceps-pushdown": {
    motionLabel:
      "Press the rope down and separate the ends",
    phases: ["Stable setup", "Press downward", "Return slowly"],
    equipmentSetup: [
      "Attach the rope to a high pulley and lock the pin.",
      "Stand close enough to keep the cable nearly vertical.",
      "Begin with bent elbows beside the ribs.",
    ],
    formFocus:
      "Move only the forearms while the shoulders and upper arms stay still.",
  },
  "cable-crunch": {
    motionLabel:
      "Bring the ribs toward the pelvis against the cable",
    phases: ["Kneel stable", "Curl the torso", "Return slowly"],
    equipmentSetup: [
      "Attach the rope to a high pulley and use a knee pad.",
      "Kneel far enough away to keep the cable under tension.",
      "Hold the rope beside the head without pulling with the arms.",
    ],
    formFocus:
      "Curl through the trunk instead of only pushing the hips backward.",
  },
  "machine-chest-press": {
    motionLabel:
      "Press the handles forward, then return with control",
    phases: ["Set the seat", "Press forward", "Return slowly"],
    equipmentSetup: [
      "Set the seat so the handles align with mid-chest.",
      "Choose a manageable weight and keep both feet planted.",
      "Do not let the elbows travel too far behind the torso.",
    ],
    formFocus:
      "Keep the back supported and avoid aggressively locking the elbows.",
  },
  "pec-deck-fly": {
    motionLabel:
      "Bring the arm pads together, then open slowly",
    phases: ["Set the seat", "Close the arms", "Open slowly"],
    equipmentSetup: [
      "Set the seat so the elbows or forearms align with the chest.",
      "Use a start position that stretches the chest without shoulder strain.",
      "Keep the back and head supported.",
    ],
    formFocus:
      "Keep a soft elbow bend and avoid bouncing out of the stretch.",
  },
  "assisted-pull-up": {
    motionLabel:
      "Pull the body upward while driving the elbows down",
    phases: ["Knees on pad", "Pull the body", "Lower slowly"],
    equipmentSetup: [
      "Choose enough assistance for controlled repetitions.",
      "Place both knees securely on the pad before loading it.",
      "Use a comfortable grip and keep the handle area clear.",
    ],
    formFocus:
      "Avoid swinging and begin by driving the elbows toward the ribs.",
  },
  "hack-squat-machine": {
    motionLabel:
      "Lower the sled with the back supported, then press up",
    phases: ["Back supported", "Lower with control", "Press upward"],
    equipmentSetup: [
      "Place the shoulders under the pads and the back on the sled.",
      "Set both feet evenly and check the safety stops.",
      "Use a stance that keeps the heels planted.",
    ],
    formFocus:
      "Track the knees with the toes and keep the pelvis supported.",
  },
  "leg-extension-machine": {
    motionLabel:
      "Extend the knees against the roller, then lower slowly",
    phases: ["Align the knees", "Extend the legs", "Lower slowly"],
    equipmentSetup: [
      "Align the machine pivot with the knee joint.",
      "Place the roller above the ankles and set the backrest.",
      "Use a weight that does not require kicking or lifting the hips.",
    ],
    formFocus:
      "Keep the hips down and extend the knees with control.",
  },
  "seated-leg-curl-machine": {
    motionLabel:
      "Bend the knees and pull the roller beneath the seat",
    phases: ["Align the knees", "Curl the legs", "Extend slowly"],
    equipmentSetup: [
      "Align the machine pivot with the knee and secure the thigh pad.",
      "Place the roller slightly above the heels.",
      "Set the backrest so the hips stay supported.",
    ],
    formFocus:
      "Keep the thighs pinned down and avoid arching the lower back.",
  },
  "hip-thrust-machine": {
    motionLabel:
      "Drive the hips upward, pause, then lower",
    phases: ["Pad on hips", "Drive through heels", "Lock the hips"],
    equipmentSetup: [
      "Secure the upper back against the support pad.",
      "Place the belt or pad across the hip crease, not the abdomen.",
      "Set the feet so the shins are nearly vertical at the top.",
    ],
    formFocus:
      "Squeeze the glutes at the top while keeping the ribs and back neutral.",
  },
  "standing-calf-raise-machine": {
    motionLabel:
      "Raise the heels as high as possible, then lower slowly",
    phases: ["Shoulders under pads", "Raise the heels", "Lower the heels"],
    equipmentSetup: [
      "Set the shoulder pads with the knees softly extended.",
      "Place the balls of both feet firmly on the platform.",
      "Keep the safety stop within reach.",
    ],
    formFocus:
      "Move through the ankles without bouncing or bending the knees.",
  },
  "preacher-curl-machine": {
    motionLabel:
      "Curl while keeping the upper arms on the pad",
    phases: ["Set the seat", "Curl the elbows", "Lower slowly"],
    equipmentSetup: [
      "Set the seat so the armpits sit just above the pad.",
      "Keep the upper arms supported and use a comfortable grip.",
      "Choose a weight that allows controlled elbow extension.",
    ],
    formFocus:
      "Keep the upper arms down and do not force the elbows into lockout.",
  },
  "assisted-dip-machine": {
    motionLabel:
      "Press the body up between the handles, then lower",
    phases: ["Knees on pad", "Press the body", "Lower with control"],
    equipmentSetup: [
      "Choose enough assistance to keep the shoulders stable.",
      "Place the knees securely and grip both handles evenly.",
      "Check that the platform path is clear.",
    ],
    formFocus:
      "Keep the shoulders away from the ears and use a comfortable depth.",
  },
  "ab-crunch-machine": {
    motionLabel:
      "Curl the torso to bring the ribs toward the pelvis",
    phases: ["Sit stable", "Curl the torso", "Return slowly"],
    equipmentSetup: [
      "Set the seat and chest pad to match the torso.",
      "Secure the feet and choose a moderate weight.",
      "Hold the handles lightly without pulling with the arms.",
    ],
    formFocus:
      "Bring the ribs toward the pelvis instead of only hinging at the hips.",
  },
  "ab-wheel-rollout": {
    motionLabel:
      "Roll the wheel forward with a braced body, then pull it back",
    phases: ["Stable kneeling", "Roll forward", "Pull with the core"],
    equipmentSetup: [
      "Use a non-slip knee pad and check that the wheel rolls smoothly.",
      "Grip both handles with the wheel directly below the shoulders.",
      "Clear a straight path in front of the wheel.",
    ],
    formFocus:
      "Brace the abs and glutes, and stop before the lower back begins to arch.",
  },
  "alternating-dumbbell-curl": {
    motionLabel:
      "Curl one arm at a time while keeping the other side controlled",
    phases: ["Dumbbells at sides", "Curl one arm", "Switch sides"],
    equipmentSetup: [
      "Choose two dumbbells of equal weight.",
      "Stand tall with the palms forward or slightly inward.",
      "Leave enough room on both sides of the body.",
    ],
    formFocus:
      "Keep the elbows near the ribs and avoid swinging while changing sides.",
  },
  "treadmill-walk": {
    motionLabel:
      "Walk naturally near the center of the belt",
    phases: ["Set the speed", "Walk naturally", "Reduce the speed"],
    equipmentSetup: [
      "Stand on the side rails before starting at low speed.",
      "Attach the safety clip and increase speed gradually.",
      "Keep the emergency stop within reach.",
    ],
    formFocus:
      "Walk tall and naturally; hold the rails only when needed.",
  },
  plank: {
    motionLabel:
      "Hold the body in a straight line while breathing steadily",
    phases: ["Elbows under shoulders", "Brace the body", "Hold position"],
    equipmentSetup: [
      "Use a mat or another non-slip surface.",
      "Keep the forearms parallel and elbows below the shoulders.",
      "Extend the legs after the upper body is stable.",
    ],
    formFocus:
      "Keep the hips level with the shoulders and stop if the back begins to sag.",
  },
};


const EXERCISE_GUIDE_ALIASES: Record<string, keyof typeof GUIDES> = {
  "barbell-rack-pull": "romanian-deadlift",
  "rack-pull": "romanian-deadlift",
  "barbell-shrug": "barbell-curl",
  "bear-crawl": "treadmill-walk",
  "bird-dog": "plank",
  "bench-dip": "assisted-dip",
  "burpee": "back-squat",
  "butt-kicks": "treadmill-walk",
  "cable-front-raise": "dumbbell-lateral-raise",
  "cable-glute-kickback": "bulgarian-split-squat",
  "cable-overhead-tricep-extension": "rope-triceps-pushdown",
  "cable-pull-through": "romanian-deadlift",
  "cat-cow-stretch": "cable-crunch",
  "chest-doorway-stretch": "pec-deck-fly",
  "close-grip-push-up": "barbell-bench-press",
  "push-up": "barbell-bench-press",
  "cycling": "treadmill-walk",
  "stationary-bike": "treadmill-walk",
  "dead-bug": "ab-crunch-machine",
  "decline-barbell-bench-press": "barbell-bench-press",
  "decline-dumbbell-press": "incline-dumbbell-press",
  "barbell-shrugs": "barbell-curl",
  "shrug": "barbell-curl",
  "shrugs": "barbell-curl",
  "glute-kickback": "bulgarian-split-squat",
  "donkey-kick": "bulgarian-split-squat",
  "overhead-tricep-extension": "rope-triceps-pushdown",
  "overhead-triceps-extension": "rope-triceps-pushdown",
  "pull-through": "romanian-deadlift",
  "doorway-stretch": "pec-deck-fly",
  "bicycle-crunch": "ab-crunch-machine",
  "bike": "treadmill-walk",
  "jumping-jack": "treadmill-walk",
  "mountain-climber": "plank"
};

const CANONICAL_EXERCISE_NAMES: Record<string, string> = {
  "barbell-bench-press": "Barbell Bench Press",
  "incline-dumbbell-press": "Incline Dumbbell Press",
  "lat-pulldown": "Lat Pulldown",
  "seated-cable-row": "Seated Cable Row",
  "barbell-back-squat": "Barbell Back Squat",
  "leg-press": "Leg Press",
  "romanian-deadlift": "Romanian Deadlift",
  "bulgarian-split-squat": "Bulgarian Split Squat",
  "dumbbell-shoulder-press": "Dumbbell Shoulder Press",
  "dumbbell-lateral-raise": "Dumbbell Lateral Raise",
  "barbell-curl": "Barbell Curl",
  "hammer-curl": "Hammer Curl",
  "rope-triceps-pushdown": "Rope Triceps Pushdown",
  "cable-crunch": "Cable Crunch",
  "machine-chest-press": "Machine Chest Press",
  "pec-deck-fly": "Pec Deck Fly",
  "assisted-pull-up": "Assisted Pull-Up",
  "hack-squat-machine": "Hack Squat Machine",
  "leg-extension-machine": "Leg Extension Machine",
  "seated-leg-curl-machine": "Seated Leg Curl Machine",
  "hip-thrust-machine": "Hip Thrust Machine",
  "standing-calf-raise-machine": "Standing Calf Raise Machine",
  "preacher-curl-machine": "Preacher Curl Machine",
  "assisted-dip-machine": "Assisted Dip Machine",
  "ab-crunch-machine": "Ab Crunch Machine",
  "ab-wheel-rollout": "Ab Wheel Rollout",
  "alternating-dumbbell-curl": "Alternating Dumbbell Curl",
  "treadmill-walk": "Treadmill Walk",
  plank: "Plank",
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const INFERRED_GUIDE_RULES: Array<{
  matches: RegExp;
  guideSlug: keyof typeof GUIDES;
}> = [
  { matches: /(ab.*wheel|wheel.*rollout)/, guideSlug: "ab-wheel-rollout" },
  {
    matches: /(alternating|alternate|single.*arm).*dumbbell.*curl|dumbbell.*curl/,
    guideSlug: "alternating-dumbbell-curl",
  },
  { matches: /(incline.*press|decline.*dumbbell.*press)/, guideSlug: "incline-dumbbell-press" },
  { matches: /(decline.*barbell.*bench.*press|decline.*press|close.*grip.*push.*up|push.*up)/, guideSlug: "barbell-bench-press" },
  { matches: /bench.*press/, guideSlug: "barbell-bench-press" },
  { matches: /chest.*press/, guideSlug: "machine-chest-press" },
  { matches: /(lat.*pull|pull.*down)/, guideSlug: "lat-pulldown" },
  { matches: /row/, guideSlug: "seated-cable-row" },
  { matches: /(rack.*pull|barbell.*shrug|cable.*pull.*through)/, guideSlug: "romanian-deadlift" },
  { matches: /leg.*press/, guideSlug: "leg-press" },
  { matches: /(romanian.*deadlift|rdl|deadlift)/, guideSlug: "romanian-deadlift" },
  { matches: /(bulgarian|split.*squat|lunge)/, guideSlug: "bulgarian-split-squat" },
  { matches: /hack.*squat/, guideSlug: "hack-squat-machine" },
  { matches: /squat/, guideSlug: "barbell-back-squat" },
  { matches: /(shoulder.*press|overhead.*press)/, guideSlug: "dumbbell-shoulder-press" },
  { matches: /(lateral.*raise|side.*raise|front.*raise)/, guideSlug: "dumbbell-lateral-raise" },
  { matches: /leg.*extension/, guideSlug: "leg-extension-machine" },
  { matches: /leg.*curl/, guideSlug: "seated-leg-curl-machine" },
  { matches: /preacher.*curl/, guideSlug: "preacher-curl-machine" },
  { matches: /hammer.*curl/, guideSlug: "hammer-curl" },
  { matches: /curl/, guideSlug: "barbell-curl" },
  { matches: /(triceps.*push|push.*down|overhead.*tricep.*extension|overhead.*triceps.*extension)/, guideSlug: "rope-triceps-pushdown" },
  { matches: /cable.*crunch/, guideSlug: "cable-crunch" },
  { matches: /(pec.*deck|chest.*fly|fly)/, guideSlug: "pec-deck-fly" },
  { matches: /(pull.*up|chin.*up)/, guideSlug: "assisted-pull-up" },
  { matches: /(bench.*dip|dip)/, guideSlug: "assisted-dip-machine" },
  { matches: /(bird.*dog|dead.*bug|cat.*cow|doorway.*stretch|mountain.*climber)/, guideSlug: "plank" },
  { matches: /(bear.*crawl|burpee|butt.*kicks|cycling|bicycle|bike|jumping.*jack)/, guideSlug: "treadmill-walk" },
  { matches: /(glute.*kickback|donkey.*kick)/, guideSlug: "bulgarian-split-squat" },
  { matches: /(shrug|shrugs)/, guideSlug: "barbell-curl" },
  { matches: /(hip.*thrust|glute.*bridge)/, guideSlug: "hip-thrust-machine" },
  { matches: /calf.*raise/, guideSlug: "standing-calf-raise-machine" },
  { matches: /(ab.*crunch|crunch)/, guideSlug: "ab-crunch-machine" },
  { matches: /(treadmill|walking|walk)/, guideSlug: "treadmill-walk" },
  { matches: /plank/, guideSlug: "plank" },
];

export function getExerciseGuide(
  slug: string | null | undefined,
  name: string,
  language: "id" | "en" = "id"
): ExerciseGuide {
  const normalizedSlug = toSlug(slug || name);
  const normalizedName = toSlug(name);
  const normalizedValues = Array.from(
    new Set([normalizedSlug, normalizedName])
  );
  const aliasSlug = normalizedValues
    .map((value) => EXERCISE_GUIDE_ALIASES[value])
    .find(Boolean);
  const aliasMatch = aliasSlug ? GUIDES[aliasSlug] : undefined;
  const directMatch = normalizedValues
    .map((value) => GUIDES[value])
    .find(Boolean);
  const inferredSlug = INFERRED_GUIDE_RULES.find(
    ({ matches }) =>
      normalizedValues.some((value) => matches.test(value))
  )?.guideSlug;

  const nameMatch = directMatch ?? aliasMatch ?? Object.values(GUIDES).find(
    (guide) =>
      normalizedValues.some(
        (value) =>
          value.includes(guide.slug) ||
          guide.slug.includes(value)
      )
  ) ?? (inferredSlug ? GUIDES[inferredSlug] : undefined);

  if (nameMatch) {
    const englishCopy = ENGLISH_GUIDES[nameMatch.slug];

    return language === "en" && englishCopy
      ? { ...nameMatch, ...englishCopy }
      : nameMatch;
  }

  return language === "en"
    ? {
        slug: normalizedSlug,
        preset: "standing",
        motionLabel:
          "Follow the instructions with a controlled tempo",
        phases: [
          "Stable setup",
          "Controlled movement",
          "Return slowly",
        ],
        equipmentSetup: [
          "Make sure the equipment is stable and adjusted correctly.",
          "Start with a light load while learning the movement.",
          "Clear the training area before starting the set.",
        ],
        formFocus:
          "Use the written guide and stop if the movement causes pain.",
      }
    : {
      slug: normalizedSlug,
      preset: "standing",
      motionLabel: "Ikuti petunjuk dengan tempo yang terkontrol",
      phases: ["Posisi stabil", "Gerakan terkontrol", "Kembali perlahan"],
      equipmentSetup: [
        "Pastikan alat stabil dan sudah diatur dengan benar.",
        "Mulai dengan beban ringan saat mempelajari gerakan.",
        "Kosongkan area latihan sebelum memulai set.",
      ],
      formFocus:
        "Gunakan panduan tertulis sebagai acuan dan berhenti jika terasa sakit.",
      };
}

export function getCanonicalExerciseName(
  value: string | null | undefined
) {
  if (!value?.trim()) {
    return null;
  }

  const guide = getExerciseGuide(value, value, "en");

  return guide.preset === "standing"
    ? null
    : CANONICAL_EXERCISE_NAMES[guide.slug] || null;
}

export const CALIBRATED_EXERCISE_NAMES = Object.freeze(
  Object.values(CANONICAL_EXERCISE_NAMES)
);

export const SUPPORTED_3D_EXERCISE_COUNT = Object.keys(GUIDES).length;
