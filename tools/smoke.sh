#!/usr/bin/env bash
# Post-deploy smoke test: proves the deployed site actually serves what it should.
# A green build only means the files were uploaded; this checks the live origin.
#
#   tools/smoke.sh https://envoiddesign.in/
set -uo pipefail

BASE="${1:?usage: smoke.sh <base-url>}"
BASE="${BASE%/}/"
BASE="${BASE/http:\/\//https://}"   # Pages reports http:// even where HTTPS is enforced

fails=0

note() { printf '%-58s %s\n' "$1" "$2"; }

fail() {
  note "$1" "FAIL  $2"
  fails=$((fails + 1))
}

# expect <path> <status> [substring that must appear in the body]
expect() {
  local path="$1" want="$2" needle="${3:-}" url code body
  url="${BASE}${path}?ci=${GITHUB_RUN_ID:-$RANDOM}"   # Cloudflare would serve the old build
  body="$(mktemp)"
  # Body goes to a file, so binary responses do not have to survive a shell variable.
  code="$(curl -sS --retry 3 --retry-delay 5 --max-time 30 -o "$body" -w '%{http_code}' "$url")" || {
    rm -f "$body"
    fail "$path" "curl failed"
    return
  }
  if [ "$code" != "$want" ]; then
    rm -f "$body"
    fail "$path" "HTTP $code, expected $want"
    return
  fi
  if [ -n "$needle" ] && ! grep -qF -- "$needle" "$body"; then
    rm -f "$body"
    fail "$path" "body is missing: $needle"
    return
  fi
  rm -f "$body"
  note "$path" "ok ($code)"
}

echo "Smoke testing $BASE"

expect ""              200 '<link rel="canonical" href="https://envoiddesign.in/">'
expect "projects/"     200 'canonical" href="https://envoiddesign.in/projects/"'
expect "contact/"      200 'canonical" href="https://envoiddesign.in/contact/"'
expect "services/"     200 'canonical" href="https://envoiddesign.in/services/"'
expect "services/map-approval-ghaziabad/" 200 'Ghaziabad Development Authority'
expect "architects-in-ghaziabad/"         200 'canonical" href="https://envoiddesign.in/architects-in-ghaziabad/"'
expect "interior-designers-in-ghaziabad/" 200 '<h1'
expect "architects-in-noida/"             200 '<h1'
expect "services/architecture/"           200 '<h1'
expect "services/interior-design/"        200 '<h1'
expect "services/design-build-turnkey/"   200 '<h1'
expect "services/vastu/"                  200 '<h1'
expect "styles.css"    200 '.gal__grid'
expect "main.js"       200 ""
expect "contact.js"    200 ""
expect "assets/marriage-hall.jpg" 200 ""

# The custom 404 must answer with a real 404, or search engines index the error page.
expect "no-such-page"        404 "never built"
expect "deep/nested/missing" 404 "never built"

# The thank-you page stays out of the index.
expect "thanks/" 200 'name="robots" content="noindex"'

# Crawl directives. A sitemap that 404s is worse than none: Search Console
# keeps reporting the fetch error against the property.
expect "robots.txt"  200 'Sitemap: https://envoiddesign.in/sitemap.xml'
expect "sitemap.xml" 200 '<loc>https://envoiddesign.in/</loc>'

if [ "$fails" -gt 0 ]; then
  echo "::error::$fails smoke check(s) failed against $BASE"
  exit 1
fi
echo "All smoke checks passed."
