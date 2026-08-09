import type { ExerciseGuide, ExerciseGuidePreset } from "@/lib/exercise-guides";
import { getExercise2DCategory, type Exercise2DCategory } from "@/lib/exercise-2d-categories";
export { getExercise2DCategory, type Exercise2DCategory } from "@/lib/exercise-2d-categories";


export type Exercise2DStep = {
  title: string;
  caption: string;
  coachingCues: string[];
};

export type Exercise2DMeta = {
  breathing: string;
  rangeFocus: string;
  mistakes: string[];
};


type Exercise2DStepTemplate = {
  id: {
    caption: string;
    coachingCues: string[];
  }[];
  en: {
    caption: string;
    coachingCues: string[];
  }[];
};


const STEP_TITLES = {
  id: ["Langkah 1 · Posisi awal", "Langkah 2 · Gerakan", "Langkah 3 · Selesai"],
  en: ["Step 1 · Start", "Step 2 · Move", "Step 3 · Finish"],
} as const;

function triple(
  idCaptions: [string, string, string],
  enCaptions: [string, string, string],
  idCues: [string[], string[], string[]],
  enCues: [string[], string[], string[]]
): Exercise2DStepTemplate {
  return {
    id: idCaptions.map((caption, index) => ({ caption, coachingCues: idCues[index] })),
    en: enCaptions.map((caption, index) => ({ caption, coachingCues: enCues[index] })),
  };
}

