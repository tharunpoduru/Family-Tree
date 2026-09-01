# Prompt: make this template my family's

Copy everything below the line into an AI coding assistant opened in
this repository, and fill in the bracketed details.

---

Customize this family-tree template for my family:

- Family name: **[NAME IN ENGLISH]**, in our script: **[NATIVE-SCRIPT
  NAME, or "none"]**
- Language: **[telugu / kannada / english]**
- Description line (for link previews): **[or "keep the default"]**
- Color feel: **[e.g. "keep the indigo/gold", or "deep green and
  copper", or a specific palette]**

Steps:

1. Read `docs/CUSTOMIZATION.md`, then edit `app/src/family.config.ts`
   with my name, language, and description. Leave `siteUrl` and
   `socialImage` as they are unless I've given you a deployed URL.
2. If I asked for different colors: update the `@theme` block AND the
   `[data-theme='dark']` block in `app/src/index.css` (keep the token
   *names*; change only values), and keep contrast at WCAG AA — check
   ink-on-paper and ink-faint-on-card ratios. Then update the two
   `theme-color` metas and the `.shell` colors in `app/index.html` to
   match the new paper/ink colors.
3. If the palette changed meaningfully, restyle
   `app/public/favicon.svg` to match and run `npm run icons` in `app/`.
4. Run `npm test`, `npm run lint`, and `npm run build` in `app/`; fix
   anything they catch.
5. Show me: the config you wrote, a summary of any palette changes with
   the contrast ratios you checked, and what's left for me to do by
   hand (creating the Firebase project per `docs/SETUP.md`, filling
   `app/.env`, and replacing the seed via
   `prompts/build-your-seed.md`).

Do not touch `app/src/data/seed.ts`, the security rules, or anything
under `functions/` for this task.
