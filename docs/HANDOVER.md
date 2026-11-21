# HANDOVER

Where things stand. Newest entry on top. Read this first; update it last.

---

## 2026-11-21 — interactive planning tools

- `/room-planner/` and `/sun-path/` are live, linked from a dark "Plan your space" band on the home page, a footer column on every page, and the daylight sentence on the architecture page. Reasons and rejected options are in D-023.
- `tools/test-tools.js` checks the sun and room maths and runs in CI. `tools/stage.sh` now cache-busts every root-level script by pattern, so a new page's script is covered without editing it. The deploy's script check covers every `*.js` at the root.
- **Search Console:** the studio's own account, `envoid.design.architect@gmail.com`, is now a verified owner of the envoiddesign.in domain property through its own DNS TXT record at Hostinger. It is independent of the account that first verified the site, which stays an owner too.
- Four more tools added (D-025): Will it fit?, Colour your room, Staircase designer and Guess the area. With the room calculator and sunlight explorer that makes six, linked from the home page band and a footer column on every page.
- A drawing-fee estimator was built and withdrawn the same day: the studio does not want prices on the site, because they set expectations that conflict with the real consultation (D-024). Do not re-propose one.

## 2026-11-21 — the enquiry form was broken, and now works

- **`contact.js` had been sending to an EmailJS service that does not exist.** It carried `service_cpailsr`; the account lists exactly one service, "Envoid Studio Gmail", whose id is `service_ueaeebb`. Every enquiry was rejected before a template was reached, from the day the identifiers were filled until this fix. Corrected in `contact.js` and in `docs/email-templates/README.md`, deployed as `c499076`.
- **The enquiry path is now confirmed working end to end**, by the studio submitting the live form and receiving both the enquiry and the confirmation. That closes the item that had been top of this file since the form was wired.
- Worth keeping in mind, because it is the reason this went unnoticed for days. The form catches a send failure and offers a `mailto:` fallback, so a broken form looks like a working one to a visitor. And EmailJS's own counter read `0 / 200 requests received`, which is equally consistent with "nobody enquired" and "every enquiry failed" — it counts accepted requests, so a rejected one leaves no trace. Neither the page nor the dashboard could distinguish the two states; only a real submission could.
- The lesson for anything similar: an identifier that is never exercised is not configured, it is merely written down. `docs/TESTING.md` holds the procedure.

## 2026-11-17 — privacy policy, app links

- `/.well-known/assetlinks.json` published and verified: 200 as `application/json` with no redirect, accepted by Google's Digital Asset Links API, and confirmed on two Android devices by the app session. `www.envoiddesign.in` can never verify, because GitHub Pages 301s it to the apex and Android's verifier follows no redirects; the app stopped declaring that host rather than pretending otherwise.
- D-021 records why the site gets no "Open in app" banner. App Links fire on a `VIEW` intent from another app, so a typed URL and a tapped Google result both stay in the browser by design. The one working mechanism, an `intent://` link, waits on a Play listing.
- `/privacy/` written, because Play requires a reachable privacy policy for any app that takes user-generated content. **It covers the website as well as the app, and that was the substantive change from the drafted text:** the app collects only a review, but this website's enquiry form collects name, phone and email, falls back to FormSubmit without JavaScript, sends the typed email's domain to Cloudflare for a deliverability check, and loads Google Fonts and jsDelivr on every page view. A policy published here that described only the app would have been false about the site hosting it.
- **The studio has not read the privacy policy yet.** Everything in it about the website was verified against the code, and the app half came from the app session's draft. It is live, which Play needs, but someone at the studio should read it once and confirm two things in particular: that `envoid.design.architect@gmail.com` is the address they want answering deletion requests inside 30 days, and that publishing the postal address there is fine. Both already appear elsewhere on the site, so neither leaks anything new.
- One claim was deliberately dropped from the draft: that Supabase hosts the data in the EU. The project host resolves through Cloudflare, so the region is not verifiable from here, and an unverified hosting location is exactly the kind of thing a privacy policy should not assert. Add it back if the Supabase dashboard confirms it.
- Footers across all 15 pages now carry a `Privacy` link; `check_site.py` enforces that the chrome stays identical, so the link cannot exist on some pages and not others.
- The deploy's HTML validation no longer uses a hand-written file list. It reads `git ls-files '*.html'`, so a new page is validated the moment it is tracked instead of deploying unchecked until someone remembers the list.

