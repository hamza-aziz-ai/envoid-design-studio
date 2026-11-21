// Room planner: sketch a room's outline and read off its quantities.
//
// Everything is in feet. The formulas are the ones the studio's own estimating
// workspace uses, so a visitor sees the same arithmetic a quotation starts from:
//   floor area     shoelace formula over the outline
//   wall area      perimeter x height, minus door and window openings
//   paint          area / coverage per litre per coat x coats x (1 + wastage)
//   floor tiles    area x (1 + wastage) / tile area, rounded up
//   skirting       perimeter minus door widths
// No prices, deliberately: rates depend on the material and the site.
// The geometry, kept free of the page so tools/test-tools.js can check it in Node.
const RoomGeometry = (() => {
  const signedArea = (p) => {
    let s = 0;
    for (let i = 0; i < p.length; i++) {
      const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length];
      s += x1 * y2 - x2 * y1;
    }
    return s / 2;
  };
  const edgeLen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const perimeter = (p) => p.reduce((s, a, i) => s + edgeLen(a, p[(i + 1) % p.length]), 0);

  // Proper intersection of segments ab and cd (shared endpoints excluded by the caller).
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const segmentsCross = (a, b, c, d) => {
    const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
    // Collinear overlap counts as crossing too: it would fold a wall back on itself.
    const on = (p, q, r) => cross(p, q, r) === 0 &&
      Math.min(p[0], q[0]) <= r[0] && r[0] <= Math.max(p[0], q[0]) &&
      Math.min(p[1], q[1]) <= r[1] && r[1] <= Math.max(p[1], q[1]);
    return on(c, d, a) || on(c, d, b) || on(a, b, c) || on(a, b, d);
  };

  // A room must be a simple polygon with real walls, or its area means nothing.
  const valid = (p) => {
    const n = p.length;
    if (n < 3 || Math.abs(signedArea(p)) < 4) return false;
    for (let i = 0; i < n; i++) if (edgeLen(p[i], p[(i + 1) % n]) < 1) return false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (j === i + 1 || (i === 0 && j === n - 1)) continue; // neighbours share a corner
        if (segmentsCross(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return false;
      }
    }
    return true;
  };

  // Outward normal of edge i, whichever way the outline happens to be wound.
  const outward = (p, i) => {
    const a = p[i], b = p[(i + 1) % p.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const s = signedArea(p) > 0 ? 1 : -1;
    return [(s * dy) / len, (-s * dx) / len];
  };

  return { signedArea, edgeLen, perimeter, valid, outward };
})();
if (typeof module === 'object' && module.exports) module.exports = RoomGeometry;

