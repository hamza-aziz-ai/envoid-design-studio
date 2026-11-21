/* Enquiry form — EmailJS, same pattern as hamzaaziz.dev.
   Two sends: the enquiry to the studio, then a confirmation to the sender.

   The four identifiers below are filled, so this path is live. While any of
   them is empty the form falls back instead to its native POST to FormSubmit,
   so the site keeps working — nothing here runs until all four are set.

   They came from an EmailJS account holding:
     1. A service connected to the inbox the enquiries should arrive in.
     2. An ENQUIRY template whose To is envoid.design.architect@gmail.com, using
        {{user_name}} {{user_email}} {{user_phone}} {{user_service}}
        {{user_location}} {{user_message}}; set Reply-To to {{user_email}}.
     3. A CONFIRMATION template whose To is {{reply_to}} (the auto-reply the
        enquirer receives), using {{from_name}} {{subject}} {{message}}.
   The public key is meant to ship in client code and is not a secret. EmailJS
   can scope it to an allowed origin, but that setting is paid-only, so on this
   account the key works from anywhere: the exposure is the monthly quota, not
   the mailbox. The free tier is roughly 200 emails per month and each enquiry
   sends two. */
const EMAILJS = {
  publicKey: '62buuGiVOAO8DFEZt',  // EmailJS Account > General > Public Key
  enquiry:  { service: 'service_ueaeebb', template: 'template_24jbzoi' },  // delivers to envoid.design.architect@gmail.com
  confirm:  { service: 'service_ueaeebb', template: 'template_vxjz63k' },  // auto-reply to the person enquiring
}

const form = document.getElementById('form')
const statusLine = document.getElementById('form-status')
const configured = Object.values(EMAILJS).every(v => typeof v === 'string' ? v : v.service && v.template)

// Until the EmailJS IDs are filled in, leave the form's native POST to
// FormSubmit alone rather than intercepting it and sending nowhere.
if (configured) form.noValidate = false

/* Email address checks before sending. The browser already checks the syntax
   (type="email"); whether the mailbox exists cannot be checked from a browser.
   These catch a mistyped popular domain and a domain that cannot receive mail. */

// ponytail: short list of popular providers; add any domain visitors keep mistyping.
// Real providers are listed even when only one letter apart (ymail/gmail),
// so they are never "corrected" into each other.
const COMMON_DOMAINS = ['gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'ymail.com',
  'rocketmail.com', 'outlook.com', 'outlook.in', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'live.in',
  'msn.com', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'zoho.com',
  'zohomail.in', 'rediffmail.com', 'gmx.com', 'mail.com', 'yandex.com']
let typoWarnedFor = ''

const editDistance = (a, b) => {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = above
    }
  }
  return row[b.length]
}

// "gmial.com" -> "gmail.com"; null when the domain is fine or nothing is close.
const suggestDomain = domain => {
  if (COMMON_DOMAINS.includes(domain)) return null
  let best = null, bestDistance = 3
  for (const candidate of COMMON_DOMAINS) {
    const distance = editDistance(domain, candidate)
    if (distance < bestDistance) { best = candidate; bestDistance = distance }
  }
  return best
}

// Can the domain receive mail? Asked over DNS-over-HTTPS; only the domain leaves
// the browser. Fails open: a DNS outage or a blocker must never stop a real enquiry.
const domainAcceptsMail = async domain => {
  const lookup = async type => {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
      { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(4000) })
    return response.json()
  }
  try {
    const mx = await lookup('MX')
    if (mx.Status === 3) return false // NXDOMAIN: the domain does not exist
    const servers = (mx.Answer || []).filter(record => record.type === 15)
    // A "null MX" (RFC 7505: "0 .") says the domain accepts no mail.
    if (servers.length) return !servers.every(record => /^0 \.?$/.test(record.data.trim()))
    // No MX at all: mail falls back to the domain's own address (RFC 5321).
    const a = await lookup('A')
    return (a.Answer || []).some(record => record.type === 1)
  } catch {
    return true
  }
}

// Offers the corrected address; pressing Send again keeps it as typed.
const showTypoHint = (emailInput, suggestion) => {
  const fixed = `${emailInput.value.trim().split('@')[0]}@${suggestion}`
  const use = document.createElement('button')
  use.type = 'button'
  use.className = 'form__suggestion'
  use.textContent = fixed
  use.addEventListener('click', () => {
    emailInput.value = fixed
    statusLine.textContent = ''
    emailInput.focus()
  })
  statusLine.replaceChildren('Did you mean ', use, '? Or press Send again to keep it as typed.')
}

const field = name => form.elements[name].value.trim()

// Confirmation to the person who enquired. Failing here must not report the
// enquiry itself as failed — the studio already has it.
const sendConfirmation = params =>
  emailjs.send(EMAILJS.confirm.service, EMAILJS.confirm.template, params, EMAILJS.publicKey)
    .catch(() => console.error('Confirmation email not sent'))

const sendEnquiry = async event => {
  event.preventDefault()
  if (field('_honey')) return                      // bot filled the hidden field

  const emailInput = form.elements.Email
  const domain = emailInput.value.trim().split('@').pop().toLowerCase()
  const suggestion = suggestDomain(domain)
  if (suggestion && typoWarnedFor !== emailInput.value) {
    typoWarnedFor = emailInput.value
    showTypoHint(emailInput, suggestion)
    return
  }
  statusLine.textContent = 'Checking your email address…'
  if (!(await domainAcceptsMail(domain))) {
    statusLine.textContent = `"${domain}" can't receive email. Please check your address ❌`
    return
  }

  const params = {
    user_name: field('Name'),
    user_email: emailInput.value.trim(),
    user_phone: field('Phone'),
    user_service: field('Service'),
    user_location: field('Location'),
    user_message: field('Brief'),
  }

  statusLine.textContent = 'Sending…'
  const button = form.querySelector('button[type="submit"]')
  button.disabled = true
  try {
    await emailjs.send(EMAILJS.enquiry.service, EMAILJS.enquiry.template, params, EMAILJS.publicKey)
    statusLine.textContent = 'Enquiry sent. We will call you back within one working day ✅'
    // Key event in Google Analytics, only if the visitor accepted it. No form
    // content is sent: only which service was asked about, or none.
    if (window.envoidTrack) window.envoidTrack('generate_lead', { service: params.user_service || 'not given' })
    // Service and Brief are optional. The studio's copy keeps them blank, so it
    // can see what was not said; the enquirer's copy gets readable text instead
    // of an empty row under a heading.
    sendConfirmation({
      from_name: params.user_name,
      subject: params.user_service || 'General enquiry',
      message: params.user_message || 'No brief was included.',
      reply_to: params.user_email,
    })
    form.reset()
    setTimeout(() => { statusLine.textContent = '' }, 8000)
  } catch {
    statusLine.textContent = 'Enquiry not sent (service error) ❌ — please call or WhatsApp us instead'
  } finally {
    button.disabled = false
  }
}

if (configured) form.addEventListener('submit', sendEnquiry)
