# Google Ads

Account `942-602-9978`, on the studio's Google login, linked to the Analytics property (personalised advertising off, auto-tagging on). Nothing runs until the studio adds billing.

## The plan: one Search campaign, not Smart

The account was opened through Google's Smart campaign wizard, which left a draft called "Home | Architecture Firm". Do not run it:

- Its keyword themes are Google's guesses: landscaping, industrial, lighting and restoration architecture, and no interior design at all, although interiors are most of the studio's work.
- Its ad text was written by Google, including "Find Beauty In Precision", a line the studio has never used.
- Smart campaigns give no keyword list, weak negatives, and also serve on Maps and Display.

So: as soon as billing is added, pause that draft, then build the campaign below in Expert mode. This follows the setup used for the owner's portfolio site, which had the same constraints.

## Campaign settings

| Setting | Value | Why |
|---|---|---|
| Type | Search, Search Network only | Display and search partners off: they bring cheap, low-intent clicks |
| Name | `Search – Delhi NCR` | |
| Location | Ghaziabad, Noida, East Delhi; or about 20 km around the Sector 5, Vaishali address | The studio's area, as the site says |
| Location option | Presence: people in or regularly in your locations | Not "interest in", which shows ads to people elsewhere |
| Schedule | Monday to Saturday, 10:00 am to 5:00 pm | The studio's hours, as on the Business Profile and the site |
| Bidding | Maximise clicks, with a maximum CPC cap | Conversion bidding cannot work here: ad consent is never asked for, so Ads sees almost no conversions |
| Budget | About ten times the expected CPC per day | Check the real CPC in Keyword Planner first; the Smart draft proposed about ₹463 a day |
| Final URL suffix | `utm_source=google&utm_medium=cpc&utm_campaign=search_ncr` | Analytics credits enquiries to the campaign even without ad consent |
| Turn off | AI Max / broad match expansion, automatically created assets, auto-apply recommendations | Each lets Google write text or pick searches the studio has not approved |
| Audiences | None, or Observation only | Personalised advertising is off by design |

## Ad groups

Phrase and exact match only, never broad. Each group lands on the page that answers it.

| Ad group | Landing page | Keywords |
|---|---|---|
| Interior design, Ghaziabad | `/interior-designers-in-ghaziabad/` | "interior designer ghaziabad", "interior designers in ghaziabad", "interior designer vaishali", "interior designer indirapuram", [home interior designer ghaziabad], [flat interior design ghaziabad] |
| Architect, Ghaziabad | `/architects-in-ghaziabad/` | "architect in ghaziabad", "architects in ghaziabad", "architect vaishali", "architect indirapuram", [house design architect ghaziabad] |
| GDA map approval | `/services/map-approval-ghaziabad/` | "gda map approval", "map approval ghaziabad", "building plan approval ghaziabad", "naksha pass ghaziabad" |
| Noida | `/architects-in-noida/` | "architect in noida", "architect greater noida", "interior designer noida" |
| Design and build | `/services/design-build-turnkey/` | "turnkey interior ghaziabad", "design and build ghaziabad", "turnkey house construction ghaziabad" |

### Negative keywords, campaign level, from day one

jobs, job, vacancy, salary, internship, course, courses, college, institute, degree, free, diy, ideas, images, photos, pdf, software, app, autocad, sketchup, "how to", wallpaper, furniture shop, rent

Then read the Search terms report every week and add more.

## Ad text

Every line below is said on the site already. No prices, ever (D-024), and no claim the studio has not made: no "best", no "No. 1", no years of experience, no review count, since that changes.

Headlines (each 30 characters or fewer):

- Envoid Design Studio
- Architects in Ghaziabad
- Architects in Vaishali
- Interior Designers Ghaziabad
- Interior Design, Delhi NCR
- Architects in Noida
- GDA Map Approval, End to End
- Design, Build and Turnkey
- Studio in Sector 5, Vaishali
- Joinery and Lighting Design

Descriptions (each 90 characters or fewer):

- Plot studies, elevations, structural coordination and working drawings across Delhi NCR.
- Space planning, joinery drawings, materials and lighting, with turnkey execution too.
- GDA map approval handled end to end: drawings, filing and follow-up until sanctioned.
- One studio, end to end. Visit us in Sector 5, Vaishali, Ghaziabad.

Assets: call (+91 95607 69743, the studio's own number, not a Google forwarding number unless the studio agrees), location (from the Business Profile), and sitelinks to Projects, Services, Contact and the 3D room.

## Measuring it

- Analytics shows each campaign's visits, `contact_click` and `generate_lead` under Advertising and under Traffic acquisition (`google / cpc`).
- Inside Google Ads, conversions will read near zero. That is expected: the site never asks for ad consent, so Ads cannot see them. Judge the campaign in Analytics, after four to six weeks.
- Each week: Search terms report, new negatives, and pause keywords with clicks but no contact taps.
