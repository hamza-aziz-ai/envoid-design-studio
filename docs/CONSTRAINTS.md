# CONSTRAINTS

What must never happen in this repository, and what requires asking first. Written in plain words so that neither a human nor an assistant can read a loophole into them.

## Never

- **Never crop a source photograph to fit a layout.** Resize proportionally only. The tiles are sized to the picture, not the other way round. Trimming uniform white margins from PDF-page exports is the single exception, and it is deliberate.
- **Never repoint a canonical, `og:url` or schema.org URL at the host the site happens to be served from.** They name `envoiddesign.in` on purpose. `tools/check_site.py` enforces this with `CANONICAL_HOST`.
- **Never add a checkout of the pull request's code to `.github/workflows/automerge.yml`.** It runs on `pull_request_target` with a writable token; not executing untrusted code is the only thing that makes that safe.
- **Never commit a credential, key, token or `.env` file.** Nothing in this repository is secret and it must stay that way. The EmailJS *public* key is an exception by design — see `docs/DEPENDENCIES.md`.
- **Never delete `CNAME` or either Google verification `TXT` record** without reading `docs/ROLLBACK.md` first. One hands the site back to `*.github.io`; the others un-verify Search Console. There are two TXT records on `@`, one per owning Google account: `google-site-verification=-MJdFTnLS-…` for the original account and `google-site-verification=bx2mjJiy…` for the studio's own `envoid.design.architect@gmail.com`. Removing one silently strips that account's ownership.
- **Never use `<br>` to imitate text wrap.** A hard break is a guess about viewport width that is wrong at every other width. Give the heading a measure in `ch` and let `text-wrap: balance` place the break. `<br>` between two separate entries is also wrong — that is a list, and `.info__stack` exists for it.
- **Never let a `.html` extension into a URL.** Pages live in directories and are served at `/projects/`, not `/projects.html`. Every reference in the markup is root-relative, and `tools/check_site.py` checks each canonical for equality against the published URL.
- **Never hard-wrap prose in a Markdown file.** One paragraph is one line; the renderer wraps it. This applies to every file in `docs/` and to commit messages.
- **Never add a runtime dependency without asking.** The site currently loads one third-party script. That number is a feature.
- **Never disable or loosen a check in `tools/check_site.py` or `lighthouserc.js` to make a build pass.** Fix the page. Each exception already in `lighthouserc.js` carries a comment saying why; a new one needs the same.

## Always

- **Always update `PAGES` in `tools/check_site.py`** when adding or removing a page, and `sitemap.xml` with it. The build fails if you forget the sitemap, but nothing catches a page missing from `PAGES`.
- **Always set `--r` on a gallery tile** to the replacement image's real aspect ratio when swapping a photograph.
- **Always regenerate the `-600` and `-1200` WebP variants** for a new photograph, and wire them through `<picture>` and `sizes`.
- **Always commit before a risky change**, so there is a known-good commit to return to.
- **Never remove `include-hidden-files: true` from the Pages upload step.** Without it the deploy drops every dot-entry, which un-deploys `/.well-known/` and breaks the mobile app's deep links with no visible symptom on the website. `check_site.py` fails the build if it goes missing; D-020 has the evidence.
- **Never render `testimonials.json` or `reviews.json` with `innerHTML`.** Every string in those files was typed by a member of the public. `main.js` builds the testimonial cards with `textContent` and `createTextNode` only, and that is not a style preference — it is the whole defence. The sync script strips control characters and caps lengths, which limits damage and is not an escaping layer. A human approving a review is a judgement check, not a sanitiser.
- **Never force a text wrap.** Text occupies the full width of its container. No `<br>` imitating a wrap, no `max-width` in `ch` on body copy or headings, and no `text-wrap: balance` — balance evens a heading's lines rather than letting the first run the full measure, which is the same defect in a different form. The grid and the page gutters set the measure.
- **Links are never underlined.** No `text-decoration: underline`, and no `border-bottom` standing in for one. A link is marked by colour and transitions to another colour on hover: `--brass-ink` to `--ink` on light backgrounds, `--brass-lt` to `--bone` on dark. Because colour is then the only signal, a link colour must hold at least 3:1 against the surrounding body text as well as 4.5:1 against the background — `--brass-ink` on `--bone` is 5.55:1 against the background and exactly 3.00:1 against `--ink`, so there is no headroom to darken the body text or lighten the link.
- **Never write a claim the studio has not confirmed.** No project in a locality it has not worked in, no credential, no year count, no client name, no opening hour, no price, no review. The temptation is strongest on the service-area pages, where a sentence like "over 200 projects delivered in Indirapuram" would help the page and be a lie. Where a page states a rule or a procedure, it states one the relevant authority publishes, and says that the authority is the one to check with.
- **Always give an outbound or asset link `target="_blank" rel="noopener"`.** In-site navigation is the exception and stays in the same tab: forcing a new tab on every nav click is a WCAG 3.2.5 failure and would drop the accessibility score below its floor.
- **Always read the full diff**, not a summary of it.

## Protected areas

| Area | Rule |
| --- | --- |
| `.github/workflows/automerge.yml` | Privileged. Any change is a security change and is reviewed as one |
| `contact.js` | The only module handling visitor input. Changes here are reviewed against `docs/THREAT.md` |
| `tools/stage.sh` | Decides what is published. A mistake here ships the toolchain or drops the site |
| `CNAME`, `robots.txt`, `sitemap.xml` | Live SEO surface; a wrong value is visible to search engines before it is visible to us |
| DNS and the registrar account | Outside this repository. See `docs/ROLLBACK.md` |

## Allow, pause or never — decided in advance

This is the standing answer to the permission prompt, decided calmly rather than at the prompt.

| Safe to allow | Pause and read | Never without a human |
| --- | --- | --- |
| Reading and searching files | Any edit to `contact.js` | Anything touching the registrar or DNS zone |
| Running `check_site.py`, `html-validate`, `node --check` | Any edit to a workflow file | `gh api` calls that change repository settings or branch protection |
| Running `stage.sh` into a scratch directory | Adding or removing a page | Force-push or history rewrite on `main` |
| Formatting and prose edits | Changing `lighthouserc.js` thresholds | Deleting a release, tag, or the Hostinger account's records |
| Local `git` reads: `status`, `log`, `diff` | `git push` to `main` | Publishing anything that reveals a credential |

**Rule of thumb:** the harder an action is to undo, the less it deserves a fast click. A DNS change propagates to strangers; a CSS change does not.
