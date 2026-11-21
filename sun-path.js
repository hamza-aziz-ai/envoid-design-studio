// Sunlight explorer: where the sun is over Vaishali at any date and time, and
// how far it reaches into a room through a window facing a given direction.
//
// Sun position uses NOAA's General Solar Position equations, good to about a
// minute of time and a fraction of a degree, which is far finer than anything
// a window decision turns on. The site is the studio's own coordinates. The
// model knows nothing about neighbouring buildings, trees or a chajja above the
// window, which is exactly what a real daylight study adds.
// The maths, kept free of the page so tools/test-tools.js can check it in Node.
const SunPath = (() => {
  const LAT = 28.6424, LON = 77.3423, TZ = 5.5; // Sector 5, Vaishali; IST
  const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const dayOfYear = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 864e5);

  // Fractional-year terms shared by the position and the sunrise maths.
  const terms = (doy, minutes) => {
    const g = ((2 * Math.PI) / 365) * (doy - 1 + (minutes / 60 - 12) / 24);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    return { eq, dec };
  };

  // Sun altitude and azimuth (degrees; azimuth clockwise from north) at a local clock time.
  const sunAt = (doy, minutes) => {
    const { eq, dec } = terms(doy, minutes);
    const ha = rad((minutes + eq + 4 * LON - 60 * TZ) / 4 - 180);
    const lat = rad(LAT);
    const alt = deg(Math.asin(clamp(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha), -1, 1)));
    const az = (deg(Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat))) + 540) % 360;
    return { alt, az };
  };

  // Sunrise, solar noon and sunset in local clock minutes.
  const dayTimes = (doy) => {
    const { eq, dec } = terms(doy, 720);
    const lat = rad(LAT);
    const ha = deg(Math.acos(clamp(Math.cos(rad(90.833)) / (Math.cos(lat) * Math.cos(dec)) - Math.tan(lat) * Math.tan(dec), -1, 1)));
    const base = 720 - 4 * LON - eq + 60 * TZ;
    return { rise: base - 4 * ha, noon: base, set: base + 4 * ha };
  };

  return { rad, clamp, dayOfYear, sunAt, dayTimes };
})();
if (typeof module === 'object' && module.exports) module.exports = SunPath;

