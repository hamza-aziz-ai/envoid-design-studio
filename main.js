// nav: solid on scroll + mobile toggle
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');

const onScroll = () => nav.classList.toggle('nav--solid', window.scrollY > 40);
onScroll();
addEventListener('scroll', onScroll, { passive: true });

burger.addEventListener('click', () => {
  const open = nav.classList.toggle('nav--open');
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});
document.getElementById('menu').addEventListener('click', e => {
  if (e.target.tagName === 'A') burger.click();
});

// reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  });
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.r').forEach((el, i) => {
  el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
  io.observe(el);
});

document.getElementById('yr').textContent = String(new Date().getFullYear());

// Gallery lightbox.
//
// The tiles are plain links to the full image, so without JavaScript, or
// before this runs, clicking one still works — it just leaves the page. This
// upgrades that to an overlay using a native <dialog>, which brings the focus
// trap, Escape handling and inertness of the rest of the page for free.
const grid = document.querySelector('.gal__grid');
if (grid && typeof HTMLDialogElement === 'function') {
  const shots = [...document.querySelectorAll('.shot')];

  const box = document.createElement('dialog');
  box.className = 'lb';
  box.setAttribute('aria-label', 'Project image');
  box.innerHTML =
    '<button class="lb__x" type="button" aria-label="Close">&times;</button>' +
    '<button class="lb__nav lb__nav--prev" type="button" aria-label="Previous image">&#8249;</button>' +
    '<button class="lb__nav lb__nav--next" type="button" aria-label="Next image">&#8250;</button>' +
    '<figure class="lb__fig"><img alt=""><figcaption class="lb__cap"></figcaption></figure>';
  document.body.append(box);

  const shown = box.querySelector('img');
  const caption = box.querySelector('.lb__cap');
  let at = 0;

  const show = (i) => {
    at = (i + shots.length) % shots.length;
    const link = shots[at];
    const thumb = link.querySelector('img');
    // The href is the JPEG, so the link still works without JavaScript; in the
    // overlay prefer the widest WebP the tile already offers.
    const source = link.querySelector('source');
    const widest = source && source.srcset.split(',').pop().trim().split(' ')[0];
    shown.src = widest || link.href;
    shown.alt = thumb.alt;
    caption.textContent = thumb.alt;
  };

  shots.forEach((link, i) => link.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;  // let people open it in a tab
    e.preventDefault();
    show(i);
    box.showModal();
  }));

  box.querySelector('.lb__x').addEventListener('click', () => box.close());
  box.querySelector('.lb__nav--prev').addEventListener('click', () => show(at - 1));
  box.querySelector('.lb__nav--next').addEventListener('click', () => show(at + 1));

  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
  });

  // A click that lands on the dialog itself is a click on its backdrop: the
  // figure and buttons sit above it and stop the event there.
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });

  // Returning focus to the tile that was opened keeps keyboard order sensible.
  box.addEventListener('close', () => shots[at].focus());
}

/* Client testimonials.
   Reads /testimonials.json, written by tools/sync-testimonials.mjs from reviews
   a client left in the mobile app and a human approved. The section ships
   hidden and only reveals itself when there is something to show, so the page
   is never a heading above an empty space.

   SECURITY: every string in that file was typed by a member of the public.
   It is written with textContent and createTextNode only — never innerHTML,
   never concatenated into markup. The sync script strips control characters
   and caps lengths, which limits damage but is not an escaping layer.

   No Review or AggregateRating structured data is emitted here, deliberately:
   Google's policy disallows self-serving reviews on a business's own pages and
   the penalty is a manual action. See docs/REVIEWS-CONTRACT.md. */
const wall = document.getElementById('testimonials');
if (wall) {
  const list = wall.querySelector('.says');

  const card = ({ name, rating, body, project, date }) => {
    const item = document.createElement('li');
    item.className = 'say r';

    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
      const stars = document.createElement('p');
      stars.className = 'say__stars';
      stars.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      stars.setAttribute('role', 'img');
      stars.setAttribute('aria-label', `${rating} out of 5`);
      item.append(stars);
    }

    const quote = document.createElement('blockquote');
    quote.className = 'say__body';
    quote.textContent = body;              // never innerHTML
    item.append(quote);

    const who = document.createElement('p');
    who.className = 'say__who';
    who.append(document.createTextNode(name || 'Client'));
    const meta = [project, date].filter(Boolean).join(' · ');
    if (meta) {
      const small = document.createElement('span');
      small.textContent = meta;
      who.append(small);
    }
    item.append(who);
    return item;
  };

  // A missing file is the normal state until the first review is approved, so
  // failure here is silent by design: no console noise, no empty section.
  fetch('/testimonials.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const rows = (data && Array.isArray(data.testimonials) ? data.testimonials : [])
        .filter((t) => t && typeof t.body === 'string' && t.body.trim().length >= 10);
      if (!rows.length) return;
      rows.forEach((t) => list.append(card(t)));
      wall.hidden = false;
      // The reveal observer has already run by now, so show these directly.
      list.querySelectorAll('.r').forEach((el) => el.classList.add('in'));
    })
    .catch(() => {});
}
