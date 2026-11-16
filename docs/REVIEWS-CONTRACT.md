# `reviews.json` — the contract, if it is ever built

**Status, 2026-11-16: `reviews.json` is built and live**, holding eight reviews left on the studio's Google Business Profile. The rest of this file is the contract it follows. This file exists so that the agreement between the website and the mobile app survives the sessions that made it, and so nobody re-derives it by guessing.

**Do not create `reviews.json` empty.** The app's `listPublished()` throws on any non-200, `loadReviews()` catches it and falls through, and a cached list is shown regardless — so a 404 costs one failed request on tab open and nothing reaches the screen. An empty file would be worse than the 404: it makes the feature look live when it is not.

## The licensing position, as it actually stands

The studio was told the concern and chose to publish anyway, which is their call to make. For the record, so nobody re-litigates it from memory:

The Maps Platform [Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) tie the 30-day caching limit to **latitude and longitude values**, not to review text. Claims that review content may never be stored come from third-party commentary that does not quote a clause. The Places API returns at most five reviews, and scraping the Maps place page is separately prohibited — which is why neither route was used here.

What is published was read once from the studio's own profile, at the studio's instruction, with attribution and a link back to the profile. It is not refreshed automatically, and nothing here calls a Google API.

**Attribution is not optional.** `source: "google"` makes the renderer print "These reviews were left on Google." with a link to the profile. Remove the attribution and the position above stops holding.

## Shape

```json
{
  "updated": "2026-11-16",
  "source": "google",
  "reviews": [
    {
      "name": "A. Sharma",
      "rating": 5,
      "body": "Full review text.",
      "project": "Residence, Lucknow",
      "date": "2026-10-02"
    }
  ]
}
```

## What the app does with each field

| Field | Behaviour |
| --- | --- |
| `reviews` | Must be the top-level array key. Everything else at the top level is ignored. |
| `rating` | Integer 1–5. A row without one is dropped. |
| `body` | String, required — a row without one is dropped. Sliced to 800 characters. |
| `name` | Coerced to string, sliced to 60. |
| `project` | Sliced to 80; becomes `null` when absent or empty. |
| `date` | Read as `date`, falling back to `created_at`. Kept as a plain string and never parsed, so any format is safe. |
| `source` | Read from the top level or from the row. The value `"google"` makes the app display "Reviews shown here were left on Google." above its link-out buttons. That line is the attribution, so `source` is not optional when the content came from Google. |

Order is preserved exactly as written. The app does not re-sort, so whatever ranking this file gives is what a reader sees.

## Rules that apply whatever is in it

- **Render with `textContent` or `createTextNode`.** Never `innerHTML`, never interpolated into markup. Every string here was typed by a member of the public.
- **No `Review`, `AggregateRating` or `reviewCount` structured data anywhere on this site**, for these or for app-submitted testimonials. Google's structured data policy disallows self-serving reviews on a business's own pages, and the penalty is a manual action rather than a silent non-display. The reviews that help this studio rank are the ones on the Business Profile itself.
- If any of this text ever enters a `<script type="application/ld+json">` block for some other reason, escape `<` as `<`. `JSON.stringify` does not, and a body containing `</script>` terminates the element.
- **A Google Places API key is a repository secret**, with referrer or IP restrictions set in the Google Cloud console, used only by a server-side job. It is the opposite of the Supabase anon key, which is a repository variable because it is public by design and constrained by row-level security.

## The renderer exists

`main.js` already reads `/testimonials.json` and fills the `#testimonials` section on the home page. It ships `hidden` and reveals itself only when the file parses and holds at least one row with a body of ten characters or more, so a missing file costs one failed request and shows nothing — which is the state the site is in today and will stay in until the first review is approved.

The fetch is gated on a `data-src` attribute that `tools/stage.sh` adds at deploy time, and only when `testimonials.json` actually shipped. Without the file there is no attribute and no request at all. That is not tidiness: a 404 is logged to the console by the browser whatever the code does with the response, and Lighthouse scores a console error as a best-practices failure — the first version of this took the home page's best-practices score from 1.0 to 0 and the pipeline caught it.

It was tested against hostile input before it shipped: a row whose name was `<img src=x onerror=alert(1)>` and whose body contained `</script><script>alert('xss')</script>` rendered as visible text, executed nothing, and raised no dialog. Any future change to that code should be re-tested the same way rather than reasoned about.

`reviews.json` has no renderer. If one is ever written it uses the same approach, and the same prohibition on `Review` structured data.

## Related

`testimonials.json` is a different file with a different source: reviews written in the app by clients, approved by a human, synced by `tools/sync-testimonials.mjs`. The two are deliberately not merged.
