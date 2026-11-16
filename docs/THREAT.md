# THREAT

Who could behave badly, what they can reach, and what stops them. Known gaps are listed as gaps, because an admitted gap beats a hidden one.

## Actors and entry points

### 1. Anonymous visitor

**Can reach:** every published file, and the enquiry form.

**Worst realistic abuse:** submitting the form repeatedly with junk, or with a crafted `Brief` field trying to inject content into the email the studio receives.

**What stops them:**

- There is no server to attack, no database to read and no session to steal. A static site removes the entire class.
- EmailJS renders fields into a template; the studio's inbox displays them as text.
- The honeypot `_honey` field aborts the send silently when filled.

**Gaps, honestly:**

- **No CAPTCHA and no rate limit.** A determined submitter can flood the studio's inbox, and can exhaust the EmailJS free-tier quota (roughly 200 emails per month, two per enquiry, so about 100 enquiries). The honeypot stops naive bots and nothing more.
- **No length cap** on `Brief`. A very large submission is rejected by EmailJS rather than by us.
- A visitor can read every phone number and the email address on the site. That is intentional — they are published contact details for a business that wants to be contacted.

### 2. Email-validation side channel

`domainAcceptsMail()` sends the **domain part** of a typed address to `cloudflare-dns.com` before the form is submitted. A visitor who types an address and never sends has still revealed their email provider to Cloudflare.

**Mitigation:** only the domain leaves, never the local part, and never the rest of the form. **Accepted** as the cost of catching undeliverable addresses before a lead is silently lost. It **fails open**: a DNS outage, a timeout or a blocker returns `true` so that a real enquiry is never stopped by our validation.

### 3. Third-party script — the EmailJS SDK

`contact/index.html` and `index.html` load `@emailjs/browser@3.12.1` from `cdn.jsdelivr.net`. That script runs with full access to the page, including the form fields.

**What stops a bad version:** the version is pinned, so jsDelivr serves an immutable artifact rather than a moving `latest`.

**What stops a tampered one:** a Subresource Integrity hash, `sha384-VDbnsk/qjpIVHPQMkJiROI+vW/7cw0k8TFYVLUabm7EWoLEDwcXh09XQ6gQ86Y0B`, with `crossorigin="anonymous"`. The browser hashes the delivered bytes and refuses to execute them if they differ, so a compromise of jsDelivr or of the published 3.12.1 artifact fails closed rather than silently reading every enquiry.

**Residual risk:** failing closed means the form stops working rather than leaking. If EmailJS ever republishes 3.12.1 with different bytes — which it should not, since npm versions are immutable — the script would stop loading and enquiries would fall back to nothing, because `contact.js` would still believe EmailJS is configured. Recomputing the hash is the fix; `docs/DEPENDENCIES.md` records how.

### 4. Third-party services receiving enquiry data

| Service | Sees | Why it is acceptable |
| --- | --- | --- |
| EmailJS | The full enquiry, both sends | It is the delivery mechanism; this is its purpose |
| FormSubmit | The full enquiry, on the fallback path only | Same, and it is the degraded path, not the normal one |
| Cloudflare DNS | The domain part of a typed email | Documented above |
| Google Fonts | Visitor IP and user agent | Standard web-font cost; no consent banner exists because nothing is stored |
| Google Maps (iframe, contact page) | Visitor IP, and the referrer | `referrerpolicy="strict-origin-when-cross-origin"` limits the referrer to the origin; `loading="lazy"` means it is not contacted until scrolled to |

### 5. Repository collaborator, or a compromised one

**Can reach:** everything. `main` is protected and requires the `Checks` context, but `enforce_admins` is **false**, so an administrator can push directly and bypass it. A bypassed push is reported, not blocked.

**What stops a bad change reaching visitors:** nothing, if the pusher is an administrator. The protection is a guardrail against mistakes, not against the account owner. This is accepted for a one-maintainer project and should be revisited the moment a second person has write access.

### 6. A malicious pull request

`automerge.yml` runs on `pull_request_target`, which executes the workflow definition **from `main`** with a **writable** token. A fork's pull request cannot alter that definition.

**The one property that keeps this safe:** the workflow never checks out or executes the pull request's code. It only calls `gh pr merge --auto`. Adding a checkout of the head ref would hand a writable token to a stranger's code. This is recorded as a hard rule in `docs/CONSTRAINTS.md`.

Auto-merge itself is held by branch protection until `Checks` is green — without that rule, `gh pr merge --auto` merges immediately.

### 7. Supply chain — GitHub Actions

Each job pins actions by major version (`actions/checkout@v7`, `actions/deploy-pages@v5`, `treosh/lighthouse-ci-action@v12`). A major tag moves, so a compromised upstream release would run in CI with that job's permissions. Permissions are scoped per job: `contents: read` by default, `pages: write` and `id-token: write` only on deploy, `contents: write` only on release.

Dependabot opens the upgrade pull requests and `automerge.yml` queues them, so an upstream version lands automatically once `Checks` is green. **That is a deliberate trade:** staying current beats pinning to a stale SHA that nobody reviews, for a repository whose worst case is a defaced marketing site rather than a data breach. **Revisit if** this repository ever holds a real secret.

### 8. Registrar and DNS account

The highest-impact target in the whole system, and it is not in this repository. Control of the Hostinger account means control of where `envoiddesign.in` points, which means the site, and the ability to issue certificates for it.

**Known weakness:** **auto-renewal is off** on the domain (expiry 2029-07-25). A lapsed domain is a takeover waiting to happen, and the window is silent.

### 9. The published repository itself

Public, and it contains the studio's real telephone numbers, email address and street address. Intentional — all of it is published on the site. It contains no credentials: no workflow consumes a secret beyond the automatically provided `GITHUB_TOKEN`.

**Open question**, recorded in `docs/ASSUMPTIONS.md`: the project titles and locations in `projects/index.html` were read off source filenames. If any of them names a client who did not agree to be named, it is public now.

## Summary of known gaps

| Gap | Impact | Cost to close |
| --- | --- | --- |
| No rate limit or CAPTCHA on the form | Inbox spam; EmailJS quota exhaustion | A service, or a third party; weighed against friction on a real lead |
| `enforce_admins: false` | An administrator can bypass CI | One setting, at the cost of locking yourself out of your own emergency fix |
| Domain auto-renewal off | Silent total loss at expiry | One toggle |
| Unverified project names | Possible client naming without consent | One conversation with the studio |