const DETAILED_STEPS: Record<Exercise2DCategory, Exercise2DStepTemplate> = {
  "bench-press": triple(
    [
      "Berbaring di bangku datar, kaki menapak kuat di lantai, tangan memegang bar sedikit lebih lebar dari bahu.",
      "Turunkan bar ke tengah dada secara terkontrol lalu dorong lurus ke atas sampai siku hampir lurus.",
      "Kunci posisi di atas sebentar lalu jaga bahu tetap stabil saat menyiapkan repetisi berikutnya.",
    ],
    [
      "Lie on the flat bench with both feet planted firmly and grip the bar slightly wider than shoulder width.",
      "Lower the bar to the mid chest under control, then press it straight up until the elbows are nearly locked.",
      "Pause briefly at the top and keep the shoulders stable before starting the next repetition.",
    ],
    [
      ["Dada terangkat", "Pergelangan lurus"],
      ["Siku turun ±45°", "Bar melewati garis dada"],
      ["Jangan memantulkan bar", "Bahu tetap menempel bangku"],
    ],
    [
      ["Lift the chest", "Keep wrists straight"],
      ["Lower elbows around 45°", "Keep the bar over the chest line"],
      ["Do not bounce the bar", "Keep shoulders pinned to the bench"],
    ]
  ),
  "incline-press": triple(
    [
      "Duduk lalu rebahkan tubuh di bangku incline, punggung menempel penuh dan tangan memegang bar atau dumbbell setinggi dada atas.",
      "Tekan beban ke atas dan sedikit ke belakang mengikuti sudut bangku sampai lengan hampir lurus.",
      "Turunkan kembali ke dada atas dengan kontrol tanpa menjatuhkan bahu ke depan.",
    ],
    [
      "Sit down and lean onto the incline bench with the full back supported and the load positioned at upper chest level.",
      "Press the weight upward and slightly back along the bench angle until the arms are nearly straight.",
      "Lower it back to the upper chest with control without letting the shoulders roll forward.",
    ],
    [
      ["Kepala netral", "Kaki menapak"],
      ["Dorong dari dada atas", "Jangan mengangkat pinggul"],
      ["Turun perlahan", "Scapula tetap rapat"],
    ],
    [
      ["Keep the head neutral", "Keep feet planted"],
      ["Drive from the upper chest", "Do not lift the hips"],
      ["Lower slowly", "Keep the scapula packed"],
    ]
  ),
  "lat-pulldown": triple(
    [
      "Duduk tegak, paha terkunci di bantalan, genggam bar lebar dan biarkan lengan lurus di atas kepala.",
      "Tarik bar ke arah dada atas sambil menurunkan siku ke samping tubuh dan mengangkat dada.",
      "Kembalikan bar ke atas secara penuh sampai lengan lurus tanpa membiarkan badan terayun.",
    ],
    [
      "Sit tall with the thighs secured under the pad, take a wide grip, and let the arms extend overhead.",
      "Pull the bar toward the upper chest by driving the elbows down toward the sides while lifting the chest.",
      "Return the bar upward under control until the arms are fully extended without swinging the torso.",
    ],
    [
      ["Dada terbuka", "Leher rileks"],
      ["Tarik dengan siku", "Jangan narik pakai momentum"],
      ["Lengan lurus penuh", "Bahu jangan terangkat"],
    ],
    [
      ["Open the chest", "Keep the neck relaxed"],
      ["Lead with the elbows", "Do not use momentum"],
      ["Reach full arm extension", "Do not shrug the shoulders"],
    ]
  ),
  "seated-row": triple(
    [
      "Duduk di mesin row, dada tegak, lutut sedikit menekuk, dan tangan memegang handle dengan lengan lurus ke depan.",
      "Tarik handle ke arah perut sambil membawa siku ke belakang dan menjaga dada tetap terbuka.",
      "Luruskan kembali lengan sampai punggung bagian atas terasa meregang tanpa membulatkan pinggang.",
    ],
    [
      "Sit at the row machine with a tall chest, slight knee bend, and the handle held in front with straight arms.",
      "Pull the handle toward the stomach by driving the elbows back while keeping the chest open.",
      "Extend the arms forward again until the upper back feels a stretch without rounding the lower back.",
    ],
    [
      ["Perut aktif", "Bahu turun"],
      ["Siku rapat ke badan", "Tarik sampai tulang belikat rapat"],
      ["Jangan mencondong terlalu jauh", "Kontrol fase kembali"],
    ],
    [
      ["Brace the core", "Keep shoulders down"],
      ["Keep elbows close", "Squeeze the shoulder blades"],
      ["Do not over-lean", "Control the return phase"],
    ]
  ),
  "back-squat": triple(
    [
      "Berdiri di bawah bar, letakkan bar di atas punggung atas, kaki selebar bahu, dan ujung kaki sedikit mengarah keluar.",
      "Tekuk pinggul dan lutut bersamaan untuk duduk ke bawah sampai paha minimal sejajar lantai sambil menjaga dada terbuka.",
      "Dorong lantai dengan telapak kaki lalu kembali berdiri tegak sampai pinggul dan lutut lurus.",
    ],
    [
      "Stand under the bar with it resting across the upper back, feet shoulder width apart, and toes slightly turned out.",
      "Bend the hips and knees together to sit down until the thighs are at least parallel while keeping the chest open.",
      "Drive through the full foot and stand tall again until the hips and knees are fully extended.",
    ],
    [
      ["Tarik napas dan kencangkan perut", "Punggung netral"],
      ["Lutut mengikuti arah kaki", "Tumit tetap menempel"],
      ["Dorong dari tumit dan midfoot", "Jangan runtuhkan lutut ke dalam"],
    ],
    [
      ["Brace the core", "Keep a neutral spine"],
      ["Track knees over the toes", "Keep the heels down"],
      ["Drive through heel and midfoot", "Do not let knees cave in"],
    ]
  ),
  "leg-press": triple(
    [
      "Duduk rapat di sandaran, kaki ditempatkan di platform selebar bahu, dan lutut menekuk nyaman.",
      "Dorong platform menjauh sampai kaki hampir lurus tanpa mengunci lutut sepenuhnya.",
      "Tekuk lutut lagi perlahan untuk menurunkan platform sampai paha mendekati tubuh tanpa mengangkat pinggul.",
    ],
    [
      "Sit firmly into the back pad, place the feet shoulder width apart on the platform, and start with comfortable knee bend.",
      "Press the platform away until the legs are almost straight without fully locking the knees.",
      "Bend the knees again slowly to lower the platform until the thighs approach the torso without lifting the hips.",
    ],
    [
      ["Punggung dan pinggul menempel", "Pegangan kuat"],
      ["Dorong rata dengan seluruh telapak kaki", "Jangan kunci lutut keras"],
      ["Turun terkontrol", "Jangan biarkan pinggul terangkat"],
    ],
    [
      ["Keep the back and hips glued down", "Hold the handles firmly"],
      ["Press evenly through the full foot", "Avoid hard knee lockout"],
      ["Lower with control", "Do not let the hips lift"],
    ]
  ),
  "romanian-deadlift": triple(
    [
      "Berdiri tegak memegang bar di depan paha, lutut sedikit menekuk, dan bahu ditarik ke belakang.",
      "Dorong pinggul ke belakang sambil menurunkan bar dekat paha dan tulang kering sampai hamstring terasa meregang.",
      "Dorong pinggul maju lagi dan kembali berdiri tinggi dengan bar tetap dekat ke tubuh.",
    ],
    [
      "Stand tall holding the bar in front of the thighs with a slight knee bend and the shoulders pulled back.",
      "Push the hips backward while lowering the bar close to the thighs and shins until the hamstrings stretch.",
      "Drive the hips forward and stand tall again while keeping the bar close to the body.",
    ],
    [
      ["Dada bangga", "Lengan tetap lurus"],
      ["Tekan pinggul ke belakang", "Punggung jangan membulat"],
      ["Kontraksikan glute di atas", "Bar tetap dekat kaki"],
    ],
    [
      ["Proud chest", "Keep the arms straight"],
      ["Send the hips back", "Do not round the spine"],
      ["Squeeze the glutes at the top", "Keep the bar close"],
    ]
  ),
  "split-squat": triple(
    [
      "Ambil posisi stagger, satu kaki di depan dan satu di belakang, tubuh tegak, dan beban berada di samping tubuh bila memakai dumbbell.",
      "Turunkan tubuh lurus ke bawah sampai lutut belakang mendekati lantai dan lutut depan membentuk sudut sekitar 90 derajat.",
      "Tekan kaki depan ke lantai untuk kembali ke posisi berdiri awal tanpa kehilangan keseimbangan.",
    ],
    [
      "Take a staggered stance with one foot forward and one foot back, keep the torso tall, and hold the dumbbells at the sides if used.",
      "Lower the body straight down until the back knee nears the floor and the front knee reaches about 90 degrees.",
      "Push through the front foot to rise back to the starting stance without losing balance.",
    ],
    [
      ["Beban tubuh di tengah", "Pandangan ke depan"],
      ["Turun vertikal", "Lutut depan jangan melewati kontrol kaki"],
      ["Dorong dari tumit kaki depan", "Pinggul tetap lurus"],
    ],
    [
      ["Keep body weight centered", "Look forward"],
      ["Lower vertically", "Keep the front knee controlled"],
      ["Drive through the front heel", "Keep hips square"],
    ]
  ),
  "shoulder-press": triple(
    [
      "Duduk tegak, dumbbell sejajar telinga, siku di bawah pergelangan, dan perut dikencangkan.",
      "Dorong dumbbell lurus ke atas sampai lengan hampir lurus di atas bahu.",
      "Turunkan dumbbell kembali ke posisi awal secara perlahan tanpa menjatuhkan siku terlalu rendah.",
    ],
    [
      "Sit tall with the dumbbells level with the ears, elbows under the wrists, and the core braced.",
      "Press the dumbbells straight upward until the arms are nearly straight above the shoulders.",
      "Lower the dumbbells back to the start slowly without dropping the elbows too low.",
    ],
    [
      ["Pergelangan lurus", "Dada tetap tegak"],
      ["Tekan ke atas tanpa melengkungkan punggung", "Kepala netral"],
      ["Kontrol saat turun", "Jaga siku tetap aktif"],
    ],
    [
      ["Keep wrists stacked", "Keep the chest tall"],
      ["Press up without arching the back", "Keep the head neutral"],
      ["Control the lowering", "Keep elbows active"],
    ]
  ),
  "lateral-raise": triple(
    [
      "Berdiri tegak sambil memegang dumbbell di samping paha dengan siku sedikit menekuk.",
      "Angkat kedua lengan ke samping sampai setinggi bahu, telapak sedikit menghadap lantai.",
      "Turunkan dumbbell perlahan kembali ke samping tubuh tanpa mengayun.",
    ],
    [
      "Stand upright holding dumbbells beside the thighs with a slight bend in the elbows.",
      "Raise both arms out to the sides until they reach shoulder level with the palms slightly facing down.",
      "Lower the dumbbells slowly back to the sides without swinging.",
    ],
    [
      ["Bahu turun", "Siku lembut"],
      ["Angkat dengan otot bahu", "Berhenti setinggi bahu"],
      ["Turun perlahan", "Jangan pakai momentum"],
    ],
    [
      ["Keep shoulders down", "Maintain soft elbows"],
      ["Lift with the delts", "Stop at shoulder height"],
      ["Lower slowly", "Do not use momentum"],
    ]
  ),
  "barbell-curl": triple(
    [
      "Berdiri tegak, pegangan selebar bahu, siku rapat di samping tubuh, dan bar berada di depan paha.",
      "Tekuk siku untuk mengangkat bar ke arah bahu tanpa menggerakkan bahu ke depan.",
      "Turunkan bar secara perlahan sampai siku lurus hampir penuh lalu ulangi.",
    ],
    [
      "Stand tall with a shoulder-width grip, keep the elbows close to the sides, and let the bar rest in front of the thighs.",
      "Bend the elbows to curl the bar toward the shoulders without letting the shoulders roll forward.",
      "Lower the bar slowly until the elbows are almost fully straight, then repeat.",
    ],
    [
      ["Siku tetap diam", "Dada tegak"],
      ["Angkat dari biceps", "Jangan ayunkan punggung"],
      ["Turun penuh kontrol", "Jangan jatuhkan beban"],
    ],
    [
      ["Keep the elbows fixed", "Keep the chest tall"],
      ["Lift using the biceps", "Do not swing the back"],
      ["Lower under full control", "Do not drop the load"],
    ]
  ),
  "hammer-curl": triple(
    [
      "Pegang dumbbell di samping tubuh dengan telapak saling berhadapan dan tubuh tetap tegak.",
      "Tekuk siku untuk mengangkat dumbbell ke atas sambil mempertahankan posisi telapak netral.",
      "Turunkan dumbbell kembali ke sisi paha dengan kontrol dan tanpa ayunan.",
    ],
    [
      "Hold the dumbbells beside the body with the palms facing each other and stay tall.",
      "Bend the elbows to lift the dumbbells upward while maintaining the neutral hand position.",
      "Lower the dumbbells back to the sides with control and no swing.",
    ],
    [
      ["Bahu rileks", "Siku dekat tubuh"],
      ["Pegangan netral", "Gerak hanya di siku"],
      ["Turun perlahan", "Jaga perut tetap aktif"],
    ],
    [
      ["Relax the shoulders", "Keep elbows close"],
      ["Maintain a neutral grip", "Move only at the elbows"],
      ["Lower slowly", "Keep the core engaged"],
    ]
  ),
  "triceps-pushdown": triple(
    [
      "Berdiri menghadap kabel, pegang handle di depan dada dengan siku menempel di samping badan.",
      "Dorong handle ke bawah sampai siku lurus sambil mempertahankan lengan atas tetap diam.",
      "Naikkan handle perlahan kembali ke posisi awal tanpa membiarkan siku membuka lebar.",
    ],
    [
      "Stand facing the cable, hold the handle in front of the chest, and keep the elbows pinned to the sides.",
      "Press the handle downward until the elbows are straight while keeping the upper arms still.",
      "Let the handle return slowly to the start without letting the elbows flare wide.",
    ],
    [
      ["Dada tegak", "Perut kencang"],
      ["Luruskan siku penuh", "Lengan atas tidak bergerak"],
      ["Kembali perlahan", "Jangan membungkuk"],
    ],
    [
      ["Keep the chest tall", "Brace the core"],
      ["Finish with full elbow extension", "Keep the upper arms still"],
      ["Return slowly", "Do not hunch over"],
    ]
  ),
  "cable-crunch": triple(
    [
      "Berlutut di depan kabel, pegang rope di sisi kepala, dan kencangkan perut.",
      "Tekuk tulang belakang dengan membawa siku ke arah lutut sambil pinggul tetap relatif diam.",
      "Naik perlahan kembali ke posisi netral tanpa menarik dari pinggul.",
    ],
    [
      "Kneel in front of the cable, hold the rope by the sides of the head, and brace the abs.",
      "Flex the spine by bringing the elbows toward the knees while keeping the hips relatively still.",
      "Rise back slowly to the neutral position without pulling from the hips.",
    ],
    [
      ["Pinggul stabil", "Leher netral"],
      ["Bulatkan perut, bukan bahu saja", "Buang napas saat menekuk"],
      ["Naik terkontrol", "Jangan duduk ke belakang"],
    ],
    [
      ["Keep the hips stable", "Keep the neck neutral"],
      ["Curl through the abs, not just the shoulders", "Exhale as you crunch"],
      ["Rise with control", "Do not sit back"],
    ]
  ),
  "machine-press": triple(
    [
      "Duduk rapat pada sandaran, pegang handle setinggi dada, dan letakkan kaki mantap di lantai.",
      "Dorong handle ke depan sampai lengan hampir lurus dengan dada tetap terangkat.",
      "Bawa handle kembali ke awal perlahan sambil menjaga bahu tidak maju berlebihan.",
    ],
    [
      "Sit firmly against the back pad, hold the handles at chest level, and place the feet solidly on the floor.",
      "Press the handles forward until the arms are almost straight while keeping the chest lifted.",
      "Bring the handles back slowly while preventing the shoulders from rolling too far forward.",
    ],
    [
      ["Punggung menempel sandaran", "Pergelangan lurus"],
      ["Dorong seimbang kiri-kanan", "Jangan mengunci keras"],
      ["Kontrol fase eksentrik", "Jaga dada tetap terbuka"],
    ],
    [
      ["Keep the back against the pad", "Keep wrists straight"],
      ["Press evenly left to right", "Avoid a hard lockout"],
      ["Control the eccentric phase", "Keep the chest open"],
    ]
  ),
  "pec-deck": triple(
    [
      "Duduk tegak di mesin pec deck dengan siku dan lengan menempel pada bantalan atau handle.",
      "Satukan lengan ke depan sampai otot dada berkontraksi penuh di tengah.",
      "Buka kembali lengan perlahan sampai dada terasa meregang tanpa menarik bahu terlalu jauh.",
    ],
    [
      "Sit tall on the pec deck with the elbows and arms positioned on the pads or handles.",
      "Bring the arms together in front until the chest fully contracts in the middle.",
      "Open the arms back slowly until the chest stretches without letting the shoulders pull too far back.",
    ],
    [
      ["Dada terangkat", "Leher rileks"],
      ["Rapatkan dengan dada", "Jangan menghentak"],
      ["Buka perlahan", "Rentang gerak nyaman"],
    ],
    [
      ["Keep the chest lifted", "Relax the neck"],
      ["Squeeze with the chest", "Do not jerk the weight"],
      ["Open slowly", "Stay within a comfortable range"],
    ]
  ),
  "assisted-pull-up": triple(
    [
      "Naik ke mesin assisted pull-up, pegang handle, dan letakkan lutut atau kaki pada bantalan bantuan.",
      "Tarik tubuh ke atas sampai dagu mendekati atau melewati level handle dengan siku mengarah ke bawah.",
      "Turunkan tubuh kembali perlahan sampai lengan hampir lurus penuh sambil tetap terkendali.",
    ],
    [
      "Step onto the assisted pull-up machine, grip the handles, and place the knees or feet on the assistance pad.",
      "Pull the body upward until the chin nears or passes the handle level while driving the elbows down.",
      "Lower the body back down slowly until the arms are almost fully extended while staying controlled.",
    ],
    [
      ["Perut aktif", "Bahu jangan terangkat"],
      ["Tarik siku ke bawah", "Dada menuju handle"],
      ["Turun penuh kontrol", "Jangan jatuh ke bawah"],
    ],
    [
      ["Brace the core", "Do not shrug the shoulders"],
      ["Drive the elbows down", "Lead the chest to the handles"],
      ["Lower under full control", "Do not drop back down"],
    ]
  ),
  "hack-squat": triple(
    [
      "Tempelkan bahu dan punggung pada pad mesin hack squat, kaki di platform selebar bahu.",
      "Turunkan tubuh dengan menekuk lutut dan pinggul sampai sudut yang nyaman sambil menjaga punggung menempel pad.",
      "Dorong platform dengan telapak kaki dan kembali ke posisi awal tanpa mengunci lutut keras.",
    ],
    [
      "Place the shoulders and back firmly against the hack squat pads with the feet shoulder width apart on the platform.",
      "Lower by bending the knees and hips to a comfortable depth while keeping the back pressed into the pad.",
      "Press through the feet and return to the start without locking the knees aggressively.",
    ],
    [
      ["Pinggul menempel pad", "Kaki stabil"],
      ["Lutut searah ujung kaki", "Turun terkontrol"],
      ["Dorong rata seluruh telapak", "Jangan lockout keras"],
    ],
    [
      ["Keep the hips against the pad", "Keep the feet stable"],
      ["Track knees with the toes", "Lower with control"],
      ["Press through the full foot", "Avoid hard lockout"],
    ]
  ),
  "leg-extension": triple(
    [
      "Duduk rapat di mesin, punggung menempel, dan bantalan berada di depan tulang kering bagian bawah.",
      "Luruskan lutut untuk mengangkat bantalan sampai kaki hampir sejajar lurus ke depan.",
      "Turunkan kembali bantalan perlahan sampai lutut menekuk nyaman tanpa menghentakkan beban.",
    ],
    [
      "Sit firmly in the machine with the back supported and the pad resting against the lower shins.",
      "Extend the knees to lift the pad until the legs are nearly straight out in front.",
      "Lower the pad back slowly until the knees are comfortably bent without slamming the weight.",
    ],
    [
      ["Pinggul tetap menempel kursi", "Pegangan stabil"],
      ["Luruskan dari paha depan", "Jangan tendang beban"],
      ["Turun perlahan", "Rentang nyaman untuk lutut"],
    ],
    [
      ["Keep the hips glued to the seat", "Hold the handles steady"],
      ["Extend using the quads", "Do not kick the weight"],
      ["Lower slowly", "Use a knee-friendly range"],
    ]
  ),
  "leg-curl": triple(
    [
      "Atur mesin leg curl sesuai tinggi tubuh, letakkan pergelangan kaki di bawah bantalan dan tubuh menempel pada sandaran.",
      "Tekuk lutut untuk menarik bantalan ke arah bokong sambil menahan pinggul tetap stabil.",
      "Luruskan kembali kaki perlahan sampai hamstring terasa meregang dengan kontrol.",
    ],
    [
      "Set the leg curl machine to your height, place the ankles under the pad, and keep the body supported.",
      "Bend the knees to pull the pad toward the glutes while keeping the hips stable.",
      "Extend the legs back slowly until the hamstrings feel a controlled stretch.",
    ],
    [
      ["Pinggul diam", "Gerak dari lutut"],
      ["Tarik sampai hamstring kontraksi", "Jangan menghentak"],
      ["Turun perlahan", "Jangan lepas ketegangan"],
    ],
    [
      ["Keep the hips still", "Move from the knees"],
      ["Curl until the hamstrings contract", "Do not jerk the load"],
      ["Lower slowly", "Do not lose tension"],
    ]
  ),
  "hip-thrust": triple(
    [
      "Sandarkan punggung atas pada bangku, letakkan bar di atas pinggul, dan kaki menapak selebar pinggul.",
      "Dorong pinggul ke atas sampai lutut, pinggul, dan bahu membentuk garis lurus.",
      "Turunkan pinggul kembali mendekati lantai dengan kontrol sambil menjaga dagu sedikit masuk.",
    ],
    [
      "Rest the upper back on a bench, place the bar across the hips, and set the feet hip width apart.",
      "Drive the hips upward until the knees, hips, and shoulders form a straight line.",
      "Lower the hips back toward the floor with control while keeping the chin slightly tucked.",
    ],
    [
      ["Kaki menapak penuh", "Perut aktif"],
      ["Kontraksikan glute keras di atas", "Jangan hyperextend punggung"],
      ["Turun perlahan", "Jaga tulang kering relatif vertikal"],
    ],
    [
      ["Plant the full foot", "Brace the abs"],
      ["Squeeze the glutes hard at the top", "Do not hyperextend the back"],
      ["Lower slowly", "Keep the shins relatively vertical"],
    ]
  ),
  "calf-raise": triple(
    [
      "Berdiri tegak di lantai atau pada step dengan ujung kaki menumpu dan tumit siap turun sedikit.",
      "Dorong ujung kaki ke lantai untuk mengangkat tumit setinggi mungkin.",
      "Turunkan tumit perlahan sampai terasa peregangan pada betis lalu ulangi.",
    ],
    [
      "Stand tall on the floor or on a step with the balls of the feet supported and the heels ready to drop slightly.",
      "Push through the balls of the feet to raise the heels as high as possible.",
      "Lower the heels slowly until the calves feel a stretch, then repeat.",
    ],
    [
      ["Tubuh tegak", "Pegang penyangga bila perlu"],
      ["Naik setinggi mungkin", "Gerak dari pergelangan kaki"],
      ["Turun perlahan", "Rasakan stretch di betis"],
    ],
    [
      ["Keep the body tall", "Use support if needed"],
      ["Lift as high as possible", "Move through the ankles"],
      ["Lower slowly", "Feel the calf stretch"],
    ]
  ),
  "preacher-curl": triple(
    [
      "Duduk atau berdiri di preacher bench, lengan atas menempel pada pad, dan tangan memegang bar atau dumbbell.",
      "Tekuk siku untuk mengangkat beban ke arah bahu tanpa mengangkat lengan atas dari pad.",
      "Turunkan beban kembali sampai siku hampir lurus sambil menjaga ketegangan pada biceps.",
    ],
    [
      "Sit or stand at the preacher bench with the upper arms resting on the pad and the bar or dumbbell in the hands.",
      "Curl the weight toward the shoulders without lifting the upper arms off the pad.",
      "Lower the weight back until the elbows are almost straight while keeping tension on the biceps.",
    ],
    [
      ["Lengan atas menempel pad", "Pergelangan netral"],
      ["Gerak hanya di siku", "Jangan memantulkan beban"],
      ["Turun penuh kontrol", "Tahan ketegangan"],
    ],
    [
      ["Keep the upper arms on the pad", "Keep the wrists neutral"],
      ["Move only at the elbows", "Do not bounce the load"],
      ["Lower under control", "Maintain tension"],
    ]
  ),
  "assisted-dip": triple(
    [
      "Naik ke mesin dip assist, pegang handle, dan letakkan lutut pada bantalan bantuan dengan siku lurus di atas.",
      "Tekuk siku untuk menurunkan tubuh sampai bahu dan siku nyaman lalu dorong kembali ke atas.",
      "Selesaikan repetisi di posisi atas dengan siku hampir lurus sambil tetap menjaga dada terbuka.",
    ],
    [
      "Step onto the assisted dip machine, grip the handles, and place the knees on the assistance pad with the elbows straight at the top.",
      "Bend the elbows to lower the body to a comfortable depth, then press back up.",
      "Finish the rep at the top with the elbows nearly straight while keeping the chest open.",
    ],
    [
      ["Bahu turun", "Perut aktif"],
      ["Siku menekuk ke belakang", "Turun sejauh nyaman"],
      ["Dorong kuat dari triceps", "Jangan mengangkat bahu"],
    ],
    [
      ["Keep the shoulders down", "Brace the core"],
      ["Let the elbows bend backward", "Lower only to a comfortable depth"],
      ["Press strongly with the triceps", "Do not shrug up"],
    ]
  ),
  "ab-crunch": triple(
    [
      "Atur mesin crunch, duduk dengan punggung rapat pada pad dan pegang handle di depan tubuh.",
      "Tekuk badan ke depan dengan menarik tulang rusuk ke arah panggul sambil mengontraksikan perut.",
      "Kembali perlahan ke posisi netral tanpa melepas kontrol pada beban.",
    ],
    [
      "Set the crunch machine, sit with the back supported, and hold the handles in front of the body.",
      "Crunch forward by drawing the rib cage toward the pelvis while contracting the abs.",
      "Return slowly to the neutral position without losing control of the weight.",
    ],
    [
      ["Perut kencang", "Kaki stabil"],
      ["Gerak dari batang tubuh", "Buang napas saat menekuk"],
      ["Naik perlahan", "Jangan menarik leher"],
    ],
    [
      ["Brace the abs", "Keep the feet stable"],
      ["Move from the torso", "Exhale while crunching"],
      ["Rise slowly", "Do not pull the neck"],
    ]
  ),
  "ab-wheel-rollout": triple(
    [
      "Berlutut, pegang ab wheel di bawah bahu, dan kencangkan perut serta bokong.",
      "Dorong roda ke depan sambil meluruskan tubuh dari lutut sampai bahu tanpa membiarkan pinggang turun.",
      "Tarik roda kembali ke bawah bahu dengan menggunakan perut dan lats sampai kembali ke posisi awal.",
    ],
    [
      "Kneel down, grip the ab wheel under the shoulders, and brace the abs and glutes.",
      "Roll the wheel forward while straightening the body from knees to shoulders without letting the lower back sag.",
      "Pull the wheel back under the shoulders using the abs and lats until you return to the start.",
    ],
    [
      ["Pinggul sejajar", "Leher netral"],
      ["Tubuh seperti papan", "Jangan lengkungkan pinggang"],
      ["Tarik kembali dengan perut", "Kontrol jarak sesuai kemampuan"],
    ],
    [
      ["Keep the hips level", "Maintain a neutral neck"],
      ["Hold a plank-like body", "Do not arch the lower back"],
      ["Pull back with the abs", "Use a controllable range"],
    ]
  ),
  "alternating-curl": triple(
    [
      "Berdiri tegak sambil memegang dua dumbbell di samping tubuh dengan telapak menghadap ke depan.",
      "Angkat satu dumbbell ke arah bahu sambil tangan satunya tetap diam, lalu ganti sisi secara bergantian.",
      "Selesaikan dengan kedua dumbbell kembali di sisi tubuh dan ritme tetap terkontrol.",
    ],
    [
      "Stand tall holding two dumbbells at the sides with the palms facing forward.",
      "Curl one dumbbell toward the shoulder while the other arm stays still, then alternate sides.",
      "Finish with both dumbbells back by the sides while keeping the rhythm controlled.",
    ],
    [
      ["Tubuh tetap diam", "Siku dekat badan"],
      ["Satu sisi bekerja, satu sisi menahan", "Jangan condongkan badan"],
      ["Kembali ke posisi netral", "Jaga tempo stabil"],
    ],
    [
      ["Keep the torso still", "Keep elbows close"],
      ["One side works while the other stays quiet", "Do not lean the torso"],
      ["Return to neutral", "Keep a steady tempo"],
    ]
  ),
  "treadmill-walk": triple(
    [
      "Naik ke treadmill, berdiri tegak, pandangan lurus ke depan, dan mulai dengan kecepatan rendah.",
      "Langkahkan kaki bergantian secara alami sambil mengayun lengan ringan mengikuti ritme jalan.",
      "Pertahankan postur tegak sampai selesai lalu kurangi kecepatan sebelum berhenti.",
    ],
    [
      "Step onto the treadmill, stand tall, look straight ahead, and start with a low speed.",
      "Alternate the feet naturally while lightly swinging the arms with the walking rhythm.",
      "Maintain an upright posture until done, then reduce the speed before stopping.",
    ],
    [
      ["Pegang rail bila perlu", "Bahunya rileks"],
      ["Mendarat lembut", "Langkah stabil"],
      ["Perlambat sebelum turun", "Jangan langsung melompat"],
    ],
    [
      ["Use the rails if needed", "Relax the shoulders"],
      ["Land softly", "Keep the steps steady"],
      ["Slow down before stepping off", "Do not jump off suddenly"],
    ]
  ),
  plank: triple(
    [
      "Posisikan siku tepat di bawah bahu, kaki lurus ke belakang, dan tubuh membentuk garis panjang.",
      "Tahan posisi plank dengan perut, bokong, dan paha aktif sambil bernapas normal.",
      "Akhiri dengan menurunkan lutut secara terkontrol tanpa membiarkan pinggang jatuh.",
    ],
    [
      "Place the elbows directly under the shoulders, extend the legs back, and create one long line with the body.",
      "Hold the plank while keeping the abs, glutes, and thighs active and breathing normally.",
      "Finish by lowering the knees with control instead of letting the lower back collapse.",
    ],
    [
      ["Leher netral", "Siku menekan lantai"],
      ["Tubuh lurus", "Perut dan glute kencang"],
      ["Keluar dengan kontrol", "Jangan menjatuhkan pinggang"],
    ],
    [
      ["Keep the neck neutral", "Press the elbows into the floor"],
      ["Keep a straight line", "Tighten abs and glutes"],
      ["Exit with control", "Do not dump into the low back"],
    ]
  ),
  standing: triple(
    [
      "Mulai dari posisi dasar yang stabil dan siapkan tubuh untuk gerakan latihan.",
      "Lakukan fase utama gerakan dengan rentang yang nyaman dan tetap terkontrol.",
      "Kembali ke posisi awal dengan rapi lalu ulangi bila dibutuhkan.",
    ],
    [
      "Start from a stable base position and prepare the body for the exercise movement.",
      "Perform the main phase through a comfortable range while staying in control.",
      "Return neatly to the starting position and repeat if needed.",
    ],
    [
      ["Kaki stabil", "Postur tegak"],
      ["Gerak halus", "Jaga kontrol"],
      ["Kembali rapi", "Napas tetap teratur"],
    ],
    [
      ["Keep the feet stable", "Stay tall"],
      ["Move smoothly", "Maintain control"],
      ["Return neatly", "Keep breathing steadily"],
    ]
  ),
};


