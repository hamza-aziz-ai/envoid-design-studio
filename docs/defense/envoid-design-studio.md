# DEFENSE: Envoid Design Studio website

The whiteboard brief. One page, in plain words, for the moment someone asks "explain what you shipped".

## What it does, in two sentences

It is the public website for an architecture and interior design practice: five pages of work, services and contact details, served at `https://envoiddesign.in/`. Its one job beyond looking right is to turn a visitor into an enquiry that reaches the studio's inbox.

## How it works

Static files on GitHub Pages, behind Cloudflare. There is no server, no database and no session — every byte a visitor receives is a file committed to the repository. A push to `main` runs validation, stages a copy with `git archive`, deploys it to Pages, probes the live origin, and tags a release only if that probe passes.

The only moving part is the enquiry form. JavaScript checks the typed email domain for a near-miss of a known provider and for an MX record, then hands the six fields to EmailJS, which sends the enquiry to the studio and a confirmation to the sender. If EmailJS is not configured, no JavaScript handler is attached at all and the browser performs the form's own POST to FormSubmit.

## The decisions I would defend

**Hand-written, no framework.** Five pages that change a few times a year do not pay for a build step, a lockfile and a permanent supply chain. The cost is duplicated header and footer markup across five files, which is smaller than the alternative. It stops being the right answer past roughly a dozen pages.

**GitHub Pages, not the Hostinger hosting already paid for.** Using Hostinger would have meant FTP credentials as repository secrets, a rewritten deploy job and the loss of atomic publishing — paying in complexity for capacity already sunk in the domain registration.

**Canonical URLs named the destination domain before the domain existed.** The site ran on an interim host for a while. Canonicalising to the interim host would have accrued ranking to an address it was always going to leave, and required a rewrite at cutover. Written this way, the URLs became self-referencing the moment DNS moved, with no edit.

**Justified flex rows for the gallery.** A fixed-ratio grid crops, and cropping an architectural render destroys its subject. Scaling both `flex-grow` and `flex-basis` by each image's own aspect ratio is what makes a row of differently-shaped photographs share one height and fill the width exactly. The cost is that every tile must carry an accurate `--r`.

**The email check fails open.** A DNS outage must never stop a real enquiry. Catching a typo is worth something; blocking a genuine customer because Cloudflare had a bad minute is worth far less than nothing.

## The data structure that matters

`--r`, the aspect ratio carried on each gallery tile. It feeds `flex-grow`, `flex-basis` and `aspect-ratio` from one value, which is what reserves the correct box before the image loads and keeps the justified rows honest. It is the one number in the system where a wrong value produces a quietly wrong layout rather than a visible error.

Beyond that there is no persistent data of the site's own: no database, and one `localStorage` value holding the visitor's analytics choice. Google Analytics runs only after the visitor accepts it, receives no form content, and keeps its data for 14 months in Google's property (D-028). Visitor data exists for the duration of one form submission and is then handed to EmailJS and forgotten.

## How someone could abuse it

There is no server to attack and no database to read, which removes most of the usual surface. What remains is the form: no CAPTCHA and no rate limit, so a determined submitter can flood the studio's inbox and exhaust the EmailJS free-tier quota of roughly 200 emails a month, two per enquiry. The honeypot stops naive bots and nothing more.

The third-party script was the sharper risk and is now closed: the EmailJS SDK loads from jsDelivr pinned to 3.12.1 and carries a Subresource Integrity hash, so the browser hashes the delivered bytes and refuses to run them if they differ. It fails closed — a tampered CDN breaks the form rather than quietly reading every enquiry, which is the right way round.

The highest-impact target of all is not in the repository: control of the Hostinger account is control of where the domain points. Its auto-renewal is currently off.

## Where it fails, and how we would know

Right now, where it already fails: **the form reaches nobody.** EmailJS is unconfigured and FormSubmit has never been activated, so submissions are accepted and discarded. Nothing in CI exercises a real submission, and a lost lead is silent — nobody would notice without being told.

More generally, the smoke test proves the live origin serves correctly at the moment of deploy and says nothing about an hour later. There is no uptime monitoring and no alerting. For a brochure site that is a defensible trade; it is the first thing to change if the site ever carries bookings.

## What I would change with more time

Put uptime monitoring in front of the live origin so an outage is not discovered by the client. Turn on domain auto-renewal. Confirm the project names in `projects/index.html` with the studio before they stay public in a public repository. And get the four EmailJS identifiers filled, because every other improvement is secondary to the form actually working.
