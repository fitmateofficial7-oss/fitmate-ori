const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const assert = (ok, label) => { if (!ok) throw new Error(`FAIL ${label}`); checks.push(`PASS ${label}`); };

const coach = read('app/coach/page.tsx');
assert(coach.includes('fitmate-coach-shell') && coach.includes('h-[100dvh]'), 'Coach uses a full-height chat shell');
assert(!coach.includes('href="/nutrition"'), 'Coach header is consultation-only');
assert(coach.includes('fitmate-coach-composer') && coach.includes('fitmate-chat-bubble'), 'Coach has native chat bubbles and composer');

const hooks = {
  'app/dashboard/page.tsx': 'fitmate-dashboard-page',
  'app/plan/page.tsx': 'fitmate-plan-page',
  'app/workout/page.tsx': 'fitmate-workout-page',
  'app/exercises/page.tsx': 'fitmate-exercises-page',
  'app/progress/page.tsx': 'fitmate-progress-page',
  'app/nutrition/page.tsx': 'fitmate-nutrition-page',
  'app/jogging/page.tsx': 'fitmate-jogging-page',
  'app/coach/page.tsx': 'fitmate-coach-page',
  'app/settings/page.tsx': 'fitmate-settings-page',
  'app/premium/page.tsx': 'fitmate-premium-page',
  'app/motivation/page.tsx': 'fitmate-motivation-page',
};
for (const [file, hook] of Object.entries(hooks)) assert(read(file).includes(hook), `${hook} mobile hook exists`);

const css = read('app/globals.css');
for (const marker of ['FitMate v14.84 — true mobile app pass', '.fitmate-coach-page', '.fitmate-plan-page', '.fitmate-exercises-grid', '.fitmate-jogging-page']) {
  assert(css.includes(marker), `v14.84 CSS marker ${marker}`);
}

const nutrition = read('app/nutrition/page.tsx');
assert(nutrition.includes('fitmate-nutrition-page') && nutrition.includes('camera'), 'Nutrition remains the meal-scan surface');

console.log(checks.join('\n'));
console.log(`PASS ${checks.length} mobile app checks`);
