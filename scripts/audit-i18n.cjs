const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = process.cwd();
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${message}`);
  }
};

const pageFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'page.tsx') pageFiles.push(path.relative(root, full).replaceAll('\\', '/'));
  }
}
walk(path.join(root, 'app'));

const uncoveredPages = pageFiles.filter((file) => {
  const text = source(file);
  return !text.includes('useLanguage') && !text.includes('LegalDocumentPage') && !text.includes('redirect(');
});
assert(uncoveredPages.length === 0, `every user-facing page is language-aware (${pageFiles.length} pages)`);
if (uncoveredPages.length) console.error(uncoveredPages);

const indonesianUiWords = /\b(?:Anda|Kamu|Tidak|Silakan|Berhasil|Gagal|Mulai|Selesai|Batal|Hapus|Simpan|Kembali|Beranda|Latihan|Pengguna|Akun|Gratis|Lanjut|Tutup|Buka|Pilih|Cari|Semua|Riwayat|Durasi|Kalori|Jarak|Kecepatan|Berat|Tinggi|Usia|Makanan|Konsultasi|Rute|Lokasi|Foto|Kesalahan|Langkah|Otot|Istirahat|Perpanjang|Cabut|Kedaluwarsa|Pembayaran|Langganan|Profil|Pengaturan|Bahasa|Tema|Keluar|Masuk|Daftar|Memuat|Memproses|fitur|paket|jadwal|tujuan|pengalaman|kebugaran|pemulihan|cedera|sarapan|camilan)\b/i;

function allTsx(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...allTsx(full));
    else if (entry.name.endsWith('.tsx')) result.push(full);
  }
  return result;
}

const directLeaks = [];
for (const full of [...allTsx(path.join(root, 'app')), ...allTsx(path.join(root, 'components'))]) {
  const text = fs.readFileSync(full, 'utf8');
  const sf = ts.createSourceFile(full, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = path.relative(root, full).replaceAll('\\', '/');

  function inTranslationCall(node) {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === 'tr') return true;
      if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) break;
    }
    return false;
  }

  function inLanguageConditional(node) {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isConditionalExpression(p) && /(language|english)/.test(p.condition.getText(sf))) return true;
      if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p)) break;
    }
    return false;
  }

  function report(node, value) {
    const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    directLeaks.push(`${rel}:${pos.line + 1}: ${value.replace(/\s+/g, ' ').trim()}`);
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      const value = node.text.replace(/\s+/g, ' ').trim();
      if (value && indonesianUiWords.test(value)) report(node, value);
    }

    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const attr = node.name.text;
      const value = node.initializer.text;
      const paired = /(?:Id|ID)$/.test(attr) || ['value', 'name', 'href', 'className', 'id', 'type'].includes(attr);
      if (!paired && indonesianUiWords.test(value)) report(node.initializer, `${attr}=${value}`);
    }

    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && indonesianUiWords.test(node.text)) {
      const parent = node.parent;
      if (ts.isJsxExpression(parent) && !inTranslationCall(node) && !inLanguageConditional(node)) {
        report(node, node.text);
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(sf);
}

assert(directLeaks.length === 0, 'no direct Indonesian UI literals bypass the language switch');
if (directLeaks.length) console.error(directLeaks.slice(0, 80).join('\n'));

const languageProvider = source('components/language-provider.tsx');
assert(languageProvider.includes('document.documentElement.lang = language'), 'HTML language attribute follows the selected language');
assert(languageProvider.includes('fitmate_language'), 'language choice persists locally');

const nutrition = source('app/nutrition/page.tsx');
assert(nutrition.includes('const { language, tr } = useLanguage()'), 'Nutrition uses the active language for dynamic labels and dates');
assert(nutrition.includes('mealTypeLabel(entry.meal_type, language)'), 'stored nutrition meal types are localized');

const dashboard = source('app/dashboard/page.tsx');
assert(dashboard.includes('localizeGoal(profile?.goal, language)') && dashboard.includes('localizeWorkoutSessionName'), 'Dashboard localizes stored profile and workout values');

const plan = source('app/plan/page.tsx');
assert(plan.includes('localizePlanTitle(plan.title, language)') && plan.includes('localizeWorkoutDayName') && plan.includes('localizeWorkoutFocus'), 'Plan localizes stored/generated plan labels');

const workout = source('app/workout/page.tsx');
assert(workout.includes('localizeWorkoutDayName') && workout.includes('localizeWorkoutFocus') && workout.includes('localizeWorkoutSessionName'), 'Workout localizes stored workout labels');

const progress = source('app/progress/page.tsx');
assert(progress.includes('localizeStoredProgressionReason') && progress.includes('localizeWorkoutSessionName'), 'Progress localizes stored recommendations and workout names');

const jogging = source('app/jogging/page.tsx');
assert(jogging.includes('localizeJoggingTitle') && jogging.includes('language,'), 'Jogging localizes stored titles and share output');

const joggingShare = source('lib/jogging-share.ts');
assert(joggingShare.includes('language?: "id" | "en"') && joggingShare.includes('GPS route not available yet'), 'exported jogging cards support English');

const routeMap = source('components/jogging-route-map.tsx');
assert(routeMap.includes('const { tr } = useLanguage()'), 'jogging map labels use the language switch');

const pwa = source('components/pwa-manager.tsx');
const timer = source('lib/rest-timer-notifications.ts');
const nativeGps = source('lib/native-background-location.ts');
assert(pwa.includes('fitmate_language') && timer.includes('fitmate_language') && nativeGps.includes('fitmate_language'), 'background notifications follow the saved language');

const coachClient = source('app/coach/page.tsx');
const coachApi = source('app/api/coach/route.ts');
assert(coachClient.includes('language') && coachApi.includes('body.language === "en"'), 'Coach requests and server responses follow the selected language');

const planApi = source('app/api/generate-plan/route.ts');
assert(planApi.includes('body.language === "en" ? "en" : "id"'), 'AI plan generation follows the selected language');

const premiumClient = source('app/premium/page.tsx');
const checkoutApi = source('app/api/billing/checkout/route.ts');
assert(premiumClient.includes('language,') && checkoutApi.includes('const language = body.language === "en" ? "en" : "id"'), 'Xendit checkout receives the selected language');
assert(checkoutApi.includes('locale: language'), 'hosted payment locale follows the selected language');

const legalFiles = ['app/privacy/page.tsx', 'app/terms/page.tsx', 'app/refund/page.tsx', 'app/subscription-terms/page.tsx'];
assert(legalFiles.every((file) => source(file).includes('copyEn')), 'all legal pages include dedicated English copy');

if (process.exitCode) process.exit(process.exitCode);
console.log(JSON.stringify({ status: 'PASS', pages: pageFiles.length, directUiLeaks: directLeaks.length }, null, 2));
