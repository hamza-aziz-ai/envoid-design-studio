#!/usr/bin/env bash
# Assemble the publishable site into a directory.
#
#   tools/stage.sh _site [cache-busting-token]
#
# Two jobs it does beyond copying:
#   - leaves the toolchain behind, so only the site ships;
#   - appends ?v=<token> to the stylesheet and every root-level script, by
#     pattern so a new page's script is covered without editing this file.
#     Cloudflare caches those
#     for four hours in front of Pages, and without a changing query a visitor
#     keeps the old CSS against the new HTML. Source files stay clean: the
#     query only exists in what is deployed.
set -euo pipefail

DEST="${1:?usage: stage.sh <dest-dir> [token]}"
TOKEN="${2:-}"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rm -rf "$DEST"
mkdir -p "$DEST"

# git archive, not a copy: what ships is exactly what is committed, so a stray
# local file or a half-finished edit cannot reach the live site. Also avoids
# depending on rsync, which Git Bash on Windows does not ship.
git -C "$SRC" archive HEAD | tar -x -C "$DEST"

# Repository plumbing, not site content. Since the deploy started shipping
# dot-entries so that /.well-known/ reaches the live site, .gitignore and
# .gitmodules would otherwise be published along with everything else.
rm -rf "$DEST/.github" "$DEST/tools" \
       "$DEST/lighthouserc.js" "$DEST/.htmlvalidate.json" "$DEST/.gitattributes" \
       "$DEST/.gitignore" "$DEST/.gitmodules" \
       "$DEST/README.md" "$DEST/docs" "$DEST/MobileApp"

# The testimonials section only fetches when this attribute is present, and it
# is added only when the data file actually shipped. Without it the browser
# logs a 404 on every page load, which costs the whole Lighthouse
# best-practices score — the fetch cannot suppress that, only not happen.
# reviews.json holds reviews left on Google; testimonials.json holds reviews
# written in the app and approved by the studio.
#
# The studio's own approved testimonials win when there are any, because they
# are the ones it chose to publish. "Any" is the load-bearing word: the sync
# job writes testimonials.json even when nothing is approved yet, so testing
# for the file's existence would hide the Google reviews behind an empty file
# the moment that job first runs. Test for content instead.
if [ -f "$DEST/testimonials.json" ] && grep -q '"body"' "$DEST/testimonials.json"; then
  TESTIMONIAL_SRC="/testimonials.json"
elif [ -f "$DEST/reviews.json" ]; then
  TESTIMONIAL_SRC="/reviews.json"
else
  TESTIMONIAL_SRC=""
fi

if [ -n "$TESTIMONIAL_SRC" ]; then
  while IFS= read -r f; do
    sed -i "s|<section id=\"testimonials\" class=\"sec\" hidden>|<section id=\"testimonials\" class=\"sec\" data-src=\"${TESTIMONIAL_SRC}\" hidden>|g" "$f"
  done < <(find "$DEST" -name "*.html")
  echo "stage: testimonials section enabled from ${TESTIMONIAL_SRC}"
else
  echo "stage: no reviews.json or testimonials.json, section stays inert"
fi

if [ -n "$TOKEN" ]; then
  while IFS= read -r f; do
    sed -i \
      -e "s|\"/styles\.css\"|\"/styles.css?v=${TOKEN}\"|g" \
      -e "s|\"/\([a-z-]*\)\.js\"|\"/\1.js?v=${TOKEN}\"|g" \
      "$f"
  done < <(find "$DEST" -name "*.html")
  echo "stage: cache-busted assets with v=${TOKEN}"
fi

echo "stage: $(find "$DEST" -type f | wc -l) files in $DEST"
