/**
 * The fixed vocabulary of tradition — spelled once, bilingually, so
 * nobody has to fight a text box over transliteration. The spellings
 * come from the active language pack.
 *
 * Nakshatras are a closed list of 27, the same in every tradition.
 * Gotras are NOT closed: the curated list covers the common ones, and
 * the edit sheet merges in whatever already lives in the family data —
 * a married-in gotra typed once becomes a listed option for everyone
 * after.
 */
import { pack } from '../family.config';
import type { BiTerm } from './lang';

export type { BiTerm };

/** The 27 birth stars, in their traditional order. */
export const NAKSHATRAS: BiTerm[] = pack.tradition.nakshatras;

/** Common gotras. Deliberately not exhaustive — free typing is allowed. */
export const GOTRAS: BiTerm[] = pack.tradition.gotras;

/** Field labels as this community says them ('Gotram' vs 'Gotra'). */
export const GOTRA_LABEL = pack.tradition.gotraLabel;
export const NAKSHATRA_LABEL = pack.tradition.nakshatraLabel;

/** "Bharadwaja · భరద్వాజ" when the native spelling is known; the value alone otherwise. */
export function withNative(value: string, list: BiTerm[]): string {
  const hit = list.find((t) => t.en.toLowerCase() === value.trim().toLowerCase());
  return hit?.native ? `${hit.en} · ${hit.native}` : value;
}
