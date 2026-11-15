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
