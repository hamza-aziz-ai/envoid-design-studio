# DEPENDENCIES

Every dependency is code somebody else wrote and nobody here will read. Each one needs a reason on file.

## Runtime — what a visitor's browser fetches

| Dependency | Version | Why it is here | Pinned | Risk |
| --- | --- | --- | --- | --- |
| `@emailjs/browser` via `cdn.jsdelivr.net` | `3.12.1` | Sends the enquiry and the auto-reply without a backend | Exact version **and** an SRI hash | Executes in the page with access to the form, but tampered bytes fail closed — see `docs/THREAT.md` |
| Google Fonts — Fraunces, Inter | unversioned CSS endpoint | The two typefaces the design is built on | No | Visitor IP and user agent reach Google. Blocked or slow, fallback fonts render and layout holds |
| Google Maps embed | iframe, contact page | Shows the studio's verified business listing | No | `loading="lazy"` and `referrerpolicy="strict-origin-when-cross-origin"`; blocked, an empty box |
| `cloudflare-dns.com` DNS-over-HTTPS | — | MX/A lookup for a typed email domain | No | Fails open after a 4-second timeout |
| `formsubmit.co` | — | Fallback form target while EmailJS is unconfigured | No | Receives the full enquiry on the fallback path only |
| `wa.me` | — | WhatsApp deep links | No | Outbound link only; `rel="noopener"` |

**Node modules: none.** There is no `package.json` and no `node_modules`. `html-validate` runs through `npx --yes` in CI and is never installed into the repository.

**One third-party script, total.** That number is the design, not an accident. `docs/CONSTRAINTS.md` requires asking before it changes.

## Build and deploy — what CI runs

| Action | Version | Why | Permissions in that job |
| --- | --- | --- | --- |
| `actions/checkout` | `v7` | Every job needs the repository | `contents: read` |
| `actions/setup-node` | `v7` | Node 20 for `html-validate` and `node --check` | `contents: read` |
| `treosh/lighthouse-ci-action` | `v12` | Runs the budget in `lighthouserc.js` | `contents: read` |
| `actions/upload-artifact` | `v4` | Keeps Lighthouse reports for 14 days | `contents: read` |
| `actions/configure-pages` | `v5` | Pages deployment setup | `pages: write`, `id-token: write` |
| `actions/upload-pages-artifact` | `v5` | Uploads `_site` | `pages: write`, `id-token: write` |
| `actions/deploy-pages` | `v5` | Publishes atomically | `pages: write`, `id-token: write` |

All seven are pinned to a **major tag**, which moves. A compromised upstream release would run with that job's permissions. The trade is deliberate: a floating major stays patched, while a pinned SHA goes stale because nobody reviews the diff anyway. **Revisit if** this repository ever holds a real secret. Dependabot opens the upgrade pull requests and `automerge.yml` queues them behind a green `Checks`.

Python 3 is used by `tools/check_site.py` and by Lighthouse's local server. It is standard-library only, with no `pip install` anywhere.

## Secrets and credentials

**This repository contains none, and must continue to.**

| Value | Where it lives | Secret? |
| --- | --- | --- |
| `GITHUB_TOKEN` | Injected by Actions per job, scoped per job | Yes, and never written down |
| EmailJS **public key** | `contact.js`, in plain sight | **No.** It is designed to ship in client code; EmailJS scopes it by allowed origin |
| EmailJS service and template ids | `contact.js`, in plain sight | No. Identifiers, not credentials |
| Studio phone, email, address | In the markup | No. They are published contact details |
| Hostinger and Google account access | Outside this repository | Yes. Never put them in it |

The rule in `docs/CONSTRAINTS.md` stands: never commit a credential, key, token or `.env` file. Scan a diff for them before committing — `git diff --cached` — because the repository is public and a push cannot be unpublished.

The two email bodies live in `docs/email-templates/`. EmailJS stores the real copy in its dashboard and offers no export, so that folder is the version under review and the dashboard is a paste of it — they can drift, and only a human re-paste keeps them together.

## Recomputing the EmailJS SRI hash

Needed only when the pinned version changes. The published hash is cross-checked against jsDelivr's own, so a bad download cannot quietly become the recorded value:

```bash
URL="https://cdn.jsdelivr.net/npm/@emailjs/browser@<version>/dist/email.min.js"
curl -sS -o sdk.js "$URL"
python3 -c "import hashlib,base64;print('sha384-'+base64.b64encode(hashlib.sha384(open('sdk.js','rb').read()).digest()).decode())"
curl -sS "https://data.jsdelivr.com/v1/packages/npm/@emailjs/browser@<version>?structure=flat" \
  | grep -o '"name":"/dist/email.min.js".\{0,80\}'
```

The second command prints jsDelivr's published **sha256** for the same file. Compute the sha256 of your download too and confirm it matches before trusting the sha384 you are about to paste into the markup.

The tag must carry `crossorigin="anonymous"` as well — without it the browser cannot read the cross-origin response to hash it, and blocks the script regardless of whether the hash is right.

## Adding a dependency

1. State what it does that a few lines of our own code cannot.
2. Record who maintains it and how actively.
3. Pin an exact version. For anything that executes in the page, add a Subresource Integrity hash.
4. Write the entry in this file **before** the code that uses it.
5. Note the failure mode in `docs/FAILURE.md`: what happens when it is down, slow or wrong.
