# Agent guide

This is a private family-tree web app template: React 19 + TypeScript +
Vite + Tailwind v4 on Firebase (Auth, Firestore, Storage, Hosting, one
gen2 Cloud Function). Families clone it, configure it, and deploy their
own instance. The ready-made tasks users will hand you live in
`prompts/` (customize, build the seed, add a language).

## Commands (run in `app/`)

```bash
npm install
npm run dev          # Vite dev server against the real Firebase project
npm test             # kinship engine tests (no emulator needed)
npm run lint         # oxlint — keep it at zero errors
npm run build        # tsc -b && vite build; also fills index.html placeholders
npm run seed         # upload src/data/seed.ts to Firestore (needs gcloud ADC)
npm run icons        # regenerate PNG icons from public/favicon.svg
npm run test:rules   # security-rules tests (needs Java + firebase CLI)
```

Deploy from the repo root: `firebase deploy` (after `firebase use
<project-id>`; web config lives in `app/.env`, never in source).

## Architecture in six facts

1. **One config file drives all branding**: `app/src/family.config.ts`
   (family name, language pack, tagline, description, siteUrl). The
   HTML shell and social tags are filled from it at build time by the
   `familyBranding` plugin in `app/vite.config.ts` — don't hardcode a
   family name anywhere.
2. **Language is data.** `app/src/lib/lang/` holds packs (telugu,
   kannada, english): kinship vocabulary as ~60 named slots, calendar
   display names, nakshatra/gotra lists, a couple of UI strings. The
   kinship *engine* (`app/src/lib/kinship.ts`) owns the classificatory
   rules and generates the English gloss itself; packs supply only
   native words. `kinshipOfWith(pack, …)` exists so tests pin a pack.
3. **Data model** (`app/src/types/family.ts`): Person + Union,
   GEDCOM-aligned, sparse-tolerant — every field beyond `id` and
   `name.en` is optional, and UI must render absence as nothing, never
   as "Unknown". Dates are Gregorian (partial ISO) and/or tithi, plus
   an `approximate` flag. Union children are ordered **eldest first**;
   the kinship engine reads seniority from that order.
4. **The whole graph loads once** per session into memory
   (`app/src/lib/data.tsx`); navigation is synchronous lookups. Keep it
   that way — and keep Firestore out of the signed-out critical path:
   `firebase.ts` (Auth only) is eagerly imported, `firebase-data.ts`
   (Firestore/Storage) only ever dynamically, and the vendor chunks in
   `vite.config.ts` preserve that split. This is a hard performance
   requirement (PRD R7), not a style preference.
5. **Security lives in `firestore.rules` / `storage.rules`**, not in
   the UI: no reads without approved membership, no canonical writes
   except admins, member uploads only into a quarantined
   `suggestions/{uid}/` path. If you touch access behavior, update the
   rules and `app/tests/rules.test.ts` together.
6. **Members suggest, admins apply**: member saves become pending
   changes; `app/src/lib/diff.ts` renders human-language field diffs
   ("Born: c. 1918 → 1 Dec 1918" — never JSON) used across the admin
   review surfaces.

## Conventions

- Comments explain *why* and cultural context, not what the next line
  does — match the existing density and voice.
- No i18n framework; native-script text carries `lang={pack.langTag}`
  so the right serif applies via `:lang()` in `index.css`.
- Theme tokens (`--color-nili`, `--color-pasupu`, paper/ink/card/line)
  are defined once in `app/src/index.css` for light and dark; change
  values, not names. Focus rings, WCAG AA contrast, ≥44px tap targets,
  and reduced-motion support are load-bearing.
- Never invent family data (names, dates, spellings) when building
  seeds — omit unknowns; flag uncertain transcriptions with `// ⚠️`.
- Kinship terms are researched vocabulary: verify against dictionary
  sources before changing a pack, and leave ⚠️ notes for native-speaker
  review rather than guessing.
