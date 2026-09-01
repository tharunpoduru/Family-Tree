# Setup — Firebase from zero to deployed

Everything below happens once. Expect 30–45 minutes the first time,
most of it in the Firebase console. When a step says *console*, it means
[console.firebase.google.com](https://console.firebase.google.com).

## 0. Prerequisites

- **Node.js 20+** (22 recommended — it's what the Cloud Function runs).
- **Firebase CLI**: `npm i -g firebase-tools`, then `firebase login`.
- **gcloud CLI** (for the admin scripts):
  [install](https://cloud.google.com/sdk/docs/install), then
  `gcloud auth application-default login`. The seed/grant-admin scripts
  authenticate with these *Application Default Credentials*, not with
  `firebase login`.
- A Google account, and a payment card for the Blaze plan (see costs
  below — a family site runs at roughly **$0–2/month**).

## 1. Create the project

1. Console → **Add project**. Pick any id — it becomes your permanent
   free domain, `<project-id>.web.app`, so choose one you like saying
   out loud. Skip Analytics.
2. **Upgrade to the Blaze plan** (project settings → Usage and billing).
   This is unavoidable: Cloud Storage and Cloud Functions both require
   Blaze on new projects. Blaze includes generous no-cost allowances;
   set a **budget alert** at $5 while you're there so a surprise is
   an email, not a bill.

## 2. Pick your region — before anything else

Firestore's location is **immutable**. Decide where your family mostly
lives and use that region for Firestore, Storage, *and* the function —
`asia-south1` (Mumbai) for families in India, or whatever is close.

- Console → **Firestore Database → Create database** → production mode →
  your region.
- Console → **Storage → Get started** → same region. Note the bucket
  name (`<project-id>.firebasestorage.app`).
- If you chose something other than `asia-south1`, change the `REGION`
  constant at the top of [functions/index.js](../functions/index.js) to
  match.

## 3. Turn on sign-in

Console → **Authentication → Sign-in method**, enable two providers:

- **Google** — one tap for most of the family.
- **Email link (passwordless)** — under the Email/Password provider,
  enable *Email link*. This is the fallback for relatives without a
  Google account: they type their email and tap the link they receive.

## 4. Register the web app and fill in .env

1. Console → Project settings → **Your apps** → Web (`</>`), register
   (no hosting checkbox needed).
2. Copy the config values into `app/.env` (start from
   [app/.env.example](../app/.env.example)). These identifiers are
   public by design; the security rules are what protect the data.

## 5. Point the repo at your project

From the repo root:

```bash
firebase use <project-id>
```

## 6. Make it yours

- Edit [app/src/family.config.ts](../app/src/family.config.ts) — family
  name (English + native script), language pack, tagline, description.
- Write your family into
  [app/src/data/seed.ts](../app/src/data/seed.ts) (it ships empty, with
  a commented example of every kind of entry) — by hand, or with
  [prompts/build-your-seed.md](../prompts/build-your-seed.md) and an AI
  assistant.
- Optional polish: [docs/CUSTOMIZATION.md](CUSTOMIZATION.md) covers
  colors, icons, and the social-share card.

Preview locally at any point:

```bash
cd app && npm install && npm run dev
```

The dev server talks to your real Firebase project, so sign-in works
locally out of the box (localhost is pre-authorized).

## 7. Deploy

```bash
cd app && npm run build && cd ..
firebase deploy
```

That ships hosting, both rule sets, Firestore indexes, and the
photo-resize function. Two first-deploy notes:

- The very first functions deploy enables several Google Cloud APIs and
  grants IAM roles; if it fails with a permissions error, **wait two
  minutes and run it again** — propagation delay, not a real failure.
- Say yes when the CLI offers an Artifact Registry cleanup policy (it
  caps the storage cost of function container images).

Your site is now at `https://<project-id>.web.app`. Set that as
`siteUrl` in `family.config.ts` and redeploy when you want social-share
tags.

## 8. Open the doors

```bash
cd app
npx tsx scripts/grant-admin.mts you@example.com   # you are the first admin
npm run seed                                       # upload the family graph
```

`grant-admin` works for any email, even one that has never signed in —
grant your co-admin (the family elder who owns the data) at the same
time. Everyone else signs in themselves and taps **Request to join**;
admins approve from the in-app Admin page.

## 9. App Check (optional, recommended once live)

App Check rejects requests that don't come from your actual deployed
app. It needs a
[reCAPTCHA Enterprise](https://console.cloud.google.com/security/recaptcha)
key (score-based, for your domain):

1. Create the key in Google Cloud console; put your `web.app` domain in
   its allowed domains (never `localhost`).
2. Console → **App Check** → register your web app with the key.
3. Put the site key in `app/.env` as
   `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`, rebuild, redeploy.
4. For local dev, the SDK prints a debug token in the browser console
   once — register it under App Check → Apps → Manage debug tokens.
5. After a few days of clean metrics, flip **Enforce** for Firestore
   and Storage.

Pricing note: reCAPTCHA Enterprise is free for 10,000 assessments per
month — plenty for a family, but worth knowing it's the one line item
most likely to appear on a bill if your family is large and very online.

## 10. Verify the locks

The security rules are the entire privacy story, so prove them:

- **Unit tests** (needs Java for the emulator):
  `cd app && npm run test:rules`
- **Against production** (creates and deletes throwaway accounts,
  touches no family data):
  `cd app && FIREBASE_ADMIN_SERVICE_ACCOUNT=<firebase-adminsdk-…@….iam.gserviceaccount.com> npx tsx scripts/verify-rules-live.mts`
  — the service-account address is in console → Project settings →
  Service accounts.

Every check should read **denied**.

## Costs, honestly

| Service | Free allowance | A 200-person, 50-member family |
|---|---|---|
| Hosting | 10 GB stored, ~10 GB/mo transfer | $0 |
| Firestore | 1 GiB, 50k reads/day | $0 |
| Auth | 50k monthly users | $0 |
| Functions | 2M invocations/mo | $0 |
| Storage | none in most non-US regions | a few cents/GB/month for photos |
| reCAPTCHA (optional) | 10k assessments/mo | usually $0 |

Realistic total: **under $1/month**, occasionally $2 with lots of
photos. Set the budget alert anyway.
