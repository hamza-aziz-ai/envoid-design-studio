#!/usr/bin/env node
// Pull approved client reviews from Supabase into testimonials.json.
//
//   node tools/sync-testimonials.mjs [--limit 6] [--out testimonials.json]
//
// Reads SUPABASE_URL and SUPABASE_ANON_KEY from the environment. Both are
// public values: the anon key is shipped inside the mobile app, and the
// database's row-level security is what constrains it. It can read only rows
// a human has marked approved, and it cannot write anything.
//
// SECURITY, for whoever renders this file: every string in it was typed by a
// member of the public. Render it with textContent / createTextNode, never
// innerHTML, and never interpolate it into markup on the server either. This
// script strips control characters and caps lengths, which limits the damage
// but is NOT an escaping layer and must not be treated as one.

import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const LIMIT = Number(arg('limit', '6'));
const OUT = arg('out', 'testimonials.json');
const URL_BASE = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_ANON_KEY ?? '';

if (!URL_BASE || !KEY) {
  // Not configured yet is not a failure: the studio's project may not exist.
  console.log('sync-testimonials: SUPABASE_URL or SUPABASE_ANON_KEY unset, nothing to do.');
  process.exit(0);
}

const clean = (s, max) =>
  String(s ?? '')
    // Drop C0/C1 control characters; keep ordinary punctuation and scripts.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim()
    .slice(0, max);

const q = new URLSearchParams({
  status: 'eq.approved',
  select: 'name,rating,body,project,created_at',
  order: 'rating.desc,created_at.desc',
  limit: String(LIMIT),
});

const res = await fetch(`${URL_BASE}/rest/v1/reviews?${q}`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});

if (!res.ok) {
  console.error(`sync-testimonials: Supabase returned ${res.status} ${res.statusText}`);
  process.exit(1); // a broken sync must be loud, not silently stale
}

const rows = await res.json();
if (!Array.isArray(rows)) {
  console.error('sync-testimonials: expected an array, got', typeof rows);
  process.exit(1);
}

const testimonials = rows
  .filter((r) => Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5 && clean(r.body, 800).length >= 10)
  .map((r) => ({
    name: clean(r.name, 60),
    rating: r.rating,
    body: clean(r.body, 800),
    project: clean(r.project, 80) || null,
    date: String(r.created_at ?? '').slice(0, 10), // day precision; the hour is nobody's business
  }));

const payload = JSON.stringify({ updated: new Date().toISOString().slice(0, 10), testimonials }, null, 2) + '\n';

// Only rewrite when the reviews themselves changed: the `updated` stamp alone
// would make a commit every single run.
const same =
  existsSync(OUT) &&
  JSON.stringify(JSON.parse(readFileSync(OUT, 'utf8')).testimonials) === JSON.stringify(testimonials);

if (same) {
  console.log(`sync-testimonials: ${testimonials.length} approved, unchanged.`);
  process.exit(0);
}

writeFileSync(OUT, payload);
console.log(`sync-testimonials: wrote ${testimonials.length} approved review(s) to ${OUT}.`);
