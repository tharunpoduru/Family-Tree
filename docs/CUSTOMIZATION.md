# Customization

Everything family-specific lives in a handful of places. An AI
assistant can do all of this from [prompts/customize.md](../prompts/customize.md);
this page is the map for doing it yourself.

## The one file everyone edits: family.config.ts

[app/src/family.config.ts](../app/src/family.config.ts) drives the app,
the static HTML shell, the page title, and the social-share tags:

```ts
name: { en: 'YourName', native: '…' },   // your family name, both scripts
language: 'telugu',                       // 'telugu' | 'kannada' | 'english'
tagline: 'The family of',
description: 'A private space for our family — our people, our generations.',
siteUrl: '',                                  // set after deploy for share tags
socialImage: '',                              // optional, see below
```

`native` may be omitted (and is meaningless for the `english` pack).
Language packs are documented in [LANGUAGES.md](LANGUAGES.md).

## Your family's data: seed.ts

[app/src/data/seed.ts](../app/src/data/seed.ts) holds the family graph
you first upload. It ships empty — no fictional relatives to delete —
with a commented example demonstrating every kind of entry. Write your
own family in, then:

```bash
cd app && npm run seed        # idempotent merge — safe to re-run
```

`npm run seed` merges document-by-document, preserving photos and edits
made in the app afterwards. To wipe and start over instead:
`npx tsx scripts/reset-firestore.mts` (leaves members and suggestions
untouched).

The fastest way to build a real seed is
[prompts/build-your-seed.md](../prompts/build-your-seed.md) — it turns
notes, a GEDCOM export, or photos of a handwritten family record into
valid entries. Rules worth knowing either way:

- children are listed **eldest first** — the kinship engine reads
  seniority from this when birth years are unknown;
- every field beyond the English name is optional, and absent fields
  simply don't render;
- for people who married in, record their parents with
  `fatherName`/`motherName` (names only) and their birth family with
  `maidenName`.

## Colors and theme

The whole palette is CSS variables in
[app/src/index.css](../app/src/index.css) — one `@theme` block for
light, one `[data-theme='dark']` block for dark. Change the values,
not the names (`--color-nili`, `--color-pasupu`, … are used as Tailwind
classes throughout; they're just token names — nili is indigo, pasupu
is turmeric).

If you change the background colors, also update the two
`theme-color` metas and the `.shell` colors in
[app/index.html](../app/index.html) so the first paint matches.

## Icons

[app/public/favicon.svg](../app/public/favicon.svg) is the mark — a
banyan on indigo silk. Edit or replace it (any square SVG), then:

```bash
cd app && npm run icons       # regenerates icon-192.png / icon-512.png
```

## Social-share card

WhatsApp/iMessage previews use Open Graph tags, generated from
`family.config.ts` once `siteUrl` is set. For a picture card, generate
a 1200×630 image (see [social-share-image.md](social-share-image.md)
for a prompt that makes a beautiful one), drop it in `app/public/`, and
set `socialImage: '/your-file.jpg'`.

## Admin scripts

All run from `app/`, authenticated via gcloud Application Default
Credentials (`gcloud auth application-default login`):

| Script | Purpose |
|---|---|
| `npm run seed` | Upload/merge the seed graph |
| `npx tsx scripts/reset-firestore.mts` | Replace all family data with the seed |
| `npx tsx scripts/grant-admin.mts <email>` | Make someone an approved admin (creates the account if needed) |
| `npx tsx scripts/revoke-user.mts <email>` | Remove a member's access entirely |
| `npm test` | The whole suite, rules included (emulator; needs Java) |
| `npm run test:unit` | Everything that needs no emulator — kinship, tree, saves, errors |
| `npm run test:rules` | Security-rules unit tests (emulator; needs Java) |
| `npx tsx scripts/verify-rules-live.mts` | Attack the deployed rules with throwaway accounts |
| `npm run icons` | Regenerate PNG icons from favicon.svg |

## Day-to-day upkeep

After launch you shouldn't need any of the above: admins add people,
families, photos, and dates in the app itself, and members' suggested
edits arrive on the Admin page with a field-by-field diff.
