// Staircase designer: floor-to-floor height in, a drawn stair out.
//
// A stair is set by two numbers, the riser (how high each step lifts you) and
// the tread (how deep each step is). The comfort check is Blondel's rule, the
// seventeenth-century observation still used to judge a stair: twice the riser
// plus one tread should match a natural stride, ideally about 630 mm. UK
// building regulations (Approved Document K) accept anything from 550 to 700.

// The arithmetic, kept free of the page so tools/test-tools.js can check it.
const Stair = (() => {
  const MM_PER_FT = 304.8;

  // Fewest risers that keep each one at or below 175 mm: a sensible first guess.
  const suggest = (heightMm) => Math.max(2, Math.ceil(heightMm / 175));

  const design = (heightMm, risers, treadMm) => {
    const n = Math.max(2, Math.round(risers));
    const riser = heightMm / n;
    const treads = n - 1; // the last riser steps onto the upper floor itself
    const run = treads * treadMm;
    return {
      risers: n,
      riser,
      treads,
      tread: treadMm,
      run,
      angle: (Math.atan2(riser, treadMm) * 180) / Math.PI,
      blondel: 2 * riser + treadMm,
    };
  };

  // Plain-language verdict on how the stair will feel to climb.
  const feel = (d) => {
    if (d.angle > 42) return { tone: 'bad', text: 'Very steep. Closer to a ladder than a stair: hard going up and risky coming down.' };
    if (d.blondel > 700) return { tone: 'bad', text: 'Too long a stride. Each step asks for more than legs naturally give.' };
    if (d.blondel < 550) return { tone: 'bad', text: 'Too short a stride. Steps this shallow break your rhythm, which is how people trip.' };
    if (d.blondel >= 600 && d.blondel <= 660) return { tone: 'good', text: 'Comfortable. Two risers and a tread come close to a natural stride.' };
    return { tone: 'warn', text: d.blondel < 600 ? 'Acceptable, with a slightly short stride.' : 'Acceptable, with a slightly long stride.' };
  };

  return { MM_PER_FT, suggest, design, feel };
})();
if (typeof module === 'object' && module.exports) module.exports = Stair;

(() => {
  if (typeof document === 'undefined') return;
  const svg = document.getElementById('st-svg');
  if (!svg) return;

  const { MM_PER_FT, suggest, design, feel } = Stair;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const $ = (id) => document.getElementById(id);
  const ftIn = (mm) => {
    const inches = mm / 25.4;
    const ft = Math.floor(inches / 12);
    const rest = Math.round(inches - ft * 12);
    return rest === 12 ? `${ft + 1}′ 0″` : `${ft}′ ${rest}″`;
  };

  const heightIn = $('st-height'), risersIn = $('st-risers'), treadIn = $('st-tread');
  let risersTouched = false;

  const draw = (d, heightMm) => {
    svg.textContent = '';
    const pad = 500, left = -1500;
    const W = Math.max(d.run, 2400) - left + pad + 900, H = heightMm + 2 * pad;
    svg.setAttribute('viewBox', `${left} ${-heightMm - pad} ${W} ${H}`);

    // Floors: the lower one runs under the stair, the upper slab starts at the top step.
    el('line', { x1: left, y1: 0, x2: left + W, y2: 0, class: 'st__floor' }, svg);
    el('rect', { x: d.run, y: -heightMm - 150, width: left + W - d.run, height: 150, class: 'st__slab' }, svg);

    // The flight as one outline: up a riser, along a tread, repeated.
    let x = 0, y = 0, path = 'M0,0';
    for (let i = 0; i < d.risers; i++) {
      y -= d.riser;
      path += ` L${x.toFixed(1)},${y.toFixed(1)}`;
      if (i < d.treads) {
        x += d.tread;
        path += ` L${x.toFixed(1)},${y.toFixed(1)}`;
      }
    }
    path += ` L${d.run.toFixed(1)},0 Z`;
    el('path', { d: path, class: 'st__flight' }, svg);

    // A 5 ft 6 in person at the foot of the stair, for scale.
    const p = 1676, px = -1000;
    el('circle', { cx: px, cy: -p + 110, r: 110, class: 'st__person' }, svg);
    el('path', { d: `M${px},${-p + 220} L${px},${-p + 960} M${px - 260},${-p + 560} L${px},${-p + 360} L${px + 260},${-p + 560} M${px},${-p + 960} L${px - 200},0 M${px},${-p + 960} L${px + 200},0`, class: 'st__person-line' }, svg);

    // Dimension labels on the middle step, where the space above the flight is clear.
    const t = (txt, tx, ty, anchor = 'middle') => { el('text', { x: tx, y: ty, 'text-anchor': anchor, class: 'st__dim' }, svg).textContent = txt; };
    const k = Math.floor(d.risers / 2);
    t(`riser ${Math.round(d.riser)} mm`, k * d.tread - 100, -k * d.riser - d.riser / 2 + 60, 'end');
    t(`tread ${d.tread} mm`, (k + 1) * d.tread, -(k + 1) * d.riser - 140, 'end');
    t(`run ${(d.run / 1000).toFixed(2)} m · ${ftIn(d.run)}`, d.run / 2, 330);
    t(`${(heightMm / 1000).toFixed(2)} m`, d.run + 160, -heightMm / 2, 'start');
  };

  const render = () => {
    const heightMm = +heightIn.value * MM_PER_FT;
    if (!risersTouched) risersIn.value = suggest(heightMm);
    const d = design(heightMm, +risersIn.value, +treadIn.value);
    const v = feel(d);

    $('st-height-out').textContent = `${(+heightIn.value).toFixed(2)} ft · ${Math.round(heightMm)} mm`;
    $('st-risers-out').textContent = `${d.risers}`;
    $('st-tread-out').textContent = `${d.tread} mm`;
    $('o-riser').textContent = `${Math.round(d.riser)} mm`;
    $('o-riser-in').textContent = ftIn(d.riser).replace(/^0′ /, '');
    $('o-steps').textContent = `${d.risers} risers, ${d.treads} treads`;
    $('o-run').textContent = `${(d.run / 1000).toFixed(2)} m`;
    $('o-run-ft').textContent = ftIn(d.run);
    $('o-angle').textContent = `${d.angle.toFixed(1)}°`;
    $('o-blondel').textContent = `${Math.round(d.blondel)} mm`;
    const verdict = $('st-verdict');
    verdict.textContent = v.text;
    verdict.dataset.tone = v.tone;

    const half = Math.ceil(d.risers / 2);
    $('st-dogleg').textContent = `Turned into a dog-leg stair, the same steps split into flights of ${half} and ${d.risers - half} risers around a landing, so it needs about ${((half - 1) * d.tread / 1000).toFixed(2)} m of length plus the landing, instead of ${(d.run / 1000).toFixed(2)} m.`;

    draw(d, heightMm);
    svg.setAttribute('aria-label', `Side view of a stair rising ${Math.round(heightMm)} millimetres in ${d.risers} steps of ${Math.round(d.riser)} millimetres, ${d.tread} millimetre treads, ${d.angle.toFixed(0)} degrees steep. ${v.text}`);
  };

  risersIn.addEventListener('input', () => { risersTouched = true; });
  $('st-auto').addEventListener('click', () => { risersTouched = false; render(); });
  $('st').addEventListener('input', render);
  render();
})();
