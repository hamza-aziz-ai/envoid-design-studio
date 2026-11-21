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
  ];

  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
  const inside = (a, room) => a.x >= 0 && a.y >= 0 && a.x + a.w <= room.w && a.y + a.d <= room.l;

  // Clear distance from a piece to the nearest wall or piece facing it on each side.
  const gaps = (a, others, room) => {
    const g = { left: a.x, right: room.w - (a.x + a.w), top: a.y, bottom: room.l - (a.y + a.d) };
    for (const b of others) {
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

  // A piece is in trouble if it crosses a wall, overlaps another, or blocks the door.
  const problems = (items, room, door) =>
    items.map((a, i) => ({
      outside: !inside(a, room),
      overlaps: items.some((b, j) => j !== i && overlap(a, b)),
      door: blocksDoor(a, room, door),
    }));

  return { CATALOGUE, overlap, inside, gaps, blocksDoor, problems };
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
        'aria-label': `${describe(i)}${t.outside ? ' Crosses a wall.' : ''}${t.overlaps ? ' Overlaps another piece.' : ''}${t.door ? ' Blocks the door.' : ''} Arrow keys move it, R turns it, Delete removes it.`,
      }, svg);
      el('rect', { x: a.x, y: a.y, width: a.w, height: a.d }, g);
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
      const a = items[selected];
      const gp = gaps(a, items.filter((_, j) => j !== selected), r);
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
    svg.setAttribute('aria-label', `Plan of a ${fmt(r.w)} by ${fmt(r.l)} foot room with ${items.length} piece${items.length === 1 ? '' : 's'} of furniture.`);
    draw3d(r, doorNow, trouble, issues);
  }

  // ---- real 3D, on request -----------------------------------------------
  // The same room and pieces, modelled: beds with mattress, headboard and
  // pillows, sofas with back and arms, full-height wardrobes, tables on legs.
  // A piece with a problem gets a red outline, the selected one a brass one.
  let p3 = null, g3 = null, M = null, floorKey = '';
  const WALL_H = 9;

  function model(a, parent) {
    const box = (x0, y0, z0, x1, y1, z1, m, round) => p3.box(x0, y0, z0, x1, y1, z1, m, { parent, round });
    const x0 = a.x, z0 = a.y, x1 = a.x + a.w, z1 = a.y + a.d;
    const wide = a.w >= a.d; // long side runs along x
    const id = a.name.toLowerCase();
    const legs = (h, inset = 0.25) => [[x0 + inset, z0 + inset], [x1 - inset, z0 + inset], [x0 + inset, z1 - inset], [x1 - inset, z1 - inset]]
      .forEach(([x, z]) => box(x - 0.07, 0, z - 0.07, x + 0.07, h, z + 0.07, M.metal));
    if (id.includes('bed') && !id.includes('bedside')) {
      box(x0, 0, z0, x1, 1.1, z1, M.frame, 0.08);
      box(x0 + 0.15, 1.1, z0 + 0.15, x1 - 0.15, 1.8, z1 - 0.15, M.mattress, 0.18);
      // Headboard on a short end; pillows against it.
      if (!wide || a.w === a.d) {
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
      if (wide) {
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
      if (wide) box(x0 + 0.6, 1.9, z0 + 0.2, x1 - 0.6, 4.6, z0 + 0.35, M.screen);
      else box(x0 + 0.2, 1.9, z0 + 0.6, x0 + 0.35, 4.6, z1 - 0.6, M.screen);
      box((x0 + x1) / 2 - 0.4, 1.6, (z0 + z1) / 2 - 0.15, (x0 + x1) / 2 + 0.4, 1.9, (z0 + z1) / 2 + 0.15, M.metal);
      return 4.6;
    }
    const top = id.includes('coffee') ? 1.4 : 2.55;
    legs(top - 0.15);
    box(x0, top - 0.15, z0, x1, top, z1, M.top, 0.05);
    return top;
  }

  function draw3d(r, door, trouble, issues) {
    if (!p3) return;
    p3.clear(g3);
    const key = `${r.w}x${r.l}`;
    if (key !== floorKey) { M.floor = p3.mat.wood(r.w / 6, r.l / 6); floorKey = key; }
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
      const h = model(a, g3);
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
          screen: api.mat.plain('#121314', 0.25),
          badLine: new L.LineBasicMaterial({ color: '#c0392b' }),
          selLine: new L.LineBasicMaterial({ color: '#b88a52' }),
        };
        const r = room();
        render();
        // High enough to see over a seven-foot wardrobe standing near the camera.
        api.frameOn(r.w / 2, 1.5, r.l / 2, Math.hypot(r.w, r.l) / 2, { azimuth: 0.95, elevation: 1.0, distance: 2.7 });
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
  $('fp-clear').addEventListener('click', () => { items = []; selected = -1; render(); say('Room cleared.'); });
  $('fp-room').addEventListener('input', render);

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