## 2026-11-16 — domain cutover, documentation set

**Model:** claude-opus-5 (Claude Code)

### Done

- Site moved to `https://envoiddesign.in/`. DNS repointed at Hostinger (four A records, `www` CNAME), domain set on the repository with `gh api`, HTTPS enforced, certificate approved for apex and `www`, `http://` 301s.
- `robots.txt` and `sitemap.xml` published; `check_site.py` now holds the sitemap to exactly the indexable pages, in both directions.
- Google Search Console verified by TXT; sitemap submitted and reporting **Success**, 3 pages discovered.
- `404.html` base href dropped to `/`; the form's `_next` points at the new `/thanks/`; Lighthouse's `canonical` audit re-enabled now that it is self-referencing.
- `README.md` restructured as production documentation.
- Pipeline skips documentation-only pushes (`paths-ignore` on `push` only — a required check that never runs blocks a pull request forever).
- Every wrap-imitating `<br>` removed from the markup; headings carry a measure plus `text-wrap: balance`, the two phone numbers became a real stack.
- Every outbound and asset link opens in a new tab; in-site navigation deliberately does not.
- Both EmailJS email templates written and reviewed in `docs/email-templates/`, pasted into the dashboard, and the four identifiers filled in `contact.js`. One of those identifiers was wrong; see the 2026-11-21 entry.
- EmailJS SDK tag now carries a Subresource Integrity hash and `crossorigin="anonymous"`.
- URLs dropped the `.html` extension: pages moved into directories and are served at `/projects/`, `/contact/`, `/thanks/`, with every markup reference now root-relative.
- Nine pages added for local search: a services hub, five service pages and three service-area pages, each with its own breadcrumb, `Service`, `BreadcrumbList` and `FAQPage` data. Navigation and footer changed with them, and `check_site.py` now guards the fourteen copies of the chrome against drift.
- Fixed a deploy defect found while answering the mobile app session: Pages was dropping every dot-directory, so `/.well-known/` could never have been served. One line in the workflow, a guard in `check_site.py`, and `tools/stage.sh` now strips `.gitignore` and `.gitmodules` since hidden files ship. `/.well-known/assetlinks.json` is now live, carrying the `in.envoiddesign.app` signing fingerprint the mobile-app session read off the built APK with `apksigner`; Google's Digital Asset Links API parses it, so Android link verification has what it needs. The iOS counterpart, `apple-app-site-association`, is not pending but declined: the mobile-app session reports that the studio was asked directly about the $99 Apple Developer membership and chose Android only, recorded as D-012 in `MobileApp/docs/DECISIONS.md`. Without that membership there is no Apple Team ID, so the file cannot be written at all, and there is no iOS app for it to point at. Do not add it, and do not add an app section, a store badge or a download link to the site on anyone's initiative: Android is real and verified on two devices, but it is distributed internally with no Play listing, so the only honest public claim today is no claim.
- **The Google Business Profile exists** — `Envoid Design Architect Studio`, 4.9 stars from 27 reviews, place `0x390cfb04c8251bab:0x23608581738bf604`. Earlier notes in this file that said it did not exist were wrong. What it still lacks is the hours, categories, services and photographs written out in [GOOGLE-BUSINESS-PROFILE.md](GOOGLE-BUSINESS-PROFILE.md), which are worth filling in.
- Eight of those reviews are published on the home page via `reviews.json`, read once from the profile at the studio's instruction, with attribution and a link back. See [REVIEWS-CONTRACT](REVIEWS-CONTRACT.md) for the licensing position and the rule that the attribution stays.
- A testimonials section is live on the home page, reading `/testimonials.json`, hidden until there is content. The sync pipeline that writes that file belongs to the mobile app session; the rendering is here, written with `textContent` only and tested against script-injection input.
- IndexNow, 2026-11-16: all 12 sitemap URLs submitted to Bing, Yahoo, DuckDuckGo and Yandex in one POST, HTTP 200. Re-run it with `tools/indexnow.sh` after any content change; it reads the URL list from `sitemap.xml`, so it needs no editing when a page is added. It does nothing for Google.
- Search Console, 2026-11-16: the sitemap was resubmitted and re-read on the spot, taking discovered pages from 3 to 12. Indexing was requested for all nine new pages plus `/` and `/projects/`, which is 11 of the day's quota. **`/contact/` hit "Quota Exceeded" and still needs submitting** — one request, any day, it is already in the sitemap either way.
- Search Console facts worth keeping: `/` was already indexed before any of this; every other URL reported either "Discovered - currently not indexed" or "URL is unknown to Google". The Page indexing and Performance reports were still showing "Processing data" because the property is barely a day old, so there is no ranking or impression data to read yet.
- This `docs/` set written.

