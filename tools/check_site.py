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

PAGES = ["index.html", "projects.html", "contact.html", "thanks.html", "404.html"]
INDEXABLE = {"index.html", "projects.html", "contact.html"}

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
        check(all(c.startswith(CANONICAL_HOST) for c in canonical),
              "%s: canonical is not under %s" % (name, CANONICAL_HOST))
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
    refs = find(r'(?:src|href)="(?!https?:|mailto:|tel:|data:|#|/)([^"?#]+)"', html)
    for candidates in find(r'srcset="([^"]+)"', html):
        refs += [c.strip().split()[0] for c in candidates.split(",") if c.strip()]
    for ref in refs:
        check(os.path.exists(os.path.join(ROOT, ref)), "%s: references missing file %s" % (name, ref))


def main():
    os.chdir(ROOT)
    for name in PAGES:
        if not os.path.exists(name):
            problems.append("%s: missing" % name)
            continue
        check_page(name, io.open(name, encoding="utf-8").read())

    # Orphan pages are invisible to crawlers that only follow links.
    linked = set()
    for name in PAGES:
        if os.path.exists(name):
            html = io.open(name, encoding="utf-8").read()
            linked |= set(find(r'href="([^"]+\.html)"', html))
    for name in ("projects.html", "contact.html"):
        check(name in linked, "%s is not linked from any page" % name)

    # The sitemap must list exactly the indexable pages. A stale one either
    # hides a page from crawlers, or names a noindex URL, which Search Console
    # reports as an error against the sitemap itself.
    listed = set(find(r"<loc>([^<]+)</loc>", io.open("sitemap.xml", encoding="utf-8").read()))
    for name in PAGES:
        if not os.path.exists(name):
            continue
        url = CANONICAL_HOST if name == "index.html" else CANONICAL_HOST + name
        noindex = 'content="noindex' in io.open(name, encoding="utf-8").read()
        check((url in listed) != noindex,
              "%s: %s in sitemap.xml"
              % (name, "noindex page is listed" if noindex else "indexable page is missing"))
    known = set([CANONICAL_HOST]) | set(CANONICAL_HOST + n for n in PAGES)
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
