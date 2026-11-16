# DECISIONS

One entry per meaningful decision: what was chosen, what was rejected, and why. Newest first. The rejected options are the point — without them every choice reads as the only possible one, which is a red flag.

Entries made during AI-assisted sessions record the model, because behaviour differs between versions and knowing who reasoned through a change matters when debugging it later.

---

## D-015 — Pin the EmailJS SDK with a Subresource Integrity hash

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Context:** The SDK runs in the page with access to every enquiry field. Pinning the version stops a bad *release*; it does nothing about tampered *bytes* at the CDN.

**Options:** 1) leave it pinned and accept the risk; 2) add an SRI hash; 3) self-host a copy in `assets/`; 4) drop the SDK and post to the EmailJS REST API directly.

**Chosen:** 2, `sha384`, with `crossorigin="anonymous"`.

**Why:** It costs two attributes and converts a silent-compromise risk into a loud failure. 3 moves the supply-chain problem to whoever updates the copy, and loses the shared-CDN cache. 4 is a larger rewrite of working code for a smaller gain.

**Trade-off:** It fails **closed**. If the served bytes ever change, the script stops loading and the form silently stops working, because `contact.js` still believes EmailJS is configured. That is the correct direction for a security control, but it is a real failure mode and is recorded in `docs/FAILURE.md`.

**Verification:** Downloaded twice, byte-identical; computed sha256 equals jsDelivr's own published sha256 for the file; the attribute in the markup recomputed and compared.

**Revisit if:** the pinned version changes — the hash must be recomputed, and `docs/DEPENDENCIES.md` holds the procedure.

---

## D-014 — Skip the pipeline for documentation-only commits

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Context:** Editing a paragraph in `README.md` ran four jobs and cut a dated release tag, for a change that cannot alter a single served byte.

**Options:** 1) leave it; 2) `paths-ignore` on `push` and `pull_request`; 3) `paths-ignore` on `push` only; 4) rely on `[skip ci]` in commit messages.

**Chosen:** 3.

**Why:** GitHub reports a required status check that never runs as "Expected", not as skipped. Option 2 would leave a documentation-only pull request permanently unmergeable — the opposite of the intent. Option 4 depends on remembering a magic string.

**Trade-off:** A documentation-only pull request still burns a CI run. Rare enough not to matter.

**Revisit if:** documentation pull requests become common, which would justify a filter job that reports success explicitly.

---

## D-013 — Keep `CNAME` even though Pages ignores it

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Context:** After the cutover, all four pipeline jobs passed but `gh api .../pages` still reported `cname: null`. An Actions-deployed Pages site does not adopt the domain from a `CNAME` file the way a branch build does.

**Options:** 1) set the domain via `gh api` and delete the now-inert file; 2) set it via `gh api` and keep the file; 3) switch Pages back to a branch build so the file is authoritative.

**Chosen:** 2.

**Why:** 3 would undo D-008 and let a red build publish again. Between 1 and 2, the file costs one line and documents the domain next to the code that assumes it; deleting it would also break a future branch build silently.

**Trade-off:** Two sources of truth for the domain. Mitigated by saying so explicitly in `README.md`.

---

## D-012 — Publish `sitemap.xml` only at cutover, and enforce it in CI

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Context:** Before the move, every page canonicalised to a domain the site was not served from. A sitemap then would have listed URLs pointing at someone else's content.

**Options:** 1) publish a sitemap all along; 2) publish none, ever; 3) publish at cutover with a check that keeps it honest.

**Chosen:** 3.

**Why:** A stale sitemap is worse than none — Search Console reports it as an error against the property. `check_site.py` now compares the sitemap against `PAGES` in both directions, so an added page cannot be forgotten and a `noindex` page cannot creep in.

**Trade-off:** One more thing the build can fail on. That is the feature.

---

## D-011 — Four A records, no AAAA

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Context:** Pointing `envoiddesign.in` at GitHub Pages.

**Options:** 1) four A records; 2) four A plus four AAAA; 3) a single A record; 4) `ALIAS` at the apex, as Hostinger had.

**Chosen:** 1.

**Why:** The four are GitHub's anycast endpoints; dropping any removes a path rather than saving a line, so 3 is strictly worse. IPv6-only clients reach IPv4 through 464XLAT, so 2 adds four records that change nothing today. 4 is not GitHub's documented apex configuration.

**Revisit if:** a client reports being unable to reach the site, or IPv6-only access becomes common on the networks the studio's customers use.

---

## D-010 — GitHub Pages, not the Hostinger hosting already paid for

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Context:** The domain was bought at Hostinger, which comes with hosting and an AI site builder.

**Options:** 1) GitHub Pages, Hostinger for DNS only; 2) deploy to Hostinger over FTP from CI; 3) rebuild the site in Hostinger's builder.

**Chosen:** 1.

**Why:** 2 means FTP credentials as repository secrets, a rewritten deploy job, and losing `deploy-pages`' atomic publish — all to use capacity already paid for on a site that costs nothing to host. 3 discards the work entirely.

**Trade-off:** Hostinger hosting goes unused. Its cost is already sunk in the domain registration.

---

## D-009 — Validate the email domain over DNS-over-HTTPS, failing open

**Date:** 2026-11-15 · **Model:** claude-opus-5 (Claude Code)

**Context:** `type="email"` checks syntax only. A typo like `gmial.com` passes it and the lead is lost silently.

**Options:** 1) syntax only; 2) a typo suggestion list; 3) an MX lookup over DoH; 4) both; 5) a paid verification API.

**Chosen:** 4, with the lookup failing open.

**Why:** The two catch different mistakes: the suggestion catches a near-miss of a real provider, the MX lookup catches a domain that cannot receive mail at all. 5 costs money and sends the full address to a third party.

