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

// enquiry form -> WhatsApp (no backend)
const form = document.getElementById('form');          // absent on projects.html
const err = document.getElementById('err');
form?.addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(form));
  const name = f.name.trim(), phone = f.phone.trim();
  if (!name || !phone) { err.hidden = false; return; }
  err.hidden = true;
  const msg = `New project enquiry\nName: ${name}\nPhone: ${phone}\nService: ${f.service}\nLocation: ${f.location || '-'}\nBrief: ${f.brief || '-'}`;
  open(`https://wa.me/919560769743?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
});

document.getElementById('yr').textContent = String(new Date().getFullYear());