### Broken or risky

- ~~The enquiry path has never been tested end to end.~~ **Closed 2026-11-21.** The studio submitted the live form and confirmed both mails arrive. It was broken until that day, and the fix is in the 2026-11-21 entry.
- **The site ranks for nothing yet, and on-page work alone will not change that.** The eight new pages are necessary and insufficient. Without a Google Business Profile and reviews, the map pack — which occupies the top of every local query — remains unreachable.
- **Nothing watches the EmailJS quota.** Roughly 200 requests a month, two per enquiry; past that, sends fail the way an outage does.
- **An open question the studio must answer, not us: may Google reviews be republished on this site?** The mobile app's Reviews tab reads `https://envoiddesign.in/reviews.json` if it exists. Filling that file means pulling review text through the Google Places API and keeping a copy on the studio's own domain, and the Maps Platform terms restrict exactly that — caching limits, and review content in particular. Neither session will build it without the studio accepting that exposure knowingly. The alternative costs nothing and is probably better: a button that opens the Business Profile shows real, current, complete reviews, needs no key and no sync, and sends signals that help the profile rank. The app already works that way; choosing link-out deletes four lines of its client code.
- **Domain auto-renewal is off** (expiry 2029-07-25). Long runway, silent failure.
- **No uptime monitoring.** The smoke test only runs at deploy time.
- **Project names in `projects/index.html` are unconfirmed** — read off source filenames, in a public repository.

### Next

1. Submit the live form once and confirm both mails arrive, following the manual path in `docs/TESTING.md`.
2. **Create the Google Business Profile.** Every field is written out ready to paste in [GOOGLE-BUSINESS-PROFILE.md](GOOGLE-BUSINESS-PROFILE.md), including the five facts that need the studio to confirm them. For "architect in Vaishali" or "interior designer in Indirapuram" the map pack sits above every organic result, and nothing in this repository can compete with it. Verify the Sector 5 address, set the categories to Architect and Interior Designer, add the service areas, post the project photographs that are already in `assets/`, and then ask every past client for a review. This single item outweighs all of the on-page work below it.
3. **Supply the facts the pages had to leave out.** Opening hours, a price band, the Instagram handle, and any Council of Architecture registration. Each is a ranking or display signal currently missing from the structured data, and each needs a human to confirm it rather than a model to guess — see `docs/ASSUMPTIONS.md`.
4. Turn on domain auto-renewal in hPanel.
5. Confirm the project titles and locations with the studio.
6. Submit `https://envoiddesign.in/contact/` in Search Console — it is the one URL the daily quota cut off on 2026-11-16. Everything else is submitted. Then leave it alone: expect weeks, not days, before a new domain settles, and resubmitting a URL does not improve its queue position.
7. Build links the honest way: a Google Business Profile, Instagram and a Justdial or IndiaMART listing that all carry the same name, address and phone number, exactly as the site writes them. Inconsistent address formatting across directories is the most common self-inflicted local-SEO wound.

### Do not touch

- Both `TXT` records on `@`: each verifies one Google account as a Search Console owner.
- `CNAME`, and the Pages domain setting. Both, together, are what keep the domain working.
- `.github/workflows/automerge.yml` — never add a checkout of the pull request's code.
- Canonical URLs, `og:url` and schema.org URLs. They name `envoiddesign.in` deliberately and CI enforces it.
- Image aspect ratios. Resize, never crop.

**Read first:** `docs/ARCHITECTURE.md`, `docs/CONSTRAINTS.md`, then `docs/defense/envoid-design-studio.md`.
