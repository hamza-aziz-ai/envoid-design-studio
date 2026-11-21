# DECISIONS

One entry per meaningful decision: what was chosen, what was rejected, and why. Newest first. The rejected options are the point — without them every choice reads as the only possible one, which is a red flag.

Entries made during AI-assisted sessions record the model, because behaviour differs between versions and knowing who reasoned through a change matters when debugging it later.

---

## D-028 — Google Analytics 4, opt-in only, with no form content

**Date:** 2026-11-21 · **Model:** claude-opus-5-5 (Claude Code)

**Context:** The studio asked for Google Analytics, set up professionally. Until now the site promised "no analytics", in `/privacy/` and in these docs.

**Decided:**
- **Consent first.** Google Analytics loads only after a visitor presses Accept on a small panel. Before that and after Decline, no Google script, request or cookie happens at all. This is stricter than Consent Mode's "advanced" setup, which sends cookieless pings before consent. India's DPDP Act asks for consent, and the old privacy promise made it a commitment. The choice can be changed from "Cookie settings" in every footer, and withdrawing deletes the `_ga` cookies.
- **What is measured:**
  - Page views, plus enhanced measurement: scrolls, outbound clicks, site search and file downloads.
  - `contact_click`, with `method` (phone, WhatsApp or email).
  - `tool_use`, the first interaction with a play tool on a page.
  - `generate_lead` when an enquiry is sent, carrying only the service chosen. `generate_lead` is the key event.
  - Never a name, phone number, email address or brief.
- **Property settings:**
  - Measurement ID `G-95C4HE9ZZC`, property 547361214, owned by the studio account.
  - Time zone India and currency INR.
  - Event data retention 14 months, the most the free tier allows.
  - Google signals and user-provided data off, and ad personalisation off in the tag too.
  - Linked to the `envoiddesign.in` Search Console domain property, so search queries show up in Analytics.

**Rejected:**
- Google Tag Manager: a second container to secure and audit for one tag.
- Advanced consent mode: it sends data before consent.
- A third-party consent platform: a dependency and a script for one checkbox.

---

## D-027 — The whole playground in 3D, through one shared lazy viewer

**Date:** 2026-11-21 · **Model:** claude-opus-5-5 (Claude Code)

**Context:** After the 3D room, the studio set the goal of taking the whole playground into three.js.

**Built:** `play-3d.js`, one shared viewer, plus a "View in 3D" control on every tool. Each tool keeps its 2D drawing as the default and the fallback. The 3D view is drawn from the tool's own tested state and stays in sync as the visitor plays.
- **Room calculator:** the drawn outline extruded with plaster walls, the floor laid in the chosen tile size, rebuilt on every corner drag.
- **Will it fit?:** each piece modelled from parts, the door standing open, problems outlined in red and the selected piece in brass.
- **Staircase:** a solid stair with timber treads, upper floor, wall, handrail and posts, and a figure at the foot, all to scale.
- **Sunlight explorer:** a new shadow study. A two-storey house with a chajja turns to face the chosen direction and casts its shadow under the real sun. Today's sun path and both solstice paths are drawn across the sky. The windows glow after dark.
- **Guess the area:** the room stands in 3D, and the reveal lays one-foot squares on its floor to count, matching the plan.
- **Colour your room:** its choices travel to the 3D room in the address, and the 3D room accepts only values it offers.

**Why one shared viewer:** renderer, controls, on-demand rendering, lighting with shadows, photographic materials, wall cutaway and framing are the same in every tool. Six copies would drift apart. Each tool's own code is only the part that differs: what it draws.

**Found and fixed while testing:**
- An SVG element has no `.hidden` property, so the old model must be hidden with the attribute.
- A shadow study viewed from the sunny side shows no shadow at all, so its camera starts on the north-west.
- Compass letters laid on the ground read mirrored from half the directions, so they are sprites that face the viewer.

**Cost:** none until a visitor asks. Every tool page still measured 99 performance and 100 on accessibility, best practices and SEO, because three.js and the textures load only when a "View in 3D" button is pressed.

---

## D-026 — A real-time 3D room, with three.js and photographed textures

**Date:** 2026-11-21 · **Model:** claude-opus-5-5 (Claude Code)

**Context:** The studio asked whether the play tools could be made smoother and more realistic with three.js, like browser games. It chose one flagship scene with photographic textures over upgrading every tool. D-023 had rejected three.js for the earlier tools on weight and dependency grounds, and those still hold for them. This reverses that for one page only.