**Trade-off:** The domain part of a typed address reaches Cloudflare before submit. Recorded in `docs/THREAT.md`. **Failing open is non-negotiable** — a DNS outage must never block a real enquiry.

---

## D-008 — Pages publishes from Actions only, never from a branch

**Date:** 2026-11-15 · **Model:** claude-opus-5 (Claude Code)

**Context:** The legacy branch build and the Actions workflow were both active, so a red build still published.

**Chosen:** `build_type: workflow`.

**Why:** Two publishers means the quality gate is advisory. One means a failing check actually stops a release.

---

## D-007 — Stage with `git archive`, and cache-bust with the commit sha

**Date:** 2026-11-15 · **Model:** claude-opus-5 (Claude Code)

**Context:** `rsync` is absent on Git Bash, and Cloudflare caches assets for four hours in front of Pages, so a returning visitor ran new HTML against old CSS.

**Options:** 1) `rsync`; 2) `cp -r` with exclusions; 3) `git archive HEAD`. For caching: a) nothing; b) content-hashed filenames; c) `?v=<sha>` appended at stage time.

**Chosen:** 3 and c.

**Why:** `git archive` guarantees only committed content ships, which removes a whole class of "it worked locally" accident, and needs no dependency. Hashed filenames (b) would require renaming files and rewriting references on every build — a build step this project exists to avoid.

**Trade-off:** Every deploy invalidates all three assets even when only one changed. Three files; irrelevant.

---

## D-006 — A native `<dialog>` for the gallery lightbox

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Options:** 1) leave tiles as plain links; 2) a library; 3) a hand-rolled overlay; 4) native `<dialog>`.

**Chosen:** 4, layered over 1.

**Why:** `<dialog>` brings the focus trap, Escape handling and background inertness for free — the three things hand-rolled overlays get wrong. The tiles remain real links, so without JavaScript the gallery still works.

---

## D-005 — Justified rows, not a fixed-ratio grid

**Date:** 2026-11-15 · **Model:** claude-opus-5 (Claude Code)

**Context:** The gallery cropped photographs to squarish tiles. Architectural renders lose their subject that way.

**Options:** 1) crop to a grid; 2) letterbox into fixed cells; 3) CSS columns (masonry); 4) flex rows with both `flex-grow` and `flex-basis` scaled by each image's ratio.

**Chosen:** 4.

**Why:** Only 4 gives a row of differently-shaped photographs one shared height while filling the width — the "Google Photos" behaviour asked for. Masonry (3) reorders reading sequence into columns, which a curated project sequence should not do.

**Trade-off:** Every tile must carry an accurate `--r`. Recorded as a hard rule in `docs/CONSTRAINTS.md`.

---

## D-004 — A text-safe brass, `#805a2c`

**Date:** 2026-11-15 · **Model:** claude-opus-5 (Claude Code)

**Context:** The brand brass `#b88a52` measures 2.79:1 on the bone background — far below the 4.5:1 WCAG AA needs for small text.

**Options:** 1) keep it and accept the failure; 2) darken the brand colour everywhere; 3) keep brass for large text and decoration, introduce a darker `--brass-ink` for small text.

**Chosen:** 3, after three rounds of measurement. `#8a6333` cleared the page background at 4.99:1 but only reached 4.36:1 on the darker `#ece7df` panels; `#805a2c` clears both (5.55:1 and 4.99:1).

**Why:** The brand colour survives where it is legible, and text is readable everywhere. Accessibility is not a thing to trade away for a shade.

---

## D-003 — Canonicalise to `envoiddesign.in` before the domain existed

**Date:** 2026-11-15 · **Model:** claude-opus-5 (Claude Code)

**Context:** The site was served from an interim host while the real domain still ran a placeholder.

**Options:** 1) canonicalise to the interim host and rewrite at cutover; 2) canonicalise to the destination from the start.

**Chosen:** 2.

**Why:** The URLs become self-referencing at cutover with no edit, and no ranking accrues to a host the site was always going to leave. Enforced by `CANONICAL_HOST` in `check_site.py` so nobody "fixes" it back.

**Trade-off:** Lighthouse's `canonical` audit had to be disabled until the move, with a comment saying why. Re-enabled in D-012's commit.

---

## D-002 — `pull_request_target` for auto-merge, with no checkout

**Date:** 2026-11-15 · **Model:** claude-opus-5 (Claude Code)

**Context:** Dependabot pull requests needed to merge themselves once green.

**Options:** 1) merge by hand; 2) `pull_request` with an elevated token; 3) `pull_request_target` with a writable token and no checkout of the head ref.

**Chosen:** 3.

**Why:** 2 cannot work — a fork's `pull_request` token is read-only by design. 3 runs the workflow definition from `main`, so a fork cannot alter it, and never executing the pull request's code is what keeps the writable token out of a stranger's hands.

**Trade-off:** A footgun one careless edit away. Written as a hard rule in `docs/CONSTRAINTS.md` and as a comment in the workflow itself.

---

## D-001 — Hand-written static site, no framework

**Date:** 2026-11 · **Model:** claude-opus-5 (Claude Code)

**Context:** A five-page brochure site for a practice that will change its content a few times a year.

**Options:** 1) a static site generator; 2) a React or Next.js application; 3) hand-written HTML, CSS and JavaScript.

**Chosen:** 3.

**Why:** A build step is a dependency tree, a lockfile and a supply chain to maintain forever, in exchange for templating five pages. The duplicated header and footer markup is the cost; it is smaller than the alternative.

**Trade-off:** A change to the navigation touches five files. **Revisit if** the page count grows past roughly a dozen, or a blog is added.
