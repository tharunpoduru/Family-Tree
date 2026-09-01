/**
 * Your family graph — the one file that holds the people and marriages
 * you seed the site with (uploaded by `npm run seed`; day-to-day changes
 * happen in the app afterwards).
 *
 * It ships EMPTY on purpose: no fictional relatives to delete. The
 * commented example below shows every kind of entry. The fastest way to
 * fill it: give an AI assistant your family details (notes, a GEDCOM
 * export, even photos of a written family record) together with
 * prompts/build-your-seed.md, and it will write this file for you.
 *
 * Conventions:
 * - ids are stable slugs: 'p-<name>' for people, 'u-<a>-<b>' for unions.
 * - children are listed ELDEST FIRST — kinship seniority (elder/younger
 *   terms) reads birth order from this when years are unknown.
 * - Every field beyond `id` and the English name is optional. A person
 *   with only a name renders as a complete entry, never a gap.
 * - Dates take partial ISO ('1952', '1952-08', '1952-08-17'), an
 *   `approximate: true` flag, and/or a lunar-calendar tithi.
 */
import { familyConfig } from '../family.config';
import type {
  FamilyData,
  FamilyDate,
  Person,
  PersonId,
  Union,
  UnionId,
} from '../types/family';

const people: Record<PersonId, Person> = {};
const unions: Record<UnionId, Union> = {};

type PersonDetails = Omit<Partial<Person>, 'id' | 'name' | 'gender'> & {
  /** The name in your family's script (Telugu, Kannada, …). */
  nameNative?: string;
};

export function addPerson(
  id: PersonId,
  name: string,
  gender: 'm' | 'f' | undefined,
  details: PersonDetails = {},
) {
  const { nameNative, ...rest } = details;
  people[id] = {
    id,
    name: { en: name, ...(nameNative ? { native: nameNative } : {}) },
    ...(gender ? { gender } : {}),
    ...rest,
  };
}

export function addUnion(
  id: UnionId,
  partnerA: PersonId,
  partnerB: PersonId,
  children: PersonId[],
  marriage?: FamilyDate,
) {
  unions[id] = {
    id,
    partners: [partnerA, partnerB],
    children,
    ...(marriage ? { marriage } : {}),
  };
}

// ═════════════════════════════════════════════════════════════════════
//  YOUR FAMILY GOES HERE.
//
//  The example below shows every kind of entry — copy the shapes and
//  write your own people (then delete the example).
//
// addPerson('p-first-ancestor', 'First Ancestor', 'm', {
//   nameNative: '…',                          // their name in your script
//   birth: { gregorian: '1928', approximate: true },
//   death: { gregorian: '1996-04-02' },
//   place: 'Their ancestral village',
//   bio: 'A line or two the family remembers about them.',
// });
// addPerson('p-his-wife', 'Her Name', 'f', {
//   maidenName: { en: 'Her birth family' },   // the house she was born into
//   fatherName: { en: 'Her father' },         // parents not in this tree: names only
//   death: {},                                // deceased, date not recorded
// });
// addPerson('p-eldest-child', 'Eldest Child', 'm', {
//   gotra: 'Kashyapa',
//   nakshatra: 'Rohini',
//   birth: { gregorian: '1957-08-17', tithi: { masa: 'shravana', tithi: 'ashtami' } },
// });
//
// addUnion('u-first-ancestor-his-wife', 'p-first-ancestor', 'p-his-wife', [
//   'p-eldest-child',                         // children ELDEST FIRST
// ]);
// ═════════════════════════════════════════════════════════════════════

export const seedFamily: FamilyData = {
  family: familyConfig.name,
  // Point this at the union id of your eldest ancestral couple.
  rootUnion: 'u-first-ancestor-his-wife',
  people,
  unions,
};
