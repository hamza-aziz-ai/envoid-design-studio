# `reviews.json` — the contract, if it is ever built

Nothing here is built. This file exists so that the agreement between the website and the mobile app survives the sessions that made it, and so nobody re-derives it by guessing.

**Do not create `reviews.json` empty.** The app's `listPublished()` throws on any non-200, `loadReviews()` catches it and falls through, and a cached list is shown regardless — so a 404 costs one failed request on tab open and nothing reaches the screen. An empty file would be worse than the 404: it makes the feature look live when it is not.

**Do not build it at all** until the studio has answered the licensing question in [HANDOVER](HANDOVER.md). Republishing Google Places review content on this domain is restricted by the Maps Platform terms, and that is the studio's risk to accept, not a developer's to assume.

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

## Related

`testimonials.json` is a different file with a different source: reviews written in the app by clients, approved by a human, synced by `tools/sync-testimonials.mjs`. The two are deliberately not merged.