**Built:** `/3d-room/`, a furnished living room in real-time 3D.
- **Sunlight:** the sun is placed with the same tested NOAA maths as `/sun-path/` for Vaishali at any date and time, and shines through a window that can face any of eight directions, with real shadows from the window bars, the sofa and the room.
- **Evening:** after sunset a pendant lamp takes over, switching itself on unless the visitor sets it.
- **Finishes:** walls, feature wall, floor, sofa and rug use the twenty-finish palette.
- **Controls:** orbit, zoom, eye-level and window views, turn buttons for keyboard users, play-the-day, and a PNG download.

**How it stays fast:** nothing heavy loads with the page. three.js (753 KB, about 196 KB compressed) and 1.8 MB of textures are fetched only when the visitor presses "Enter the room". The page itself measured 99 performance and 100 on accessibility, best practices and SEO, at 286 KB.

**How it looks real without being heavy:**
- *Textures:* CC0 photographs from Poly Haven at 1K, with normal and roughness maps. Each was decoded and re-encoded from pixels before being committed, which validates it and strips its metadata. Plaster, linen and wool are converted to light neutral greys so a chosen colour reads as itself.
- *Bounce light:* a real room is lit mostly by sunlight bouncing off the floor patch, which this renderer does not trace. A soft warm light placed where the sun actually lands stands in for it.
- *Cutaway walls:* walls between the camera and the room are lifted away for the view, but keep casting shadows through a material that draws nothing, so the sun still comes in only through the window.

**Choices:**
- *Self-hosted, not a CDN.* No new third party sees visitors, so the privacy policy stays true. The version sits in the path, so upgrades cannot mix with cached copies.
- *Kept the 2D tools.* They stay as the fast default and the fallback for browsers without WebGL, which get a plain message pointing to them.
- *Accessibility:* a canvas cannot be read by a screen reader. Its label is rewritten with the time, the light and every finish whenever anything changes, and every control is a native input or button.

**Tested:** `tools/test-tools.js` checks the sun-to-room conversion, the one piece of maths specific to this page, against the window's geometry.

---

## D-025 — Four more things to play with

**Date:** 2026-11-21 · **Model:** claude-opus-5-5 (Claude Code)

**Context:** The studio asked for more things visitors can play with, after withdrawing the fee estimator (D-024). The same limits apply: everything runs in the browser, nothing is generated by AI, no prices, and nothing the studio has not said.

**Built:**
- `/furniture-planner/`, "Will it fit?": a room of the visitor's size with beds, sofas, wardrobes and tables at common Indian retail sizes. Gaps to the nearest wall or piece show on every side, and a piece turns red when it overlaps another, crosses a wall or sits in the door's swing.
- `/colour-your-room/`: an isometric living room with walls, a feature wall, the floor, sofa, rug and metal finish picked from twenty named finishes, in daylight or evening lamplight, downloadable as a PNG. The finishes are the palette from the studio's design workspace. The page does not call it the studio's palette, because the studio has not said it is.
- `/staircase/`: floor-to-floor height, riser count and tread depth in; a stair drawn to scale beside a person out, with Blondel's comfort rule. The verdict uses Blondel's ideal of about 630 mm and the 550–700 mm range in UK Approved Document K, a published range rather than a number made up here. An earlier draft used a stricter 600 mm floor that called ordinary Indian stairs awkward, and was corrected before shipping.
- `/guess-the-area/`: a five-round plan-reading game with a best score kept in the visitor's own browser storage, which is a per-visitor nicety and wrapped so the game works without it.

**Choices:**
- *Rejected: a Vastu compass.* The studio's Vastu page deliberately avoids issuing rulings, and a tool would have had to.
- *Rejected: a plot-feasibility calculator.* It would have needed exact GDA bye-law figures, where a wrong number misleads people about what they are legally allowed to build.
- *Rejected: a before-and-after slider.* It needs matched drawing and photograph pairs of real projects, which do not exist yet.
- *Reused rather than copied:* the area game loads `room-planner.js` for its geometry.
- *Tested:* each tool's maths is in `tools/test-tools.js`, including 2,000 generated game rooms checked for valid outlines and whole-foot areas.
- *Results:* every page measured 99 performance and 100 on accessibility, best practices and SEO. Lighthouse in CI now also gates `/furniture-planner/`.

---

## D-024 — No fee estimator on the site

**Date:** 2026-11-21 · **Model:** claude-opus-5-5 (Claude Code)

**Context:** A drawing-fee estimator showing the quotation tool's default rates as "from" prices was built and published, then withdrawn the same day at the studio's request.

