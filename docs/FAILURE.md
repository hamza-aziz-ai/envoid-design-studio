# FAILURE

Where this breaks, what happens when a dependency is slow, down, wrong or empty, and how anyone would find out.

## The failure that was live, and what replaced it

Until 2026-11-16 `EMAILJS` held four blank identifiers, so `contact.js` attached no handler, the browser performed the form's native POST to FormSubmit, and FormSubmit had never been activated: enquiries were accepted and discarded. The identifiers are now filled and the EmailJS path is live.

Two things take its place, and both are quiet by nature.

**The quota.** The free tier is roughly 200 requests a month and each enquiry spends two, so enquiry 101 in a month fails with the same "service error" a visitor would see during an outage. The counter is on the EmailJS dashboard and nothing here watches it.

**The fallback is still unactivated.** If anyone empties an identifier, the form silently reverts to the FormSubmit path, which still needs a one-time activation click on a mail sent to `envoid.design.architect@gmail.com`. Removing an identifier therefore does not degrade the form, it disables it.

**How you would notice either:** you would not. Nothing in CI or the smoke test exercises a real submission, and a lost lead is silent. The manual path in `docs/TESTING.md` is the only check there is.

## Dependency by dependency

| Dependency | If it is down | If it is slow | If it is wrong or empty | Blast radius |
| --- | --- | --- | --- | --- |
| **GitHub Pages / Fastly** | Site unreachable | Slow first byte | — | Total. No fallback origin exists |
| **EmailJS API** | `emailjs.send` rejects; the visitor sees "service error" and is told to call or WhatsApp | Visitor waits on "Sending…" with no timeout of ours | Wrong template id resolves as a rejection, same path | Enquiries only; the rest of the site is unaffected |
| **EmailJS quota** | Sends reject once exhausted | — | Roughly 200 emails/month, two per enquiry | About 100 enquiries per month before silence |
| **FormSubmit** | Fallback POST fails, visitor sees a browser error page | — | **Unactivated: accepts and discards** | Enquiries only, and only if an `EMAILJS` identifier is emptied |
| **cloudflare-dns.com** | `domainAcceptsMail` catches and returns `true` | 4-second `AbortSignal.timeout`, then `true` | NXDOMAIN correctly refuses a dead domain | None. Fails open by design |
| **jsdelivr.net** | SDK absent, `emailjs` undefined, submit throws | Form is unusable until it loads | **Bytes that fail the SRI hash are refused**, same as absent | Enquiries only |
| **Google Fonts** | Fallback system fonts render; layout holds | Brief flash of fallback text | — | Cosmetic |
| **Google Maps iframe** | Empty box on the contact page | Lazy-loaded, so no effect above the fold | — | Cosmetic. The address is also in text |
| **DNS (Hostinger)** | Domain stops resolving; the site is gone | — | A wrong record points the domain elsewhere | Total |
| **Certificate renewal** | Browsers refuse the connection | — | — | Total |

## First limits to expect

| Limit | Value | Consequence |
| --- | --- | --- |
| EmailJS free tier | ~200 emails/month, 2 per enquiry | Silence after roughly 100 enquiries in a month |
| Published site size | 14 MB of assets today | Comfortable. GitHub publishes soft limits on site size, monthly bandwidth and builds per hour — check the current figures before a large asset addition |
| Fastly and browser asset cache | 10 minutes (`max-age=600`) | A CSS or JS change is invisible to a returning visitor until the `?v=` token changes, which every deploy does |
| Lighthouse `uses-responsive-images` | warns below 0.9 | A new photograph without `-600`/`-1200` variants warns rather than fails |
| Concurrency | One deployment at a time, `cancel-in-progress: false` | Two quick pushes queue rather than race; the second waits |

## How we would find out

| Signal | Covers | Gap |
| --- | --- | --- |
| `Checks` job | Markup, scripts, metadata, links, Lighthouse floors | Only what is committed; says nothing about production |
| `Smoke test` job | The live origin, immediately after each deploy | **Only at deploy time.** An outage an hour later is invisible |
| `Release` job | Proves a tag names a version that actually served | — |
| Browser console | `Confirmation email not sent` is logged on a failed auto-reply | Nobody is watching a visitor's console |

**The honest gap: there is no uptime monitoring and no alerting.** If Pages, DNS or the certificate fails tomorrow, the first report will come from a person, probably the client. For a brochure site that is a defensible trade; it is a choice, not an oversight, and it is the first thing to change if the site starts carrying bookings.

## Things that cannot fail

Worth stating, because they are where the effort went:

- There is no database to corrupt, no migration to half-apply, no session store to lose.
- `tools/stage.sh` builds from `git archive HEAD`, so a half-finished local edit cannot reach production even if someone deploys from a dirty working tree.
- The `deploy` job runs only on `main`, and only after `Checks` passes, so a red build cannot publish.
- Every release attaches the exact published directory, so any past version can be inspected byte for byte.
