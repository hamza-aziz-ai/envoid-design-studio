#!/usr/bin/env python3
"""Structural checks for the static site. No dependencies, runs in CI and locally.

Catches the classes of defect this site has actually shipped: a duplicate <head>
open tag, Open Graph values copy-pasted from another page, a canonical that
disagrees with og:url, a schema.org block that no longer parses, and references
to files that were renamed or never committed.

    python3 tools/check_site.py
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The domain the site is canonicalised to. It replaces the studio's current site
# there, so these URLs are written ahead of the move and become self-referencing
# at cutover. Changing this one string is the whole cutover, for the markup.
CANONICAL_HOST = "https://envoiddesign.in/"

# File on disk -> the URL it is served at. GitHub Pages serves <dir>/index.html
# as <dir>/, which is what keeps ".html" out of the address bar. 404.html is
# served for any missing path and is never linked, so it has no URL of its own.
PAGES = {
    "index.html": "/",
    "projects/index.html": "/projects/",
    "contact/index.html": "/contact/",
    "services/index.html": "/services/",
    "services/architecture/index.html": "/services/architecture/",
    "services/interior-design/index.html": "/services/interior-design/",
    "services/design-build-turnkey/index.html": "/services/design-build-turnkey/",
    "services/map-approval-ghaziabad/index.html": "/services/map-approval-ghaziabad/",
    "services/vastu/index.html": "/services/vastu/",
    "architects-in-ghaziabad/index.html": "/architects-in-ghaziabad/",
    "interior-designers-in-ghaziabad/index.html": "/interior-designers-in-ghaziabad/",
    "architects-in-noida/index.html": "/architects-in-noida/",
    "privacy/index.html": "/privacy/",
    "room-planner/index.html": "/room-planner/",
    "sun-path/index.html": "/sun-path/",
    "3d-room/index.html": "/3d-room/",
    "colour-your-room/index.html": "/colour-your-room/",
    "furniture-planner/index.html": "/furniture-planner/",
    "staircase/index.html": "/staircase/",
    "guess-the-area/index.html": "/guess-the-area/",
    "thanks/index.html": "/thanks/",
    "404.html": None,
}
# Everything except the two that carry their own noindex.
INDEXABLE = set(PAGES) - {"thanks/index.html", "404.html"}
HOST = CANONICAL_HOST.rstrip("/")


def url_for(name):
    """The absolute URL a page must canonicalise to, or None for 404.html."""
    path = PAGES[name]
    return None if path is None else HOST + path

REQUIRED_META = [
    "og:title", "og:description", "og:image", "og:image:alt",
    "og:site_name", "og:locale", "twitter:card",
]

problems = []


def check(ok, msg):
    if not ok:
        problems.append(msg)


def find(pattern, text):
    return re.findall(pattern, text, re.S)


def check_page(name, html):
    def fail(msg):
        problems.append("%s: %s" % (name, msg))

    # Structure. `<head><head>` shipped to production once and browsers hid it.
    check(html.count("<head>") == 1, "%s: expected 1 <head>, found %d" % (name, html.count("<head>")))
    check(html.count("</head>") == 1, "%s: expected 1 </head>" % name)
    check(html.count("<title>") == 1, "%s: expected exactly 1 <title>" % name)
    check(html.count("<h1") == 1, "%s: expected exactly 1 <h1>, found %d" % (name, html.count("<h1")))
    check('<html lang="' in html, "%s: <html> has no lang" % name)
    check('name="viewport"' in html, "%s: no viewport meta" % name)

    desc = find(r'<meta name="description" content="([^"]*)"', html)
    check(len(desc) == 1, "%s: expected 1 meta description, found %d" % (name, len(desc)))
    if desc:
        check(60 <= len(desc[0]) <= 300, "%s: meta description is %d chars" % (name, len(desc[0])))

    title = find(r"<title>(.*?)</title>", html)
    if title:
        check(len(title[0]) <= 70, "%s: <title> is %d chars, over 70" % (name, len(title[0])))

    for meta in REQUIRED_META:
        check(('property="%s"' % meta) in html or ('name="%s"' % meta) in html,
              "%s: missing %s" % (name, meta))

    # Indexability. A noindex page must not also claim a canonical: the two
    # directives contradict each other and Google picks whichever it likes.
    canonical = find(r'<link rel="canonical" href="([^"]+)"', html)
    og_url = find(r'<meta property="og:url" content="([^"]+)"', html)
    robots = find(r'<meta name="robots" content="([^"]+)"', html)
    check(len(robots) == 1, "%s: expected 1 robots meta, found %d" % (name, len(robots)))

    if name in INDEXABLE:
        check(len(canonical) == 1, "%s: expected 1 canonical, found %d" % (name, len(canonical)))
        check(canonical == og_url, "%s: canonical %s != og:url %s" % (name, canonical, og_url))
        expected = url_for(name)
        check(canonical == [expected],
              "%s: canonical is %s, expected %s" % (name, canonical, expected))
        check(robots and "noindex" not in robots[0], "%s: indexable page is noindex" % name)
    else:
        check(not canonical, "%s: noindex page must not set a canonical" % name)
        check(robots and "noindex" in robots[0], "%s: non-indexable page is missing noindex" % name)

    # Open Graph values must belong to this page, not whichever page they were
    # copied from. The title is the cheap proxy: it has to share a word with ours.
    og_title = find(r'<meta property="og:title" content="([^"]+)"', html)
    if og_title and title:
        head = re.split(r"[—|]", title[0])[0].strip().lower()
        check(head and head in og_title[0].lower(),
              "%s: og:title %r does not match <title> %r" % (name, og_title[0], title[0]))

    # schema.org
    blocks = find(r'<script type="application/ld\+json">(.*?)</script>', html)
    check(len(blocks) <= 1, "%s: %d ld+json blocks, expected at most 1" % (name, len(blocks)))
    if name not in INDEXABLE:
        check(not blocks, "%s: noindex page should carry no schema.org data" % name)
    for raw in blocks:
        try:
            data = json.loads(raw)
        except ValueError as exc:
            fail("ld+json does not parse: %s" % exc)
            continue
        nodes = data.get("@graph", [data])
        check(bool(nodes), "%s: ld+json has no nodes" % name)
        for node in nodes:
            check("@type" in node, "%s: ld+json node without @type" % name)
            for key in ("url", "@id"):
                val = node.get(key)
                if isinstance(val, str) and val.startswith("http"):
                    check(val.startswith(CANONICAL_HOST),
                          "%s: ld+json %s %s is not under %s" % (name, key, val, CANONICAL_HOST))

    # Images: alt for screen readers, intrinsic size so the layout does not shift.
    for tag in find(r"<img\b[^>]*>", html):
        src = (find(r'src="([^"]*)"', tag) or ["?"])[0]
        check('alt="' in tag, "%s: <img src=%s> has no alt" % (name, src))
        check('width="' in tag and 'height="' in tag,
              "%s: <img src=%s> has no width/height" % (name, src))

    # A <picture> must keep a plain <img> inside it, or browsers that skip the
    # <source> elements render nothing at all.
    for block in find(r"<picture\b.*?</picture>", html):
        check("<img" in block, "%s: <picture> without an <img> fallback" % name)
        for source in find(r"<source\b[^>]*>", block):
            check('srcset="' in source and 'type="' in source,
                  "%s: <source> without srcset and type" % name)

    # Every local reference must resolve, srcset candidates included: a renamed
    # variant is invisible until a browser happens to pick that width.
    refs = find(r'(?:src|href)="(?!https?:|mailto:|tel:|data:|#|//)([^"?#]+)"', html)
    for candidates in find(r'srcset="([^"]+)"', html):
        refs += [c.strip().split()[0] for c in candidates.split(",") if c.strip()]
    for ref in refs:
        if not ref:
            continue
        # A directory URL is served by its index.html; check that, not the folder.
        target = ref.lstrip("/")
        if target.endswith("/") or target == "":
            target += "index.html"
        check(os.path.exists(os.path.join(ROOT, target)),
              "%s: references missing file %s" % (name, ref))


def chrome(html):
    """The header and footer, normalised so pages can be compared to each other.

    Three differences are legitimate and are flattened away: the current page
    marks itself with aria-current, the home page's own anchors are written
    bare (#about) rather than rooted (/#about), and its logo points at #top
    rather than /. Anything left over is drift.
    """
    out = []
    for pattern in (r'<header class="nav".*?</header>', r'<footer class="foot">.*?</footer>'):
        block = find(pattern, html)
        if not block:
            return None
        text = block[0]
        text = re.sub(r'\s*aria-current="page"', "", text)
        text = text.replace('href="#top"', 'href="/"')
        text = text.replace('href="#', 'href="/#')
        out.append(text)
    return out


def check_chrome():
    """Fourteen hand-edited copies of one header drift. This is what notices.

    Decided in docs/DECISIONS.md D-017: the pages are written by hand, so
    nothing regenerates the chrome and only a check keeps it honest.
    """
    reference = chrome(io.open("index.html", encoding="utf-8").read())
    check(reference is not None, "index.html: no header/footer to compare against")
    if reference is None:
        return
    for name in PAGES:
        if name == "index.html" or not os.path.exists(name):
            continue
        other = chrome(io.open(name, encoding="utf-8").read())
        if other is None:
            check(False, "%s: has no <header class=\"nav\"> or <footer class=\"foot\">" % name)
            continue
        for part, (a, b) in zip(("header", "footer"), zip(reference, other)):
            check(a == b, "%s: %s has drifted from index.html's" % (name, part))


def check_workflow():
    """The deploy must keep shipping dot-directories.

    actions/upload-pages-artifact defaults include-hidden-files to false, and
    in that mode it tars the site with `--exclude=.[^/]*`, dropping every
    dot-entry. That silently un-deploys /.well-known/, where the Android and
    iOS deep-link association files live: the files stay committed, the site
    serves 404, and the only symptom is a deep link opening the browser.
    Proved by probe on 2026-11-16; see docs/DECISIONS.md D-020.
    """
    path = os.path.join(".github", "workflows", "deploy.yml")
    if not os.path.exists(path):
        return
    text = io.open(path, encoding="utf-8").read()
    if "upload-pages-artifact" in text:
        check("include-hidden-files: true" in text,
              "%s: upload-pages-artifact without include-hidden-files: true "
              "would drop /.well-known/ from the deploy" % path)


def main():
    os.chdir(ROOT)
    for name in PAGES:
        if not os.path.exists(name):
            problems.append("%s: missing" % name)
            continue
        check_page(name, io.open(name, encoding="utf-8").read())

    check_chrome()
    check_workflow()

    # Orphan pages are invisible to crawlers that only follow links.
    linked = set()
    for name in PAGES:
        if os.path.exists(name):
            html = io.open(name, encoding="utf-8").read()
            linked |= set(find(r'href="(/[^"#]*)"', html))
    # /thanks/ is reached only by the form's redirect, so it is deliberately
    # unlinked; the home page is the root and needs no inbound link either.
    for name, path in PAGES.items():
        if path in (None, "/") or name not in INDEXABLE or not os.path.exists(name):
            continue
        check(path in linked, "%s is not linked from any page" % path)

    # The sitemap must list exactly the indexable pages. A stale one either
    # hides a page from crawlers, or names a noindex URL, which Search Console
    # reports as an error against the sitemap itself.
    listed = set(find(r"<loc>([^<]+)</loc>", io.open("sitemap.xml", encoding="utf-8").read()))
    for name in PAGES:
        if not os.path.exists(name):
            continue
        url = url_for(name)
        noindex = url is None or 'content="noindex' in io.open(name, encoding="utf-8").read()
        check((url in listed) != noindex,
              "%s: %s in sitemap.xml"
              % (name, "noindex page is listed" if noindex else "indexable page is missing"))
    known = set(u for u in (url_for(n) for n in PAGES) if u)
    for url in sorted(listed - known):
        check(False, "sitemap.xml lists %s, which is not a page of this site" % url)

    if problems:
        print("\n".join(sorted(problems)))
        print("\n%d problem(s)" % len(problems))
        return 1
    print("check_site: %d pages OK" % len(PAGES))
    return 0


if __name__ == "__main__":
    sys.exit(main())
