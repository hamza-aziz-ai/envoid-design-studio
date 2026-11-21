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

// Staircase. A 10 ft (3048 mm) floor height splits into 18 risers of about
// 169 mm, and the comfort check follows Blondel's 2R + T.
const St = require('../staircase.js');
const ten = 10 * St.MM_PER_FT;
assert.equal(St.suggest(ten), 18);
const stair = St.design(ten, 18, 275);
near(stair.riser, 169.33, 0.01, 'riser');
assert.equal(stair.treads, 17, 'one fewer tread than risers: the last step is the upper floor');
assert.equal(stair.run, 17 * 275);
near(stair.blondel, 2 * 169.33 + 275, 0.05, '2R + T');
assert.equal(St.feel(stair).tone, 'good');
assert.equal(St.feel(St.design(ten, 10, 220)).tone, 'bad', 'tall risers on short treads are flagged');
assert.equal(St.feel(St.design(ten, 30, 225)).tone, 'bad', 'tiny risers on short treads are flagged');
assert.equal(St.design(ten, 1, 275).risers, 2, 'a stair has at least two risers');

// Guess the area: every generated room is a valid outline with a whole-foot area.
const G = require('../guess-the-area.js');
let seed = 7;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const kinds = new Set();
for (let i = 0; i < 2000; i++) {
  const { kind, pts } = G.make(rng);
  kinds.add(kind);
  assert.ok(R.valid(pts), `generated ${kind} is not a valid room: ${JSON.stringify(pts)}`);
  assert.ok(Number.isInteger(Math.abs(R.signedArea(pts))), 'areas are whole square feet');
}
assert.equal(kinds.size, G.KINDS.length, 'every room shape turns up');
assert.equal(G.score(100, 100), 100);
assert.equal(G.score(110, 100), 80);
assert.equal(G.score(90, 100), 80, 'over and under score the same');
assert.equal(G.score(300, 100), 0, 'never below zero');

// Will it fit.
const Fit = require('../furniture-planner.js');
const room = { w: 12, l: 14 }, door = { x: 1, w: 3 };
assert.ok(Fit.overlap({ x: 0, y: 0, w: 2, d: 2 }, { x: 1, y: 1, w: 2, d: 2 }));
assert.ok(!Fit.overlap({ x: 0, y: 0, w: 2, d: 2 }, { x: 2, y: 0, w: 2, d: 2 }), 'touching is not overlapping');
assert.ok(!Fit.inside({ x: 11, y: 0, w: 2, d: 2 }, room), 'crossing a wall is caught');
assert.deepEqual(Fit.gaps({ x: 4, y: 4, w: 2, d: 2 }, [{ x: 0, y: 4, w: 3, d: 2 }], room), { left: 1, right: 6, top: 4, bottom: 8 });
assert.ok(Fit.blocksDoor({ x: 2, y: 12, w: 1, d: 1 }, room, door), 'a piece in the swing blocks the door');
assert.ok(!Fit.blocksDoor({ x: 5, y: 12, w: 1, d: 1 }, room, door), 'a piece beyond the swing does not');
assert.ok(!Fit.blocksDoor({ x: 0, y: 12, w: 0.5, d: 2 }, room, door), 'a piece behind the hinge does not');
assert.ok(Fit.CATALOGUE.every((c) => c.w > 0 && c.d > 0 && c.name), 'every catalogue piece has a size');

// 3D room: the sun's direction in room coordinates, where the window is in the
// x = 0 wall facing -x. Sun straight in front of the window must point back out
// through it (-x); sun behind the window must not reach in; and the same sun and
// window must agree with the 2D sunlight explorer on which side light lands.
const R3 = require('../room-3d.js');
const ahead = R3.sunInRoom({ az: 180, alt: 30 }, 180);
near(ahead[0], -Math.cos(Math.PI / 6), 1e-9, 'sun ahead is out through the window');
near(ahead[1], 0.5, 1e-9, 'altitude 30 degrees');
near(ahead[2], 0, 1e-9, 'no sideways component');
assert.ok(R3.sunInRoom({ az: 0, alt: 30 }, 180)[0] > 0, 'sun behind the window cannot shine through it');
// Sun 45 degrees to the window's right (south-west for a south window): light then
// lands to the left inside, which is +z here and +u in the sunlight explorer's room.
const side = R3.sunInRoom({ az: 225, alt: 30 }, 180);
assert.ok(side[2] < 0, 'the sun to the right of the window is towards -z');

console.log('test-tools: sun, room, stair, game, furniture and 3D maths OK');
