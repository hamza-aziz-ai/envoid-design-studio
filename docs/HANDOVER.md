# HANDOVER

Where things stand. Newest entry on top. Read this first; update it last.

---

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
- Both EmailJS email templates written and reviewed in `docs/email-templates/`, pasted into the dashboard, and the four identifiers filled in `contact.js`. The enquiry path is live and not yet exercised end to end.
- EmailJS SDK tag now carries a Subresource Integrity hash and `crossorigin="anonymous"`.
- URLs dropped the `.html` extension: pages moved into directories and are served at `/projects/`, `/contact/`, `/thanks/`, with every markup reference now root-relative.
- Nine pages added for local search: a services hub, five service pages and three service-area pages, each with its own breadcrumb, `Service`, `BreadcrumbList` and `FAQPage` data. Navigation and footer changed with them, and `check_site.py` now guards the fourteen copies of the chrome against drift.
- IndexNow, 2026-11-16: all 12 sitemap URLs submitted to Bing, Yahoo, DuckDuckGo and Yandex in one POST, HTTP 200. Re-run it with `tools/indexnow.sh` after any content change; it reads the URL list from `sitemap.xml`, so it needs no editing when a page is added. It does nothing for Google.
- Search Console, 2026-11-16: the sitemap was resubmitted and re-read on the spot, taking discovered pages from 3 to 12. Indexing was requested for all nine new pages plus `/` and `/projects/`, which is 11 of the day's quota. **`/contact/` hit "Quota Exceeded" and still needs submitting** — one request, any day, it is already in the sitemap either way.
- Search Console facts worth keeping: `/` was already indexed before any of this; every other URL reported either "Discovered - currently not indexed" or "URL is unknown to Google". The Page indexing and Performance reports were still showing "Processing data" because the property is barely a day old, so there is no ranking or impression data to read yet.
- This `docs/` set written.

### Broken or risky

- **The enquiry path has never been tested end to end.** It is wired and deployed; nobody has yet submitted the live form and watched both mails arrive. **This is the top priority**, and the procedure is in `docs/TESTING.md`.
- **The site ranks for nothing yet, and on-page work alone will not change that.** The eight new pages are necessary and insufficient. Without a Google Business Profile and reviews, the map pack — which occupies the top of every local query — remains unreachable.
- **Nothing watches the EmailJS quota.** Roughly 200 requests a month, two per enquiry; past that, sends fail the way an outage does.
- **Domain auto-renewal is off** (expiry 2029-07-25). Long runway, silent failure.
- **No uptime monitoring.** The smoke test only runs at deploy time.
- **Project names in `projects/index.html` are unconfirmed** — read off source filenames, in a public repository.

### Next

1. Submit the live form once and confirm both mails arrive, following the manual path in `docs/TESTING.md`.
2. **Create the Google Business Profile.** For "architect in Vaishali" or "interior designer in Indirapuram" the map pack sits above every organic result, and nothing in this repository can compete with it. Verify the Sector 5 address, set the categories to Architect and Interior Designer, add the service areas, post the project photographs that are already in `assets/`, and then ask every past client for a review. This single item outweighs all of the on-page work below it.
3. **Supply the facts the pages had to leave out.** Opening hours, a price band, the Instagram handle, and any Council of Architecture registration. Each is a ranking or display signal currently missing from the structured data, and each needs a human to confirm it rather than a model to guess — see `docs/ASSUMPTIONS.md`.
4. Turn on domain auto-renewal in hPanel.
5. Confirm the project titles and locations with the studio.
6. Submit `https://envoiddesign.in/contact/` in Search Console — it is the one URL the daily quota cut off on 2026-11-16. Everything else is submitted. Then leave it alone: expect weeks, not days, before a new domain settles, and resubmitting a URL does not improve its queue position.
7. Build links the honest way: a Google Business Profile, Instagram and a Justdial or IndiaMART listing that all carry the same name, address and phone number, exactly as the site writes them. Inconsistent address formatting across directories is the most common self-inflicted local-SEO wound.

### Do not touch

- The `TXT` record on `@` — it verifies Search Console.
- `CNAME`, and the Pages domain setting. Both, together, are what keep the domain working.
- `.github/workflows/automerge.yml` — never add a checkout of the pull request's code.
- Canonical URLs, `og:url` and schema.org URLs. They name `envoiddesign.in` deliberately and CI enforces it.
- Image aspect ratios. Resize, never crop.

**Read first:** `docs/ARCHITECTURE.md`, `docs/CONSTRAINTS.md`, then `docs/defense/envoid-design-studio.md`.