**Why it was withdrawn:** the interactive pages exist for visitors to play with and learn from. A price calculator is a different thing: it sets an expectation before the consultation, and any figure on the site becomes the number a client brings to the meeting and argues from when the real scope, and the real fee, turn out different. The studio would rather the fee conversation start at the consultation, where the scope is understood.

**What this rules out:** prices, rates or fee ranges anywhere on the site, including inside an interactive tool, unless the studio decides otherwise. The home FAQ goes back to saying the studio does not quote a rate before seeing the site.

**State after withdrawal:** the page, its script, its rate test, its sitemap entry and every link to it are gone. `/fee-estimator/` now serves the site's 404. It was submitted to IndexNow while live and will drop out of those indexes as crawlers find it missing.

---

## D-023 — Two interactive tools, drawn in SVG, with quantities and no prices

**Date:** 2026-11-21 · **Model:** claude-opus-5-5 (Claude Code)

**Context:** The studio asked for something visitors can play with, with nothing that needs AI to render or generate. The studio's internal workspace, Envoid-Agent, was reviewed with that session for anything deterministic that could run in a visitor's browser on a static site.

**Built:** `/room-planner/`, where a visitor drags the corners of a room and reads off floor area, wall area, paint, floor tiles and skirting, and `/sun-path/`, which shows where the sun is over Vaishali at any date and hour and how far it reaches into a room through a window facing any of eight directions. Both are linked from a dark band on the home page and from a footer column on every page.

**Options considered and rejected:**
- *three.js for the 3D views.* A large dependency, a network request to a CDN and a measurable Lighthouse cost for what is a box with walls. Both views are hand-projected SVG instead: a rotation and a downward tilt, depth-sorted walls, and near walls drawn as dashed cut edges. Both pages measured 99 performance and 100 on everything else.
- *Copying Envoid-Agent's code.* Its `calculations.ts` depends on Decimal.js and its type system. The formulas were reimplemented in plain JavaScript from the same definitions, so a visitor sees the arithmetic a studio estimate starts from without the site taking on a library.
- *Showing costs.* Envoid-Agent holds default drawing rates that pre-fill every quotation, but they are starting points edited per client, not a published price list. A fee estimator is the natural next tool and waits on the studio deciding to publish figures.
- *The demo designs and renders in Envoid-Agent.* The projects are fictional, so they cannot be shown as the studio's work, and one image is labelled AI-generated by the app itself.
- *A `/tools/` path.* `tools/stage.sh` deletes `tools/` from the deploy because that directory is the toolchain, so pages there would never have shipped.

**Correctness:** the sun uses NOAA's General Solar Position equations at the studio's coordinates. `tools/test-tools.js` checks them against values that do not come from the code: noon altitude from plain geometry at both solstices, and published Delhi NCR sunrise and sunset times. It also checks room areas, winding, rejection of crossed or folded walls, and outward wall normals. It was shown to fail when the time zone was deliberately broken. CI runs it on every push.

---

## D-022 — The studio is a `ProfessionalService`, because `ArchitecturalService` does not exist

**Date:** 2026-11-21 · **Model:** claude-opus-5-5 (Claude Code)

**Context:** While mirroring the Business Profile's opening hours onto the site, the studio node in the home page's JSON-LD turned out to be typed `ArchitecturalService`. That is not a schema.org type: `https://schema.org/ArchitecturalService` returns 404, and it was in the very first commit with no recorded reason.

**What it cost:** an unknown type is not a `LocalBusiness`, so the address, telephone, geo coordinates and area served attached to it were not being read as a local business's details. Every service page points its `provider` at this node, so the defect reached all of them through one `@id`.

**Options:** 1) `LocalBusiness` itself; 2) `ProfessionalService`, the `LocalBusiness` subtype for practices that sell expertise; 3) `HomeAndConstructionBusiness`, which reads as a contractor.

**Chosen:** 2. schema.org has no architect type, and Google's guidance is to use the most specific subtype that is true. `ProfessionalService` is true and specific; `HomeAndConstructionBusiness` would describe the design-and-build work but misdescribe the rest of the practice.

**Also added:** `openingHoursSpecification`, Monday to Saturday 10:00–17:00, taken from the studio's own Business Profile. The same hours are now visible on the contact and home pages, because structured data that describes nothing on the page is the kind Google ignores.

---

## D-021 — No "Open in app" banner on the site, because neither platform hands off a typed URL

**Date:** 2026-11-17 · **Model:** claude-opus-5 (Claude Code)

**Context:** The studio asked that hitting `envoiddesign.in` in a phone's browser open the app instead of the website, when the app is installed. `/.well-known/assetlinks.json` is live and verified on two Android devices, so the question is why that does not already cover the browser.

