// Colour your room: try finishes on a furnished room and download the result.
//
// The finishes are the named palette the studio's design workspace uses for
// room mood boards. Colours are set as attributes, not CSS classes, so the SVG
// can be turned into a PNG exactly as it looks on screen.
(() => {
  const svg = document.getElementById('cr-svg');
  if (!svg) return;

  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const $ = (id) => document.getElementById(id);

  const F = {
    ivory: ['Warm ivory paint', '#e8e0d2'], charcoal: ['Charcoal paint', '#3e4445'], green: ['Deep green paint', '#34574b'],
    terracotta: ['Terracotta paint', '#b87660'], sage: ['Soft sage paint', '#a5b09a'],
    ivoryTile: ['Ivory porcelain tile', '#dfd9cc'], greyTile: ['Grey porcelain tile', '#8f9391'], terrazzo: ['Terrazzo tile', '#cdc5b5'],
    marble: ['White veined marble', '#ece9e1'], darkStone: ['Dark stone', '#494c4b'], oak: ['Warm oak', '#ae8052'], walnut: ['Dark walnut', '#604332'],
    linen: ['Beige linen', '#cbbb9e'], greenFabric: ['Deep green fabric', '#355a4a'], blue: ['Blue fabric', '#526a83'], clay: ['Clay fabric', '#ae7566'],
    brass: ['Brushed brass', '#ab8b4e'], darkMetal: ['Dark metal', '#303737'],
  };
  const GROUPS = {
    walls: { label: 'Walls', options: ['ivory', 'sage', 'terracotta', 'green', 'charcoal'], value: 'ivory' },
    feature: { label: 'Feature wall', options: ['ivory', 'sage', 'terracotta', 'green', 'charcoal', 'oak', 'walnut', 'marble', 'darkStone'], value: 'oak' },
    floor: { label: 'Floor', options: ['ivoryTile', 'greyTile', 'terrazzo', 'marble', 'darkStone', 'oak', 'walnut'], value: 'terrazzo' },
    sofa: { label: 'Sofa', options: ['linen', 'greenFabric', 'blue', 'clay'], value: 'greenFabric' },
    rug: { label: 'Rug', options: ['linen', 'greenFabric', 'blue', 'clay'], value: 'linen' },
    metal: { label: 'Lamp and legs', options: ['brass', 'darkMetal'], value: 'brass' },
  };
  let evening = false;

  // Shade a hex colour: f < 1 darkens, f > 1 lightens toward white.
  const shade = (hex, f) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const out = c.map((v) => Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1)));
    return `#${out.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
  };

  // Swatches: one radio group per surface, so they work from the keyboard.
  const panel = $('cr-swatches');
  Object.entries(GROUPS).forEach(([key, g]) => {
    const fs = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = g.label;
    fs.append(legend);
    const row = document.createElement('div');
    row.className = 'cr__row';
    g.options.forEach((id) => {
      const label = document.createElement('label');
      label.className = 'cr__swatch';
      label.title = F[id][0];
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `cr-${key}`;
      input.value = id;
      input.checked = id === g.value;
      input.setAttribute('aria-label', F[id][0]);
      const chip = document.createElement('span');
      chip.style.background = F[id][1];
      label.append(input, chip);
      row.append(label);
    });
    fs.append(row);
    panel.append(fs);
  });

  // ---- the room ------------------------------------------------------------
  // Isometric: x runs along the right-hand wall, y along the left-hand wall,
  // z is height. The back corner of the floor is the origin.
  const W = 14, D = 12, H = 10, C = Math.cos(Math.PI / 6), S = Math.sin(Math.PI / 6);
  const P = (x, y, z) => [(x - y) * C, (x + y) * S - z];
  const poly = (pts, fill, extra = {}, parent = svg) =>
    el('polygon', { points: pts.map((p) => P(...p).map((n) => n.toFixed(3)).join(',')).join(' '), fill, stroke: '#1d1d1d', 'stroke-width': 0.04, 'stroke-linejoin': 'round', ...extra }, parent);

  // A box seen from the front corner: top, front (+y) and side (+x) faces.
  const box = (x0, y0, z0, x1, y1, z1, colour) => {
    poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], colour);
    poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], shade(colour, 0.82));
    poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], shade(colour, 1.12));
  };

  const draw = () => {
    const pick = (k) => F[GROUPS[k].value][1];
    const wall = pick('walls'), feature = pick('feature'), floor = pick('floor');
    const sofa = pick('sofa'), rug = pick('rug'), metal = pick('metal');
    svg.textContent = '';

    // Floor, then the two walls: the feature wall behind the sofa, the plain one with the window.
    poly([[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]], floor);
    poly([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]], feature);
    poly([[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]], shade(wall, 0.9));
    // Skirting along both walls.
    poly([[0, 0, 0], [W, 0, 0], [W, 0, 0.4], [0, 0, 0.4]], shade(floor, 0.7));
    poly([[0, 0, 0], [0, D, 0], [0, D, 0.4], [0, 0, 0.4]], shade(floor, 0.62));
    // Window in the left wall.
    poly([[0, 3, 3], [0, 8.5, 3], [0, 8.5, 7.5], [0, 3, 7.5]], evening ? '#26304a' : '#d7e8f2');
    el('path', { d: `M${P(0, 5.75, 3).join(',')} L${P(0, 5.75, 7.5).join(',')}`, stroke: '#1d1d1d', 'stroke-width': 0.04 }, svg);
    // A frame on the feature wall.
    poly([[1.2, 0, 4.6], [3.6, 0, 4.6], [3.6, 0, 7.4], [1.2, 0, 7.4]], '#f6f3ee', { stroke: metal, 'stroke-width': 0.12 });

    // Rug, then everything on it from the back of the room forwards, so nearer
    // pieces are painted over farther ones.
    poly([[3, 3.6, 0.02], [12, 3.6, 0.02], [12, 10, 0.02], [3, 10, 0.02]], rug, { stroke: shade(rug, 0.75) });
    box(3.6, 0.4, 0, 3.8, 0.6, 0.4, metal);
    box(3.4, 0.2, 0.4, 4, 3.2, 2.2, shade(sofa, 0.95));
    box(4, 0.2, 0.4, 12, 3.2, 1.6, sofa);
    box(4, 0.2, 1.6, 12, 1.0, 3, shade(sofa, 0.92));
    box(12.2, 0.4, 0, 12.4, 0.6, 0.4, metal);
    box(12, 0.2, 0.4, 12.6, 3.2, 2.2, shade(sofa, 0.95));
    [[6.2, 5.8], [9.2, 5.8], [6.2, 7.4], [9.2, 7.4]].forEach(([x, y]) => box(x - 0.1, y - 0.1, 0, x + 0.1, y + 0.1, 1.2, metal));
    box(6, 5.6, 1.2, 9.4, 7.6, 1.45, F.oak[1]);

    // Pendant lamp over the table.
    const cord = [P(7.7, 6.6, H), P(7.7, 6.6, 6.6)];
    el('line', { x1: cord[0][0], y1: cord[0][1], x2: cord[1][0], y2: cord[1][1], stroke: '#1d1d1d', 'stroke-width': 0.03 }, svg);
    poly([[7.2, 6.1, 6.6], [8.2, 6.1, 6.6], [8.6, 7.1, 5.9], [6.8, 7.1, 5.9]], metal);

    // Evening: dim the room warmly and let the lamp glow.
    if (evening) {
      const defs = el('defs', {}, svg);
      const grad = el('radialGradient', { id: 'cr-glow' }, defs);
      el('stop', { offset: '0', 'stop-color': '#ffd98a', 'stop-opacity': '0.85' }, grad);
      el('stop', { offset: '1', 'stop-color': '#ffd98a', 'stop-opacity': '0' }, grad);
      const [vx, vy, vw, vh] = viewBox();
      el('rect', { x: vx, y: vy, width: vw, height: vh, fill: '#2a1d10', 'fill-opacity': 0.32 }, svg);
      const [gx, gy] = P(7.7, 6.6, 5.6);
      el('ellipse', { cx: gx, cy: gy + 1.2, rx: 5.5, ry: 3.6, fill: 'url(#cr-glow)' }, svg);
    }

    el('text', { x: P(W, D, 0)[0] - 9.6, y: P(W, D, 0)[1] + 1.6, 'font-family': 'Inter, sans-serif', 'font-size': 0.62, fill: '#666159' }, svg).textContent = 'Designed on envoiddesign.in';

    const chosen = Object.entries(GROUPS).map(([, g]) => `${g.label}: ${F[g.value][0]}`);
    $('cr-list').textContent = '';
    chosen.forEach((line) => { const li = document.createElement('li'); li.textContent = line; $('cr-list').append(li); });
    svg.setAttribute('aria-label', `A living room in ${evening ? 'evening lamplight' : 'daylight'}. ${chosen.join('. ')}.`);
    // Carry these finishes into the 3D room, which reads them from the address.
    const link = $('cr-3d');
    if (link) link.href = `/3d-room/?${new URLSearchParams({ walls: GROUPS.walls.value, feature: GROUPS.feature.value, floor: GROUPS.floor.value, sofa: GROUPS.sofa.value, rug: GROUPS.rug.value })}`;
  };

  const viewBox = () => {
    const corners = [[0, 0, 0], [W, 0, 0], [0, D, 0], [W, D, 0], [W, 0, H], [0, D, H], [0, 0, H]].map((p) => P(...p));
    const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
    const pad = 1;
    return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad + 1.4];
  };
  svg.setAttribute('viewBox', viewBox().map((n) => n.toFixed(2)).join(' '));

  panel.addEventListener('change', (e) => {
    const key = e.target.name && e.target.name.replace('cr-', '');
    if (GROUPS[key]) { GROUPS[key].value = e.target.value; draw(); }
  });
  $('cr-light').addEventListener('click', (e) => {
    evening = !evening;
    e.currentTarget.setAttribute('aria-pressed', String(evening));
    e.currentTarget.textContent = evening ? 'Switch to daylight' : 'Switch to evening';
    draw();
  });
  $('cr-random').addEventListener('click', () => {
    Object.entries(GROUPS).forEach(([key, g]) => {
      g.value = g.options[Math.floor(Math.random() * g.options.length)];
      const input = panel.querySelector(`input[name="cr-${key}"][value="${g.value}"]`);
      if (input) input.checked = true;
    });
    draw();
  });

  // Download: serialise the SVG, paint it onto a canvas, save as PNG.
  $('cr-save').addEventListener('click', () => {
    const [, , vw, vh] = viewBox();
    const out = 1600, scale = out / vw;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', NS);
    clone.setAttribute('width', out);
    clone.setAttribute('height', Math.round(vh * scale));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = out;
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f6f3ee';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'my-room-envoid.png';
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, 'image/png');
    };
    img.src = url;
  });

  draw();
})();
