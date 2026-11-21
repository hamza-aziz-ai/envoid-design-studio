# FLOW

How execution actually travels. Update this whenever a path changes.

## Page load

```
HTML parsed
  └─ styles.css                       (render-blocking, single stylesheet)
  └─ main.js            [defer]
       ├─ nav scroll listener         toggles .nav--solid past 40px
       ├─ #burger click               toggles .nav--open, updates aria-expanded
       ├─ IntersectionObserver        adds .in to every .r element, then unobserves
       ├─ #yr textContent             current year
       └─ gallery lightbox            built only if .gal__grid exists (/projects/)
  └─ email.min.js       [defer]       EmailJS SDK, /contact/ and /
  └─ contact.js         [defer]       reads EMAILJS config, decides which path is live
```

`main.js` assumes `#nav`, `#burger`, `#menu` and `#yr` exist on every page. They are in the shared header and footer markup; removing one breaks the script for every page, not just the one edited.

## Gallery lightbox (`/projects/`)

```
.shot anchor clicked
  └─ modified click (Ctrl/Cmd/Shift/middle)? ─► fall through, browser opens the image
  └─ otherwise
       ├─ preventDefault()
       ├─ show(i)             picks the widest WebP from the tile's <source srcset>,
       │                      falling back to the anchor's href (the JPEG)
       └─ dialog.showModal()  native <dialog>: focus trap, Escape, inert background
            ├─ ‹ / ›, ArrowLeft / ArrowRight   show(at ± 1), wrapping
            ├─ click on the dialog itself      backdrop click, closes
            └─ close                           focus returns to the tile that opened it
```

Without JavaScript each tile is a plain link to the full image, so the gallery still works; the lightbox is an upgrade, not a requirement.

## Enquiry submit — EmailJS path

This is the live path: all four identifiers in `EMAILJS` are filled. `configured` is computed once at load.

```
submit ─► sendEnquiry(event)
  1. event.preventDefault()
  2. field('_honey') non-empty? ─► return silently          (bot filled the honeypot)
  3. domain = text after the last @, lowercased
  4. suggestDomain(domain)
       └─ Levenshtein distance against COMMON_DOMAINS, best match under 3
       └─ match, and not already warned for this exact value?
            └─ showTypoHint() ─► return    (pressing Send again keeps it as typed)
  5. domainAcceptsMail(domain)             DNS-over-HTTPS to cloudflare-dns.com
       ├─ Status 3 (NXDOMAIN)              ─► false, refuse
       ├─ MX records present               ─► false only if every one is a null MX ("0 .")
       ├─ no MX                            ─► A record lookup (RFC 5321 implicit MX)
       └─ fetch threw, timed out (4s), or was blocked ─► true   (fails open, deliberately)
  6. build params from Name, Email, Phone, Service, Location, Brief
  7. emailjs.send(enquiry)  ─► awaited; this is the send that matters
       ├─ resolves ─► success message, sendConfirmation(), form.reset(), clear after 8s
       └─ rejects  ─► "service error" message naming phone and WhatsApp as the way through
  8. sendConfirmation()     NOT awaited; its failure is caught and logged only
```

Step 8 is deliberate: the auto-reply is a courtesy, and failing it must never tell a visitor their enquiry did not arrive when the studio already has it.

## Enquiry submit — fallback path

Not live. While any `EMAILJS` identifier is blank, `contact.js` attaches no submit handler at all, and the browser performs the form's own `action` instead:

```
POST https://formsubmit.co/envoid.design.architect@gmail.com
  ├─ _subject, _template   presentation of the email FormSubmit sends
  ├─ _next                 https://envoiddesign.in/thanks/
  ├─ _honey                FormSubmit's own honeypot convention
  └─ Name, Phone, Email, Service, Location, Brief
```

**FormSubmit requires a one-time activation click** on a mail it sends to `envoid.design.architect@gmail.com` on the very first submission. Until someone clicks it, submissions are accepted by the browser and delivered nowhere. See `docs/FAILURE.md`.

## Deploy

```
push to main (unless every changed path matches '**.md' or 'docs/**')
  └─ Checks
       ├─ npx html-validate@9 on all fourteen pages
       ├─ node --check main.js contact.js
       ├─ python3 tools/check_site.py
       ├─ bash tools/stage.sh _preview ci
       └─ Lighthouse CI against http://localhost:8000/ (three pages)
  └─ Deploy to Pages        stage.sh _site <sha8> ─► upload-pages-artifact ─► deploy-pages
  └─ Smoke test             tools/smoke.sh against the deployed page_url
  └─ Release                tag vYYYY.MM.DD-<run>, generate notes, attach <version>-site.zip
```

A failure at any stage stops the stages after it. `Deploy` additionally requires the ref to be `main` and the event to be a push or a manual dispatch, so a pull request is validated but never published.