export function getExercise2DMeta(
  preset: ExerciseGuidePreset,
  language: "id" | "en"
): Exercise2DMeta {
  const category = getExercise2DCategory(preset);

  const id: Record<Exercise2DCategory, Exercise2DMeta> = {
    "bench-press": { breathing: "Tarik napas saat bar turun, hembuskan saat mendorong ke atas.", rangeFocus: "Turunkan sampai dada bawah/ tengah tersentuh ringan lalu dorong kembali penuh kontrol.", mistakes: ["Pantulan bar ke dada", "Pinggul terangkat dari bench", "Siku terlalu melebar"] },
    "incline-press": { breathing: "Tarik napas saat turun, hembuskan saat menekan.", rangeFocus: "Turun sampai dumbbell sejajar dada atas, lalu tekan naik sesuai sudut bench.", mistakes: ["Bahu naik ke telinga", "Sudut bench terlalu tegak", "Gerakan terlalu cepat"] },
    "lat-pulldown": { breathing: "Hembuskan saat menarik, tarik napas saat melepas ke atas.", rangeFocus: "Tarik ke dada atas lalu kembali sampai lengan lurus penuh.", mistakes: ["Menarik di belakang leher", "Badan mengayun", "Bahu terangkat"] },
    "seated-row": { breathing: "Hembuskan saat menarik, tarik napas saat meluruskan lengan.", rangeFocus: "Tarik hingga siku melewati garis tubuh lalu kembali sampai punggung atas meregang.", mistakes: ["Pinggang membulat", "Badan terlalu mundur", "Handle dihentak"] },
    "back-squat": { breathing: "Tarik napas dan brace sebelum turun, hembuskan setelah melewati titik tersulit saat naik.", rangeFocus: "Turun setidaknya sampai paha sejajar bila mobilitas memungkinkan, lalu berdiri penuh.", mistakes: ["Lutut masuk ke dalam", "Tumit terangkat", "Punggung terlalu membulat"] },
    "leg-press": { breathing: "Tarik napas saat platform turun, hembuskan saat mendorong.", rangeFocus: "Turun sampai paha mendekat tanpa mengangkat panggul, lalu dorong kembali hampir lurus.", mistakes: ["Lockout terlalu keras", "Pinggul terangkat", "Lutut terlalu menutup"] },
    "romanian-deadlift": { breathing: "Tarik napas saat turun, hembuskan saat pinggul mendorong ke depan.", rangeFocus: "Turun sampai hamstring meregang tanpa kehilangan punggung netral.", mistakes: ["Bar jauh dari kaki", "Pinggang membulat", "Lutut terlalu menekuk"] },
    "split-squat": { breathing: "Tarik napas saat turun, hembuskan saat naik.", rangeFocus: "Turun vertikal sampai lutut belakang hampir menyentuh lantai, lalu dorong naik.", mistakes: ["Beban jatuh ke kaki belakang", "Badan terlalu condong", "Langkah terlalu pendek"] },
    "shoulder-press": { breathing: "Hembuskan saat mendorong ke atas, tarik napas saat turun.", rangeFocus: "Mulai dari level telinga/bahu lalu tekan sampai hampir lurus di atas kepala.", mistakes: ["Punggung melengkung", "Dumbbell terlalu ke depan", "Siku turun berlebihan"] },
    "lateral-raise": { breathing: "Hembuskan saat mengangkat, tarik napas saat menurunkan.", rangeFocus: "Naik sampai setinggi bahu lalu turun terkontrol.", mistakes: ["Mengayun badan", "Dumbbell terlalu tinggi", "Bahu naik"] },
    "barbell-curl": { breathing: "Hembuskan saat menekuk siku, tarik napas saat menurunkan.", rangeFocus: "Angkat sampai kontraksi biceps penuh lalu turunkan sampai siku hampir lurus.", mistakes: ["Badan mengayun", "Siku maju", "Pergelangan tertekuk"] },
    "hammer-curl": { breathing: "Hembuskan saat mengangkat, tarik napas saat turun.", rangeFocus: "Naik sampai dumbbell dekat bahu dengan grip netral lalu kembali turun penuh kontrol.", mistakes: ["Mengangkat bahu", "Ayunan tubuh", "Siku menjauh dari badan"] },
    "triceps-pushdown": { breathing: "Hembuskan saat menekan ke bawah, tarik napas saat kembali.", rangeFocus: "Luruskan siku penuh lalu kembali sampai triceps meregang.", mistakes: ["Lengan atas ikut bergerak", "Badan membungkuk", "Pergelangan patah"] },
    "cable-crunch": { breathing: "Hembuskan saat crunch, tarik napas saat kembali netral.", rangeFocus: "Tekuk dari perut hingga siku mendekat ke lutut, lalu kembali perlahan.", mistakes: ["Menarik dengan lengan", "Pinggul terlalu banyak bergerak", "Leher menegang"] },
    "machine-press": { breathing: "Hembuskan saat mendorong, tarik napas saat kembali.", rangeFocus: "Dorong sampai hampir lurus lalu kembali sampai dada terasa teregang nyaman.", mistakes: ["Bahu maju", "Punggung lepas dari sandaran", "Gerakan dipantulkan"] },
    "pec-deck": { breathing: "Hembuskan saat merapatkan lengan, tarik napas saat membuka.", rangeFocus: "Rapatkan di depan dada lalu buka sampai dada meregang nyaman.", mistakes: ["Siku berubah-ubah", "Bahu terlalu tertarik", "Gerakan terlalu cepat"] },
    "assisted-pull-up": { breathing: "Hembuskan saat menarik tubuh, tarik napas saat turun.", rangeFocus: "Naik sampai dagu mendekati handle lalu turun sampai lengan hampir lurus.", mistakes: ["Ayunan berlebihan", "Leher maju duluan", "Turun terlalu cepat"] },
    "hack-squat": { breathing: "Tarik napas saat turun, hembuskan saat naik.", rangeFocus: "Turun sampai kedalaman nyaman dengan tumit menempel, lalu dorong naik.", mistakes: ["Lutut masuk ke dalam", "Pinggul lepas dari pad", "Lockout keras"] },
    "leg-extension": { breathing: "Hembuskan saat meluruskan kaki, tarik napas saat turun.", rangeFocus: "Luruskan sampai kontraksi quads terasa lalu turunkan perlahan.", mistakes: ["Menendang beban", "Pinggul terangkat", "Rentang terlalu dipaksa"] },
    "leg-curl": { breathing: "Hembuskan saat menekuk lutut, tarik napas saat meluruskan.", rangeFocus: "Tekuk sampai hamstring kontraksi penuh lalu kembali sampai meregang nyaman.", mistakes: ["Pinggul bergerak", "Beban dihentak", "Gerakan setengah-setengah"] },
    "hip-thrust": { breathing: "Hembuskan saat pinggul naik, tarik napas saat turun.", rangeFocus: "Naik sampai tubuh membentuk garis lurus lalu turun hampir menyentuh lantai.", mistakes: ["Hyperextend punggung", "Lutut terlalu melebar/menutup", "Tulang kering tidak stabil"] },
    "calf-raise": { breathing: "Hembuskan saat naik ke ujung kaki, tarik napas saat turun.", rangeFocus: "Naik setinggi mungkin dan turunkan sampai betis terasa meregang.", mistakes: ["Memantul", "Rentang terlalu pendek", "Badan condong berlebihan"] },
    "preacher-curl": { breathing: "Hembuskan saat mengangkat, tarik napas saat menurunkan.", rangeFocus: "Naik sampai kontraksi biceps lalu turun sampai hampir lurus tanpa mengunci keras.", mistakes: ["Lengan atas terangkat dari pad", "Beban dipantulkan", "Pergelangan terlalu menekuk"] },
    "assisted-dip": { breathing: "Tarik napas saat turun, hembuskan saat mendorong naik.", rangeFocus: "Turun sampai bahu nyaman lalu tekan kembali ke posisi atas.", mistakes: ["Bahu terangkat", "Turun terlalu dalam", "Ayunan tubuh"] },
    "ab-crunch": { breathing: "Hembuskan saat crunch, tarik napas saat kembali.", rangeFocus: "Tekuk batang tubuh sampai abs berkontraksi jelas lalu kembali netral perlahan.", mistakes: ["Menarik leher", "Menggunakan momentum", "Pinggul ikut menendang"] },
    "ab-wheel-rollout": { breathing: "Tarik napas saat rollout, hembuskan saat menarik kembali.", rangeFocus: "Roll sejauh tubuh masih bisa lurus lalu kembali dengan kontrol.", mistakes: ["Pinggang melengkung", "Bahu kehilangan kontrol", "Jarak terlalu jauh"] },
    "alternating-curl": { breathing: "Hembuskan saat satu sisi naik, tarik napas saat turun lalu ulang sisi lain.", rangeFocus: "Satu dumbbell naik ke bahu sementara sisi lain tetap diam dan stabil.", mistakes: ["Bergoyang kiri-kanan", "Kedua tangan bergerak bersamaan", "Siku maju"] },
    "treadmill-walk": { breathing: "Bernapas normal dan ritmis sepanjang jalan.", rangeFocus: "Langkah konsisten, lembut, dan seimbang dari tumit ke ujung kaki.", mistakes: ["Pegang rail terus-menerus", "Langkah terlalu panjang", "Melihat ke bawah terus"] },
    plank: { breathing: "Bernapas pendek namun stabil tanpa menahan napas.", rangeFocus: "Pertahankan garis lurus dari kepala sampai tumit selama durasi tahanan.", mistakes: ["Pinggul turun", "Pinggul terlalu tinggi", "Leher menegang"] },
    standing: { breathing: "Bernapas teratur sesuai ritme gerak.", rangeFocus: "Gunakan rentang gerak yang nyaman dan terkontrol.", mistakes: ["Gerakan terburu-buru", "Postur tidak stabil", "Kehilangan kontrol"] },
  };

  const en: Record<Exercise2DCategory, Exercise2DMeta> = {
    "bench-press": { breathing: "Inhale as the bar lowers, exhale as you press up.", rangeFocus: "Lower to the lower/mid chest with a light touch, then press back up under control.", mistakes: ["Bouncing the bar", "Hips lifting off the bench", "Elbows flaring too wide"] },
    "incline-press": { breathing: "Inhale on the way down, exhale on the press.", rangeFocus: "Lower until the dumbbells reach upper-chest level, then press up along the bench angle.", mistakes: ["Shrugging the shoulders", "Bench angle too steep", "Rushing the movement"] },
    "lat-pulldown": { breathing: "Exhale as you pull, inhale as you return overhead.", rangeFocus: "Pull to the upper chest and return to full arm extension.", mistakes: ["Pulling behind the neck", "Swinging the torso", "Shrugging the shoulders"] },
    "seated-row": { breathing: "Exhale on the pull, inhale as the arms lengthen.", rangeFocus: "Pull until the elbows pass the torso, then reach forward until the upper back stretches.", mistakes: ["Rounding the lower back", "Leaning too far back", "Jerking the handle"] },
    "back-squat": { breathing: "Inhale and brace before the descent, exhale after the hardest part of the ascent.", rangeFocus: "Descend to at least parallel when mobility allows, then stand back up fully.", mistakes: ["Knees caving in", "Heels lifting", "Rounding the back too much"] },
    "leg-press": { breathing: "Inhale as the platform lowers, exhale as you press.", rangeFocus: "Lower until the thighs approach the torso without the hips lifting, then press back to near-straight legs.", mistakes: ["Hard lockout", "Hips lifting", "Knees collapsing inward"] },
    "romanian-deadlift": { breathing: "Inhale on the descent, exhale as the hips drive forward.", rangeFocus: "Lower until the hamstrings stretch while maintaining a neutral spine.", mistakes: ["Bar drifting away from the legs", "Rounding the back", "Bending the knees too much"] },
    "split-squat": { breathing: "Inhale as you lower, exhale as you rise.", rangeFocus: "Drop vertically until the back knee nearly touches the floor, then drive back up.", mistakes: ["Too much weight on the back leg", "Leaning the torso forward too much", "Stride too short"] },
    "shoulder-press": { breathing: "Exhale as you press up, inhale as you lower.", rangeFocus: "Start from shoulder/ear level and press to a near-straight overhead position.", mistakes: ["Overarching the back", "Pressing too far forward", "Dropping the elbows too low"] },
    "lateral-raise": { breathing: "Exhale as you raise, inhale as you lower.", rangeFocus: "Lift to shoulder height and lower with control.", mistakes: ["Swinging the body", "Lifting too high", "Shrugging the shoulders"] },
    "barbell-curl": { breathing: "Exhale as you curl, inhale as you lower.", rangeFocus: "Curl to full biceps contraction, then lower until the elbows are nearly straight.", mistakes: ["Swinging the torso", "Elbows drifting forward", "Bent wrists"] },
    "hammer-curl": { breathing: "Exhale as you lift, inhale on the way down.", rangeFocus: "Lift until the dumbbells near the shoulders with a neutral grip, then lower with control.", mistakes: ["Shrugging the shoulders", "Using body swing", "Letting elbows drift away"] },
    "triceps-pushdown": { breathing: "Exhale as you press down, inhale as you return.", rangeFocus: "Straighten the elbows fully, then return until the triceps stretch.", mistakes: ["Moving the upper arms", "Hunching over", "Broken wrists"] },
    "cable-crunch": { breathing: "Exhale during the crunch, inhale as you return to neutral.", rangeFocus: "Curl through the abs until the elbows move toward the knees, then come back slowly.", mistakes: ["Pulling with the arms", "Moving the hips too much", "Tensing the neck"] },
    "machine-press": { breathing: "Exhale on the press, inhale on the return.", rangeFocus: "Press until almost straight and return until the chest stretches comfortably.", mistakes: ["Shoulders rolling forward", "Back leaving the pad", "Bouncing the reps"] },
    "pec-deck": { breathing: "Exhale as the arms come together, inhale as they open.", rangeFocus: "Squeeze together in front of the chest, then open until the chest stretches comfortably.", mistakes: ["Changing elbow angle", "Overstretching the shoulders", "Moving too fast"] },
    "assisted-pull-up": { breathing: "Exhale as you pull up, inhale as you lower.", rangeFocus: "Rise until the chin nears handle level, then lower until the arms are almost straight.", mistakes: ["Excessive swinging", "Leading with the neck", "Dropping too fast"] },
    "hack-squat": { breathing: "Inhale on the descent, exhale on the ascent.", rangeFocus: "Lower to a comfortable depth with the heels down, then press up.", mistakes: ["Knees caving in", "Hips leaving the pad", "Hard lockout"] },
    "leg-extension": { breathing: "Exhale as you extend, inhale as you lower.", rangeFocus: "Extend until the quads fully contract, then lower slowly.", mistakes: ["Kicking the weight", "Hips lifting", "Forcing the range"] },
    "leg-curl": { breathing: "Exhale as you curl, inhale as you lengthen.", rangeFocus: "Curl until the hamstrings fully contract, then extend until they stretch comfortably.", mistakes: ["Hips moving around", "Jerking the load", "Cutting the range short"] },
    "hip-thrust": { breathing: "Exhale as the hips rise, inhale as they lower.", rangeFocus: "Lift until the body forms a straight line, then lower back toward the floor.", mistakes: ["Hyperextending the lower back", "Knees caving or flaring too much", "Unstable shin angle"] },
    "calf-raise": { breathing: "Exhale as you rise onto the toes, inhale as you lower.", rangeFocus: "Rise as high as possible and lower until the calves fully stretch.", mistakes: ["Bouncing", "Very short range", "Leaning the torso too much"] },
    "preacher-curl": { breathing: "Exhale as you curl up, inhale as you lower.", rangeFocus: "Lift to full biceps contraction and lower until almost straight without slamming the elbow.", mistakes: ["Upper arms lifting off the pad", "Bouncing the weight", "Overbending the wrists"] },
    "assisted-dip": { breathing: "Inhale as you lower, exhale as you press up.", rangeFocus: "Lower to a shoulder-friendly depth and press back to the top.", mistakes: ["Shrugged shoulders", "Going too deep", "Swinging the body"] },
    "ab-crunch": { breathing: "Exhale during the crunch, inhale on the return.", rangeFocus: "Curl the torso until the abs fully contract, then return to neutral slowly.", mistakes: ["Pulling with the neck", "Using momentum", "Kicking with the hips"] },
    "ab-wheel-rollout": { breathing: "Inhale on the rollout, exhale as you pull back.", rangeFocus: "Roll out only as far as you can keep a straight body line, then return with control.", mistakes: ["Sagging the low back", "Losing shoulder control", "Rolling too far"] },
    "alternating-curl": { breathing: "Exhale as one side curls up, inhale as it lowers, then repeat on the other side.", rangeFocus: "One dumbbell travels to the shoulder while the other arm stays still and stable.", mistakes: ["Rocking side to side", "Moving both hands at once", "Elbows drifting forward"] },
    "treadmill-walk": { breathing: "Breathe normally and rhythmically throughout the walk.", rangeFocus: "Use smooth, consistent steps from heel strike to toe-off.", mistakes: ["Holding the rails the whole time", "Overstriding", "Looking down constantly"] },
    plank: { breathing: "Keep breathing steadily without holding your breath.", rangeFocus: "Maintain one straight line from the head through the heels for the full hold.", mistakes: ["Sagging hips", "Hips too high", "Tense neck"] },
    standing: { breathing: "Breathe steadily with the movement rhythm.", rangeFocus: "Work through a comfortable and controlled range.", mistakes: ["Rushing the movement", "Unstable posture", "Losing control"] },
  };

  return language === "id" ? id[category] : en[category];
}

export function getExercise2DSteps(
  guide: Pick<ExerciseGuide, "phases" | "preset">,
  language: "id" | "en"
): Exercise2DStep[] {
  const presetCategory = getExercise2DCategory(guide.preset);
  const detailed = DETAILED_STEPS[presetCategory];
  const titles = STEP_TITLES[language];

  if (detailed) {
    return detailed[language].map((step, index) => ({
      title: titles[index],
      caption: step.caption,
      coachingCues: step.coachingCues,
    }));
  }

  const phases = guide.phases.filter(Boolean);
  const genericEnd =
    language === "id"
      ? "Kembali ke posisi awal dengan kontrol lalu ulangi sesuai kebutuhan."
      : "Return to the starting position with control, then repeat as needed.";

  return [0, 1, 2].map((index) => ({
    title: titles[index],
    caption: phases[index] ?? (index === 2 ? genericEnd : phases[phases.length - 1] ?? genericEnd),
    coachingCues:
      language === "id"
        ? ["Jaga bentuk gerakan", "Lakukan dengan kontrol"]
        : ["Keep good form", "Move with control"],
  }));
}
