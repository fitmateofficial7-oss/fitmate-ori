import assert from "node:assert/strict";

import {
  PREMIUM_QRIS_ACCESS_DAYS,
  PREMIUM_WEEKLY_GENERATION_LIMIT,
  createQrisAccessPeriod,
  getJakartaWeekWindow,
  getPremiumPaymentMode,
} from "../lib/subscription.ts";

const paidAt = new Date("2026-08-05T08:30:00.000Z");
const period = createQrisAccessPeriod(paidAt);

assert.equal(period.start.toISOString(), paidAt.toISOString());
assert.equal(
  period.end.getTime() - period.start.getTime(),
  PREMIUM_QRIS_ACCESS_DAYS * 24 * 60 * 60 * 1000
);
assert.equal(period.end.toISOString(), "2026-09-04T08:30:00.000Z");
assert.equal(getPremiumPaymentMode({ payment_mode: "qris" }), "qris");
assert.equal(getPremiumPaymentMode({ payment_mode: "recurring" }), "recurring");
assert.equal(getPremiumPaymentMode({}), "recurring");
assert.throws(() => createQrisAccessPeriod(new Date("invalid")));
assert.equal(PREMIUM_WEEKLY_GENERATION_LIMIT, 10);

const beforeJakartaReset = getJakartaWeekWindow(
  new Date("2026-08-02T16:59:59.000Z")
);
assert.equal(beforeJakartaReset.key, "2026-07-27");
assert.equal(beforeJakartaReset.start.toISOString(), "2026-07-26T17:00:00.000Z");
assert.equal(beforeJakartaReset.end.toISOString(), "2026-08-02T17:00:00.000Z");

const atJakartaReset = getJakartaWeekWindow(
  new Date("2026-08-02T17:00:00.000Z")
);
assert.equal(atJakartaReset.key, "2026-08-03");
assert.equal(atJakartaReset.start.toISOString(), "2026-08-02T17:00:00.000Z");
assert.equal(atJakartaReset.end.toISOString(), "2026-08-09T17:00:00.000Z");
assert.throws(() => getJakartaWeekWindow(new Date("invalid")));

console.log("Billing period tests passed.");
