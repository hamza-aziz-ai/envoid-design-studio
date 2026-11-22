// Will it fit? Drop furniture into a room of your size and see the gaps.
//
// Everything is in feet. Pieces turn in quarter turns, so every footprint is an
// axis-aligned rectangle and the checks stay exact: a piece is flagged when it
// overlaps another, crosses a wall, or sits in the door's swing.

// The geometry, kept free of the page so tools/test-tools.js can check it.
const Fit = (() => {
  const CATALOGUE = [
    { id: 'king', name: 'King bed', w: 6, d: 6.5 },
    { id: 'queen', name: 'Queen bed', w: 5, d: 6.5 },
    { id: 'single', name: 'Single bed', w: 3, d: 6.5 },
    { id: 'bunk', name: 'Bunk bed', w: 3, d: 6.5 },
    { id: 'loft', name: 'Loft bed with desk', w: 3, d: 6.5 },
    { id: 'loft-robe', name: 'Loft bed with wardrobe', w: 3, d: 6.5 },
    { id: 'trundle', name: 'Trundle bed', w: 3, d: 6.5 },
    { id: 'bedside', name: 'Bedside table', w: 1.5, d: 1.5 },
    { id: 'wardrobe2', name: 'Wardrobe, 2-door', w: 3, d: 2 },
    { id: 'wardrobe4', name: 'Wardrobe, 4-door', w: 6, d: 2 },
    { id: 'sofa3', name: 'Sofa, 3-seat', w: 7, d: 3 },
    { id: 'sofa2', name: 'Sofa, 2-seat', w: 5, d: 3 },
    { id: 'armchair', name: 'Armchair', w: 2.5, d: 2.5 },
    { id: 'coffee', name: 'Coffee table', w: 3.5, d: 2 },
    { id: 'tv', name: 'TV unit', w: 6, d: 1.5 },
    { id: 'dining4', name: 'Dining table, 4 seats', w: 4, d: 3 },
    { id: 'dining6', name: 'Dining table, 6 seats', w: 6, d: 3 },
    { id: 'desk', name: 'Study desk', w: 4, d: 2 },
    { id: 'fridge', name: 'Fridge', w: 2.5, d: 2 },
    { id: 'sink', name: 'Sink unit', w: 2.5, d: 2 },
    { id: 'hob', name: 'Hob unit', w: 2.5, d: 2 },
    { id: 'counter', name: 'Counter', w: 2, d: 2 },
  ];

  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
  const inside = (a, room) => a.x >= 0 && a.y >= 0 && a.x + a.w <= room.w && a.y + a.d <= room.l;

  // Clear distance from a piece to the nearest wall or piece facing it on each
  // side. A bed with its trundle pulled out measures from the pair, and a
  // pulled-out trundle elsewhere counts as an obstacle.
  const gaps = (piece, others, room) => {
    const a = extent(piece);
    const g = { left: a.x, right: room.w - (a.x + a.w), top: a.y, bottom: room.l - (a.y + a.d) };
    for (const b of others.flatMap(feet)) {
      if (a.y < b.y + b.d && b.y < a.y + a.d) { // side by side
        if (b.x + b.w <= a.x) g.left = Math.min(g.left, a.x - (b.x + b.w));
        if (b.x >= a.x + a.w) g.right = Math.min(g.right, b.x - (a.x + a.w));
      }
      if (a.x < b.x + b.w && b.x < a.x + a.w) { // one in front of the other
        if (b.y + b.d <= a.y) g.top = Math.min(g.top, a.y - (b.y + b.d));
        if (b.y >= a.y + a.d) g.bottom = Math.min(g.bottom, b.y - (a.y + a.d));
      }
    }
    return g;
  };

  // The door is in the bottom wall, hinged at `door.x`, swinging into the room
  // towards the right. Its swing is a quarter disc of radius `door.w`.
  const blocksDoor = (a, room, door) => {
    const hx = door.x, hy = room.l;
    if (a.x + a.w <= hx) return false; // wholly left of the hinge
    const px = Math.max(a.x, hx), py = Math.min(hy, a.y + a.d); // nearest point of the piece in the swing's quadrant
    return Math.hypot(px - hx, py - hy) < door.w;
  };

  // A trundle pulled out (`out`) takes the floor along its bed's open side, the
  // side away from the wall it backs onto, so it is checked like a piece too.
  const TRUNDLE_OUT = 2.75;
  const pulledOut = (a) => front({ ...a, back: a.back || (a.w >= a.d ? 'top' : 'left') }, TRUNDLE_OUT);
  const feet = (a) => (a.out ? [a, pulledOut(a)] : [a]);
  // The floor a piece takes, as one rectangle (a bed and its pulled-out trundle side by side).
  const extent = (a) => {
    const f = feet(a), x = Math.min(...f.map((r) => r.x)), y = Math.min(...f.map((r) => r.y));
    return { x, y, w: Math.max(...f.map((r) => r.x + r.w)) - x, d: Math.max(...f.map((r) => r.y + r.d)) - y };
  };

  // A piece is in trouble if it crosses a wall, overlaps another, or blocks the door.
  const problems = (items, room, door) =>
    items.map((a, i) => ({
      outside: !feet(a).every((f) => inside(f, room)),
      overlaps: items.some((b, j) => j !== i && feet(a).some((f) => feet(b).some((g) => overlap(f, g)))),
      door: feet(a).some((f) => blocksDoor(f, room, door)),
    }));

  // ---- suggested layouts -----------------------------------------------------
  // Rules, not guesswork. A piece stands against a wall facing into the room
  // (catalogue w along the wall, d away from it) and keeps clear floor for use:
  // 2 ft beside and beyond a bed, 2.5 ft in front of a wardrobe, desk or TV,
  // 1.5 ft in front of a sofa, 2.5 ft round a dining table for its chairs, and
  // a TV square to the sofa, 6 to 11 ft from it, with nothing between but the
  // coffee table. A layout is offered only if every piece passes the same
  // checks as one placed by hand and every clear zone lies inside the room,
  // free of other pieces.
  // Walls: top is the far wall, bottom holds the door.
  const TYPES = [
    { id: 'bedroom', name: 'Bedroom' },
    { id: 'living', name: 'Living room' },
    { id: 'living-dining', name: 'Living and dining' },
    { id: 'kids', name: 'Kids’ room, one bed' },
    { id: 'kids-twin', name: 'Kids’ room, twin beds' },
    { id: 'kids-bunk', name: 'Kids’ room, bunk bed' },
    { id: 'kids-loft', name: 'Kids’ room, loft bed with desk' },
    { id: 'kids-loft-robe', name: 'Kids’ room, loft bed with wardrobe' },
    { id: 'kids-trundle', name: 'Kids’ room, trundle bed' },
    { id: 'kitchen', name: 'Kitchen' },
  ];
  const WALLS = ['top', 'left', 'right', 'bottom'];
  const WALL_NAME = { top: 'the far wall', left: 'the left wall', right: 'the right wall', bottom: 'the door wall' };
  const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
  const STEP = 0.5;
  const byId = (id) => CATALOGUE.find((c) => c.id === id);
  const short = (a) => a.name.split(',')[0].toLowerCase();
  const across = (wall) => wall === 'top' || wall === 'bottom';
  const wallLen = (wall, room) => (across(wall) ? room.w : room.l);

  const onWall = (c, wall, t, room) => {
    const w = across(wall) ? c.w : c.d, d = across(wall) ? c.d : c.w;
    const x = wall === 'left' ? 0 : wall === 'right' ? room.w - w : t;
    const y = wall === 'top' ? 0 : wall === 'bottom' ? room.l - d : t;
    return { id: c.id, name: c.name, w, d, x, y, back: wall };
  };
  const rect = (x, y, w, d) => ({ x, y, w, d });
  const front = (a, n) => ({
    top: rect(a.x, a.y + a.d, a.w, n), bottom: rect(a.x, a.y - n, a.w, n),
    left: rect(a.x + a.w, a.y, n, a.d), right: rect(a.x - n, a.y, n, a.d),
  })[a.back];
  const sides = (a, n) => (across(a.back)
    ? [rect(a.x - n, a.y, n, a.d), rect(a.x + a.w, a.y, n, a.d)]
    : [rect(a.x, a.y - n, a.w, n), rect(a.x, a.y + a.d, a.w, n)]);
  const ring = (a, n) => [rect(a.x - n, a.y - n, a.w + 2 * n, n), rect(a.x - n, a.y + a.d, a.w + 2 * n, n), rect(a.x - n, a.y, n, a.d), rect(a.x + a.w, a.y, n, a.d)];

  // Zones are { r, owner, allow }: no piece but its owner, or one whose id is
  // `allow`, may stand in one.
  const valid = (L, room, door) =>
    problems(L.items, room, door).every((t) => !t.outside && !t.overlaps && !t.door) &&
    L.zones.every((z) => inside(z.r, room) && L.items.every((a, i) => i === z.owner || a.id === z.allow || !overlap(a, z.r)));

  // Add a piece at the first spot that keeps the layout valid, or report false.
  const tryAdd = (L, room, door, spots, keep) => {
    for (const a of spots) {
      const i = L.items.length;
      const next = { items: [...L.items, a], zones: [...L.zones, ...keep(a).map((z) => ({ owner: i, ...z }))] };
      if (valid(next, room, door)) { L.items = next.items; L.zones = next.zones; return a; }
    }
    return false;
  };
  // Every spot along the given walls, nearest the wall's centre or its corners first.
  const along = (c, walls, room, order) => walls.flatMap((wall) => {
    const span = wallLen(wall, room) - (across(wall) ? c.w : c.d);
    const ts = [];
    for (let t = 0; t <= span + 1e-9; t += STEP) ts.push(t);
    const mid = Math.round(span / 2 / STEP) * STEP;
    ts.sort((p, q) => (order === 'centre' ? Math.abs(p - mid) - Math.abs(q - mid) : Math.min(p, span - p) - Math.min(q, span - q)));
    return ts.map((t) => onWall(c, wall, t, room));
  });
  // Free-standing: every spot on the grid, both ways round.
  const anywhere = (c, room) => {
    const out = [];
    for (const [w, d] of [[c.w, c.d], [c.d, c.w]]) {
      for (let y = 0; y + d <= room.l; y += STEP) for (let x = 0; x + w <= room.w; x += STEP) out.push({ id: c.id, name: c.name, w, d, x, y });
    }
    return out;
  };
  const first = (L, room, door, ids, spotsFor, keep) => {
    for (const id of ids) { const a = tryAdd(L, room, door, spotsFor(byId(id)), keep); if (a) return a; }
    return false;
  };

  // Every bed position along the wall, nearest the centre first; keep the first
  // that gets both bedside tables and a desk, or else the fullest one.
  const bedroom = (wall, room, door) => {
    const bs = byId('bedside'), others = WALLS.filter((w) => w !== wall);
    for (const bedId of ['king', 'queen', 'single']) {
      let best = null;
      for (const spot of along(byId(bedId), [wall], room, 'centre')) {
        const L = { items: [], zones: [] };
        const bed = tryAdd(L, room, door, [spot], (a) => [...sides(a, 2).map((r) => ({ r, allow: 'bedside' })), { r: front(a, 2) }]);
        if (!bed) continue;
        const t = across(wall) ? bed.x : bed.y, span = across(wall) ? bed.w : bed.d;
        const tables = [t - bs.w, t + span].filter((at) => tryAdd(L, room, door, [onWall(bs, wall, at, room)], () => [])).length;
        const robe = first(L, room, door, ['wardrobe4', 'wardrobe2'], (c) => along(c, others, room, 'corner'), (a) => [{ r: front(a, 2.5) }]);
        if (!robe) continue;
        const desk = tryAdd(L, room, door, along(byId('desk'), others, room, 'corner'), (a) => [{ r: front(a, 2.5) }]);
        const score = tables * 2 + (desk ? 1 : 0);
        if (!best || score > best.score) best = { L, score, bed, robe, desk };
        if (score === 5) break;
      }
      if (!best) continue;
      const { bed, robe, desk } = best;
      const parts = [`${bed.name.toLowerCase()} against ${WALL_NAME[wall]}`, `${short(robe)} on ${WALL_NAME[robe.back]}`];
      if (desk) parts.push(`desk on ${WALL_NAME[desk.back]}`);
      return { ...best.L, text: parts.join(', ') };
    }
    return null;
  };

  // Every sofa position along the wall, nearest the centre first; keep the
  // first with a coffee table and an armchair (and the dining table, when one
  // is asked for), or else the fullest.
  const living = (wall, room, door, dining) => {
    const tvc = byId('tv'), ct = byId('coffee');
    const sideWalls = WALLS.filter((w) => w !== wall && w !== OPPOSITE[wall]);
    for (const sofaId of ['sofa3', 'sofa2']) {
      let best = null;
      for (const spot of along(byId(sofaId), [wall], room, 'centre')) {
        const L = { items: [], zones: [] };
        const sofa = tryAdd(L, room, door, [spot], (a) => [{ r: front(a, 1.5) }]);
        if (!sofa) continue;
        // The TV on the facing wall, as square to the sofa as it will go.
        const centre = (a) => (across(wall) ? a.x + a.w / 2 : a.y + a.d / 2);
        const tvSpots = along(tvc, [OPPOSITE[wall]], room, 'centre').sort((p, q) => Math.abs(centre(p) - centre(sofa)) - Math.abs(centre(q) - centre(sofa)));
        const tv = tryAdd(L, room, door, tvSpots, (a) => [{ r: front(a, 2.5) }]);
        if (!tv) continue;
        // Nothing but the coffee table between the sofa and the screen.
        const lo = (k, n) => Math.min(sofa[k] + sofa[n], tv[k] + tv[n]), hi = (k) => Math.max(sofa[k], tv[k]);
        // Watchable: the screen within a foot of square, 6 to 11 ft from the seat's front.
        const view = across(wall) ? hi('y') - lo('y', 'd') : hi('x') - lo('x', 'w');
        if (Math.abs(centre(tv) - centre(sofa)) > 1 || view < 6 || view > 11) continue;
        L.zones.push({ owner: 0, allow: 'coffee', r: across(wall) ? rect(sofa.x, lo('y', 'd'), sofa.w, hi('y') - lo('y', 'd')) : rect(lo('x', 'w'), sofa.y, hi('x') - lo('x', 'w'), sofa.d) });
        // The coffee table 1.5 ft in front of the sofa, centred on it.
        const cw = across(wall) ? ct.w : ct.d, cd = across(wall) ? ct.d : ct.w, fz = front(sofa, 1.5);
        const cx = across(wall) ? sofa.x + (sofa.w - cw) / 2 : wall === 'left' ? fz.x + fz.w : fz.x - cw;
        const cy = across(wall) ? (wall === 'top' ? fz.y + fz.d : fz.y - cd) : sofa.y + (sofa.d - cd) / 2;
        const coffee = tryAdd(L, room, door, [{ id: ct.id, name: ct.name, w: cw, d: cd, x: cx, y: cy }], () => []);
        let table = false;
        if (dining) {
          table = first(L, room, door, ['dining6', 'dining4'], (c) => anywhere(c, room), (a) => ring(a, 2.5).map((r) => ({ r })));
          if (!table) continue;
        }
        const chair = tryAdd(L, room, door, along(byId('armchair'), sideWalls, room, 'centre'), (a) => [{ r: front(a, 2) }]);
        const score = (coffee ? 2 : 0) + (chair ? 1 : 0);
        if (!best || score > best.score) best = { L, score, sofa, tv, coffee, chair, table };
        if (score === 3) break;
      }
      if (!best) continue;
      const { sofa, tv, coffee, chair, table } = best;
      const parts = [`${short(sofa)} against ${WALL_NAME[wall]}`, `TV unit facing it on ${WALL_NAME[tv.back]}`];
      if (coffee) parts.push('coffee table between');
      if (chair) parts.push(`armchair on ${WALL_NAME[chair.back]}`);
      if (table) parts.push(`${table.name.split(', ')[1].replace(' seats', '-seat')} dining table with room for its chairs`);
      return { ...best.L, text: parts.join(', ') };
    }
    return null;
  };

  // Kids' room: a single bed lengthwise in a corner, open along one long side
  // (2 ft clear), a wardrobe and a desk (2.5 ft clear in front of each), and
  // 4 ft by 4 ft of clear floor to play on, out of the door's swing.
  const playSpace = (L, room, door) => {
    for (let y = 0; y + 4 <= room.l; y += STEP) for (let x = 0; x + 4 <= room.w; x += STEP) {
      const r = rect(x, y, 4, 4);
      if (!blocksDoor(r, room, door) && L.items.every((a) => !overlap(a, r))) { L.zones.push({ owner: -1, r }); return r; }
    }
    return null;
  };
  // Wardrobe, desk and play space, after the beds. With one bed all three are
  // required, less whichever a loft bed has built in (`built`: 'desk' or
  // 'robe'); twin beds take most of a small room's floor, so there only the
  // wardrobe is, and the desk and play space come if they fit.
  const kidsRest = (L, room, door, strict, built = null) => {
    const robe = built !== 'robe' && first(L, room, door, ['wardrobe4', 'wardrobe2'], (c) => along(c, WALLS, room, 'corner'), (a) => [{ r: front(a, 2.5) }]);
    if (built !== 'robe' && !robe) return null;
    const desk = built !== 'desk' && tryAdd(L, room, door, along(byId('desk'), WALLS, room, 'corner'), (a) => [{ r: front(a, 2.5) }]);
    if (strict && built !== 'desk' && !desk) return null;
    const play = playSpace(L, room, door);
    if (strict && !play) return null;
    return [robe && `${short(robe)} on ${WALL_NAME[robe.back]}`, desk && `desk on ${WALL_NAME[desk.back]}`, play && 'and 4 by 4 ft of clear floor to play on'].filter(Boolean).join(', ');
  };
  // A bed lengthwise against a wall, in the corner at its start (t = 0) or end.
  const cornerBed = (id, wall, t, room) => {
    const c = byId(id);
    return { ...onWall({ ...c, w: c.d, d: c.w }, wall, t, room), head: t === 0 ? (across(wall) ? 'left' : 'top') : (across(wall) ? 'right' : 'bottom') };
  };
  const corners = (id, wall, room) => { const span = wallLen(wall, room) - byId(id).d; return span < 0 ? [] : span === 0 ? [0] : [0, span]; };

  // One bed in a corner, with clear floor along its open side: 2 ft for a
  // single or bunk bed, 2.5 ft for the chair at a loft bed's built-in desk or
  // the doors of its built-in wardrobe (so no separate one), 3 ft for a
  // trundle to pull out into.
  const KID_BED = {
    single: { clear: 2, say: 'single bed' },
    bunk: { clear: 2, say: 'bunk bed' },
    loft: { clear: 2.5, say: 'loft bed with a desk under it', built: 'desk' },
    'loft-robe': { clear: 2.5, say: 'loft bed with a wardrobe under it', built: 'robe' },
    trundle: { clear: 3, say: 'trundle bed', note: ', with 3 ft clear beside it to pull the trundle out' },
  };
  const kids = (wall, room, door, id) => {
    const k = KID_BED[id];
    for (const t of corners(id, wall, room)) {
      const L = { items: [], zones: [] };
      // A trundle is laid out pulled out, so the door and every other check see
      // the floor it takes, then handed over pushed in.
      const bed = { ...cornerBed(id, wall, t, room), ...(id === 'trundle' && { out: true }) };
      if (!tryAdd(L, room, door, [bed], (a) => [{ r: front(a, k.clear) }])) continue;
      const rest = kidsRest(L, room, door, true, k.built);
      if (rest) return { ...L, items: L.items.map(({ out, ...a }) => a), text: `${k.say} in a corner of ${WALL_NAME[wall]}${k.note || ''}, ${rest}` };
    }
    return null;
  };

  // Twin beds: side by side against one wall with a bedside table in a 2.5 ft
  // gap between them, or in corners of facing walls with their open sides
  // towards each other across a shared 2.5 ft aisle.
  const twin = (wall, room, door) => {
    const out = [], sg = byId('single'), bs = byId('bedside'), gap = 2.5;
    const pair = { id: 'pair', name: 'pair', w: sg.w * 2 + gap, d: sg.d };
    for (const p of along(pair, [wall], room, 'centre')) {
      const L = { items: [], zones: [] }, t = across(wall) ? p.x : p.y;
      const one = tryAdd(L, room, door, [onWall(sg, wall, t, room)], (a) => [{ r: front(a, 2) }, { r: sides(a, gap)[1], allow: 'bedside' }]);
      const two = one && tryAdd(L, room, door, [onWall(sg, wall, t + sg.w + gap, room)], (a) => [{ r: front(a, 2) }]);
      if (!two) continue;
      tryAdd(L, room, door, [onWall(bs, wall, t + sg.w + (gap - bs.w) / 2, room)], () => []);
      const rest = kidsRest(L, room, door, false);
      if (rest) { out.push({ ...L, text: `two single beds side by side against ${WALL_NAME[wall]}, a bedside table between, ${rest}` }); break; }
    }
    if (wall === 'top' || wall === 'left') {
      const other = OPPOSITE[wall];
      found: for (const t1 of corners('single', wall, room)) for (const t2 of corners('single', other, room)) {
        const L = { items: [], zones: [] };
        const one = tryAdd(L, room, door, [cornerBed('single', wall, t1, room)], (a) => [{ r: front(a, 2.5) }]);
        if (!one || !tryAdd(L, room, door, [cornerBed('single', other, t2, room)], (a) => [{ r: front(a, 2.5) }])) continue;
        const rest = kidsRest(L, room, door, false);
        if (rest) { out.push({ ...L, text: `single beds in corners of ${WALL_NAME[wall]} and ${WALL_NAME[other]}, facing each other, ${rest}` }); break found; }
      }
    }
    return out;
  };

  // Kitchen: counters 2 ft deep along the chosen walls, a 3.5 ft clear aisle
  // in front of them, the fridge at an open end of a run, 1.5 ft of counter
  // each side of the hob and beside the sink and fridge, and the fridge, sink
  // and hob 4 to 9 ft apart with the three legs 26 ft at most: the usual
  // work-triangle guideline. One layout per shape, the most compact.
  const SHAPES = [
    ['L-shaped', [['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right']]],
    ['parallel', [['top', 'bottom'], ['left', 'right']]],
    ['U-shaped', [['left', 'top', 'right'], ['top', 'right', 'bottom'], ['left', 'bottom', 'right'], ['top', 'left', 'bottom']]],
    ['straight', [['top'], ['left'], ['right'], ['bottom']]],
  ];
  const K = { depth: 2, aisle: 3.5, landing: 1.5, unit: 2.5, legMin: 4, legMax: 9, sumMax: 26 };
  // Runs of counter, each { wall, t0, t1, open0, open1 } along its wall. The far
  // and door walls own the corners; an end that meets another run is not open.
  const runsFor = (walls, room, door) => {
    const has = (w) => walls.includes(w), runs = [];
    if (has('bottom') && ((has('left') && door.x < K.depth) || (has('right') && room.w - door.x - door.w < K.depth))) return null;
    for (const wall of walls) {
      if (wall === 'top') runs.push({ wall, t0: 0, t1: room.w, open0: !has('left'), open1: !has('right') });
      if (wall === 'bottom') {
        runs.push({ wall, t0: 0, t1: door.x, open0: !has('left'), open1: true });
        runs.push({ wall, t0: door.x + door.w, t1: room.w, open0: true, open1: !has('right') });
      }
      if (wall === 'left' || wall === 'right') {
        const r = { wall, t0: has('top') ? K.depth : 0, t1: has('bottom') ? room.l - K.depth : room.l, open0: !has('top'), open1: !has('bottom') };
        const x = wall === 'left' ? 0 : room.w - K.depth;
        while (r.t1 > r.t0 && blocksDoor(rect(x, r.t0, K.depth, r.t1 - r.t0), room, door)) { r.t1 -= STEP; r.open1 = true; }
        runs.push(r);
      }
    }
    return runs.filter((r) => r.t1 - r.t0 >= K.depth);
  };
  const unitAt = (id, run, t, len, room) => {
    const c = byId(id), a = across(run.wall);
    return { id, name: c.name, w: a ? len : K.depth, d: a ? K.depth : len,
      x: a ? t : run.wall === 'left' ? 0 : room.w - K.depth, y: a ? (run.wall === 'top' ? 0 : room.l - K.depth) : t, back: run.wall };
  };
  const kitchen = (walls, room, door) => {
    const runs = runsFor(walls, room, door);
    if (!runs || !runs.length) return null;
    // Appliance spots: anywhere along a run outside the corner squares; the
    // fridge only at an open end.
    const spot = (r, t) => { const a = unitAt('counter', runs[r], t, K.unit, room); return { r, t0: t, t1: t + K.unit, cx: a.x + a.w / 2, cy: a.y + a.d / 2 }; };
    const lo = (R) => R.t0 + (across(R.wall) && !R.open0 ? K.depth : 0), hi = (R) => R.t1 - (across(R.wall) && !R.open1 ? K.depth : 0);
    const free = [], fridges = [];
    runs.forEach((R, r) => {
      for (let t = lo(R); t + K.unit <= hi(R) + 1e-9; t += STEP) free.push(spot(r, t));
      if (R.open0) fridges.push(spot(r, R.t0));
      if (R.open1 && R.t1 - K.unit >= R.t0) fridges.push(spot(r, R.t1 - K.unit));
    });
    const leg = (p, q) => Math.hypot(p.cx - q.cx, p.cy - q.cy);
    const okLeg = (p, q) => { const d = leg(p, q); return d >= K.legMin && d <= K.legMax; };
    const clash = (p, q) => p.r === q.r && p.t0 < q.t1 && q.t0 < p.t1;
    // Counter of at least `landing` beside p on that side, clear of the others.
    const side = (p, others, dir) => {
      const R = runs[p.r], a = dir < 0 ? p.t0 - K.landing : p.t1, b = dir < 0 ? p.t0 : p.t1 + K.landing;
      return a >= R.t0 - 1e-9 && b <= R.t1 + 1e-9 && others.every((q) => q.r !== p.r || q.t1 <= a || q.t0 >= b);
    };
    let best = null;
    for (const f of fridges) for (const s of free) {
      if (clash(f, s) || !okLeg(f, s)) continue;
      for (const h of free) {
        if (clash(h, s) || clash(h, f) || !okLeg(h, s) || !okLeg(h, f)) continue;
        const sum = leg(f, s) + leg(s, h) + leg(h, f);
        if (sum > K.sumMax || (best && sum >= best.sum)) continue;
        if (!(side(h, [f, s], -1) && side(h, [f, s], 1))) continue;
        if (!(side(s, [f, h], -1) || side(s, [f, h], 1))) continue;
        if (!(side(f, [s, h], -1) || side(f, [s, h], 1))) continue;
        best = { f, s, h, sum };
      }
    }
    if (!best) return null;
    const items = [], zones = [];
    const placedAt = [[best.f, 'fridge'], [best.s, 'sink'], [best.h, 'hob']];
    runs.forEach((R, r) => {
      const mine = placedAt.filter(([p]) => p.r === r).sort((p, q) => p[0].t0 - q[0].t0);
      let t = R.t0;
      for (const [p, id] of mine) {
        if (p.t0 - t > 0.01) items.push(unitAt('counter', R, t, p.t0 - t, room));
        items.push(unitAt(id, R, p.t0, K.unit, room));
        t = p.t1;
      }
      if (R.t1 - t > 0.01) items.push(unitAt('counter', R, t, R.t1 - t, room));
      // The aisle in front of the run, short of corner squares another run's aisle covers.
      const a0 = lo(R), a1 = hi(R);
      zones.push({ owner: -1, r: front(unitAt('counter', R, a0, a1 - a0, room), K.aisle) });
    });
    const L = { items, zones };
    return valid(L, room, door) ? { ...L, sum: best.sum, legs: [leg(best.f, best.s), leg(best.s, best.h), leg(best.h, best.f)] } : null;
  };
  const kitchens = (room, door) => SHAPES.map(([shape, sets]) => {
    let best = null, on = null;
    for (const walls of sets) { const L = kitchen(walls, room, door); if (L && (!best || L.sum < best.sum)) { best = L; on = walls; } }
    if (!best) return null;
    const names = on.map((w) => WALL_NAME[w].replace('the ', '').replace(' wall', ''));
    const where = names.length === 1 ? `the ${names[0]} wall` : `the ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} walls`;
    return { ...best, text: `${shape} kitchen on ${where}: fridge, sink and hob ${Math.round(Math.min(...best.legs))} to ${Math.round(Math.max(...best.legs))} ft apart, a ${Math.round(best.sum)} ft work triangle` };
  });

  // Up to one layout per wall the main piece can stand on (one per shape for a kitchen).
  const suggest = (type, room, door) => (type === 'kitchen' ? kitchens(room, door) : WALLS.flatMap((wall) => {
    if (type === 'bedroom') return [bedroom(wall, room, door)];
    const kid = { kids: 'single', 'kids-bunk': 'bunk', 'kids-loft': 'loft', 'kids-loft-robe': 'loft-robe', 'kids-trundle': 'trundle' }[type];
    if (kid) return [kids(wall, room, door, kid)];
    if (type === 'kids-twin') return twin(wall, room, door);
    return [living(wall, room, door, type === 'living-dining')];
  }))
    .filter(Boolean)
    .map((L) => ({ ...L, text: L.text.charAt(0).toUpperCase() + L.text.slice(1) }));

  return { CATALOGUE, TYPES, overlap, inside, gaps, blocksDoor, problems, suggest, valid, pulledOut, extent };
})();
if (typeof module === 'object' && module.exports) module.exports = Fit;

