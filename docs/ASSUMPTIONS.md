# ASSUMPTIONS

What is believed but not proven, and what is simply unknown. Unverified assumptions are where production bugs are born, so they are written down rather than carried around.

Status is one of **verified** (checked, with the check named), **unverified** (believed, never tested) or **wrong** (found false; kept so nobody re-assumes it).

## Verified

| Assumption | Status | How it was checked |
| --- | --- | --- |
| `envoiddesign.in` resolves to GitHub Pages | verified | Both apex and `www` return the four GitHub IPs over Google and Cloudflare DNS |
| HTTPS is enforced and the certificate covers both names | verified | `gh api .../pages` reports `https_enforced: true`, `cert: approved`, domains `envoiddesign.in` and `www.envoiddesign.in`; `http://` answers 301 |
| The live site serves what the repository contains | verified | `tools/smoke.sh` returns twelve `ok` lines against the real origin |
| Search Console owns the property and has the sitemap | verified | Ownership verified by TXT; sitemap reports **Success**, 3 pages discovered |
| The 404 page answers a real 404 at any depth | verified | Smoke probes `no-such-page` and `deep/nested/missing`, both cache-busted |
| Pages publishes only from Actions | verified | `build_type: workflow`; the legacy branch build is off |
| The domain had nothing to lose | verified | It served a Hostinger AI Builder placeholder titled "ARCHITECTURE FIRM" |

## Unverified

| Assumption | Risk if wrong | How to settle it |
| --- | --- | --- |
| **`envoidstudio26@gmail.com` is monitored by the studio** | Every enquiry lands somewhere nobody reads | Ask, and send a test enquiry |
| **FormSubmit has never been activated** | Believed true; if false the fallback already works | Submit the live form once and watch that inbox |
| **An EmailJS account exists for this studio** | The four blank identifiers may have nowhere to come from | Ask whoever owns the studio's accounts |
| **The two phone numbers are current and both wanted in public** | A wrong number on a live client site | Confirm with the studio |
| **The project titles and locations in `projects/index.html` are safe to publish** | A client named without consent, in a public repository | Confirm each one with the studio |
| **The studio wants the apex, not `www`, as the public form of the domain** | Only cosmetic; `www` already redirects to the apex | Ask which they will print |
| **GitHub's published Pages soft limits still apply as documented** | A surprise at some future asset size | Re-read GitHub's current limits before a large upload |
| **`text-wrap: balance` degrades acceptably where unsupported** | Headings wrap unevenly on older browsers, never badly | Open the site in an older browser and look |

## Deliberately accepted, not unknown

These were considered and chosen. They are not gaps in knowledge.

- The EmailJS SDK loads without a Subresource Integrity hash. The version is pinned; the gap is real and recorded in `docs/THREAT.md`.
- `enforce_admins` is `false` on branch protection, so an administrator can bypass CI. Accepted for a single maintainer.
- Domain auto-renewal is **off**, expiring 2029-07-25. Accepted only because the runway is long; it is still a silent total-loss risk.
- There is no uptime monitoring. The smoke test runs at deploy time only.
- `target="_blank"` on `tel:` links leaves an empty tab on desktop browsers. Accepted as the cost of a uniform rule.

## Questions nobody has answered

1. Who owns the Hostinger account long term — the studio, or the developer? Transfer is far easier before it matters than after.
2. Should the enquiry form keep a copy of submissions anywhere, or is the inbox the only record?
3. Is there a brand asset source of truth — a logo file, exact colours — or is `styles.css` now it?
