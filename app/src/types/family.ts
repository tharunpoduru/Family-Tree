/**
 * Family Tree — core family data model.
 *
 * Design principles (see docs/PRD.md):
 * - GEDCOM-aligned: Person ≈ INDI, Union ≈ FAM. Data outlives websites.
 * - Sparse-tolerant: every field beyond `id` and `name.en` is optional.
 *   A name-only person is a first-class citizen, not a degenerate record.
 * - Composite dates: Gregorian and tithi are peers; either, both, or neither.
 * - Built for unbounded growth: the tree starts at one ancestor and grows
 *   downward forever.
 */

export type PersonId = string;
export type UnionId = string;

/**
 * Lunar (chandramana) months, Chaitra-first. These are storage keys —
 * the active language pack decides how each is displayed.
 */
export const LUNAR_MONTHS = [
  'chaitra',
  'vaishakha',
  'jyeshtha',
  'ashadha',
  'shravana',
  'bhadrapada',
  'ashwayuja',
  'kartika',
  'margashira',
  'pushya',
  'magha',
  'phalguna',
] as const;
export type LunarMonth = (typeof LUNAR_MONTHS)[number];

/** Lunar fortnight: waxing (śukla) or waning (kṛṣṇa/bahuḷa). */
export type Paksha = 'shukla' | 'krishna';

/** The fifteen tithis; amavasya/purnima close their respective fortnights. */
export const TITHIS = [
  'pratipada',
  'dwitiya',
  'tritiya',
  'chaturthi',
  'panchami',
  'shashthi',
  'saptami',
  'ashtami',
  'navami',
  'dashami',
  'ekadashi',
  'dwadashi',
  'trayodashi',
  'chaturdashi',
  'purnima',
  'amavasya',
] as const;
export type Tithi = (typeof TITHIS)[number];

/** A date by the lunar calendar — any subset may be known. */
export interface TithiDate {
  masa?: LunarMonth;
  paksha?: Paksha;
  tithi?: Tithi;
}

/**
 * A family-history date. Any combination is valid, including neither
 * (an event known to have happened, date unknown).
 * `gregorian` accepts partial ISO: 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD'.
 */
export interface FamilyDate {
  gregorian?: string;
  tithi?: TithiDate;
  /** True when the family remembers this only approximately. */
  approximate?: boolean;
}

/**
 * Bilingual text — English required; the family's own script cherished
 * when known (Telugu, Kannada, … — set by the language pack).
 */
export interface BiName {
  en: string;
  native?: string;
}

/**
 * A crop, stored as a normalized rectangle in 0–1 source coordinates
 * and applied at display time. The original upload is never altered.
 */
export interface PhotoCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A photo: where it lives, how it's framed, what it shows. */
export interface PhotoRef {
  path: string;
  crop?: PhotoCrop;
  caption?: string;
}

export interface Person {
  id: PersonId;
  name: BiName;
  /**
   * What the family actually calls them. Often the only name younger
   * relatives know — so it is searchable, not decorative.
   */
  nickname?: BiName;
  gender?: 'm' | 'f';
  /** The portrait shown by default — usually the most recent. */
  portrait?: PhotoRef;
  /**
   * A younger portrait. When present, tapping the portrait turns it over
   * between the two — the way a family album falls open at both.
   */
  portraitThen?: PhotoRef;
  gotra?: string;
  /** Birth star — one of the 27 nakshatras, stored by its English name. */
  nakshatra?: string;
  /**
   * Parents recorded by name only — for the eldest generation and for
   * spouses who married in, whose own parents aren't people in this tree.
   * When a person's parents ARE in the tree, the link wins over these.
   */
  fatherName?: BiName;
  motherName?: BiName;
  /**
   * The family, or house, someone was born into before marriage.
   * Kept because it is the thread back to their own line and gotra.
   */
  maidenName?: BiName;
  birth?: FamilyDate;
  /** Presence of `death` (even empty {}) marks the person as deceased. */
  death?: FamilyDate;
  /** Short life story / notes. Plain text, paragraphs split on blank lines. */
  bio?: string;
  /** Native place / ancestral village. */
  place?: string;
  birthPlace?: string;
  deathPlace?: string;
  /**
   * Reserved for future field-level privacy (PRD decision #4 keeps all
   * visible today; the flag exists so a policy change never needs a schema
   * migration).
   */
  visibility?: 'members' | 'admins';
}

export interface Union {
  id: UnionId;
  /**
   * One or two partners. Two for a marriage; one supports single-parent
   * lineages without contortion. Order is presentational only.
   */
  partners: [PersonId] | [PersonId, PersonId];
  /**
   * The wedding album — it belongs to the marriage, not to either person.
   * The first photo is the banner; the rest are swiped through.
   */
  photos?: PhotoRef[];
  marriage?: FamilyDate;
  /** Ordered eldest-first. */
  children: PersonId[];
}

/** The whole family graph — loaded once per session, navigated instantly. */
export interface FamilyData {
  /** Display name of the family. */
  family: BiName;
  /** Union at the root of the known tree (the eldest ancestral couple). */
  rootUnion: UnionId;
  people: Record<PersonId, Person>;
  unions: Record<UnionId, Union>;
}
