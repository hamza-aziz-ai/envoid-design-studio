#!/usr/bin/env bash
# Assemble the publishable site into a directory.
#
#   tools/stage.sh _site [cache-busting-token]
#
# Two jobs it does beyond copying:
#   - leaves the toolchain behind, so only the site ships;
#   - appends ?v=<token> to the stylesheet and scripts. Cloudflare caches those
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

rm -rf "$DEST/.github" "$DEST/tools" \
       "$DEST/lighthouserc.js" "$DEST/.htmlvalidate.json" "$DEST/.gitattributes" \
       "$DEST/README.md"

if [ -n "$TOKEN" ]; then
  for f in "$DEST"/*.html; do
    sed -i \
      -e "s|\"styles\.css\"|\"styles.css?v=${TOKEN}\"|g" \
      -e "s|\"main\.js\"|\"main.js?v=${TOKEN}\"|g" \
      -e "s|\"contact\.js\"|\"contact.js?v=${TOKEN}\"|g" \
      "$f"
  done
  echo "stage: cache-busted assets with v=${TOKEN}"
fi

echo "stage: $(find "$DEST" -type f | wc -l) files in $DEST"
