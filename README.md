# Family Tree

A private, self-hosted family tree for Indian families — built to be
seeded once, browsed by everyone from grandparents to grandchildren, and
kept alive by the family itself.

Made originally for a Telugu family and shaped by how such families
actually describe themselves: one household at a time, with kinship
words that English doesn't have. It ships with **Telugu**, **Kannada**,
and **English** language packs, and adding another language is one file.

## What you get

- **Family pages** — a couple, their wedding album, their children;
  tap a child to walk down a generation, tap a parent to walk up.
- **A tree overview** that re-roots as you tap, built for unbounded
  growth — phones get a vertical outline, desktops a panoramic canvas.
- **"Who is this person to me?"** — a kinship engine that computes the
  exact Dravidian relationship between the viewer and anyone in the
  tree: మేనల్లుడు, ದೊಡ್ಡಪ್ಪ, "father's elder brother" — elder/younger,
  paternal/maternal, cross/parallel all handled by rule.
- **Dates the way the family remembers them** — Gregorian (even just a
  year), lunar-calendar tithi (māsa/paksha/tithi), or both; gotra and
  nakshatra as first-class optional fields.
- **Names in two scripts** — English always, the family's own script
  wherever it's known; search matches both.
- **Private by rules, not by obscurity** — nobody sees anything without
  an admin-approved membership, enforced in Firestore/Storage security
  rules and covered by tests.
- **A living record** — members suggest edits through the same forms
  admins use; admins see a human-readable field diff and apply with one
  tap. Photos are resized automatically by a Cloud Function; originals
  are archived untouched.
- **Built for slow networks and elder eyes** — the whole graph loads
  once and navigation is instant; large text, big tap targets, WCAG AA.

## Make it your family's — with an AI assistant

This repo is written to be customized by an AI coding agent (Claude
Code, Codex, Antigravity, Cursor, …). Clone it, open it in your agent,
and use the prompts:

| Prompt | What it does |
|---|---|
| [prompts/customize.md](prompts/customize.md) | Renames the family, picks the language, rethemes colors and icons |
| [prompts/build-your-seed.md](prompts/build-your-seed.md) | Turns your notes, a GEDCOM export, or **photos of a written family record** into your seed data |
| [prompts/add-a-language.md](prompts/add-a-language.md) | Builds a language pack for a language the template doesn't ship |

Prefer doing it by hand? Everything the prompts do is documented in
[docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md).

## Quickstart

```bash
git clone <this-repo> my-family && cd my-family
cd app && npm install
```

1. Create a Firebase project and enable Auth, Firestore, and Storage —
   the full console walkthrough is [docs/SETUP.md](docs/SETUP.md).
   (Firebase's Blaze plan is required; a small family site costs
   roughly **$0–2/month**.)
2. Copy `app/.env.example` to `app/.env` and paste in your Firebase web
   config.
3. Edit [app/src/family.config.ts](app/src/family.config.ts) — family
   name, language (`telugu` / `kannada` / `english`), description.
4. Write your family into [app/src/data/seed.ts](app/src/data/seed.ts)
   — it ships empty with a commented example, and
   [prompts/build-your-seed.md](prompts/build-your-seed.md) turns your
   notes or records into it.
5. Deploy and open the doors:

```bash
cd app && npm run build && cd ..
firebase deploy
cd app && npx tsx scripts/grant-admin.mts you@example.com && npm run seed
```

## Documentation

| Doc | Contents |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Firebase from zero to deployed, step by step |
| [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) | Name, theme, seed data, icons, social image, admin scripts |
| [docs/LANGUAGES.md](docs/LANGUAGES.md) | How language packs work; the Telugu/Kannada/English packs; adding your own |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Firebase Hosting in depth, real costs, and hosting on Vercel/Netlify/Cloudflare instead |
| [docs/PRD.md](docs/PRD.md) | The product thinking: goals, principles, and requirements |
| [docs/social-share-image.md](docs/social-share-image.md) | Generating a beautiful WhatsApp/iMessage share card |

## Stack

React 19 + TypeScript + Vite + Tailwind v4, Firebase (Auth, Firestore,
Storage, Hosting, one gen2 Cloud Function for photo resizing). No
server of your own to run; no i18n framework — language is data.

```
app/        the web app (src/family.config.ts is yours to edit)
  scripts/  admin CLI: seed, grant-admin, revoke, verify rules
functions/  photo-resize Cloud Function
docs/       setup and customization guides
prompts/    hand these to your AI assistant
*.rules     Firestore/Storage security rules — the actual privacy layer
```

## License

[MIT](LICENSE). Family photos, names, and records you put into your
deployment are yours alone — nothing in this repo phones home.
