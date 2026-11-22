# ROLLBACK

The way back out. Read this before a risky change, not during one.

## Known good

| | |
| --- | --- |
| **Last verified-live commit** | `20da407` — Restructure the README as production documentation |
| **Last release that served** | `v2026.11.16-25`, 2026-11-16 |
| **Verified by** | All four pipeline jobs green, then `tools/smoke.sh https://envoiddesign.in/` with twelve `ok` lines |

Every release attaches the exact published directory as `<version>-site.zip`. A release tag therefore names a version of the site that provably served, not merely one that built.

## Rolling back the site

The site has no state, so a rollback is a revert and a redeploy. There is nothing to migrate back.

```bash
git revert <bad-sha>          # prefer revert over reset: main is published history
git push origin main
```

The pipeline runs Checks, deploys, smokes and cuts a new release automatically. **Do not force-push `main`.** Nine release tags already point into this history; rewriting it detaches them from any commit you can reach.

If the problem is not in the code — a bad deploy, a Pages-side failure, something changed outside the repository — redeploy the same commit instead:

```bash
gh workflow run "CI/CD" --ref main
```

`workflow_dispatch` is enabled precisely so that `main` can be republished without inventing a commit.

### Expect a cache lag

GitHub Pages serves `styles.css`, `main.js` and `contact.js` with `Cache-Control: max-age=600`, so Fastly (its CDN) and the browser can hold them for ten minutes. A revert changes the `?v=<sha>` token on every page, so a visitor loading HTML after the rollback gets the matching assets immediately. A visitor sitting on an already-loaded page does not; they need a reload.

## Rolling back the domain

These are the changes that are not in git. Each one is reversible, and each one is slower to notice than a bad commit.

### If the site must return to the interim host

```bash
gh api -X PUT repos/:owner/:repo/pages -f cname=''
```

The site returns to `https://hamza-aziz-ai.github.io/envoid-design-studio/`. Canonicals still point at `envoiddesign.in`, which is correct only while that domain serves this site — if the move is being undone for real, revert commit `e0a7ff0` as well.

### If DNS must be restored

The zone before the cutover held exactly two records, both pointing at Hostinger's CDN:

| Type | Name | Content | TTL |
| --- | --- | --- | --- |
| CNAME | `www` | `www.envoiddesign.in.cdn.hstgr.net` | 300 |
| ALIAS | `@` | `envoiddesign.in.cdn.hstgr.net` | 300 |

Recreating those two, and removing the four A records and the `www` CNAME, returns the domain to the Hostinger AI Builder placeholder, which still exists in the account on its own `*.hostingersite.com` subdomain.

**Do not remove the `TXT` record on `@`** while doing this. It verifies Google Search Console and is unrelated to where the site is hosted.

### If the certificate is the problem

Certificate state is visible without guessing:

```bash
gh api repos/:owner/:repo/pages --jq '{cname, https_enforced, cert: .https_certificate.state, domains: .https_certificate.domains}'
```

A healthy answer names both `envoiddesign.in` and `www.envoiddesign.in` with `"cert": "approved"`. If HTTPS enforcement needs to come off temporarily while a certificate reissues:

```bash
gh api -X PUT repos/:owner/:repo/pages -F https_enforced=false
```

Put it back the moment the certificate is approved again. The site should not sit on plain HTTP.

## Before a risky change

1. Commit first, so there is a clean point to return to.
2. Note the current `main` sha and the latest release tag in `docs/HANDOVER.md`.
3. For a DNS or Pages-settings change, write down the current values **before** editing — the panel does not show you what you replaced.
4. Make one logical change per commit, so a revert is surgical rather than a guess.

## What has no rollback

| Action | Why |
| --- | --- |
| Deleting a GitHub release or tag | The attached site zip goes with it |
| Force-pushing `main` | Detaches the nine existing release tags from reachable history |
| Letting the domain expire | Auto-renewal is **off**; expiry is 2029-07-25 |
| Deleting the Hostinger placeholder site | Not recoverable from this repository, and it is the only copy |
