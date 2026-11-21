# DATA

The structures this site relies on, how they are read and written, and what each trade-off buys.

## There is no persistent data

No database, no API, no server-side state, no `sessionStorage`. One value is remembered between page loads: the visitor's analytics choice, `envoid-analytics-consent` in `localStorage` (`granted` or `denied`). Only after `granted` does Google Analytics load and set its `_ga` cookies, with a random identifier and no personal data (D-028). Nothing else a visitor does is remembered. This is the single most important fact about the system's data model, and it is what removes most of the usual privacy and breach surface.

The only visitor data that exists at all lives in form fields for the length of one submission, and is then handed to EmailJS or FormSubmit and forgotten by the page.

## `EMAILJS` — configuration object (`contact.js`)

```js
{ publicKey: '', enquiry: { service: '', template: '' }, confirm: { service: '', template: '' } }
```

Read once at load to compute `configured`. Shape chosen so that the two sends are named rather than positional — `EMAILJS.confirm.template` cannot be mistaken for the enquiry template at a call site, which four flat string constants would allow. The public key belongs in client code by design and is not a secret; see `docs/DEPENDENCIES.md`.

## `COMMON_DOMAINS` — typo correction (`contact.js`)

A flat array of 23 known email providers. Access pattern is a full linear scan on every submit, computing a Levenshtein distance against each entry.

The trade-off: 23 distance computations per submission is free at human typing speed, and a flat array stays readable and editable by whoever maintains the site. A trie or a BK-tree would cut the comparisons and cost far more to understand than it saves. **Revisit if** the list grows past a few hundred entries, which would mean the problem changed shape.

Two properties are deliberate and easy to break by "tidying":

- Real providers that differ by one letter are **both** listed (`gmail.com` and `ymail.com`, `live.com` and `live.in`). A list that omitted one would silently "correct" real addresses into the other.
- `bestDistance` starts at 3, so only matches at distance 1 or 2 are offered. Raising it starts suggesting corrections to addresses that were typed correctly.

### `editDistance(a, b)`

Single-row dynamic programming: `O(len(a) × len(b))` time, `O(len(b))` memory, rather than the textbook full matrix. For domain-length strings the difference is irrelevant to speed; it is written this way because one row is less code than two dimensions, not for performance.

## `params` — the EmailJS payload (`contact.js`)

```js
{ user_name, user_email, user_phone, user_service, user_location, user_message }
```

Keys are a contract with the EmailJS templates, not internal names. Renaming one here without renaming it in the dashboard template produces an email with a blank field and no error anywhere. The confirmation send uses a different, smaller shape — `{ from_name, subject, message, reply_to }` — because it is a different template.

## Form fields (`index.html`, `contact/index.html`)

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `Name` | text | yes | |
| `Phone` | tel | yes | `type="tel"` for the numeric keypad on mobile |
| `Email` | email | yes | Browser syntax check, then the two checks in `contact.js` |
| `Service` | text | no | Also used as the confirmation email's subject |
| `Location` | text | no | |
| `Brief` | textarea | no | |
| `_honey` | hidden text | no | Honeypot; a non-empty value aborts the send silently |
| `_subject`, `_template`, `_next` | hidden | — | FormSubmit directives, used only on the fallback path |

## `--r` — the gallery's one layout value

Every gallery tile carries its source image's aspect ratio as a CSS custom property:

```html
<article class="work__item" style="--r:1.7778">
<a class="shot" style="--r:1.3333">
```

It drives three things at once:

```css
flex: var(--r) 1 calc(var(--r) * var(--row));   /* grow and basis both scaled by the ratio */
aspect-ratio: var(--r);                          /* the image reserves its own box */
```

Scaling **both** `flex-grow` and `flex-basis` by the ratio is what makes a row of differently-shaped photographs resolve to one shared height and fill the container exactly — the justified-row layout. Scaling only one of them produces rows that are either ragged or subtly wrong in height. The value is written into the markup rather than measured at runtime so that the correct box is reserved before the image loads, which is also what keeps Lighthouse's `unsized-images` audit passing.

**Where it comes from:** the source image's real pixel dimensions. If an image is replaced with one of a different shape and `--r` is not updated, the photograph is letterboxed or cropped — this is the one place a wrong number produces a quietly wrong layout rather than an error.

## `PAGES` — the check manifest (`tools/check_site.py`)

```python
PAGES = ["index.html", "projects/index.html", "contact/index.html", "thanks/index.html", "404.html"]
```

The single list that drives every structural check, the orphan-page detection and the sitemap comparison. A new page that is not added here is not checked by anything. **This is the first place to edit when adding a page.**

## Sitemap set

`sitemap.xml` holds one `<loc>` per indexable page. `check_site.py` compares that set against `PAGES` minus any page carrying `content="noindex"`, in both directions: an indexable page missing from the sitemap fails the build, and a `noindex` page listed in it fails too.