(() => {
  if (typeof document === 'undefined') return;
  const svg = document.getElementById('fp-plan');
  if (!svg) return;

  const { CATALOGUE, gaps, problems } = Fit;
  const NS = 'http://www.w3.org/2000/svg';
  const SNAP = 0.5;
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 });
  const snap = (v) => Math.round(v / SNAP) * SNAP;
  const num = (id, lo, hi) => Math.min(hi, Math.max(lo, parseFloat($(id).value) || lo));

  const room = () => ({ w: num('fp-w', 6, 40), l: num('fp-l', 6, 40) });
  const door = () => ({ x: num('fp-door-x', 0, 40), w: num('fp-door-w', 2, 5) });

  let items = [];
  let selected = -1;
  let seq = 0;

  // Catalogue buttons.
  const shelf = $('fp-catalogue');
  CATALOGUE.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'play__btn';
    b.textContent = `${c.name} · ${fmt(c.w)}×${fmt(c.d)}′`;
    b.addEventListener('click', () => add(c));
    shelf.append(b);
  });

  const say = (msg) => { $('fp-status').textContent = msg; };
  const describe = (i) => {
    const a = items[i], g = gaps(a, items.filter((_, j) => j !== i), room());
    return `${a.name}, ${fmt(a.w)} by ${fmt(a.d)} feet. Clear space: ${fmt(Math.max(0, g.left))} ft left, ${fmt(Math.max(0, g.right))} ft right, ${fmt(Math.max(0, g.top))} ft above, ${fmt(Math.max(0, g.bottom))} ft below.`;
  };

  function add(c) {
    const r = room();
    const a = { key: ++seq, name: c.name, w: c.w, d: c.d, x: snap((r.w - c.w) / 2), y: snap((r.l - c.d) / 2) };
    // Nudge to the first free spot on a half-foot grid, if there is one.
    for (let y = 0; y + a.d <= r.l; y += SNAP) {
      let placed = false;
      for (let x = 0; x + a.w <= r.w; x += SNAP) {
        const t = { ...a, x, y };
        if (!items.some((b) => Fit.overlap(t, b)) && !Fit.blocksDoor(t, r, door())) { a.x = x; a.y = y; placed = true; break; }
      }
      if (placed) break;
    }
    items.push(a);
    selected = items.length - 1;
    render();
    focusSelected();
    say(`Added. ${describe(selected)}`);
  }

  const focusSelected = () => {
    const node = svg.querySelector(`[data-i="${selected}"]`);
    if (node) node.focus({ preventScroll: true });
  };

  const rotate = (i) => {
    const a = items[i];
    const cx = a.x + a.w / 2, cy = a.y + a.d / 2;
    [a.w, a.d] = [a.d, a.w];
    delete a.back; // a turned piece no longer faces away from a wall
    delete a.head;
    a.x = snap(cx - a.w / 2);
    a.y = snap(cy - a.d / 2);
  };

  const remove = (i) => {
    const name = items[i].name;
    items.splice(i, 1);
    selected = items.length ? Math.min(i, items.length - 1) : -1;
    render();
    if (selected >= 0) focusSelected();
    say(`Removed the ${name.toLowerCase()}.`);
  };

  function render() {
    const r = room(), d = door();
    const pad = 2.5;
    svg.setAttribute('viewBox', `${-pad} ${-pad} ${r.w + 2 * pad} ${r.l + 2 * pad}`);
    svg.textContent = '';

    const grid = el('g', { class: 'fp__grid' }, svg);
    for (let x = 1; x < r.w; x++) el('line', { x1: x, y1: 0, x2: x, y2: r.l }, grid);
    for (let y = 1; y < r.l; y++) el('line', { x1: 0, y1: y, x2: r.w, y2: y }, grid);

    // Walls, with a gap where the door is, and the door's swing.
    const dx = Math.min(d.x, r.w - d.w);
    el('path', { d: `M${dx},${r.l} L0,${r.l} L0,0 L${r.w},0 L${r.w},${r.l} L${dx + d.w},${r.l}`, class: 'fp__wall' }, svg);
    el('path', { d: `M${dx},${r.l} L${dx},${r.l - d.w} A${d.w},${d.w} 0 0 1 ${dx + d.w},${r.l}`, class: 'fp__door' }, svg);

    const doorNow = { x: dx, w: d.w };
    const trouble = problems(items, r, doorNow);
    items.forEach((a, i) => {
      const t = trouble[i];
      const bad = t.outside || t.overlaps || t.door;
      const g = el('g', {
        class: `fp__item${bad ? ' is-bad' : ''}${i === selected ? ' is-on' : ''}`,
        tabindex: 0, role: 'button', 'data-i': i,
        'aria-label': `${describe(i)}${t.outside ? ' Crosses a wall.' : ''}${t.overlaps ? ' Overlaps another piece.' : ''}${t.door ? ' Blocks the door.' : ''}${a.out ? ' Trundle pulled out.' : ''} Arrow keys move it, R turns it, Delete removes it.`,
      }, svg);
      el('rect', { x: a.x, y: a.y, width: a.w, height: a.d }, g);
      if (a.out) { const o = Fit.pulledOut(a); el('rect', { x: o.x, y: o.y, width: o.w, height: o.d, class: 'fp__out' }, g); }
      // Label: the full name if it fits across the piece, else its first word,
      // shrunk until it does. 0.56 is roughly Inter's average glyph width.
      let text = a.name.split(',')[0];
      let size = Math.min(0.9, Math.max(0.45, Math.min(a.w, a.d) / 3.2));
      if (text.length * size * 0.56 > a.w * 0.9) text = text.split(' ')[0];
      size = Math.min(size, (a.w * 0.9) / (text.length * 0.56));
      el('text', { x: a.x + a.w / 2, y: a.y + a.d / 2 + size * 0.35, 'text-anchor': 'middle', style: `font-size:${size.toFixed(2)}px` }, g).textContent = text;
    });

    // Gaps around the selected piece, drawn as dimension lines.
    if (selected >= 0 && items[selected]) {
      const a = Fit.extent(items[selected]);
      const gp = gaps(items[selected], items.filter((_, j) => j !== selected), r);
      const dim = el('g', { class: 'fp__dims', 'aria-hidden': 'true' }, svg);
      const cx = a.x + a.w / 2, cy = a.y + a.d / 2;
      const line = (x1, y1, x2, y2, v, tx, ty) => {
        if (v <= 0.05) return;
        el('line', { x1, y1, x2, y2 }, dim);
        el('text', { x: tx, y: ty, 'text-anchor': 'middle' }, dim).textContent = `${fmt(v)}′`;
      };
      line(a.x - gp.left, cy, a.x, cy, gp.left, a.x - gp.left / 2, cy - 0.3);
      line(a.x + a.w, cy, a.x + a.w + gp.right, cy, gp.right, a.x + a.w + gp.right / 2, cy - 0.3);
      line(cx, a.y - gp.top, cx, a.y, gp.top, cx + 0.2, a.y - gp.top / 2 + 0.25);
      line(cx, a.y + a.d, cx, a.y + a.d + gp.bottom, gp.bottom, cx + 0.2, a.y + a.d + gp.bottom / 2 + 0.25);
    }

    // Totals.
    const covered = items.reduce((s, a) => s + a.w * a.d, 0);
    const floor = r.w * r.l;
    const issues = trouble.filter((t) => t.outside || t.overlaps || t.door).length;
    $('o-floor').textContent = `${fmt(floor)} sq ft`;
    $('o-covered').textContent = `${fmt(covered)} sq ft`;
    $('o-free').textContent = `${fmt(Math.max(0, floor - covered))} sq ft`;
    $('o-free-pct').textContent = `${Math.max(0, Math.round((1 - covered / floor) * 100))}% of the floor`;
    $('o-issues').textContent = issues ? `${issues} piece${issues > 1 ? 's' : ''} to fix` : items.length ? 'Everything fits' : 'Add some furniture';
    $('fp-issues').dataset.tone = issues ? 'bad' : 'good';
    $('fp-rotate').disabled = $('fp-remove').disabled = selected < 0;
    const sel = items[selected], tr = $('fp-trundle');
    tr.hidden = !(sel && /trundle/i.test(sel.name));
    if (!tr.hidden) tr.textContent = sel.out ? 'Push the trundle in' : 'Pull the trundle out';
    svg.setAttribute('aria-label', `Plan of a ${fmt(r.w)} by ${fmt(r.l)} foot room with ${items.length} piece${items.length === 1 ? '' : 's'} of furniture.`);
    draw3d(r, doorNow, trouble, issues);
  }

  // ---- real 3D, on request -----------------------------------------------
  // The same room and pieces, modelled: beds with mattress, headboard and
  // pillows, sofas with back and arms, full-height wardrobes, tables on legs.
  // A piece with a problem gets a red outline, the selected one a brass one.
  let p3 = null, g3 = null, M = null, floorKey = '';
  const TRUNDLE_3D = 2.75; // as Fit's pulled-out trundle
  const WALL_H = 9;

  function model(a, parent) {
    const box = (x0, y0, z0, x1, y1, z1, m, round) => p3.box(x0, y0, z0, x1, y1, z1, m, { parent, round });
    const x0 = a.x, z0 = a.y, x1 = a.x + a.w, z1 = a.y + a.d;
    const wide = a.w >= a.d; // long side runs along x
    // A suggested piece knows which wall it backs onto; that settles square ones too.
    const backTop = a.back ? a.back === 'top' || a.back === 'bottom' : null;
    const id = a.name.toLowerCase();
    const legs = (h, inset = 0.25) => [[x0 + inset, z0 + inset], [x1 - inset, z0 + inset], [x0 + inset, z1 - inset], [x1 - inset, z1 - inset]]
      .forEach(([x, z]) => box(x - 0.07, 0, z - 0.07, x + 0.07, h, z + 0.07, M.metal));
    if (/bunk|loft|trundle/.test(id)) {
      // These beds orient themselves from the wall they back onto and the end
      // their head is at. part() takes a box along the bed (u, from either
      // end), out from the wall (v, 0 at the wall), and up (y).
      const back = a.back || (wide ? 'top' : 'left'), head = a.head || (wide ? 'left' : 'top');
      const alongX = back === 'top' || back === 'bottom', depth = alongX ? z1 - z0 : x1 - x0;
      const footAtEnd = alongX ? head !== 'right' : head !== 'bottom';
      const [u0, u1] = alongX ? [x0, x1] : [z0, z1];
      const foot = footAtEnd ? u1 : u0, headEnd = footAtEnd ? u0 : u1, toHead = footAtEnd ? -1 : 1;
      const part = (ua, ub, va, vb, ya, yb, m, round) => {
        const [p, q] = [Math.min(ua, ub), Math.max(ua, ub)];
        const w0 = back === 'top' || back === 'left' ? (alongX ? z0 : x0) + va : (alongX ? z1 : x1) - vb;
        return alongX ? box(p, ya, w0, q, yb, w0 + vb - va, m, round) : box(w0, ya, p, w0 + vb - va, yb, q, m, round);
      };
      const posts = (h) => [[0.02, 0.2], [depth - 0.2, depth - 0.02]].forEach(([va, vb]) =>
        [[u0 + 0.02, u0 + 0.2], [u1 - 0.2, u1 - 0.02]].forEach(([ua, ub]) => part(ua, ub, va, vb, 0, h, M.frame)));
      const deck = (y) => { part(u0, u1, 0, depth, y, y + 0.5, M.frame, 0.05); part(u0 + 0.12, u1 - 0.12, 0.12, depth - 0.12, y + 0.5, y + 1, M.mattress, 0.15); };
      // A ladder at the foot of the open side; returns where it ends, for the guard rail.
      const ladder = (top) => {
        const r1 = foot + toHead * 0.3, r2 = foot + toHead * 1.5, v0 = depth - 0.12;
        part(r1 - 0.06, r1 + 0.06, v0, depth, 0, top, M.frame);
        part(r2 - 0.06, r2 + 0.06, v0, depth, 0, top, M.frame);
        for (let y = 1.2; y < top - 0.3; y += 0.9) part(r1, r2, v0, depth, y, y + 0.1, M.frame);
        return r2;
      };
      if (id.includes('bunk')) {
        posts(5.8);
        deck(0.4);
        deck(3.6);
        part(headEnd, ladder(5.4), depth - 0.12, depth, 5.1, 5.25, M.frame);
        return 5.8;
      }
      if (id.includes('loft')) {
        // The bed at 5 ft, and a desk or a wardrobe against the wall underneath.
        posts(6.4);
        deck(4.6);
        part(headEnd, ladder(6.1), depth - 0.12, depth, 5.95, 6.1, M.frame);
        const end = headEnd - toHead * 4.2;
        if (id.includes('wardrobe')) {
          part(headEnd - toHead * 0.2, end, 0, 2, 0, 4.4, M.cabinet, 0.03);
        } else {
          part(headEnd - toHead * 0.2, end, 0, 2, 2.4, 2.52, M.top, 0.03);
          part(end, end + toHead * 0.1, 0, 2, 0, 2.4, M.cabinet);
        }
        return 6.4;
      }
      // Trundle: a bed with a second one in a low drawer on the open side.
      part(u0, u1, 0, depth, 0.55, 1.2, M.frame, 0.06);
      part(u0 + 0.12, u1 - 0.12, 0.12, depth - 0.12, 1.2, 1.8, M.mattress, 0.15);
      part(headEnd, headEnd - toHead * 0.3, 0, depth, 0, 3.3, M.head, 0.08);
      part(headEnd - toHead * 0.45, headEnd - toHead * 1.6, 0.4, depth - 0.4, 1.8, 2.2, M.mattress, 0.15);
      if (a.out) {
        // Pulled out: the second bed on its low frame beside the first.
        part(u0 + 0.3, u1 - 0.3, depth, depth + TRUNDLE_3D, 0.08, 0.5, M.cabinet, 0.03);
        part(u0 + 0.4, u1 - 0.4, depth + 0.1, depth + TRUNDLE_3D - 0.1, 0.5, 0.95, M.mattress, 0.12);
      } else {
        part(u0 + 0.3, u1 - 0.3, depth - 0.1, depth, 0.08, 0.5, M.cabinet, 0.03);
      }
      return 3.3;
    }
    if (id.includes('bed') && !id.includes('bedside')) {
      box(x0, 0, z0, x1, 1.1, z1, M.frame, 0.08);
      box(x0 + 0.15, 1.1, z0 + 0.15, x1 - 0.15, 1.8, z1 - 0.15, M.mattress, 0.18);
      // Headboard on a short end; pillows against it.
      if (a.head ? a.head === 'top' || a.head === 'bottom' : backTop ?? (!wide || a.w === a.d)) {
        box(x0, 0, z0, x1, 3.6, z0 + 0.3, M.head, 0.1);
        const n = a.w >= 4 ? 2 : 1, pw = (a.w - 0.6) / n;
        for (let i = 0; i < n; i++) box(x0 + 0.3 + i * pw + 0.08, 1.8, z0 + 0.45, x0 + 0.3 + (i + 1) * pw - 0.08, 2.2, z0 + 1.6, M.mattress, 0.15);
      } else {
        box(x0, 0, z0, x0 + 0.3, 3.6, z1, M.head, 0.1);
        const n = a.d >= 4 ? 2 : 1, pw = (a.d - 0.6) / n;
        for (let i = 0; i < n; i++) box(x0 + 0.45, 1.8, z0 + 0.3 + i * pw + 0.08, x0 + 1.6, 2.2, z0 + 0.3 + (i + 1) * pw - 0.08, M.mattress, 0.15);
      }
      return 3.6;
    }
    if (id.includes('sofa') || id.includes('armchair')) {
      legs(0.4, 0.2);
      box(x0, 0.4, z0, x1, 1.5, z1, M.sofa, 0.18);
      if (backTop ?? wide) {
        box(x0, 1.4, z0, x1, 3, z0 + 0.8, M.sofa, 0.2);
        box(x0, 0.4, z0, x0 + 0.5, 2.2, z1, M.sofa, 0.18);
        box(x1 - 0.5, 0.4, z0, x1, 2.2, z1, M.sofa, 0.18);
        box(x0 + 0.55, 1.5, z0 + 0.8, x1 - 0.55, 1.8, z1 - 0.05, M.sofa, 0.14);
      } else {
        box(x0, 1.4, z0, x0 + 0.8, 3, z1, M.sofa, 0.2);
        box(x0, 0.4, z0, x1, 2.2, z0 + 0.5, M.sofa, 0.18);
        box(x0, 0.4, z1 - 0.5, x1, 2.2, z1, M.sofa, 0.18);
        box(x0 + 0.8, 1.5, z0 + 0.55, x1 - 0.05, 1.8, z1 - 0.55, M.sofa, 0.14);
      }
      return 3;
    }
    if (id.includes('fridge')) {
      box(x0, 0, z0, x1, 6, z1, M.steel, 0.06);
      return 6;
    }
    if (id.includes('counter') || id.includes('sink') || id.includes('hob')) {
      // Base cabinet, worktop, and the basin or glass hob set into it.
      box(x0, 0, z0, x1, 2.75, z1, M.cabinet, 0.03);
      box(x0, 2.75, z0, x1, 2.9, z1, M.worktop, 0.02);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, l = Math.min(a.w, a.d) / 2 - 0.25, m = Math.max(a.w, a.d) / 2 - 0.35;
      const [hx, hz] = wide ? [m, l] : [l, m];
      if (id.includes('sink')) box(cx - hx, 2.9, cz - hz, cx + hx, 2.92, cz + hz, M.basin);
      if (id.includes('hob')) box(cx - hx, 2.9, cz - hz, cx + hx, 2.95, cz + hz, M.screen);
      return 2.95;
    }
    if (id.includes('wardrobe')) {
      box(x0, 0, z0, x1, 7, z1, M.cabinet, 0.04);
      return 7;
    }
    if (id.includes('bedside')) {
      box(x0, 0, z0, x1, 2, z1, M.cabinet, 0.05);
      return 2;
    }
    if (id.includes('tv')) {
      box(x0, 0, z0, x1, 1.6, z1, M.cabinet, 0.05);
      if (backTop ?? wide) box(x0 + 0.6, 1.9, z0 + 0.2, x1 - 0.6, 4.6, z0 + 0.35, M.screen);
      else box(x0 + 0.2, 1.9, z0 + 0.6, x0 + 0.35, 4.6, z1 - 0.6, M.screen);
      box((x0 + x1) / 2 - 0.4, 1.6, (z0 + z1) / 2 - 0.15, (x0 + x1) / 2 + 0.4, 1.9, (z0 + z1) / 2 + 0.15, M.metal);
      return 4.6;
    }
    const top = id.includes('coffee') ? 1.4 : 2.55;
    legs(top - 0.15);
    box(x0, top - 0.15, z0, x1, top, z1, M.top, 0.05);
    return top;
  }

  // The models face the top or the left wall. A suggested piece backed against
  // the right or bottom wall is built the same way and turned a half turn.
  function placed(a, parent) {
    const turn = a.head || a.back; // a corner bed turns by its headboard, not its long side
    if ((turn !== 'right' && turn !== 'bottom') || /bunk|loft|trundle/i.test(a.name)) return model(a, parent); // these orient themselves
    const T3 = p3.THREE, outer = new T3.Group(), inner = new T3.Group();
    outer.position.set(a.x + a.w / 2, 0, a.y + a.d / 2);
    outer.rotation.y = Math.PI;
    inner.position.set(-(a.x + a.w / 2), 0, -(a.y + a.d / 2));
    outer.add(inner);
    parent.add(outer);
    return model(a, inner);
  }

  function draw3d(r, door, trouble, issues) {
    if (!p3) return;
    p3.clear(g3);
    const key = `${r.w}x${r.l}`;
    if (key !== floorKey) {
      // A new room size: new floor boards, and the camera re-fitted to the room,
      // high enough to see over a seven-foot wardrobe standing near it.
      M.floor = p3.mat.wood(r.w / 6, r.l / 6);
      floorKey = key;
      p3.frameOn(r.w / 2, 1.5, r.l / 2, Math.hypot(r.w, r.l) / 2, { azimuth: 0.95, elevation: 1.0, distance: 2.7 });
    }
    const box = (x0, y0, z0, x1, y1, z1, m, o = {}) => p3.box(x0, y0, z0, x1, y1, z1, m, { parent: g3, ...o });
    box(0, -0.1, 0, r.w, 0, r.l, M.floor, { cast: false });
    const T = 0.35, dx = Math.min(door.x, r.w - door.w);
    // Walls, each lifted away when it stands between the camera and the room.
    const wall = (x0, z0, x1, z1, nx, nz, y0 = 0, y1 = WALL_H) => {
      const m = box(x0, y0, z0, x1, y1, z1, M.wall);
      p3.cutaway(m, nx, nz, (x0 + x1) / 2, (z0 + z1) / 2);
    };
    wall(-T, -T, 0, r.l + T, -1, 0);
    wall(r.w, -T, r.w + T, r.l + T, 1, 0);
    wall(-T, -T, r.w + T, 0, 0, -1);
    wall(-T, r.l, dx, r.l + T, 0, 1);
    wall(dx + door.w, r.l, r.w + T, r.l + T, 0, 1);
    wall(dx, r.l, dx + door.w, r.l + T, 0, 1, 7, WALL_H);
    // The door, standing open into the room along its swing.
    box(dx, 0, r.l - door.w, dx + 0.14, 6.95, r.l, M.door, { round: 0.03 });

    const T3 = p3.THREE;
    items.forEach((a, i) => {
      const h = placed(a, g3);
      const bad = trouble[i] && (trouble[i].outside || trouble[i].overlaps || trouble[i].door);
      if (bad || i === selected) {
        const edges = new T3.LineSegments(new T3.EdgesGeometry(new T3.BoxGeometry(a.w + 0.1, h + 0.1, a.d + 0.1)), bad ? M.badLine : M.selLine);
        edges.position.set(a.x + a.w / 2, h / 2, a.y + a.d / 2);
        g3.add(edges);
      }
    });
    p3.label(`The room in 3D, ${fmt(r.w)} by ${fmt(r.l)} feet, with ${items.length} piece${items.length === 1 ? '' : 's'}: ${items.map((a) => a.name.toLowerCase()).join(', ') || 'empty'}. ${issues ? `${issues} piece${issues > 1 ? 's' : ''} to fix.` : 'Everything fits.'}`);
    p3.request();
  }

  if (typeof Play3D !== 'undefined') {
    Play3D.mount({
      button: $('fp-3d-go'),
      view: $('fp-3d'),
      status: $('fp-3d-status'),
      label: 'The room in 3D',
      onReady: (api) => {
        p3 = api;
        g3 = api.group();
        const L = api.THREE;
        M = {
          wall: api.mat.plaster('#efe9df'),
          frame: api.mat.wood(1, 1, '#b48f6c'),
          head: api.mat.fabric('#b9a58b', 1.5),
          mattress: api.mat.fabric('#f3eee6', 1.5),
          sofa: api.mat.fabric('#5f7c6d', 1.4),
          cabinet: api.mat.wood(1, 1, '#f3e7d8'),
          top: api.mat.wood(1, 1, '#d8b896'),
          door: api.mat.wood(1, 1, '#c9a27c'),
          metal: api.mat.metal('#2f3436'),
          steel: api.mat.plain('#d9dcde', 0.35),
          basin: api.mat.plain('#9ea4a8', 0.3),
          worktop: api.mat.plain('#d8d2c8', 0.5),
          screen: api.mat.plain('#121314', 0.25),
          badLine: new L.LineBasicMaterial({ color: '#c0392b' }),
          selLine: new L.LineBasicMaterial({ color: '#b88a52' }),
        };
        render(); // the first render also frames the camera
      },
    });
  }

  // Dragging.
  let drag = null;
  const toPlan = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };
  svg.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('[data-i]');
    if (!g) return;
    selected = +g.dataset.i;
    const p = toPlan(e), a = items[selected];
    drag = { dx: p.x - a.x, dy: p.y - a.y };
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
    render();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag || selected < 0) return;
    const p = toPlan(e), a = items[selected], r = room();
    const x = Math.min(r.w - a.w + 2, Math.max(-2, snap(p.x - drag.dx)));
    const y = Math.min(r.l - a.d + 2, Math.max(-2, snap(p.y - drag.dy)));
    if (x !== a.x || y !== a.y) { a.x = x; a.y = y; render(); }
  });
  const endDrag = () => {
    if (drag && selected >= 0) say(describe(selected));
    drag = null;
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  // Keyboard.
  svg.addEventListener('keydown', (e) => {
    const g = e.target.closest('[data-i]');
    if (!g) return;
    const i = +g.dataset.i, a = items[i], step = e.shiftKey ? 2 : SNAP;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    selected = i;
    if (moves[e.key]) {
      e.preventDefault();
      a.x += moves[e.key][0];
      a.y += moves[e.key][1];
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      rotate(i);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove(i);
      return;
    } else {
      return;
    }
    render();
    focusSelected();
    say(describe(i));
  });
  svg.addEventListener('focusin', (e) => {
    const g = e.target.closest('[data-i]');
    if (g && +g.dataset.i !== selected) { selected = +g.dataset.i; render(); focusSelected(); }
  });

  $('fp-rotate').addEventListener('click', () => { if (selected >= 0) { rotate(selected); render(); say(describe(selected)); } });
  $('fp-remove').addEventListener('click', () => { if (selected >= 0) remove(selected); });
  $('fp-trundle').addEventListener('click', () => {
    const a = items[selected];
    if (!a) return;
    a.out = !a.out;
    render();
    say(a.out ? `Trundle pulled out: it takes 2¾ ft beside the bed, and anything in that space turns red.` : 'Trundle pushed back in.');
  });
  $('fp-clear').addEventListener('click', () => { items = []; selected = -1; render(); say('Room cleared.'); });
  $('fp-room').addEventListener('input', render);

  // Suggested layouts for the room as set. Each press shows the next one.
  const type = $('fp-type');
  Fit.TYPES.forEach((t) => type.append(new Option(t.name, t.id)));
  let ideas = [], idea = -1, ideaFor = '';
  $('fp-suggest').addEventListener('click', () => {
    const r = room(), d = door(), dr = { x: Math.min(d.x, r.w - d.w), w: d.w };
    const kind = Fit.TYPES.find((t) => t.id === type.value);
    const key = `${kind.id} ${r.w} ${r.l} ${dr.x} ${dr.w}`;
    if (key !== ideaFor) { ideas = Fit.suggest(kind.id, r, dr); idea = -1; ideaFor = key; }
    if (!ideas.length) {
      say(`No layout keeps enough clear floor for a ${kind.name.toLowerCase()} ${fmt(r.w)} by ${fmt(r.l)} feet with the door there. Try a bigger room, move the door, or place pieces by hand.`);
      return;
    }
    idea = (idea + 1) % ideas.length;
    items = ideas[idea].items.map((a) => ({ ...a, key: ++seq }));
    selected = -1;
    render();
    say(`Layout ${idea + 1} of ${ideas.length}: ${ideas[idea].text}.${ideas.length > 1 ? ' Press again for another.' : ''} Drag any piece to change it.`);
  });

  // Start with a furnished bedroom so there is something to push around.
  ['queen', 'bedside', 'bedside', 'wardrobe4'].forEach((id) => {
    const c = CATALOGUE.find((k) => k.id === id);
    items.push({ key: ++seq, name: c.name, w: c.w, d: c.d, x: 0, y: 0 });
  });
  Object.assign(items[0], { x: 3.5, y: 0 });
  Object.assign(items[1], { x: 2, y: 0 });
  Object.assign(items[2], { x: 8.5, y: 0 });
  Object.assign(items[3], { w: 6, d: 2, x: 6, y: 12 });
  selected = 0;
  render();
})();
