# Prompt: add a language pack

Copy everything below the line into an AI coding assistant opened in
this repository. Works best when you (or a relative) can review the
resulting word list — kinship terms are exactly where a wrong word
stings.

---

Add a **[LANGUAGE]** language pack to this family-tree app.

**Read first:** `docs/LANGUAGES.md`, then
`app/src/lib/lang/types.ts` (the pack schema, with commentary on every
slot), `app/src/lib/lang/telugu.ts` and
`app/src/lib/lang/kannada.ts` (two worked examples — note how Kannada
handles slots its usage merges or splits differently from Telugu), and
the naming section of `app/src/lib/kinship.ts` (how slots are composed
into badges).

**Research before writing.** Verify every kinship term against real
dictionary or linguistic sources for [LANGUAGE] — do not rely on
memory alone. Where usage varies by region or community, prefer the
most widely understood term and note alternatives in comments. Pay
special attention to:

- which distinctions the language actually makes (elder/younger,
  paternal/maternal, cross/parallel) — where it merges a distinction
  the schema splits, fill both slots with the same word; where it
  needs the engine's precision, the split slots are already there;
- the genitive forms (`of*` slots) — composed terms like
  "elder brother's son" must read naturally;
- false friends between related languages (e.g. Telugu సవతి vs
  Kannada ಸವತಿ mean different things);
- calendar conventions: month spellings, the fortnight labels
  (Suddha/Bahula vs Shukla/Krishna), tithi names, and nakshatra
  spellings as this language's panchangas actually print them.

**Then:**

1. Create `app/src/lib/lang/<language>.ts` filling every slot;
   register it in `app/src/lib/lang/index.ts`.
2. Wire the script's font: add the right `@fontsource/noto-serif-…`
   package to `app/package.json`, import its 400/600 css in
   `app/src/index.css`, add the font to the `--font-native` stack and
   the `:lang(te), :lang(kn)` selector list, and set the pack's
   `langTag`.
3. Add a handful of pack tests next to the Kannada ones in
   `app/tests/kinship.test.ts` — at minimum: a cross nephew, a composed
   parallel nephew (genitive check), a grandparent, and one
   through-spouse in-law.
4. Run `npm install`, `npm test`, and `npm run build` in `app/`.
5. Report: the full term table (slot → word → romanization → source),
   every term you're less than confident about marked ⚠️ for a native
   speaker to review, and any structural notes (what merged, what
   split, and why).
