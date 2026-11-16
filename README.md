# Envoid Design Studio

Marketing site for Envoid Design Studio, an architecture and interior design practice in Vaishali, Ghaziabad.

Hand-written HTML, CSS and JavaScript. No framework, no bundler, no `node_modules`. The only external resources are Google Fonts and the EmailJS browser SDK. Open `index.html` in a browser and it works.

**Live:** <https://envoiddesign.in/>

The domain is registered at Hostinger and its DNS is served by Hostinger's nameservers, but the site itself is GitHub Pages. Hostinger hosting is unused: the only records that matter are the four A records and the `www` CNAME under [Hosting and DNS](#hosting-and-dns).

## Layout

```
index.html        Home: hero, about, services, process, selected work, contact form
projects.html     Full gallery, 23 renders in four sections
contact.html      Studio details, map, enquiry form
thanks.html       Form landing page (noindex)
404.html          Custom not-found page (noindex, carries its own <base href>)
CNAME             The custom domain. Pages reads this on every deploy.
robots.txt        Crawl directives, and the sitemap's location
sitemap.xml       The three indexable pages
styles.css        Every page's styles
main.js           Nav, scroll reveal, footer year, gallery lightbox
contact.js        Enquiry form: validation and EmailJS delivery
assets/           Photography, logo, favicons, and generated width variants
tools/            Checks and the deploy staging script, not published
```

### Images

Source photographs keep their native aspect ratio. Nothing is exported cropped to a layout box: the tiles are sized to the picture instead, with `flex-grow` and `flex-basis` both scaled by the image's own ratio, so a row of tiles shares one height and fills the width. Trimming uniform white margins off PDF-page exports is the one exception, and is deliberate.

Each photo also has `-600`, `-1200` and native-width WebP variants, with narrower JPEG fallbacks, wired up through `<picture>` and `sizes`. Regenerate them with any proportional resize; never crop.

## Working on it

```bash
python3 -m http.server 8000          # then open http://localhost:8000/
python3 tools/check_site.py          # structural, metadata and link checks
bash tools/smoke.sh https://envoiddesign.in/
npx --yes html-validate@9 *.html     # what CI runs
```

`404.html` carries `<base href="/">` because GitHub Pages serves it for a missing path at any depth, and its relative asset links would otherwise resolve against that path. To preview it:

```bash
bash tools/stage.sh /tmp/preview
(cd /tmp/preview && python3 -m http.server 8000)
# http://localhost:8000/deep/nested/anything
```

## CI/CD

`.github/workflows/deploy.yml`, four jobs in order. A failure anywhere stops the ones after it.

| Job | Runs on | Does |
| --- | --- | --- |
| **Checks** | every push and PR | `html-validate`, `node --check` on both scripts, `tools/check_site.py`, Lighthouse against a copy served from a root, as production serves it |
| **Deploy to Pages** | `main`, push or manual | stages the site with `tools/stage.sh` and deploys it |
| **Smoke test** | after deploy | probes the live origin: pages, assets, a cache-busted 404 that must answer 404, `thanks.html` still `noindex` |
| **Release** | after a green smoke | tags `vYYYY.MM.DD-<run>`, generates notes, attaches the deployed site as a zip |

Pages is set to **GitHub Actions** as its source, not a branch build. Both were once active at the same time, which meant a red build still published.

`tools/stage.sh` is what assembles the published directory. It uses `git archive HEAD`, so only committed content ships, and it appends `?v=<commit sha>` to the stylesheet and scripts — Cloudflare caches those for four hours in front of Pages, and without a changing query a visitor keeps the old CSS against new HTML.

Lighthouse gates are floors, not current scores, and live in `lighthouserc.js` with a note on each one that is deliberately off.

### Merging

`main` is protected and requires the `Checks` context. Administrators can still push directly; a push that bypasses reports it.

Auto-merge is enabled, and `.github/workflows/automerge.yml` queues it for Dependabot's pull requests and for any pull request labelled `automerge`. The branch protection rule is what holds the merge until CI is green — without it `gh pr merge --auto` merges immediately. Branches are deleted on merge.

`automerge.yml` runs on `pull_request_target` with a writable token. It never checks out the pull request's code, and must not be changed to — that is what keeps the pattern safe.

## Hosting and DNS

GitHub Pages serves the site; Hostinger only answers DNS. The records in Hostinger's zone editor for `envoiddesign.in`:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| CNAME | `www` | `hamza-aziz-ai.github.io` |

Four A records, not one: they are GitHub's anycast edge, and dropping any of them removes a path to the site rather than saving a line.

A TXT record on `@` holds the Google Search Console verification token. Removing it un-verifies the property.

`CNAME` in this repository ships with every deploy, but an Actions-deployed Pages site does not read it the way a branch build does: the domain is set on the repository itself, and was set with `gh api -X PUT repos/:owner/:repo/pages -f cname=envoiddesign.in`. Keep the file anyway — it is what a branch build would need, and it documents the domain next to the code.

`envoiddesign.in` previously served a Hostinger AI Builder placeholder. That site still exists in the Hostinger account, on its own `*.hostingersite.com` subdomain, and is deliberately left there; it is unreachable at the domain.

To change the domain, edit `CNAME`, then `CANONICAL_HOST` in `tools/check_site.py`, the expected canonicals in `tools/smoke.sh`, the `_next` hidden field in `index.html` and `contact.html`, `robots.txt`, `sitemap.xml`, and the canonical, `og:url` and schema.org URLs in each page's head.

## Still needs a human

- **EmailJS.** `contact.js` has four blank identifiers at the top: the public key, and a service and template id for the enquiry and the auto-reply. Until they are filled the form falls back to its FormSubmit action, which needs a one-time activation click on the mail sent to the studio on first submit.
- **Google Business Profile.** For "architect in Vaishali" the Business Profile does more than any markup here.
- **Project names.** The titles and locations in `projects.html` were read off the source filenames. If any names a client, confirm it before it stays public — this repository is public and carries the studio's real phone numbers and email.
