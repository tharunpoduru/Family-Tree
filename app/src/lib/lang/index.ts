/**
 * Language pack registry. Pick a pack in src/family.config.ts.
 * Adding a language = one new file shaped like telugu.ts plus a line
 * here — see docs/LANGUAGES.md and prompts/add-a-language.md.
 */
import { english } from './english';
import { kannada } from './kannada';
import { telugu } from './telugu';
import type { LanguagePack } from './types';

export type { BiTerm, KinshipTerms, LanguagePack } from './types';

export const LANGUAGE_PACKS = {
  telugu,
  english,
  kannada,
} satisfies Record<string, LanguagePack>;

export type LanguagePackId = keyof typeof LANGUAGE_PACKS;