**What was found:** It cannot, and no file published from this repository can change it. Android App Links and iOS Universal Links are triggered by an incoming `VIEW` intent from another app, not by navigation the browser performs itself. A URL typed into Chrome's address bar is handled by Chrome; Chrome deliberately does not launch an app for a typed navigation or for one without a user gesture, because that would let any page hijack a session. Safari behaves the same way and additionally will not fire a Universal Link for a link to the site you are already browsing, which is why deep-link vendors recommend a separate `links.` subdomain. Both behaviours are widely documented by vendors and by Apple's own developer forum; neither Apple nor Google states it in a one-line spec sentence, so it was verified against several independent sources rather than one.

Consequence worth knowing for search: a Google result tapped on Android is a click inside Chrome, so organic search traffic lands on the website, never in the app. The app opens for links arriving from WhatsApp, Gmail, SMS, Instagram and other apps, which is what the asset statement buys and what was verified on hardware.

**Options:** 1) accept the platform behaviour and change nothing; 2) add a tappable "Open in app" banner using an `intent://` URL with `S.browser_fallback_url`, which is the one mechanism that does work from inside Chrome on a user gesture; 3) auto-redirect to `intent://` on page load; 4) add a Safari Smart App Banner via `<meta name="apple-itunes-app">`.

**Chosen:** 1, nothing. 3 is rejected outright — Chrome blocks an ungestured intent navigation anyway, and a marketing site that throws visitors at an app they may not have is a broken website. 4 is impossible: it needs an App Store ID, and D-012 in the app repository records that the studio declined the paid Apple Developer membership, so there is no iOS app at all. 2 is the only real option and it is blocked on a precondition rather than on taste: the Android build is distributed as an internal APK with no Play listing, so the banner would be shown to every visitor while almost none of them could act on it, and its fallback would point at a store page that does not exist. Revisit 2 if and when the app is published to Play.

**Cost of being wrong:** low and reversible. If a Play listing appears, option 2 is a banner, one `intent://` URL and a dismissal flag.

---

## D-020 — Ship dot-directories, and guard that in `check_site.py`

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Context:** The mobile app needs `/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association` to claim `envoiddesign.in` links. The app session flagged that silent non-serving is the usual failure, and asked for confirmation that a dot-path is actually served.

**What was found:** It was not. Two probe files were committed, staged into `_site` correctly, and still answered 404 on the live site. The cause is in the deploy log: `actions/upload-pages-artifact@v5` defaults `include-hidden-files` to false, and in that mode it archives with `tar ... --exclude=.git --exclude=.github --exclude=.[^/]* .`, which removes every dot-entry at every level. The tar listing for that run held 167 paths and not one of them was under `.well-known`.

**Options:** 1) serve the association files from a non-dot path — impossible, Apple and Google fix the location; 2) move off GitHub Pages; 3) set `include-hidden-files: true`.

**Chosen:** 3, one line.

**Trade-off:** Everything hidden now ships, so `tools/stage.sh` had to start stripping `.gitignore` and `.gitmodules` from the deployed directory. That is the whole cost.

**Verification:** Before the fix, both probes returned 404. After it, `/.well-known/probe.txt` returns 200 `text/plain` and the extensionless `/.well-known/probe-extensionless` returns 200 `application/octet-stream` with its body intact — which is the content type iOS accepts for `apple-app-site-association`, so that question is settled too. The probes were then removed.

**Guard:** `check_site.py` now fails if the workflow uses `upload-pages-artifact` without `include-hidden-files: true`. Tested by flipping it to false and watching the run go red. Without the guard this regresses the next time somebody tidies the workflow, and regresses silently.

**Note:** the repository had already paid for this default once — the Lighthouse report upload carries the same flag and a comment saying the upload is empty without it. The same default caught us twice in two different steps.

---

## D-019 — Use IndexNow for the engines that accept it

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Context:** Nine new pages needed crawling. Google retired its sitemap ping endpoint, so Google is a browser job through Search Console — and Search Console caps indexing requests at roughly ten a day, which the submissions on 2026-11-16 hit exactly.

**Options:** 1) submit to Google only and wait for the rest; 2) create Bing Webmaster Tools and Yandex Webmaster accounts; 3) use IndexNow, which needs no account.

**Chosen:** 3, in addition to the Search Console work.

**Why:** IndexNow is one POST that reaches Bing, Yahoo, DuckDuckGo and Yandex together. Ownership is proved by a key file at the site root, so there is no account to create, no credential to store and nothing for a future maintainer to inherit a login for. 2 would mean creating accounts in the studio's name, which is the client's decision and not a prerequisite for the crawling we wanted.

