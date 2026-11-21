// Checks the maths behind the two interactive pages, in Node, with no browser.
//
//   node tools/test-tools.js
//
// The sun expectations are independent of the code under test: noon altitude
// is plain geometry (90 - latitude +/- the Earth's tilt at the solstices), and
// the sunrise/sunset times are the published Delhi NCR values for those days.
// A sign error, a wrong time zone or a hour-angle slip is off by tens of
// minutes or degrees, so the tolerances catch them without chasing seconds.
const assert = require('node:assert/strict');
const S = require('../sun-path.js');
const R = require('../room-planner.js');

const near = (got, want, tol, what) =>
  assert.ok(Math.abs(got - want) <= tol, `${what}: got ${got.toFixed(2)}, want ${want} +/- ${tol}`);
const hm = (h, m) => h * 60 + m;

const LAT = 28.6424, TILT = 23.44;

for (const [label, month, day, noonAlt, rise, set] of [
  ['June solstice', 6, 21, 90 - LAT + TILT, hm(5, 23), hm(19, 21)],
  ['December solstice', 12, 21, 90 - LAT - TILT, hm(7, 9), hm(17, 28)],
]) {
  const doy = S.dayOfYear(2026, month, day);
  const t = S.dayTimes(doy);
  near(S.sunAt(doy, t.noon).alt, noonAlt, 0.3, `${label} noon altitude`);
  near(S.sunAt(doy, t.noon).az, 180, 0.5, `${label} noon azimuth`);
  near(t.rise, rise, 3, `${label} sunrise (minutes)`);
  near(t.set, set, 3, `${label} sunset (minutes)`);
}

// Morning sun is east of south, afternoon sun west of it; night is below the horizon.
const dec21 = S.dayOfYear(2026, 12, 21);
assert.ok(S.sunAt(dec21, hm(9, 0)).az < 180, 'morning sun should be in the east');
assert.ok(S.sunAt(dec21, hm(15, 0)).az > 180, 'afternoon sun should be in the west');
assert.ok(S.sunAt(dec21, hm(23, 0)).alt < 0, 'the sun is down at 23:00');
assert.equal(S.dayOfYear(2026, 1, 1), 1);
assert.equal(S.dayOfYear(2024, 12, 31), 366);

// Room geometry.
const rect = [[0, 0], [14, 0], [14, 12], [0, 12]];
assert.equal(Math.abs(R.signedArea(rect)), 168);
assert.equal(R.perimeter(rect), 52);
assert.ok(R.valid(rect), 'a plain rectangle is a valid room');

const lShape = [[0, 0], [18, 0], [18, 9], [9, 9], [9, 18], [0, 18]];
assert.equal(Math.abs(R.signedArea(lShape)), 18 * 9 + 9 * 9);
assert.ok(R.valid(lShape), 'an L-shaped room is valid');

// Winding must not change the answer.
assert.equal(Math.abs(R.signedArea(rect.slice().reverse())), 168);

assert.ok(!R.valid([[0, 0], [10, 10], [10, 0], [0, 10]]), 'a bow-tie is not a room');
assert.ok(!R.valid([[0, 0], [10, 0], [5, 0], [5, 5]]), 'a wall folded back on itself is not a room');
assert.ok(!R.valid([[0, 0], [0.5, 0], [0.5, 8], [0, 8]]), 'walls under a foot are rejected');

// Outward normals point away from the room whichever way it is wound.
for (const poly of [rect, rect.slice().reverse()]) {
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const [nx, ny] = R.outward(poly, i);
    const probe = [(a[0] + b[0]) / 2 + nx, (a[1] + b[1]) / 2 + ny];
    const inside = probe[0] > 0 && probe[0] < 14 && probe[1] > 0 && probe[1] < 12;
    assert.ok(!inside, `edge ${i} normal points into the room`);
  });
}

// Fee estimator. The rates are the studio's published "from" prices; a change
// to any of them should be a deliberate edit here too, not a slip.
const F = require('../fee-estimator.js');
assert.deepEqual(
  Object.fromEntries(F.RATES.map((r) => [r.id, [r.rate, r.per]])),
  { plan: [2000, 'floor'], structure: [5000, 'project'], services: [2000, 'project'], elevation: [4000, 'project'], visit: [500, 'visit'] },
);
const all = new Set(['plan', 'structure', 'services', 'elevation', 'visit']);
const defaults = new Set(F.RATES.filter((r) => r.on).map((r) => r.id));
assert.equal(F.estimate(defaults, 1, 0).total, 2000 + 5000 + 2000 + 4000);
assert.equal(F.estimate(defaults, 3, 0).total, 3 * 2000 + 5000 + 2000 + 4000, 'the floor plan scales with floors');
assert.equal(F.estimate(all, 2, 4).total, 2 * 2000 + 5000 + 2000 + 4000 + 4 * 500, 'visits scale with count');
assert.equal(F.estimate(new Set(['visit']), 1, 0).lines.length, 0, 'zero visits is no line, not a zero-rupee line');
assert.equal(F.estimate(new Set(), 2, 2).total, 0);
assert.equal(F.estimate(new Set(['plan']), 0, 0).total, 2000, 'a building has at least one floor');
assert.equal(F.estimate(new Set(['plan']), 2.7, 0).total, 4000, 'floors are whole');

console.log('test-tools: sun, room and fee maths OK');
