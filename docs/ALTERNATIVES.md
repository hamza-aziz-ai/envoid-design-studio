# ALTERNATIVES

What was rejected, what it would have cost, and the condition that would change the answer. `docs/DECISIONS.md` records the choices; this file keeps the raw material for defending them.

Without the rejected options written down, every decision reads as the only possible one. That is a red flag, not a sign of good judgement.

## Hosting

| Option | Cost | Why not | Revisit if |
| --- | --- | --- | --- |
| **GitHub Pages** ✅ | Free; no server control, no custom headers | — | — |
| Hostinger hosting (already paid for) | FTP credentials as repository secrets, a rewritten deploy job, loss of atomic publish | Paying in complexity for capacity already sunk in the domain registration | The site needs server-side anything, or custom response headers |
| Netlify / Vercel | Another account in the chain; generous free tier | Would buy redirects, headers and preview deploys — none of which this site currently needs | A real need for a CSP header, `_redirects`, or per-PR previews |
| Cloudflare Pages | Same shape as above | Same | Same |

The decisive point: GitHub Pages cannot set custom response headers, which is why `csp-xss` and `uses-long-cache-ttl` are switched off in `lighthouserc.js` rather than satisfied. That is the price paid, and it is written down so nobody re-litigates it from scratch.

## Site technology

| Option | Cost | Why not | Revisit if |
| --- | --- | --- | --- |
| **Hand-written HTML/CSS/JS** ✅ | Header and footer duplicated across thirteen pages, guarded by a drift check in `check_site.py` | — | Page count passes roughly twenty-five (D-017) |
| Eleventy, Astro or Hugo | A toolchain, a lockfile and a supply chain, permanently | Templating thirteen pages still does not pay for a build step and its dependency tree; the eight new ones were written once from a throwaway generator and committed as plain HTML | Page count passes roughly twenty-five, or a blog is added |
| React / Next.js | All of the above, plus hydration and a JavaScript-dependent first paint | A brochure site that must be fast and crawlable is the worst possible case for it | Never, for this site |

## Enquiry delivery

| Option | Cost | Why not | Revisit if |
| --- | --- | --- | --- |
| **EmailJS, FormSubmit as fallback** ✅ | Two third parties see enquiry content; ~200 emails/month free | — | — |
| FormSubmit alone | Simplest; no SDK, no key | No auto-reply to the enquirer, and no control over failure messaging | Volume stays tiny and the auto-reply is dropped as a requirement |
| A serverless function | Full control, a secret to manage, a platform to run it on | Reintroduces a backend to a site that deliberately has none | Enquiry volume exceeds the free tier, or enquiries must be stored |
| `mailto:` only | Zero dependencies | Fails for anyone without a configured mail client, which is most phone users | Never |

## Email validation

| Option | Cost | Why not | Revisit if |
| --- | --- | --- | --- |
| **Typo suggestion + DoH MX lookup, failing open** ✅ | Domain part reaches Cloudflare; ~4s worst case | — | — |
| `type="email"` only | Free | Lets `gmial.com` through, and the lead is lost silently | Never |
| A paid verification API | Money, and the full address sent to a third party | Disproportionate for a studio's contact form | Lead volume makes a wasted lead expensive |
| Blocking on an undeliverable domain **without** failing open | Stricter | A DNS outage would silently block every enquiry — a far worse failure than letting one typo through | Never |

## Gallery layout

| Option | Cost | Why not | Revisit if |
| --- | --- | --- | --- |
| **Justified flex rows, `--r` per tile** ✅ | Every tile must carry an accurate ratio | — | — |
| Fixed-ratio grid with `object-fit: cover` | Trivial CSS | Crops architectural renders, which destroys the subject | Never, for photography of buildings |
| Letterboxing into fixed cells | Trivial CSS | Bands of empty background around every image | Never |
| CSS columns (masonry) | Simple, fluid | Reorders reading sequence into columns; a curated project order should survive | The gallery stops being a curated sequence |
| JavaScript justified-layout library | Pixel-exact rows | A dependency and a layout that does not exist until JavaScript runs | Row precision ever actually matters |

## Cache busting

| Option | Cost | Why not | Revisit if |
| --- | --- | --- | --- |
| **`?v=<commit sha>` appended at stage time** ✅ | All three assets invalidate together on every deploy | — | — |
| Content-hashed filenames | Precise invalidation | Requires renaming files and rewriting references — a build step this project exists to avoid | A real build step arrives for another reason |
| Nothing | Free | A returning visitor runs new HTML against four-hour-old CSS | Never |

## Auto-merge

| Option | Cost | Why not | Revisit if |
| --- | --- | --- | --- |
| **`pull_request_target`, no checkout** ✅ | One careless edit away from a serious hole | — | — |
| `pull_request` with an elevated token | — | Impossible: a fork's token is read-only by design | Never |
| Merging Dependabot pull requests by hand | No workflow at all | They pile up and get merged unread, which is worse than merging them green | A second maintainer makes review realistic |
| A GitHub App with scoped permissions | Narrower token than `GITHUB_TOKEN` | An app to install and maintain, for a repository holding no secrets | This repository ever holds a real secret |
