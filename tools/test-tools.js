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

// Suggested layouts: every one offered, across many rooms and door positions,
// passes the hand-placed checks and keeps its clear zones, and has its key pieces.
const need = { bedroom: [/bed$/i, /wardrobe/i], living: [/sofa/i, /tv/i], 'living-dining': [/sofa/i, /tv/i, /dining/i], kids: [/single bed/i, /wardrobe/i, /desk/i], 'kids-twin': [/single bed/i, /wardrobe/i], 'kids-bunk': [/bunk bed/i, /wardrobe/i, /desk/i], 'kids-loft': [/loft bed/i, /wardrobe/i], 'kids-loft-robe': [/loft bed with wardrobe/i, /desk/i], 'kids-trundle': [/trundle bed/i, /wardrobe/i, /desk/i], kitchen: [/fridge/i, /sink/i, /hob/i] };
const centre = (a) => [a.x + a.w / 2, a.y + a.d / 2];
let offered = 0;
for (const { id } of Fit.TYPES) {
  for (let w = 8; w <= 22; w += 1.5) for (let l = 8; l <= 22; l += 1.5) for (const dx of [0, 3, w - 3]) {
    const r = { w, l }, d = { x: Math.min(dx, w - 3), w: 3 };
    for (const L of Fit.suggest(id, r, d)) {
      offered++;
      assert.ok(Fit.valid(L, r, d), `${id} ${w}x${l} door ${d.x}: ${L.text}`);
      if (id === 'kitchen') {
        // The work triangle: fridge, sink and hob 4 to 9 ft apart, 26 ft round.
        const [f, sk, h] = ['fridge', 'sink', 'hob'].map((k) => centre(L.items.find((a) => a.id === k)));
        const legs = [[f, sk], [sk, h], [h, f]].map(([p, q]) => Math.hypot(p[0] - q[0], p[1] - q[1]));
        assert.ok(legs.every((g) => g >= 4 - 1e-9 && g <= 9 + 1e-9) && legs.reduce((a, b) => a + b) <= 26 + 1e-9, `work triangle off: ${L.text}`);
        assert.ok(L.items.every((a) => a.w > 0 && a.d > 0), 'no empty counter pieces');
      }
      if (id === 'kids-twin') assert.equal(L.items.filter((a) => a.id === 'single').length, 2, `twin beds: ${L.text}`);
      if (id === 'kids-trundle') assert.ok(L.zones.some((z) => z.owner === 0 && Math.min(z.r.w, z.r.d) === 3), `no room to pull the trundle out: ${L.text}`);
      if (id === 'kids-loft') assert.ok(!L.items.some((a) => a.id === 'desk'), 'a loft bed has its desk built in');
      if (id === 'kids-loft-robe') assert.ok(!L.items.some((a) => /^wardrobe/.test(a.id)), 'a loft bed with a wardrobe needs no other');
      if (id === 'kids-trundle') assert.ok(Fit.valid({ ...L, items: L.items.map((a) => (a.id === 'trundle' ? { ...a, out: true } : a)) }, r, d), `the trundle cannot be pulled out: ${L.text}`);
      if (['kids', 'kids-bunk', 'kids-loft', 'kids-loft-robe', 'kids-trundle'].includes(id)) assert.ok(L.zones.some((z) => z.owner === -1 && z.r.w === 4 && z.r.d === 4), 'a kids room keeps 4 by 4 ft to play');
      if (id === 'living' || id === 'living-dining') { const s = L.items[0], t = L.items[1]; assert.ok(Math.abs((s.x + s.w / 2) - (t.x + t.w / 2)) <= 1 || Math.abs((s.y + s.d / 2) - (t.y + t.d / 2)) <= 1, `TV not square to the sofa: ${L.text}`); }
      for (const re of need[id]) assert.ok(L.items.some((a) => re.test(a.name)), `${id} layout lacks ${re}: ${L.text}`);
    }
  }
}
assert.ok(offered > 1900, `too few layouts offered: ${offered}`);
// A pulled-out trundle takes the floor beside its bed; pushed in, it does not.
const tb = { id: 'trundle', name: 'Trundle bed', w: 6.5, d: 3, x: 0, y: 0, back: 'top' }, nearDesk = { name: 'Study desk', w: 4, d: 2, x: 1, y: 4 };
assert.ok(!Fit.problems([tb, nearDesk], room, door)[1].overlaps, 'a trundle pushed in leaves the floor free');
assert.ok(Fit.problems([{ ...tb, out: true }, nearDesk], room, door)[1].overlaps, 'a pulled-out trundle takes the floor beside the bed');
assert.ok(Fit.problems([{ ...tb, out: true, x: 0, y: 11 }], room, door)[0].outside, 'a trundle pulled out through a wall is caught');
// Gaps measure from the bed and its pulled-out trundle together, and a pulled-out
// trundle is in the way of other pieces' gaps. The 6.5 by 3 bed at the top wall
// pulls out to y = 5.75; the desk below it starts at y = 9.
const farDesk = { name: 'Study desk', w: 4, d: 2, x: 1, y: 9 };
assert.equal(Fit.gaps(tb, [farDesk], room).bottom, 6, 'pushed in: from the bed');
assert.equal(Fit.gaps({ ...tb, out: true }, [farDesk], room).bottom, 3.25, 'pulled out: from the trundle');
assert.equal(Fit.gaps(farDesk, [{ ...tb, out: true }], room).top, 3.25, 'a pulled-out trundle is an obstacle');
// Gap lines run through the stretch the two pieces share, so they touch the one
// that sets the gap: a wardrobe from y = 3 to 9 beside the pulled-out pair
// (y = 0 to 5.75) is met at y = 4.375; a wall gap stays centred on the piece.
const sideRobe = { name: 'Wardrobe, 4-door', w: 2, d: 6, x: 8, y: 3 };
const at = Fit.gapsAt({ ...tb, out: true }, [sideRobe], room);
assert.deepEqual([at.right.v, at.right.at], [1.5, 4.375], 'right gap meets the wardrobe');
assert.deepEqual([at.left.v, at.left.at], [0, 5.75 / 2], 'a wall gap stays centred');
// Headroom: 3 ft above the top mattress (bunk 4.6 ft, loft 5.6 ft).
assert.equal(Fit.ceilingFor('Bunk bed'), 7.6);
assert.equal(Fit.ceilingFor('Loft bed with wardrobe'), 8.6);
assert.equal(Fit.ceilingFor('Single bed'), 0, 'a floor-level bed needs no particular ceiling');
const bunk = { name: 'Bunk bed', w: 3, d: 6.5, x: 0, y: 0 }, loft = { name: 'Loft bed with desk', w: 3, d: 6.5, x: 0, y: 0 };
assert.ok(Fit.problems([bunk], { ...room, h: 7.5 }, door)[0].low, 'a bunk under a 7.5 ft ceiling is flagged');
assert.ok(!Fit.problems([bunk], { ...room, h: 8 }, door)[0].low, 'a bunk under an 8 ft ceiling is fine');
assert.ok(Fit.problems([loft], { ...room, h: 8 }, door)[0].low, 'a loft bed under an 8 ft ceiling is flagged');
assert.ok(!Fit.problems([loft], room, door)[0].low, 'no height given, no headroom check');
assert.equal(Fit.suggest('kids-bunk', { w: 10, l: 11, h: 7 }, door).length, 0, 'no bunk layouts under a 7 ft ceiling');
assert.equal(Fit.suggest('kids-loft-robe', { w: 10, l: 11, h: 8 }, door).length, 0, 'no loft layouts under an 8 ft ceiling');
assert.ok(Fit.suggest('kids-loft', { w: 10, l: 11, h: 10 }, door).length >= 2, 'a 10 ft ceiling takes a loft bed');
assert.ok(Fit.suggest('bedroom', { w: 12, l: 14, h: 7 }, door).length >= 2, 'a low ceiling does not stop an ordinary bedroom');
assert.ok(Fit.suggest('kids-loft', { w: 9, l: 10 }, door).length >= 2, 'a 9 by 10 room takes a loft bed');
assert.ok(Fit.suggest('kids-twin', { w: 10, l: 11 }, door).length >= 2, 'a 10 by 11 room takes twin beds two ways');
assert.ok(Fit.suggest('kids-bunk', { w: 9, l: 10 }, door).length >= 1, 'a 9 by 10 room takes a bunk bed');
assert.ok(Fit.suggest('kitchen', { w: 8, l: 10 }, door).length >= 2, 'an 8 by 10 kitchen gets a choice of shapes');
assert.equal(Fit.suggest('kitchen', { w: 6, l: 6 }, door).length, 0, 'a 6 by 6 room cannot hold a working kitchen');
assert.ok(Fit.suggest('kids', { w: 10, l: 11 }, door).length >= 2, 'a 10 by 11 kids room gets a choice');
assert.ok(Fit.suggest('bedroom', room, door).length >= 2, 'a 12 by 14 bedroom gets a choice');
assert.ok(Fit.suggest('living', { w: 12, l: 16 }, door).length >= 1, 'a 12 by 16 living room gets one');
assert.equal(Fit.suggest('living-dining', { w: 9, l: 9 }, door).length, 0, 'a 9 by 9 room is not a living and dining room');
// The rules bite: a wardrobe in front of a bed's foot is not a layout.
const bed = { id: 'queen', name: 'Queen bed', w: 5, d: 6.5, x: 3.5, y: 0, back: 'top' };
const tight = { items: [bed, { id: 'wardrobe4', name: 'Wardrobe, 4-door', w: 6, d: 2, x: 3, y: 7.5, back: 'bottom' }], zones: [{ owner: 0, r: { x: 3.5, y: 6.5, w: 5, d: 2 } }] };
assert.ok(!Fit.valid(tight, room, door), 'a wardrobe in the clear zone beyond the bed is rejected');

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
