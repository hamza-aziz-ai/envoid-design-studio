# Envoid Design Studio

Marketing site for Envoid Design Studio, an architecture and interior design
practice in Vaishali, Ghaziabad.

Hand-written HTML, CSS and JavaScript. No framework, no bundler, no
`node_modules`. The only external resources are Google Fonts and the EmailJS
browser SDK. Open `index.html` in a browser and it works.

**Live:** <https://hamzaaziz.dev/envoid-design-studio/> — an interim host.
Every page canonicalises to `https://envoiddesign.in/`, the domain this site
replaces. See [Cutover](#cutover).

## Layout

```
index.html        Home: hero, about, services, process, selected work, contact form
projects.html     Full gallery, 23 renders in four sections
contact.html      Studio details, map, enquiry form
thanks.html       Form landing page (noindex)
404.html          Custom not-found page (noindex, carries its own <base href>)
styles.css        Every page's styles
main.js           Nav, scroll reveal, footer year, gallery lightbox
contact.js        Enquiry form: validation and EmailJS delivery
assets/           Photography, logo, favicons, and generated width variants
tools/            Checks and the deploy staging script, not published
```

### Images

Source photographs keep their native aspect ratio. Nothing is exported
cropped to a layout box: the tiles are sized to the picture instead, with
`flex-grow` and `flex-basis` both scaled by the image's own ratio, so a row of
tiles shares one height and fills the width. Trimming uniform white margins
off PDF-page exports is the one exception, and is deliberate.

Each photo also has `-600`, `-1200` and native-width WebP variants, with
narrower JPEG fallbacks, wired up through `<picture>` and `sizes`. Regenerate
them with any proportional resize; never crop.

## Working on it

```bash
python3 -m http.server 8000          # then open http://localhost:8000/
python3 tools/check_site.py          # structural, metadata and link checks
bash tools/smoke.sh https://hamzaaziz.dev/envoid-design-studio/
npx --yes html-validate@9 *.html     # what CI runs
```

`404.html` is the exception: it carries `<base href="/envoid-design-studio/">`
because GitHub Pages serves it for a missing path at any depth. Served from
the project root it will look unstyled. To preview it as deployed:

```bash
bash tools/stage.sh /tmp/preview/envoid-design-studio
(cd /tmp/preview && python3 -m http.server 8000)
# http://localhost:8000/envoid-design-studio/anything
```

## CI/CD

`.github/workflows/deploy.yml`, four jobs in order. A failure anywhere stops
the ones after it.

| Job | Runs on | Does |
| --- | --- | --- |
| **Checks** | every push and PR | `html-validate`, `node --check` on both scripts, `tools/check_site.py`, Lighthouse against a copy served at the production path |
| **Deploy to Pages** | `main`, push or manual | stages the site with `tools/stage.sh` and deploys it |
| **Smoke test** | after deploy | probes the live origin: pages, assets, a cache-busted 404 that must answer 404, `thanks.html` still `noindex` |
| **Release** | after a green smoke | tags `vYYYY.MM.DD-<run>`, generates notes, attaches the deployed site as a zip |

Pages is set to **GitHub Actions** as its source, not a branch build. Both were
once active at the same time, which meant a red build still published.

`tools/stage.sh` is what assembles the published directory. It uses
`git archive HEAD`, so only committed content ships, and it appends
`?v=<commit sha>` to the stylesheet and scripts — Cloudflare caches those for
four hours in front of Pages, and without a changing query a visitor keeps the
old CSS against new HTML.

Lighthouse gates are floors, not current scores, and live in `lighthouserc.js`
with a note on each one that is deliberately off.

### Merging

`main` is protected and requires the `Checks` context. Administrators can
still push directly; a push that bypasses reports it.

Auto-merge is enabled, and `.github/workflows/automerge.yml` queues it for
Dependabot's pull requests and for any pull request labelled `automerge`. The
branch protection rule is what holds the merge until CI is green — without it
`gh pr merge --auto` merges immediately. Branches are deleted on merge.

`automerge.yml` runs on `pull_request_target` with a writable token. It never
checks out the pull request's code, and must not be changed to — that is what
keeps the pattern safe.

## Cutover

The site is written for `envoiddesign.in` already. To move it:

1. Serve this repository's contents from `envoiddesign.in`. Canonicals, og:url
   and every schema.org URL become self-referencing; nothing in the markup
   needs editing except step 2.
2. Change `<base href="/envoid-design-studio/">` in `404.html` to `/`. It is
   the one string that does not survive the move.
3. Publish a `sitemap.xml` there, and submit it in Search Console. There is
   deliberately none in this repository: it would list URLs that canonicalise
   to another domain.
4. Update `CANONICAL_HOST` in `tools/check_site.py` if the domain differs, and
   `tools/smoke.sh`'s expected canonicals.
5. Point the form's `_next` hidden field at the new `thanks.html`. FormSubmit
   needs an absolute URL there, so it currently names the interim host and
   would send people back to a page that no longer exists.
6. Delete the `hamzaaziz.dev` copy. GitHub Pages cannot 301 a project path.
7. Re-enable the `canonical` audit in `lighthouserc.js`.

Until then Google may index the interim copy despite the canonical, because it
points at a domain still serving different content.

## Still needs a human

- **EmailJS.** `contact.js` has four blank identifiers at the top: the public
  key, and a service and template id for the enquiry and the auto-reply. Until
  they are filled the form falls back to its FormSubmit action, which needs a
  one-time activation click on the mail sent to the studio on first submit.
- **Google Business Profile and Search Console.** For "architect in Vaishali"
  the Business Profile does more than any markup here.
- **Project names.** The titles and locations in `projects.html` were read off
  the source filenames. If any names a client, confirm it before it stays
  public — this repository is public and carries the studio's real phone
  numbers and email.
