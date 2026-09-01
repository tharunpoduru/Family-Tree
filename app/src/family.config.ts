/**
 * ══════════════════════════════════════════════════════════════════════
 *  YOUR FAMILY'S CONFIGURATION — the one file every family must edit.
 * ══════════════════════════════════════════════════════════════════════
 *
 * Everything brand-specific lives here: the family name, the language,
 * and the site description. The app, the HTML shell, and the social
 * meta tags all read from this file at build time.
 *
 * (Colors live in src/index.css; the Firebase project in app/.env.
 *  See docs/CUSTOMIZATION.md — or run prompts/customize.md with an AI
 *  assistant to have all of it done for you.)
 */
import { LANGUAGE_PACKS, type LanguagePackId } from './lib/lang';
import type { BiName } from './types/family';

export const familyConfig = {
  /**
   * The family name. `en` is required; `native` is the same name in the
   * family's own script and may be omitted (it is, naturally, omitted
   * for the english pack). e.g. { en: 'YourName', native: '<in your script>' }
   */
  name: { en: 'Your Family' } as BiName,

  /** 'telugu' | 'kannada' | 'english' — see src/lib/lang/. */
  language: 'telugu' as LanguagePackId,

  /** Small line above the family name: "The family of <name>". */
  tagline: 'The family of',

  /** Used in the HTML meta description and social-share tags. */
  description: 'A private space for our family — our people, our generations.',

  /**
   * Absolute URL where the site is served, e.g.
   * 'https://your-project.web.app'. Leave '' until you deploy — social
   * share tags are omitted while it is empty.
   */
  siteUrl: '',

  /**
   * Optional social-share image, as a path under app/public/, e.g.
   * '/social.jpg' (1200×630). See docs/social-share-image.md for a
   * prompt that generates a beautiful one. Used only when siteUrl is set.
   */
  socialImage: '',
};

/** The active language pack. */
export const pack = LANGUAGE_PACKS[familyConfig.language];
