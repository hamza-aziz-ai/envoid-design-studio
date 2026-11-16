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
- Both EmailJS email templates written and reviewed in `docs/email-templates/`, so filling the four identifiers is the only step left.
- EmailJS SDK tag now carries a Subresource Integrity hash and `crossorigin="anonymous"`.
- URLs dropped the `.html` extension: pages moved into directories and are served at `/projects/`, `/contact/`, `/thanks/`, with every markup reference now root-relative.
- This `docs/` set written.

### Broken or risky

- **Enquiries reach nobody.** `EMAILJS` has four blank identifiers, so the form falls back to FormSubmit, which has never been activated. Submissions are accepted and discarded, silently. **This is the top priority.**
- **Domain auto-renewal is off** (expiry 2029-07-25). Long runway, silent failure.
- **No uptime monitoring.** The smoke test only runs at deploy time.
- **Project names in `projects/index.html` are unconfirmed** — read off source filenames, in a public repository.

### Next

1. Create the EmailJS service and the two templates, paste `docs/email-templates/enquiry.html` and `confirmation.html` into them with the dashboard settings in that folder's README, fill the four identifiers in `contact.js`, then run the manual form path in `docs/TESTING.md` and confirm both mails arrive.
2. Turn on domain auto-renewal in hPanel.
3. Confirm the project titles and locations with the studio.
4. Leave Search Console to re-read `sitemap.xml` on its own — it already lists the new directory URLs. The three `.html` URLs submitted earlier today now 404, which is correct and needs no action.
5. Create the Google Business Profile — for "architect in Vaishali" it outweighs any markup here.

### Do not touch

- The `TXT` record on `@` — it verifies Search Console.
- `CNAME`, and the Pages domain setting. Both, together, are what keep the domain working.
- `.github/workflows/automerge.yml` — never add a checkout of the pull request's code.
- Canonical URLs, `og:url` and schema.org URLs. They name `envoiddesign.in` deliberately and CI enforces it.
- Image aspect ratios. Resize, never crop.

**Read first:** `docs/ARCHITECTURE.md`, `docs/CONSTRAINTS.md`, then `docs/defense/envoid-design-studio.md`.
