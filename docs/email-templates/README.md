# Email templates

The two HTML emails the enquiry form sends. They live here because EmailJS stores the real copy in its dashboard and there is no export — this folder is the version under review, and the dashboard is a paste of it.

Neither file is published. `tools/stage.sh` strips `docs/` from the deployed directory.

| File | Goes to | EmailJS template |
| --- | --- | --- |
| `enquiry.html` | the studio, `envoidstudio26@gmail.com` | the ENQUIRY template |
| `confirmation.html` | the person who enquired | the CONFIRMATION template |

## Dashboard settings

Paste each file into its template's **HTML body**, then set the fields around it. EmailJS does not read these from the markup.

### Enquiry — to the studio

| Field | Value |
| --- | --- |
| To Email | `envoidstudio26@gmail.com` |
| Reply To | `{{user_email}}` |
| Subject | `New enquiry from {{user_name}} ({{user_phone}})` |

`Reply To` is what makes Reply in Gmail answer the customer instead of the studio's own address. The subject uses Name and Phone because both are required by the form and a studio works from a phone number; Service and Location are optional and would leave a trailing dash in the subject when blank.

### Confirmation — to the enquirer

| Field | Value |
| --- | --- |
| To Email | `{{reply_to}}` |
| Reply To | `envoidstudio26@gmail.com` |
| Subject | `We have your enquiry, {{from_name}} — Envoid Design Studio` |

## Variables

They come from `contact.js` and must match exactly. A name that does not match renders as an empty space with no error anywhere.

| Template | Variables |
| --- | --- |
| Enquiry | `{{user_name}}` `{{user_email}}` `{{user_phone}}` `{{user_service}}` `{{user_location}}` `{{user_message}}` |
| Confirmation | `{{from_name}}` `{{subject}}` `{{message}}` `{{reply_to}}` |

`{{subject}}` carries the Service field and `{{message}}` the Brief. Both are optional on the form, so `contact.js` substitutes `General enquiry` and `No brief was included.` for the enquirer's copy only. The studio's copy keeps them blank deliberately — it should be able to see what a customer chose not to say.

EmailJS escapes `{{...}}` values, so nothing a visitor types can inject HTML into either email.

## Rules these follow

Tables for layout, every style inline, no JavaScript, absolute URLs, and JPG or PNG rather than WebP, which Outlook desktop cannot render. The one `<style>` block holds what cannot be inlined: the `@media` rule that stacks the columns below 740px, `.btn:hover`, and the `.addr` override.

Each one opens with a hidden preheader `div` (`display:none; mso-hide:all`), which is the grey preview line an inbox shows next to the subject.

## Client quirks

Carried over from the equivalent templates on hamzaaziz.dev, where they were found the hard way.

- **Gmail auto-links bare email addresses and phone numbers** in its own blue underline, sometimes inside ours. Every address is written as a styled `mailto:` or `tel:` link, with the `.addr` rule overriding whatever Gmail wraps around it.
- **Gmail ignores web fonts.** The Google Fonts link helps clients that honour it; every font stack ends in `Arial, Helvetica, sans-serif` or `Georgia, 'Times New Roman', serif` for the rest.
- **Outlook desktop cannot render WebP**, hence the JPG hero and PNG logo.
- **The logo sits on a bone tile**, not directly on the charcoal bar. The mark is dark on transparency and would otherwise disappear, and older Outlook renders PNG alpha inconsistently.
- **`:hover` works only in Gmail web and Apple Mail.** Everywhere else the buttons stay charcoal, which is why charcoal is the resting colour rather than the hover one.
- **Dark mode is untested.** Both files declare `color-scheme: light`, which asks clients not to invert, but Gmail's Android app inverts anyway. Worth checking on a real device before this matters to a client.

## Testing

- **Send through the live form, not EmailJS's "Test It" button.** Test It cannot send line breaks at all, so a multi-line Brief looks fine there and wrong in a real send.
- `contact.js` uses `emailjs.send` with field values rather than `sendForm`. `sendForm` turns textarea line breaks into `\r\n`, which renders as double blank lines.
- On a Gmail service, leave **Use Default Email Address** ticked. Typing a different From Email does not change the sender.
- Leave EmailJS's built-in **Google Analytics tracking** off — it only accepts the retired `UA-` id format.
- `emailjs.send` cannot be stubbed in the page; it is a non-writable getter. Any local test that gets past the checks sends real email.

## Free plan limits

Roughly 200 emails a month, and each enquiry sends two, so about 100 enquiries. The free plan also allows only two services. Both templates here can share one service, since both send from the studio's own address — unlike hamzaaziz.dev, which needed two because its notification comes from a separate `contact@` inbox.

## If the brand changes

Both files hard-code the palette inline, because email clients cannot use CSS variables. The values are `styles.css`'s own: `#141414` ink, `#f6f3ee` bone, `#dcd5ca` line, `#b88a52` brass, `#805a2c` text-safe brass, `#666159` muted. Change them here and in `styles.css` together, then re-paste both into the dashboard — nothing syncs on its own.
