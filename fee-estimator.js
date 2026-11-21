// Drawing-fee estimator: starting prices, never a quotation.
//
// The rates are the studio's own defaults: the figures its quotation tool
// pre-fills for every new client before they are adjusted to the project.
// The studio chose to publish them as "from" prices, so every figure on the
// page is a floor, not a fee. The real number follows a site visit.

// The arithmetic, kept free of the page so tools/test-tools.js can check it.
const FeeEstimate = (() => {
  const RATES = [
    { id: 'plan', name: 'Floor plan', per: 'floor', rate: 2000, on: true,
      note: 'Architectural floor plan with dimensions and basic layout, for each floor.' },
    { id: 'structure', name: 'Structural drawings', per: 'project', rate: 5000, on: true,
      note: 'Foundation, columns, beams and slab drawings.' },
    { id: 'services', name: 'Electrical & plumbing drawings', per: 'project', rate: 2000, on: true,
      note: 'Electrical layout, plumbing layout and fixture details.' },
    { id: 'elevation', name: 'Elevation & 3D drawing', per: 'project', rate: 4000, on: true,
      note: 'External elevations and 3D views as per the agreed design.' },
    { id: 'visit', name: 'Site visits', per: 'visit', rate: 500, on: false,
      note: 'Visits for discussion and coordination, beyond the free first one.' },
  ];

  // How many of each item a selection asks for.
  const quantity = (item, floors, visits) =>
    item.per === 'floor' ? floors : item.per === 'visit' ? visits : 1;

  // `chosen` is a set of item ids. Returns each chosen line and the total.
  const estimate = (chosen, floors, visits) => {
    const f = Math.max(1, Math.floor(floors) || 1);
    const v = Math.max(0, Math.floor(visits) || 0);
    const lines = RATES.filter((r) => chosen.has(r.id))
      .map((r) => ({ ...r, qty: quantity(r, f, v), amount: r.rate * quantity(r, f, v) }))
      .filter((l) => l.qty > 0);
    return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
  };

  return { RATES, estimate };
})();
if (typeof module === 'object' && module.exports) module.exports = FeeEstimate;

(() => {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('fe');
  if (!root) return;

  const { RATES, estimate } = FeeEstimate;
  const rupees = (n) => `₹${n.toLocaleString('en-IN')}`;
  const unit = { floor: 'per floor', project: '', visit: 'per visit' };

  // Build the checklist from the rates, so the page and the maths cannot disagree.
  const list = document.getElementById('fe-items');
  RATES.forEach((r) => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.value = r.id;
    box.checked = r.on;
    const name = document.createElement('strong');
    name.textContent = r.name;
    const price = document.createElement('span');
    price.className = 'fe__rate';
    price.textContent = `from ${rupees(r.rate)}${unit[r.per] ? ' ' + unit[r.per] : ''}`;
    const note = document.createElement('span');
    note.className = 'fe__note';
    note.textContent = r.note;
    label.append(box, name, price, note);
    li.append(label);
    list.append(li);
  });

  const floorsIn = document.getElementById('fe-floors');
  const visitsIn = document.getElementById('fe-visits');
  const totalOut = document.getElementById('fe-total');
  const linesOut = document.getElementById('fe-lines');
  const ask = document.getElementById('fe-ask');

  const render = () => {
    const chosen = new Set([...list.querySelectorAll('input:checked')].map((b) => b.value));
    const floors = +floorsIn.value, visits = +visitsIn.value;
    const { lines, total } = estimate(chosen, floors, visits);

    totalOut.textContent = total ? `from ${rupees(total)}` : 'Choose a service';
    linesOut.textContent = '';
    lines.forEach((l) => {
      const row = document.createElement('li');
      const what = document.createElement('span');
      what.textContent = l.per === 'project' ? l.name : `${l.name} × ${l.qty}`;
      const amount = document.createElement('span');
      amount.textContent = `from ${rupees(l.amount)}`;
      row.append(what, amount);
      linesOut.append(row);
    });

    // A WhatsApp message carrying the selection, so the conversation starts
    // where the visitor left off rather than from "hi".
    const text = lines.length
      ? `Hi Envoid Design Studio, I'd like a quote for: ${lines.map((l) => (l.per === 'project' ? l.name : `${l.name} (${l.qty})`)).join(', ')}. The estimator shows from ${rupees(total)}.`
      : "Hi Envoid Design Studio, I'd like a quote for drawings.";
    ask.href = `https://wa.me/919560769743?text=${encodeURIComponent(text)}`;
  };

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  render();
})();
