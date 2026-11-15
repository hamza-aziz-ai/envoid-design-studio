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
