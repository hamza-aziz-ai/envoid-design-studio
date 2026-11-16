#!/usr/bin/env bash
# Tell the IndexNow search engines that these pages changed.
#
#   tools/indexnow.sh
#
# IndexNow is a shared protocol: one POST reaches Bing, Yahoo, DuckDuckGo and
# Yandex. Google does not take part — it is handled through Search Console,
# which is a browser job, not a script.
#
# Ownership is proved by a key file at the site root whose name is the key.
# That file is not a secret: it authorises nothing except "please crawl these
# public pages of mine", and the URLs it submits are the ones already listed
# in sitemap.xml, which anyone can read.
#
# The URL list is read from sitemap.xml rather than written here, so a page
# added to the sitemap is submitted without anyone remembering to edit this.
set -euo pipefail

KEY="11a31af272e849d434442a1409c95719"
HOST="envoiddesign.in"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Fail loudly rather than submitting against a key the live site does not serve:
# a mismatch makes the whole submission silently useless.
served="$(curl -sS --max-time 20 "https://${HOST}/${KEY}.txt" || true)"
if [ "$served" != "$KEY" ]; then
  # A missing key file is answered with the whole 404 page, so show a snippet
  # rather than dumping the site's markup into the terminal.
  echo "error: https://${HOST}/${KEY}.txt does not serve the key" >&2
  echo "       got: $(printf '%.60s' "${served:-<nothing>}")..." >&2
  exit 1
fi

urls="$(grep -o '<loc>[^<]*</loc>' "$SRC/sitemap.xml" | sed -e 's|<loc>||' -e 's|</loc>||')"
count="$(printf '%s\n' "$urls" | grep -c . || true)"
if [ "$count" -eq 0 ]; then
  echo "error: no <loc> entries found in sitemap.xml" >&2
  exit 1
fi

# python3 on the CI runner, python on Git Bash for Windows.
PY="$(command -v python3 || command -v python)"
if [ -z "$PY" ]; then
  echo "error: neither python3 nor python is on PATH" >&2
  exit 1
fi

body="$(printf '%s\n' "$urls" | "$PY" -c '
import json, sys
urls = [line.strip() for line in sys.stdin if line.strip()]
print(json.dumps({"host": sys.argv[1], "key": sys.argv[2],
                  "keyLocation": "https://%s/%s.txt" % (sys.argv[1], sys.argv[2]),
                  "urlList": urls}))' "$HOST" "$KEY")"

code="$(curl -sS -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary "$body" -o /dev/null -w '%{http_code}')"

# 200 accepted, 202 accepted but the key is still being verified.
case "$code" in
  200|202) echo "indexnow: $count URL(s) submitted, HTTP $code" ;;
  *)       echo "indexnow: submission rejected, HTTP $code" >&2; exit 1 ;;
esac
