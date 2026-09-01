# Prompt: build my family's seed data

Copy everything below the line into an AI coding assistant (Claude
Code, Codex, Antigravity, …) opened in this repository, together with
your family information — typed notes, a GEDCOM export, a spreadsheet,
or even **photos of a handwritten or printed family record** (a
descendants book, a wedding-invite family list, a notebook). The more
you give it, the more complete your tree.

---

I want you to build my family's seed data for this family-tree app.

**Read first:** `app/src/data/seed.ts` (the file you will fill in —
note the `addPerson`/`addUnion` helpers and the commented example),
`app/src/types/family.ts` (the data model), and
`app/src/family.config.ts` (set the family name and language there if I
haven't already).

**Then take the family information I provide** — in whatever form —
and write my family into `seed.ts`, replacing the example. If I've
given you images of written records, transcribe them carefully; when
handwriting is ambiguous, make your best reading and add a `// ⚠️`
comment so I can check it.

Rules for the data:

1. Ids are stable slugs: `p-<name>` for people, `u-<a>-<b>` for unions.
   Disambiguate collisions with a distinguishing word, not numbers,
   where possible (e.g. `p-madhav-elder`).
2. **Children eldest-first** in every union — the kinship engine reads
   seniority from this order when birth years are unknown. If I haven't
   told you the order, ask me rather than guessing.
3. Record only what I actually gave you. Every field beyond the English
   name is optional — omit unknowns entirely; never invent dates,
   spellings, or relationships. Partial dates are fine: `'1952'`,
   `'1952-08'`, `{ gregorian: '1928', approximate: true }`.
4. A person who is deceased but with no known date gets `death: {}`.
5. For spouses who married in: their own parents go in
   `fatherName`/`motherName` (names only), their birth family in
   `maidenName`. Only people descended from the root couple — plus
   married-in spouses — are `addPerson` entries.
6. Native-script names go in `nameNative` when I've provided them or
   when I ask you to transliterate; if transliterating, mark uncertain
   ones with a `// ⚠️` comment.
7. Set `rootUnion` to the eldest ancestral couple.
8. Lunar-calendar dates use the storage keys in `types/family.ts`
   (`masa: 'kartika'`, `tithi: 'trayodashi'`, `paksha: 'shukla' |
   'krishna'`) whatever spelling my family uses aloud.

**When you're done:** run `npm test` and `npm run build` in `app/` and
fix anything they catch; then give me (a) a short summary tree of what
you recorded so I can spot mistakes, (b) the list of every ⚠️ you
left, and (c) the reminder that `cd app && npm run seed` uploads it.
Do not run the seed script yourself unless I say so.
