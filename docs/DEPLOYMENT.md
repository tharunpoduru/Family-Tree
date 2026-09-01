# Deployment

Firebase is the backend regardless — Firestore, Auth, Storage, and the
photo-resize function all live there. What you can choose is where the
*static site* is served from. The default (and simplest) answer is
Firebase Hosting; the alternatives below exist mostly for teams that
already live on another platform.

## Firebase Hosting (the default)

```bash
cd app && npm run build && cd ..
firebase deploy                      # or --only hosting for site-only updates
```

- `https://<project-id>.web.app` is permanent and free, with managed
  SSL. Not needing a custom domain is a *feature* for a family archive:
  a lapsed domain renewal can never cut everyone off.
- Preview a change without touching the live site:
  `firebase hosting:channel:deploy trial`.
- SPA rewrites, `noindex` headers, and long-cache asset headers are
  already configured in [firebase.json](../firebase.json).

### Plans and cost

The **Blaze plan is required** — Cloud Functions have always needed it,
and since 2024–2026 Cloud Storage does too, on all projects. Blaze is
pay-as-you-go on top of free allowances (Hosting 10 GB + ~10 GB/mo
transfer, Firestore 1 GiB + 50k reads/day, Auth 50k users, Functions 2M
invocations/mo). The one thing without a free tier in most non-US
regions is Storage itself: photos in `asia-south1` bill from the first
byte — a few cents per GB per month. Realistic total for a family:
**$0–2/month**. Set a budget alert at $5.

### The function's runtime

[functions/package.json](../functions/package.json) targets **Node 22**
(Node 20 is decommissioned on Cloud Functions as of late 2026 — don't
downgrade it). First-ever functions deploy can fail on IAM propagation;
waiting two minutes and re-running fixes it.

## Hosting the SPA on Vercel / Netlify / Cloudflare instead

Build output is plain static files (`app/dist`), so any static host
works. Three things must follow you to a new domain, whatever the host:

1. **Auth authorized domains** — Firebase console → Authentication →
   Settings → Authorized domains → add the new domain. Required for
   both Google sign-in and the email magic link.
2. **App Check** (if enabled) — add the domain to the reCAPTCHA
   Enterprise key's allowed domains.
3. **`siteUrl`** in `family.config.ts`, so share tags point home.

The app signs in with `signInWithPopup` plus email links — both work
cross-origin with the default `authDomain` on current browsers, no
proxy needed. (The belt-and-suspenders hardening, if you ever want it:
reverse-proxy `/__/auth/*` to `https://<project>.firebaseapp.com` and
set `authDomain` to your own domain.)

**Vercel** — `vercel.json` in `app/`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**Netlify** — `app/public/_redirects`:

```
/*  /index.html  200
```

**Cloudflare Pages** — serves an SPA fallback automatically when no
root `404.html` exists; nothing to configure. (New Cloudflare projects
on Workers-with-assets instead set
`assets.not_found_handling = "single-page-application"`.)

In all three cases, set the build command to `npm run build` with root
directory `app/`, output `dist/`, and add the `VITE_FIREBASE_*`
variables from `app/.env` as build-environment variables.

## Fully Firebase-free?

The honest answer: that's a rewrite, not a deployment option. Supabase
is the closest substitute (Postgres + RLS for Firestore + rules,
Supabase Auth for Google/magic-link, Supabase Storage + transformations
for photos), but every query, listener, and rule has different
semantics, and its free tier pauses inactive projects — awkward for an
app a grandparent opens monthly. For a private family site, Firebase's
near-zero bill and zero ops is the pragmatic choice; that's why this
template commits to it.