(() => {
  if (typeof document === 'undefined') return;
  const dial = document.getElementById('sp-dial');
  const room = document.getElementById('sp-room');
  if (!dial || !room) return;

  const { rad, dayOfYear, sunAt, dayTimes } = SunPath;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs, parent) => {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  };

  const clock = (m) => {
    const t = Math.round(m);
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };
  const compass = (az) => ['north', 'north-northeast', 'northeast', 'east-northeast', 'east', 'east-southeast', 'southeast', 'south-southeast', 'south', 'south-southwest', 'southwest', 'west-southwest', 'west', 'west-northwest', 'northwest', 'north-northwest'][Math.round(az / 22.5) % 16];

  const dateIn = document.getElementById('sp-date');
  const timeIn = document.getElementById('sp-time');
  const faceIn = document.getElementById('sp-face');
  const timeOut = document.getElementById('sp-time-out');

  const today = new Date();
  dateIn.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const doyNow = () => {
    const [y, m, d] = dateIn.value.split('-').map(Number);
    return y && m && d ? dayOfYear(y, m, d) : dayOfYear(today.getFullYear(), today.getMonth() + 1, today.getDate());
  };

  // ---- sun-path dial ------------------------------------------------------

  const R = 100;
  const polar = (alt, az) => {
    const r = (R * (90 - alt)) / 90;
    return [r * Math.sin(rad(az)), -r * Math.cos(rad(az))];
  };
  const arc = (doy) => {
    const out = [];
    for (let m = 240; m <= 1260; m += 6) {
      const s = sunAt(doy, m);
      if (s.alt >= 0) out.push(polar(s.alt, s.az).map((v) => v.toFixed(2)).join(','));
    }
    return out.join(' ');
  };

  const year = today.getFullYear();
  const SUMMER = dayOfYear(year, 6, 21), WINTER = dayOfYear(year, 12, 21);

  const drawDial = (doy, sun) => {
    dial.textContent = '';
    [0, 30, 60].forEach((a) => el('circle', { r: (R * (90 - a)) / 90, class: a ? 'sd__ring' : 'sd__rim' }, dial));
    for (let a = 0; a < 360; a += 45) {
      const [x, y] = polar(0, a);
      el('line', { x1: 0, y1: 0, x2: x, y2: y, class: 'sd__ring' }, dial);
    }
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([t, a]) => {
      const [x, y] = polar(-12, a);
      el('text', { x, y: y + 4, 'text-anchor': 'middle', class: 'sd__dir' }, dial).textContent = t;
    });
    [[30, '30°'], [60, '60°']].forEach(([a, t]) => {
      el('text', { x: 3, y: -((R * (90 - a)) / 90) - 2, class: 'sd__alt' }, dial).textContent = t;
    });
    el('polyline', { points: arc(SUMMER), class: 'sd__season' }, dial);
    el('polyline', { points: arc(WINTER), class: 'sd__season' }, dial);
    el('polyline', { points: arc(doy), class: 'sd__today' }, dial);

    // The window's direction, so the dial and the room read together.
    const [wx, wy] = polar(0, +faceIn.value);
    el('line', { x1: 0, y1: 0, x2: wx, y2: wy, class: 'sd__face' }, dial);

    if (sun.alt > 0) {
      const [x, y] = polar(sun.alt, sun.az);
      el('circle', { cx: x, cy: y, r: 7, class: 'sd__sun' }, dial);
    }
  };

  // ---- room cutaway -------------------------------------------------------
  //
  // Room coordinates: u runs along the window wall, left to right as seen from
  // inside; v runs from the window wall (v = 0) into the room; z is height.

  const W = 12, D = 12, H = 10;
  const WIN = { u0: 4, u1: 8, sill: 3, head: 7 };
  const A = rad(-20), ELEV = rad(30);

  // Seen from the back of the room, looking at the window wall.
  const project = (u, v, z) => {
    const x = u - W / 2, y = D / 2 - v;
    const xr = x * Math.cos(A) - y * Math.sin(A), depth = x * Math.sin(A) + y * Math.cos(A);
    return [xr, -depth * Math.sin(ELEV) - z * Math.cos(ELEV)];
  };
  const pts = (list) => list.map(([u, v, z]) => project(u, v, z).map((n) => n.toFixed(2)).join(',')).join(' ');

  // Sutherland-Hodgman: clip the sunlit patch to the floor rectangle.
  const clip = (poly) => {
    const edges = [
      (p) => p[0] >= 0, (p) => p[0] <= W, (p) => p[1] >= 0, (p) => p[1] <= D,
    ];
    const cut = [
      (a, b) => { const t = (0 - a[0]) / (b[0] - a[0]); return [0, a[1] + t * (b[1] - a[1])]; },
      (a, b) => { const t = (W - a[0]) / (b[0] - a[0]); return [W, a[1] + t * (b[1] - a[1])]; },
      (a, b) => { const t = (0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), 0]; },
      (a, b) => { const t = (D - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), D]; },
    ];
    let out = poly;
    edges.forEach((inside, k) => {
      const input = out;
      out = [];
      input.forEach((cur, i) => {
        const prev = input[(i + input.length - 1) % input.length];
        if (inside(cur)) {
          if (!inside(prev)) out.push(cut[k](prev, cur));
          out.push(cur);
        } else if (inside(prev)) {
          out.push(cut[k](prev, cur));
        }
      });
    });
    return out;
  };

  const drawRoom = (sun) => {
    room.textContent = '';
    const sky = sun.alt > 0 ? 'sr__sky' : 'sr__sky is-night';
    el('polygon', { points: pts([[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]]), class: 'sr__floor' }, room);

    // Where the light lands: each window corner, pushed along the sun's ray to the floor.
    const rel = ((sun.az - +faceIn.value + 540) % 360) - 180; // sun bearing relative to the window
    let patch = null, depth = 0;
    if (sun.alt > 0.5 && Math.abs(rel) < 89.5) {
      const k = 1 / Math.tan(rad(sun.alt));
      const along = -Math.sin(rad(rel)), into = Math.cos(rad(rel));
      const land = (u, h) => [u + along * h * k, into * h * k];
      const raw = [land(WIN.u0, WIN.sill), land(WIN.u1, WIN.sill), land(WIN.u1, WIN.head), land(WIN.u0, WIN.head)];
      depth = into * WIN.head * k;
      const floorPatch = clip(raw);
      if (floorPatch.length >= 3) patch = { floorPatch, raw };
    }

    if (patch) {
      el('polygon', { points: pts(patch.floorPatch.map(([u, v]) => [u, v, 0])), class: 'sr__light' }, room);
      // Faint rays from the window corners towards the patch.
      [[WIN.u0, WIN.sill], [WIN.u1, WIN.sill], [WIN.u1, WIN.head], [WIN.u0, WIN.head]].forEach(([u, h], i) => {
        const [lu, lv] = patch.raw[i];
        const t = lv > D ? D / lv : 1; // stop the ray at the back of the room
        const [a, b] = [project(u, 0, h), project(u + (lu - u) * t, lv * t, h * (1 - t))];
        el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'sr__ray' }, room);
      });
    }

    // Window wall with its opening, then the two side walls.
    el('polygon', { points: pts([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]]), class: 'sr__wall' }, room);
    el('polygon', { points: pts([[WIN.u0, 0, WIN.sill], [WIN.u1, 0, WIN.sill], [WIN.u1, 0, WIN.head], [WIN.u0, 0, WIN.head]]), class: sky }, room);
    el('polygon', { points: pts([[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]]), class: 'sr__side' }, room);
    el('polygon', { points: pts([[W, 0, 0], [W, D, 0], [W, D, H], [W, 0, H]]), class: 'sr__side sr__side--near' }, room);
    return { patch, depth, rel };
  };

  // ---- wiring -------------------------------------------------------------

  const summary = document.getElementById('sp-summary');
  const facts = { rise: 'sp-rise', set: 'sp-set', len: 'sp-len', alt: 'sp-alt', az: 'sp-az' };
  const put = (id, text) => { document.getElementById(id).textContent = text; };

  function render() {
    const doy = doyNow();
    const minutes = +timeIn.value;
    const sun = sunAt(doy, minutes);
    const times = dayTimes(doy);
    timeOut.textContent = clock(minutes);

    put(facts.rise, clock(times.rise));
    put(facts.set, clock(times.set));
    const len = times.set - times.rise;
    put(facts.len, `${Math.floor(len / 60)} h ${Math.round(len % 60)} min`);
    put(facts.alt, sun.alt > 0 ? `${sun.alt.toFixed(0)}° above the horizon` : 'Below the horizon');
    put(facts.az, sun.alt > 0 ? `${sun.az.toFixed(0)}°, ${compass(sun.az)}` : '–');

    drawDial(doy, sun);
    const { patch, depth } = drawRoom(sun);

    const face = faceIn.options[faceIn.selectedIndex].text.toLowerCase();
    let line;
    if (sun.alt <= 0) line = `At ${clock(minutes)} the sun has set. Today it rises at ${clock(times.rise)} and sets at ${clock(times.set)}.`;
    else if (!patch) line = `At ${clock(minutes)} the sun is in the ${compass(sun.az)}, behind a ${face}-facing window, so no direct sun comes in. The room is lit by the sky alone.`;
    else if (depth >= D) line = `At ${clock(minutes)} direct sun through a ${face}-facing window reaches right across the room to the back wall. The sun is low, ${sun.alt.toFixed(0)}° up, so expect glare and heat.`;
    else line = `At ${clock(minutes)} direct sun through a ${face}-facing window reaches about ${depth.toFixed(1)} ft into the room, with the sun ${sun.alt.toFixed(0)}° up in the ${compass(sun.az)}.`;
    summary.textContent = line;
    room.setAttribute('aria-label', `A 12 by 12 foot room with a ${face}-facing window. ${line}`);
    dial.setAttribute('aria-label', `Sun path over Vaishali for the chosen date. ${sun.alt > 0 ? `The sun is ${sun.alt.toFixed(0)} degrees up in the ${compass(sun.az)}.` : 'The sun is below the horizon.'}`);
  }

  document.getElementById('sp-form').addEventListener('input', render);

  document.querySelectorAll('[data-date]').forEach((b) =>
    b.addEventListener('click', () => {
      dateIn.value = `${year}-${b.dataset.date}`;
      render();
    }),
  );

  // Play the day from sunrise to sunset. Only ever started by the visitor.
  const play = document.getElementById('sp-play');
  let timer = null;
  const stop = () => {
    clearInterval(timer);
    timer = null;
    play.textContent = 'Play the day';
    play.setAttribute('aria-pressed', 'false');
  };
  play.addEventListener('click', () => {
    if (timer) { stop(); return; }
    const { rise, set } = dayTimes(doyNow());
    let m = Math.ceil(rise / 15) * 15;
    play.textContent = 'Pause';
    play.setAttribute('aria-pressed', 'true');
    timer = setInterval(() => {
      if (m > set) { stop(); return; }
      timeIn.value = m;
      render();
      m += 10;
    }, 90);
  });

  render();
})();
