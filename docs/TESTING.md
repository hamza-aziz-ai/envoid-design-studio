# TESTING

What to run, and what a pass actually looks like. Not a vibe check.

## Before any change is done

```bash
python3 tools/check_site.py
```

Pass is exactly:

```
check_site: 5 pages OK
```

Anything else prints one line per problem and a count, and exits 1.

```bash
npx --yes html-validate@9 index.html 404.html projects/index.html contact/index.html thanks/index.html
```

Pass is no output and exit 0. This is the same invocation CI runs; running a different one locally proves nothing.

```bash
node --check main.js
node --check contact.js
```

Pass is no output. This catches a syntax error that would otherwise ship, because nothing else parses these files before a browser does.

## Before anything customer-facing goes live

```bash
bash tools/stage.sh /tmp/preview
(cd /tmp/preview && python3 -m http.server 8000)
```

Then walk the paths by hand:

| Path | Expected |
| --- | --- |
| `http://localhost:8000/` | Home renders, hero image present, no console errors |
| `http://localhost:8000/projects/` | 23 tiles, rows share a height, no letterboxing |
| `http://localhost:8000/deep/nested/anything` | The styled 404 page, not an unstyled one |
| `http://localhost:8000/contact/` | Map iframe, form, no console errors |

The 404 check is the one people skip and the one that regresses. It only reproduces through `stage.sh`, because `<base href="/">` resolves differently when the repository root is served directly.

### The manual customer path

Open the contact page, fill the form the way a real enquirer would, and submit.

- **While `EMAILJS` is blank:** you should land on `/thanks/`, and the studio's inbox should receive a FormSubmit mail. If no mail arrives, FormSubmit has not been activated — see `docs/FAILURE.md`.
- **Once `EMAILJS` is filled:** the status line should move through "Checking your email address…" then "Sending…" to the success message, the studio should receive the enquiry, and the sender should receive the auto-reply. Test both mails, not just the first.

Also exercise the two validation paths deliberately, because neither is covered by any automated check:

| Input | Expected |
| --- | --- |
| `someone@gmial.com` | "Did you mean someone@gmail.com?" with a clickable suggestion; pressing Send again keeps it as typed |
| `someone@definitely-not-a-real-domain-xyz.com` | `"…" can't receive email. Please check your address ❌` |
| A honeypot filled by hand (via devtools) | Submit does nothing at all, silently |

## After deploy

```bash
bash tools/smoke.sh https://envoiddesign.in/
```

Pass is every line reading `ok`, ending in:

```
All smoke checks passed.
```

It probes twelve things: the three indexable pages and their canonicals, `styles.css` containing `.gal__grid`, the three scripts and a representative image, two cache-busted 404 paths that must answer `404` and contain "never built", `/thanks/` still carrying `noindex`, and `robots.txt` and `sitemap.xml`.

The 404 probes are cache-busted with `?ci=<run id>` on purpose: Cloudflare would otherwise serve a previously cached response and the check would pass against a stale answer.

## What is not tested

Stated plainly so nobody assumes otherwise:

- **No unit tests.** There is no module boundary worth testing in isolation; `contact.js` is one flow and `main.js` is DOM wiring.
- **No browser automation.** The lightbox, the mobile nav and the form are verified by hand.
- **No real email send in CI.** That would burn quota and mail a real inbox on every push.
- **No visual regression testing.** Lighthouse catches accessibility and structure; it does not catch "this looks wrong".