**Trade-off:** It does nothing for Google, which is the engine that matters most in this market. It is a supplement to the Search Console work, never a replacement, and `tools/indexnow.sh` says so in its own header.

**Verification:** First submission returned HTTP 202 (accepted, key being verified), the re-run through `tools/indexnow.sh` returned HTTP 200 for all 12 URLs. Pointing the script at a key the site does not serve makes it refuse to submit and exit 1, which was tested rather than assumed.

**Revisit if:** the studio wants Bing Webmaster Tools properly, which adds reporting that IndexNow does not.

---

## D-018 — Catch chrome drift with a check, not a template

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Context:** Fourteen pages now carry their own copy of the header and the footer (D-017). The failure that follows is familiar and slow: someone adds a nav link on four pages, forgets the rest, and nobody notices for a month because every page still looks fine on its own.

**Options:** 1) accept it and rely on care; 2) generate the chrome at build time; 3) include the chrome at runtime with JavaScript; 4) compare every page's chrome against the home page's in `check_site.py`.

**Chosen:** 4.

**Why:** It is about thirty lines, runs in the pipeline that already runs, and fails loudly the moment two pages disagree. 2 reintroduces the build step D-001 and D-017 both refused. 3 is worse than a build step: it makes the navigation invisible to a crawler with JavaScript disabled and delays the largest contentful paint on every page, to solve a problem that is not a runtime problem.

**Trade-off:** The comparison has to flatten the three differences that are legitimate — `aria-current` on the current page, the home page's bare `#about` anchors, and its logo pointing at `#top`. Each exception is a small hole in the check. They are listed in the function's docstring so the holes are at least visible.

**Verification:** Renaming one nav link on `/services/` makes `check_site.py` report `services/index.html: header has drifted from index.html's`; restoring it returns the run to green.

---

## D-017 — Write the local pages by hand, from a one-off generator

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Context:** Eight new pages share a header, a footer and twenty-odd lines of head boilerplate with the five that already existed. D-001 chose hand-written HTML and said to revisit past roughly a dozen pages. Thirteen is past it.

**Options:** 1) hand-write all eight, chrome included; 2) adopt a static site generator and rebuild the site around it; 3) write the eight from a throwaway generator, commit the output, and keep editing by hand afterwards; 4) keep the generator in `tools/` as a permanent build step.

**Chosen:** 3.

**Why:** 1 means eight hand-copied headers, and a header copied eight times is a header that disagrees with itself within a month. 2 buys templating at the price of a lockfile, a toolchain and a dependency tree, for a site whose content changes a few times a year — the same trade D-001 already refused. 4 is 2 in a smaller box: it makes the HTML a build artifact, which is the part that would have to be explained to whoever maintains this next. 3 gets the consistency where it matters, at birth, and leaves behind exactly what was there before: plain HTML anybody can edit.

**Trade-off:** Nothing in the editing model stops the fourteen copies of the chrome from drifting apart. That is a real cost, and D-018 is the answer to it.

**Revisit if:** the page count grows past roughly twenty-five, or content starts changing monthly rather than yearly. At that point templating earns its keep.

---

## D-016 — Eight pages, not twenty, and none of them thin

**Date:** 2026-11-16 · **Model:** claude-opus-5 (Claude Code)

**Context:** The site needs to rank for local queries — architect and interior designer in Ghaziabad, Noida and the surrounding NCR. Competing firms run a page per locality, often a dozen or more, each a reworded copy of the last.

**Options:** 1) match them, a page per suburb — Vaishali, Indirapuram, Vasundhara, Kaushambi, Crossings Republik and so on; 2) one page per genuine query intent, with real content; 3) a single page listing every area served.

**Chosen:** 2 — two Ghaziabad pages split by intent (architecture, interiors), one for Noida, a services hub and four service pages.

**Why:** A page per suburb, written from one template with the place name swapped, is a doorway page. Google names the pattern and devalues it, and the studio has no project in most of those suburbs to make the page honest. What it does have is a genuine difference between the architecture query and the interiors query, a real Noida project, and a service — map approval — where the local authority's own rules supply substance nobody else is writing. Those are five honest pages, and the suburbs live inside them as sections rather than as separate thin pages.

**Trade-off:** We forgo the long tail of "interior designer in Vasundhara" as an exact-match URL. If a suburb ever earns a real project and real photographs, it earns its own page then.

**Revisit if:** the studio completes work in a named locality and can show it.

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
