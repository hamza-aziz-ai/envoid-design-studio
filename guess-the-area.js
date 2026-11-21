// Guess the area: a plan-reading game. Five rooms, each drawn with its wall
// lengths the way a floor plan shows them. Guess the floor area; the closer,
// the more points. Needs room-planner.js loaded first for RoomGeometry.

// Shapes and scoring, kept free of the page so tools/test-tools.js can check them.
const GuessArea = (() => {
  const int = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

  // Rectilinear rooms in whole feet, as plans are drawn. Each generator keeps
  // every wall at least four feet long, so no room degenerates.
  const shapes = {
    rectangle: (r) => {
      const w = int(r, 9, 22), h = int(r, 8, 18);
      return [[0, 0], [w, 0], [w, h], [0, h]];
    },
    'L-shape': (r) => {
      const w = int(r, 14, 24), h = int(r, 12, 20), cw = int(r, 5, w - 6), ch = int(r, 4, h - 5);
      return [[0, 0], [w, 0], [w, h - ch], [w - cw, h - ch], [w - cw, h], [0, h]];
    },
    'T-shape': (r) => {
      const w = int(r, 16, 26), top = int(r, 6, 9), sw = int(r, 6, w - 8), sh = int(r, 6, 12), x = int(r, 2, w - sw - 2);
      return [[0, 0], [w, 0], [w, top], [x + sw, top], [x + sw, top + sh], [x, top + sh], [x, top], [0, top]];
    },
    'U-shape': (r) => {
      const w = int(r, 16, 24), h = int(r, 12, 18), gw = int(r, 4, w - 10), gd = int(r, 4, h - 5), x = int(r, 4, w - gw - 4);
      return [[0, 0], [x, 0], [x, gd], [x + gw, gd], [x + gw, 0], [w, 0], [w, h], [0, h]];
    },
  };
  const KINDS = Object.keys(shapes);
  const make = (rng) => {
    const kind = KINDS[Math.floor(rng() * KINDS.length)];
    return { kind, pts: shapes[kind](rng) };
  };

  // 100 for a perfect guess, falling by two points per percent off, never below 0.
  const score = (guess, area) => Math.max(0, Math.round(100 - (Math.abs(guess - area) / area) * 200));

  return { KINDS, shapes, make, score };
})();
if (typeof module === 'object' && module.exports) module.exports = GuessArea;

(() => {
  if (typeof document === 'undefined') return;
  const svg = document.getElementById('ga-plan');
  if (!svg || typeof RoomGeometry === 'undefined') return;

  const { signedArea, edgeLen, outward } = RoomGeometry;
  const { make, score } = GuessArea;
  const ROUNDS = 5;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString('en-IN');

  // Best score is a per-visitor nicety; storage can be missing or blocked.
  const best = {
    get() { try { return +localStorage.getItem('envoid-guess-best') || 0; } catch { return 0; } },
    set(v) { try { localStorage.setItem('envoid-guess-best', String(v)); } catch { /* fine without it */ } },
  };

  const form = $('ga-form'), input = $('ga-guess'), next = $('ga-next'), result = $('ga-result');
  let round = 0, total = 0, room = null, answered = false;

  const draw = (reveal) => {
    svg.textContent = '';
    const xs = room.pts.map((p) => p[0]), ys = room.pts.map((p) => p[1]);
    const w = Math.max(...xs), h = Math.max(...ys), pad = 3.5;
    svg.setAttribute('viewBox', `${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`);
    const points = room.pts.map((p) => p.join(',')).join(' ');

    if (reveal) {
      // Show the one-foot squares inside the room: the area, made countable.
      const clip = el('clipPath', { id: 'ga-clip' }, el('defs', {}, svg));
      el('polygon', { points }, clip);
      const g = el('g', { 'clip-path': 'url(#ga-clip)', class: 'ga__cells' }, svg);
      for (let x = 1; x < w; x++) el('line', { x1: x, y1: 0, x2: x, y2: h }, g);
      for (let y = 1; y < h; y++) el('line', { x1: 0, y1: y, x2: w, y2: y }, g);
    }
    el('polygon', { points, class: reveal ? 'pl__room ga__room is-revealed' : 'pl__room ga__room' }, svg);

    const labels = el('g', { class: 'pl__labels', 'aria-hidden': 'true' }, svg);
    room.pts.forEach((a, i) => {
      const b = room.pts[(i + 1) % room.pts.length];
      const [nx, ny] = outward(room.pts, i);
      el('text', { x: (a[0] + b[0]) / 2 + nx * 1.5, y: (a[1] + b[1]) / 2 + ny * 1.5 + 0.4, 'text-anchor': 'middle' }, labels).textContent = `${fmt(edgeLen(a, b))}′`;
    });
    const walls = room.pts.map((a, i) => `${fmt(edgeLen(a, room.pts[(i + 1) % room.pts.length]))} feet`).join(', ');
    svg.setAttribute('aria-label', `Floor plan of a room. Its walls, in order around the room, measure ${walls}.`);
  };

  const status = () => {
    $('ga-round').textContent = `Room ${Math.min(round, ROUNDS)} of ${ROUNDS}`;
    $('ga-total').textContent = `${total} points`;
    $('ga-best').textContent = best.get() ? `Best: ${best.get()} of ${ROUNDS * 100}` : 'No best score yet';
  };

  const newRoom = () => {
    round += 1;
    answered = false;
    room = make(Math.random);
    draw(false);
    input.value = '';
    input.disabled = false;
    form.querySelector('button[type=submit]').disabled = false;
    next.hidden = true;
    result.textContent = '';
    status();
    // Only after the visitor has started playing: focusing on page load would
    // pull keyboard and screen-reader users past everything above the game.
    if (round > 1) input.focus({ preventScroll: true });
  };

  const start = () => {
    round = 0;
    total = 0;
    newRoom();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (answered) return;
    const guess = parseFloat(input.value);
    if (!Number.isFinite(guess) || guess <= 0) {
      result.textContent = 'Type a guess in square feet first.';
      return;
    }
    answered = true;
    const area = Math.abs(signedArea(room.pts));
    const pts = score(guess, area);
    total += pts;
    const off = Math.round((Math.abs(guess - area) / area) * 100);
    const verdict = off === 0 ? 'Spot on.' : off <= 5 ? 'Very close.' : off <= 15 ? 'Close.' : off <= 30 ? 'In the right area.' : 'A long way off.';
    result.textContent = `${verdict} It is ${fmt(area)} sq ft; you guessed ${fmt(guess)}, ${off}% off. ${pts} points.`;
    draw(true);
    input.disabled = true;
    form.querySelector('button[type=submit]').disabled = true;

    if (round >= ROUNDS) {
      const prev = best.get();
      if (total > prev) best.set(total);
      result.textContent += ` Game over: ${total} of ${ROUNDS * 100}${total > prev ? ', a new best' : ''}.`;
      next.textContent = 'Play again';
    } else {
      next.textContent = 'Next room';
    }
    next.hidden = false;
    status();
    next.focus({ preventScroll: true });
  });

  next.addEventListener('click', () => (round >= ROUNDS ? start() : newRoom()));
  start();
})();