(() => {
  if (typeof document === 'undefined') return;
  const { signedArea, edgeLen, perimeter, valid, outward } = RoomGeometry;
  const plan = document.getElementById('plan');
  const view = document.getElementById('view');
  if (!plan || !view) return;

  const NS = 'http://www.w3.org/2000/svg';
  const MAX = 40;    // the plan grid is 40 x 40 ft
  const SNAP = 0.5;  // corners land on half-foot steps
  const ELEV = (32 * Math.PI) / 180; // how far the 3D view looks down

  const SHAPES = {
    rect: [[12, 14], [26, 14], [26, 26], [12, 26]],
    l: [[10, 10], [28, 10], [28, 19], [19, 19], [19, 28], [10, 28]],
    t: [[8, 12], [32, 12], [32, 20], [24, 20], [24, 30], [16, 30], [16, 20], [8, 20]],
  };

  let pts = SHAPES.rect.map((p) => p.slice());
  let angle = 35;
  let selected = 0;

  const el = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  };
  const fmt = (n, d = 1) => n.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const num = (id) => {
    const v = parseFloat(document.getElementById(id).value);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  };
  const snap = (v) => Math.min(MAX, Math.max(0, Math.round(v / SNAP) * SNAP));

  // ---- 2D plan ------------------------------------------------------------

  const grid = el('g', { class: 'pl__grid' }, plan);
  for (let i = 0; i <= MAX; i++) {
    const cls = i % 5 === 0 ? 'pl__major' : 'pl__minor';
    el('line', { x1: i, y1: 0, x2: i, y2: MAX, class: cls }, grid);
    el('line', { x1: 0, y1: i, x2: MAX, y2: i, class: cls }, grid);
  }
  const shape = el('polygon', { class: 'pl__room' }, plan);
  const labels = el('g', { class: 'pl__labels', 'aria-hidden': 'true' }, plan);
  const handles = el('g', { class: 'pl__handles' }, plan);

  const toPlan = (evt) => {
    const pt = plan.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(plan.getScreenCTM().inverse());
  };

  // Try a move; keep it only if the outline stays a valid room.
  const moveCorner = (i, x, y) => {
    const next = pts.map((p) => p.slice());
    next[i] = [snap(x), snap(y)];
    if (next[i][0] === pts[i][0] && next[i][1] === pts[i][1]) return false;
    if (!valid(next)) return false;
    pts = next;
    return true;
  };

  const cornerLabel = (i) => `Corner ${i + 1} of ${pts.length}, at ${fmt(pts[i][0])} by ${fmt(pts[i][1])} feet`;

  const drawHandles = () => {
    // Rebuild only when the number of corners changes: replacing a handle
    // mid-drag would drop its pointer capture.
    if (handles.childNodes.length !== pts.length) {
      handles.textContent = '';
      pts.forEach((_, i) => {
        const h = el('circle', { r: 0.7, class: 'pl__handle', tabindex: 0, role: 'button' }, handles);
        h.dataset.i = i;
      });
    }
    pts.forEach((p, i) => {
      const h = handles.childNodes[i];
      h.setAttribute('cx', p[0]);
      h.setAttribute('cy', p[1]);
      h.setAttribute('aria-label', `${cornerLabel(i)}. Arrow keys move it, Delete removes it.`);
      h.classList.toggle('is-on', i === selected);
    });
  };

  const drawPlan = () => {
    shape.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
    labels.textContent = '';
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      const [nx, ny] = outward(pts, i);
      const t = el('text', {
        x: (a[0] + b[0]) / 2 + nx * 1.4,
        y: (a[1] + b[1]) / 2 + ny * 1.4 + 0.35,
        'text-anchor': 'middle',
      }, labels);
      t.textContent = `${fmt(edgeLen(a, b))}′`;
    });
    drawHandles();
  };

  let dragging = null;
  handles.addEventListener('pointerdown', (e) => {
    const i = e.target.dataset && e.target.dataset.i;
    if (i === undefined) return;
    dragging = +i;
    selected = dragging;
    e.target.setPointerCapture(e.pointerId);
    e.preventDefault();
    render();
  });
  handles.addEventListener('pointermove', (e) => {
    if (dragging === null) return;
    const p = toPlan(e);
    if (moveCorner(dragging, p.x, p.y)) render();
  });
  const stopDrag = () => { dragging = null; };
  handles.addEventListener('pointerup', stopDrag);
  handles.addEventListener('pointercancel', stopDrag);

  handles.addEventListener('keydown', (e) => {
    const i = e.target.dataset && e.target.dataset.i;
    if (i === undefined) return;
    const step = e.shiftKey ? 2 : SNAP;
    const [x, y] = pts[+i];
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      selected = +i;
      if (!moveCorner(+i, x + moves[e.key][0], y + moves[e.key][1])) say('That move would make the walls cross, so the corner stays put.');
      render();
      handles.childNodes[+i].focus();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      selected = +i;
      removeCorner();
    }
  });
  handles.addEventListener('focusin', (e) => {
    const i = e.target.dataset && e.target.dataset.i;
    if (i !== undefined && +i !== selected) { selected = +i; drawHandles(); }
  });

  // ---- actions ------------------------------------------------------------

  const status = document.getElementById('pl-status');
  const say = (msg) => { status.textContent = msg; };

  const addCorner = () => {
    // Split the wall after the selected corner, at its midpoint: a corner on a
    // straight wall changes nothing until it is dragged, so it is always valid.
    const i = selected, j = (i + 1) % pts.length;
    if (edgeLen(pts[i], pts[j]) < 2) { say('That wall is too short to split. Select a corner on a longer wall.'); return; }
    const mid = [snap((pts[i][0] + pts[j][0]) / 2), snap((pts[i][1] + pts[j][1]) / 2)];
    const next = pts.slice(0, i + 1).concat([mid], pts.slice(i + 1));
    if (!valid(next)) { say('There is no room for another corner there.'); return; }
    pts = next;
    selected = i + 1;
    render();
    handles.childNodes[selected].focus();
    say(`Added a corner. ${cornerLabel(selected)}.`);
  };

  const removeCorner = () => {
    if (pts.length <= 3) { say('A room needs at least three corners.'); return; }
    const next = pts.filter((_, k) => k !== selected);
    if (!valid(next)) { say('Removing that corner would make the walls cross.'); return; }
    pts = next;
    selected = Math.min(selected, pts.length - 1);
    render();
    handles.childNodes[selected].focus();
    say(`Removed a corner. The room now has ${pts.length}.`);
  };

  document.getElementById('pl-add').addEventListener('click', addCorner);
  document.getElementById('pl-remove').addEventListener('click', removeCorner);
  document.querySelectorAll('[data-shape]').forEach((b) =>
    b.addEventListener('click', () => {
      pts = SHAPES[b.dataset.shape].map((p) => p.slice());
      selected = 0;
      render();
      say(`${b.textContent} loaded.`);
    }),
  );

  // ---- 3D view ------------------------------------------------------------

  const rot = document.getElementById('pl-rot');
  const drawView = (height) => {
    view.textContent = '';
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const a = (angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    // Rotate about the centre, then look down at ELEV. Larger depth is nearer.
    const project = (x, y, z) => {
      const dx = x - cx, dy = y - cy;
      const xr = dx * ca - dy * sa, depth = dx * sa + dy * ca;
      return { x: xr, y: depth * Math.sin(ELEV) - z * Math.cos(ELEV), depth };
    };
    const path = (corners) => corners.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ');

    const floor = pts.map((p) => project(p[0], p[1], 0));
    const walls = pts.map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const [nx, ny] = outward(pts, i);
      const corners = [project(p[0], p[1], 0), project(q[0], q[1], 0), project(q[0], q[1], height), project(p[0], p[1], height)];
      return {
        corners,
        depth: (corners[0].depth + corners[1].depth) / 2,
        // A wall whose outside faces the viewer would hide the room: draw it as a
        // cut edge instead, like a model with its near walls lifted off.
        front: nx * sa + ny * ca > 0.001,
        shade: 0.55 + 0.45 * Math.abs(nx * ca - ny * sa),
      };
    });

    const all = floor.concat(walls.flatMap((w) => w.corners));
    const xs = all.map((c) => c.x), ys = all.map((c) => c.y);
    const pad = 2;
    const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
    view.setAttribute('viewBox', `${minX.toFixed(2)} ${minY.toFixed(2)} ${(Math.max(...xs) - minX + pad).toFixed(2)} ${(Math.max(...ys) - minY + pad).toFixed(2)}`);

    el('polygon', { points: path(floor), class: 'v3__floor' }, view);
    walls.filter((w) => !w.front).sort((m, n) => m.depth - n.depth).forEach((w) => {
      el('polygon', { points: path(w.corners), class: 'v3__wall', style: `fill-opacity:${w.shade.toFixed(2)}` }, view);
    });
    walls.filter((w) => w.front).forEach((w) => {
      el('polygon', { points: path(w.corners), class: 'v3__cut' }, view);
    });
  };

  rot.addEventListener('input', () => { angle = +rot.value; render(); });
  let spin = null;
  view.addEventListener('pointerdown', (e) => { spin = { x: e.clientX, a: angle }; view.setPointerCapture(e.pointerId); });
  view.addEventListener('pointermove', (e) => {
    if (!spin) return;
    angle = (((spin.a + (e.clientX - spin.x) * 0.6) % 360) + 360) % 360;
    rot.value = Math.round(angle);
    render();
  });
  const stopSpin = () => { spin = null; };
  view.addEventListener('pointerup', stopSpin);
  view.addEventListener('pointercancel', stopSpin);

  // ---- quantities ---------------------------------------------------------

  const out = (id, text) => { document.getElementById(id).textContent = text; };

  function render() {
    const height = Math.max(1, num('pl-h'));
    const area = Math.abs(signedArea(pts));
    const per = perimeter(pts);
    const doors = num('pl-doors'), doorW = num('pl-door-w'), doorH = num('pl-door-h');
    const wins = num('pl-wins'), winW = num('pl-win-w'), winH = num('pl-win-h');
    const coats = Math.max(1, num('pl-coats'));
    const coverage = num('pl-cover');
    const waste = 1 + num('pl-waste') / 100;
    const [tw, tl] = document.getElementById('pl-tile').value.split('x').map(Number);

    const gross = per * height;
    const openings = doors * doorW * doorH + wins * winW * winH;
    const net = Math.max(0, gross - openings);
    const litres = (surface) => (coverage > 0 ? (surface / coverage) * coats * waste : 0);
    const tiles = Math.ceil((area * waste) / (tw * tl));
    const skirting = Math.max(0, per - doors * doorW);

    out('o-area', `${fmt(area)} sq ft`);
    out('o-area-m', `${fmt(area / 10.76391041671)} m²`);
    out('o-per', `${fmt(per)} ft`);
    out('o-gross', `${fmt(gross)} sq ft`);
    out('o-open', `${fmt(openings)} sq ft`);
    out('o-net', `${fmt(net)} sq ft`);
    out('o-paint-w', coverage > 0 ? `${fmt(litres(net))} litres` : 'Enter a coverage');
    out('o-paint-c', coverage > 0 ? `${fmt(litres(area))} litres` : 'Enter a coverage');
    out('o-tiles', `${fmt(tiles, 0)} tiles`);
    out('o-skirt', `${fmt(skirting)} ft`);
    document.getElementById('pl-openings-warn').hidden = openings <= gross;

    drawPlan();
    drawView(height);
    view.setAttribute('aria-label', `3D view of the room: ${fmt(area)} square feet, ${pts.length} walls, ${fmt(height)} feet high.`);
  }

  document.getElementById('pl-form').addEventListener('input', (e) => { if (e.target !== rot) render(); });
  render();
})();
