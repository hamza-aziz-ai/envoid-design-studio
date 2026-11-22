# Envoid Design Studio

Marketing website for Envoid Design Studio, an architecture and interior design practice in Vaishali, Ghaziabad.

[![CI/CD](https://github.com/hamza-aziz-ai/envoid-design-studio/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/hamza-aziz-ai/envoid-design-studio/actions/workflows/deploy.yml)
[![Site](https://img.shields.io/website?url=https%3A%2F%2Fenvoiddesign.in&label=envoiddesign.in)](https://envoiddesign.in/)

**Production:** <https://envoiddesign.in/>

---

## Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Local development](#local-development)
- [Quality gates](#quality-gates)
- [Delivery pipeline](#delivery-pipeline)
- [Branching and merge policy](#branching-and-merge-policy)
- [Hosting, DNS and domain](#hosting-dns-and-domain)
- [Content and asset conventions](#content-and-asset-conventions)
- [Operations runbook](#operations-runbook)
- [Security considerations](#security-considerations)
- [Documentation](#documentation)
- [Outstanding items](#outstanding-items)

---

## Overview

Five static pages, hand-written in HTML, CSS and JavaScript. There is no framework, no bundler and no `node_modules`; the only external resources the browser fetches are Google Fonts and the EmailJS SDK. Opening `index.html` from disk gives a working site.

That constraint is deliberate. The site is content that changes a few times a year, and a toolchain it does not need is a dependency surface it would have to maintain. The engineering investment sits instead in the delivery pipeline: every push is validated, deployed, probed against the live origin and released, with no manual step between a merge and production.

| | |
| --- | --- |
| **Runtime** | Static HTML, CSS, vanilla JavaScript (no build step) |
| **Hosting** | GitHub Pages, deployed from GitHub Actions |
| **Domain** | `envoiddesign.in`, registered and DNS-hosted at Hostinger |
| **TLS** | GitHub-issued certificate, HTTPS enforced, covers apex and `www` |
| **CI/CD** | GitHub Actions — validate, deploy, smoke test, release |
| **Forms** | EmailJS, with FormSubmit as the fallback transport |

## Architecture

```
Browser ──► Fastly CDN (GitHub Pages edge) ──► Static site
                                                   │
                                                   ├── EmailJS SDK  ──► enquiry + auto-reply
                                                   └── Google Fonts
```

There is no server, no database and no runtime configuration. Everything a visitor receives is a file committed to this repository and staged by `tools/stage.sh`. The enquiry form is the only outbound integration, and it degrades to a plain HTML form post if JavaScript or EmailJS is unavailable.

## Repository structure

URLs carry no file extension. GitHub Pages serves `<dir>/index.html` at `<dir>/`, so the pages live in directories and every reference in the markup is root-relative.

| Path | Served at | Purpose |
| --- | --- | --- |
| `index.html` | `/` | Home: hero, about, services, process, selected work, contact form |
| `projects/index.html` | `/projects/` | Full gallery, 23 renders across four sections |
| `contact/index.html` | `/contact/` | Studio details, map, enquiry form |
| `services/index.html` | `/services/` | Services hub |
| `services/architecture/index.html` | `/services/architecture/` | Architecture and structural coordination |
| `services/interior-design/index.html` | `/services/interior-design/` | Interior design |
| `services/design-build-turnkey/index.html` | `/services/design-build-turnkey/` | Design, build and turnkey execution |
| `services/map-approval-ghaziabad/index.html` | `/services/map-approval-ghaziabad/` | GDA building plan sanction |
| `services/vastu/index.html` | `/services/vastu/` | Vastu-informed planning |
| `architects-in-ghaziabad/index.html` | `/architects-in-ghaziabad/` | Service area: Ghaziabad, architecture |
| `interior-designers-in-ghaziabad/index.html` | `/interior-designers-in-ghaziabad/` | Service area: Ghaziabad, interiors |
| `architects-in-noida/index.html` | `/architects-in-noida/` | Service area: Noida and Greater Noida |
| `services/index.html` | `/services/` | Services hub |
| `services/architecture/index.html` | `/services/architecture/` | Architecture and structural coordination |
| `services/interior-design/index.html` | `/services/interior-design/` | Interior design |
| `services/design-build-turnkey/index.html` | `/services/design-build-turnkey/` | Design, build and turnkey execution |
| `services/map-approval-ghaziabad/index.html` | `/services/map-approval-ghaziabad/` | GDA building plan sanction |
| `architects-in-ghaziabad/index.html` | `/architects-in-ghaziabad/` | Service area: Ghaziabad, architecture |
| `interior-designers-in-ghaziabad/index.html` | `/interior-designers-in-ghaziabad/` | Service area: Ghaziabad, interiors |
| `architects-in-noida/index.html` | `/architects-in-noida/` | Service area: Noida and Greater Noida |
| `thanks/index.html` | `/thanks/` | Form landing page (`noindex`) |
| `404.html` | any missing path | Custom not-found page (`noindex`, carries its own `<base href>`) |
| `styles.css` | `/styles.css` | Every page's styles |
| `main.js` | `/main.js` | Navigation, scroll reveal, footer year, gallery lightbox |
| `contact.js` | `/contact.js` | Enquiry form validation and EmailJS delivery |
| `CNAME` | — | Custom domain declaration |
| `11a31af272e849d434442a1409c95719.txt` | `/11a31af2….txt` | IndexNow ownership key; the filename is the key |
| `robots.txt` | `/robots.txt` | Crawl directives and the sitemap's location |
| `sitemap.xml` | `/sitemap.xml` | The three indexable pages |
| `assets/` | `/assets/…` | Photography, logo, favicons and generated width variants |
| `tools/` | — | Validation, staging and smoke-test scripts (never published) |
| `.github/workflows/` | — | Delivery and dependency-merge pipelines |
| `lighthouserc.js` | — | Lighthouse CI budget |
| `.htmlvalidate.json` | — | HTML validation ruleset |
| `docs/` | — | Engineering documentation (never published) |

## Local development

### Prerequisites

Python 3 and Node.js 20 or newer. Both are used only by the checks; the site itself needs neither.

### Commands

```bash
python3 -m http.server 8000          # serve at http://localhost:8000/
python3 tools/check_site.py          # structural, metadata and link checks
npx --yes html-validate@9 *.html     # the exact validation CI runs
bash tools/smoke.sh https://envoiddesign.in/
```

### Previewing the 404 page

`404.html` carries `<base href="/">` because GitHub Pages serves it for a missing path at any depth, and its relative asset links would otherwise resolve against that path. Serving the repository root directly will therefore not reproduce production behaviour. Stage it instead:

```bash
bash tools/stage.sh /tmp/preview
(cd /tmp/preview && python3 -m http.server 8000)
# http://localhost:8000/deep/nested/anything
```

## Quality gates

`tools/check_site.py` is dependency-free and enforces the invariants that silently rot in a static site:

- exactly one `<head>`, `<title>` and `<h1>` per page, and a meta description within length limits;
- the required Open Graph tags, with `og:url` equal to the canonical;
- canonicals on indexable pages only, and no structured data on `noindex` pages;
- JSON-LD that parses, with every URL on the canonical host;
- `alt`, `width` and `height` on every `<img>`, and an `<img>` inside every `<picture>`;
- every local `src`, `href` and `srcset` candidate resolving to a file that exists;
- a sitemap listing exactly the indexable pages — neither a missing page nor a `noindex` one;
- no orphan pages.

Lighthouse CI runs against a staged copy served from a root, matching production. The thresholds in `lighthouserc.js` are floors the site must not drop below, not a record of current scores:

| Assertion | Level | Threshold |
| --- | --- | --- |
| `categories:accessibility` | error | ≥ 0.98 |
| `categories:best-practices` | error | ≥ 0.98 |
| `categories:seo` | error | ≥ 0.98 |
| `categories:performance` | warn | ≥ 0.90 |
| `document-title`, `meta-description`, `html-has-lang`, `image-alt`, `unsized-images`, `is-crawlable`, `http-status-code`, `viewport`, `link-text`, `canonical` | error | audit must pass |

`uses-long-cache-ttl` and `csp-xss` are disabled: both are properties of GitHub Pages' response headers, which this repository cannot set. Each exception carries a comment in `lighthouserc.js` explaining why.

## Delivery pipeline

`.github/workflows/deploy.yml` runs four jobs in sequence. A failure at any stage stops the ones after it, so nothing reaches production unvalidated and nothing is tagged unless it is confirmed serving.

```mermaid
flowchart LR
    pr(["`pull request`"]) --> checks
    push(["`push to main`"]) --> checks["`**Checks**`"]
    checks --> deploy["`**Deploy to Pages**`"]
    deploy --> smoke["`**Smoke test**`"]
    smoke --> release["`**Release**`"]
```

| Stage | Trigger | Responsibility |
| --- | --- | --- |
| **Checks** | every push and pull request | `html-validate`, `node --check` on both scripts, `tools/check_site.py`, Lighthouse CI against a staged copy |
| **Deploy to Pages** | `main`, on push or manual dispatch | stages the site with `tools/stage.sh` and publishes it |
| **Smoke test** | after a successful deploy | probes the live origin: every page and asset, cache-busted 404s that must answer `404`, `/thanks/` still `noindex`, `robots.txt` and `sitemap.xml` |
| **Release** | after a green smoke test | tags `vYYYY.MM.DD-<run>`, generates notes, attaches the deployed site as a zip |

Pages is configured with **GitHub Actions** as its source rather than a branch build. Both were briefly active at once, which meant a failing build still published; the workflow source is now authoritative.

`tools/stage.sh` assembles the published directory. It uses `git archive HEAD`, so only committed content ships and an uncommitted local edit cannot reach production, and it appends `?v=<commit sha>` to the stylesheet and scripts. GitHub Pages serves those assets with `max-age=600`, so Fastly and the browser hold them for ten minutes, and without a changing query string a returning visitor would run the previous CSS against new markup.

## Branching and merge policy

`main` is protected and requires the `Checks` status context. Administrators may still push directly; such a push is reported as a bypassed rule violation.

Auto-merge is enabled. `.github/workflows/automerge.yml` queues it for Dependabot pull requests and for any pull request labelled `automerge`. Branch protection is what holds the merge until CI is green — without a required status check, `gh pr merge --auto` merges immediately. Branches are deleted on merge.

`automerge.yml` runs on `pull_request_target` with a writable token. It never checks out the pull request's code and must not be changed to do so; that is the property which makes the pattern safe against a malicious fork.

## Hosting, DNS and domain

GitHub Pages serves the site. Hostinger is the registrar and answers DNS; its hosting products are unused.

### DNS records

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| CNAME | `www` | `hamza-aziz-ai.github.io` |
| TXT | `@` | `google-site-verification=…` |

Four A records rather than one: they are GitHub's anycast endpoints, and removing any of them removes a path to the site rather than saving a line. AAAA records are not published; IPv6-only clients reach the site through 464XLAT.

The TXT record holds the Google Search Console verification token. Removing it un-verifies the property.

### Domain configuration

`CNAME` declares the domain in the repository, but an Actions-deployed Pages site does not read it the way a branch build does. The domain is set on the repository itself:

```bash
gh api -X PUT repos/:owner/:repo/pages -f cname=envoiddesign.in
gh api -X PUT repos/:owner/:repo/pages -F https_enforced=true
```

The file is kept regardless: it is what a branch build would require, and it documents the domain next to the code it serves.

`envoiddesign.in` previously served a Hostinger AI Builder placeholder. That site still exists in the Hostinger account under its own `*.hostingersite.com` subdomain and is deliberately left in place; it is unreachable at the domain.

### Changing the domain

The domain appears in nine places. Changing it means editing all of them:

1. `CNAME`, and the `gh api` call above;
2. `CANONICAL_HOST` in `tools/check_site.py`;
3. the expected canonicals in `tools/smoke.sh`;
4. the `_next` hidden field in `index.html` and `contact/index.html`;
5. `robots.txt` and `sitemap.xml`;
6. the canonical, `og:url` and schema.org URLs in each page's `<head>`.

`tools/check_site.py` fails the build on any URL left behind, so a partial change is caught by CI rather than by search results.

## Content and asset conventions

### Photography

Source photographs keep their native aspect ratio. Nothing is exported cropped to a layout box; the tiles are sized to the picture instead, with `flex-grow` and `flex-basis` both scaled by the image's own ratio, so a row of tiles shares one height and fills the container width exactly. Trimming uniform white margins from PDF-page exports is the single exception, and is deliberate.

### Responsive variants

Every photograph has `-600`, `-1200` and native-width WebP variants with narrower JPEG fallbacks, wired through `<picture>` and `sizes`. Regenerate them with any proportional resize; never crop. A new image without variants is reported by the `uses-responsive-images` Lighthouse warning rather than failing the build.

## Operations runbook

| Task | Procedure |
| --- | --- |
| **Redeploy without a commit** | Run the `CI/CD` workflow manually (`workflow_dispatch`) on `main` |
| **Roll back** | Revert the offending commit on `main`; the pipeline redeploys and re-releases automatically |
| **Verify production** | `bash tools/smoke.sh https://envoiddesign.in/` |
| **Inspect a deployed version** | Each GitHub Release attaches the exact published directory as a zip |
| **Diagnose a stale asset** | Confirm the `?v=` token on `styles.css` matches the deployed commit; Fastly and the browser hold assets for ten minutes |

## Security considerations

This repository is public and contains the studio's real telephone numbers and email address, which is intentional — they are published on the site. It contains no credentials: the EmailJS public key is a browser-side identifier by design, and no workflow consumes a secret beyond the automatically provided `GITHUB_TOKEN`.

The one privileged workflow is `automerge.yml`, which runs on `pull_request_target`. Its safety rests entirely on never checking out the pull request's code. Any change to that workflow should be reviewed against that single property.

## Documentation

`docs/` holds the engineering documentation: the architecture and execution flow, the data structures and their trade-offs, the threat and failure models, the decision log with the alternatives that were rejected, the rollback procedure and a per-system defense brief. Start at [docs/README.md](docs/README.md), or at [docs/HANDOVER.md](docs/HANDOVER.md) if you are picking the project up cold.

It is never published — `tools/stage.sh` strips it from the deployed directory — and a documentation-only push skips the pipeline.

## Outstanding items

| Item | Detail |
| --- | --- |
| **Enquiry path untested** | The EmailJS public key, service and template identifiers are filled in `contact.js` and both templates are live in the dashboard, but nobody has yet submitted the live form and confirmed that the enquiry and the auto-reply both arrive. The procedure is in [docs/TESTING.md](docs/TESTING.md). |
| **Google Business Profile** | For a search such as "architect in Vaishali", the Business Profile carries more weight than any markup in this repository. It does not exist yet, and nothing here substitutes for it. |
| **Facts the studio has not supplied** | Opening hours, a price range and social profiles are ranking and display signals for a local business, and all three are absent from the structured data because nobody has confirmed them. Listed in [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md). |
| **Project names** | The titles and locations in `projects/index.html` were read from source filenames. Any that names a client should be confirmed before it stays public. |
