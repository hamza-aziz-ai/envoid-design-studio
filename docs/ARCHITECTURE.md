# ARCHITECTURE

The system map. One page. Implementation detail lives in the file it belongs to.

## What this is

A fourteen-page static marketing website for an architecture practice, served from GitHub Pages at `https://envoiddesign.in/`. There is no server, no database, no session and no runtime configuration. Every byte a visitor receives is a file committed to this repository.

## Modules

| Module | Owns | Notes |
| --- | --- | --- |
| `index.html`, `projects/index.html`, `contact/index.html` | Indexable content, structured data, the enquiry form markup | Each carries its own canonical, Open Graph tags and JSON-LD |
| `services/` and its five children, `architects-in-ghaziabad/`, `interior-designers-in-ghaziabad/`, `architects-in-noida/` | Service and service-area pages, written for local search | One shared layout; each carries `WebPage`, `Service`, `BreadcrumbList` and `FAQPage` |
| `thanks/index.html`, `404.html` | Form landing and not-found pages | `noindex`; `404.html` carries `<base href="/">` |
| `styles.css` | Every rule on every page | One stylesheet, no preprocessor, no critical-CSS split |
| `main.js` | Navigation state, scroll reveal, footer year, gallery lightbox | Pure presentation. Nothing here touches visitor data |
| `contact.js` | Enquiry validation and delivery | The only module that handles visitor input |
| `assets/` | 131 files: photography, logo, favicons, generated width variants | 64 WebP, 67 JPEG/PNG, across `assets/` and `assets/projects/` |
| `tools/` | `check_site.py`, `smoke.sh`, `stage.sh` | Never published; `stage.sh` is what decides that |
| `.github/workflows/` | `deploy.yml` (validate, deploy, smoke, release), `automerge.yml` | The only privileged code in the repository |

## Trust boundaries

Outside input enters at exactly two points.

1. **The enquiry form**, on `index.html` and `contact/index.html`. Six visible fields plus a honeypot. This is the only visitor-supplied data the system processes, and `contact.js` is the only module that reads it.
2. **The request path**, for any URL a visitor types. GitHub Pages resolves it to a file or serves `404.html`. No code of ours interprets the path, so there is no routing, traversal or injection surface here.

Everything else — fonts, the map, the EmailJS SDK — is outbound. The site asks third parties for things; they do not send anything inbound that we act on.

## Data flow

```
Visitor
  │
  ├─ HTTPS ─► Cloudflare ─► GitHub Pages ─► static files (HTML, CSS, JS, images)
  │
  ├─ fonts.googleapis.com / fonts.gstatic.com   (stylesheet + font files)
  ├─ www.google.com/maps/embed                  (iframe, contact page only)
  ├─ cdn.jsdelivr.net                           (EmailJS browser SDK 3.12.1)
  │
  └─ enquiry form
       ├─ cloudflare-dns.com/dns-query   MX/A lookup for the typed email domain
       ├─ api.emailjs.com (via SDK)      enquiry to the studio, then confirmation to the sender
       └─ formsubmit.co                  fallback native POST when EmailJS is unconfigured
```

Only the **domain part** of a typed email address leaves the browser during validation. The full enquiry leaves only on submit, and only to EmailJS or FormSubmit.

## Deployment

```
push to main ─► Checks ─► Deploy to Pages ─► Smoke test ─► Release
                  │            │                 │            │
          html-validate   stage.sh →        probes the    tags and attaches
          node --check    _site →           live origin   the deployed zip
          check_site.py   Pages
          Lighthouse CI
```

`tools/stage.sh` assembles the published directory from `git archive HEAD`, so only committed content ships. It removes `.github/`, `tools/`, `docs/`, `README.md`, `lighthouserc.js`, `.htmlvalidate.json` and `.gitattributes`, then appends `?v=<commit sha>` to the stylesheet and scripts.

## What is deliberately absent

No analytics, no cookies, no `localStorage`, no `sessionStorage`, no tag manager, no consent banner. A visitor who blocks third parties entirely still gets a complete, readable site with a working enquiry path, because the form degrades to a native HTML POST.
