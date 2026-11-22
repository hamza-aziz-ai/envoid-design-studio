// Google Analytics 4, and only with the visitor's consent. Plus Cloudflare's
// cookieless visit count, which needs none (below).
//
// Consent Mode v2, basic implementation: until a visitor presses Accept,
// nothing from Google loads, no request is made and no cookie is set. Decline
// sends nothing at all. The choice is remembered in this browser and can be
// changed from "Cookie settings" in every footer; withdrawing switches GA off
// for the rest of the visit and deletes its cookies.
//
// Google signals and ad personalisation are off, here and in the property.
// Events carry no personal data: never a name, phone number or email address.
(() => {
  if (typeof document === 'undefined') return;
  const ID = 'G-95C4HE9ZZC';
  const KEY = 'envoid-analytics-consent'; // "granted" or "denied"

  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem(KEY, v); } catch { /* the choice just will not persist */ } };

  // The studio's own devices: open any page with ?internal=1 once per browser
  // (?internal=0 undoes it). A flagged browser never loads GA and sees no
  // banner, so the studio's visits are never sent at all. Per device, not per
  // IP: the studio's broadband is CGNAT, so its public IP is shared with
  // strangers. (traffic_type "internal" was tried first: the Google tag strips
  // it from every client-side gtag call, so GA's data filter never sees it.)
  const INTERNAL = 'envoid-internal';
  const q = new URLSearchParams(location.search);
  if (q.has('internal')) {
    try { if (q.get('internal') === '0') localStorage.removeItem(INTERNAL); else localStorage.setItem(INTERNAL, '1'); } catch { /* private window */ }
    q.delete('internal');
    const rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? `?${rest}` : '') + location.hash);
  }
  const internal = (() => { try { return localStorage.getItem(INTERNAL) === '1'; } catch { return false; } })();

  // Cloudflare Web Analytics: a plain visit count with no cookie, no browser
  // storage and no identifier, so it needs no consent and runs for everyone
  // except the studio's own devices. Classic script, not a module: the beacon
  // finds its token through document.currentScript. Live host only: anywhere
  // else (local, CI) Cloudflare rejects the report and logs a console error.
  if (!internal && location.hostname === 'envoiddesign.in') {
    const cf = document.createElement('script');
    cf.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    cf.dataset.cfBeacon = '{"token": "e48710685f964756a7954895aee966d8"}';
    document.head.append(cf);
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); } // eslint-disable-line prefer-rest-params
  window.gtag = gtag;
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });

  let on = false;
  const start = () => {
    if (on || internal) return;
    on = true;
    window[`ga-disable-${ID}`] = false;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    if (!window.envoidGtagLoaded) {
      window.envoidGtagLoaded = true;
      gtag('js', new Date());
      gtag('config', ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
      document.head.append(s);
    }
  };
  const stop = () => {
    on = false;
    window[`ga-disable-${ID}`] = true;
    gtag('consent', 'update', { analytics_storage: 'denied' });
    // Delete GA's cookies on every domain level they could have been set on.
    const host = location.hostname, parts = host.split('.');
    const domains = ['', host, `.${host}`, parts.length > 1 ? `.${parts.slice(-2).join('.')}` : ''];
    document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^_ga/.test(n)).forEach((n) => {
      domains.forEach((d) => { document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`; });
    });
  };

  // For forms and tools: report an event if, and only if, the visitor agreed.
  window.envoidTrack = (name, params) => { if (on) gtag('event', name, params || {}); };

  // ---- the banner -----------------------------------------------------------
  let banner = null;
  const close = () => { if (banner) { banner.remove(); banner = null; } };
  const choose = (v) => {
    write(v);
    if (v === 'granted') start(); else stop();
    close();
  };
  const show = () => {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'consent';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie consent');
    const p = document.createElement('p');
    p.textContent = 'May we use Google Analytics to see which pages and tools people use? It sets cookies and sends usage data to Google. Google Analytics collects nothing unless you accept.';
    // In the button row, not the sentence: links here are never underlined,
    // and a bare coloured link inside text fails link-in-text-block.
    const more = document.createElement('a');
    more.href = '/privacy/';
    more.textContent = 'Privacy policy';
    const row = document.createElement('div');
    row.className = 'consent__btns';
    const yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'btn btn--sm btn--light';
    yes.textContent = 'Accept';
    yes.addEventListener('click', () => choose('granted'));
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'btn btn--sm btn--ghost';
    no.textContent = 'Decline';
    no.addEventListener('click', () => choose('denied'));
    row.append(yes, no, more);
    banner.append(p, row);
    document.body.append(banner);
  };

  // "Cookie settings" in every footer, so a choice can always be changed.
  const footer = document.querySelector('.foot__copy');
  if (footer) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'foot__btn';
    b.textContent = 'Cookie settings';
    b.addEventListener('click', show);
    footer.append(' · ', b);
  }

  // ---- what is measured, beyond page views ----------------------------------
  // Contact taps: the moment a visitor reaches for the phone, WhatsApp or email.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    const method = href.startsWith('tel:') ? 'phone' : href.startsWith('mailto:') ? 'email' : /wa\.me\//.test(href) ? 'whatsapp' : '';
    if (method) window.envoidTrack('contact_click', { method, placement: a.closest('footer') ? 'footer' : 'page' });
  });
  // First real use of a play tool on a page, once.
  const tool = document.querySelector('.play');
  if (tool) {
    const used = () => {
      window.envoidTrack('tool_use', { tool: location.pathname });
      tool.removeEventListener('input', used, true);
      tool.removeEventListener('pointerdown', used, true);
    };
    tool.addEventListener('input', used, true);
    tool.addEventListener('pointerdown', used, true);
  }

  const choice = read();
  if (choice === 'granted') start();
  else if (choice !== 'denied' && !internal) show();
})();
