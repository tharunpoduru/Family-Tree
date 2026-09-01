/**
 * Field-level diffing in human language — never JSON.
 * One source of truth for "what changed", used both by the admin
 * summaries and by the inline hints that appear on the field itself.
 */
import type { FamilyDate, Person, Union } from '../types/family';
import { formatFamilyDate } from './format';
import { GOTRAS, GOTRA_LABEL, NAKSHATRAS, NAKSHATRA_LABEL, withNative } from './tradition';
import { pack } from '../family.config';

export type FieldKey =
  | 'name.en'
  | 'name.native'
  | 'nickname'
  | 'maidenName'
  | 'fatherName'
  | 'motherName'
  | 'gotra'
  | 'nakshatra'
  | 'place'
  | 'birth'
  | 'birthPlace'
  | 'death'
  | 'deathPlace'
  | 'bio'
  | 'portrait'
  | 'portraitThen';

export const FIELD_LABEL: Record<FieldKey, string> = {
  'name.en': 'Name',
  'name.native': `${pack.languageName ?? 'Native'} name`,
  nickname: 'Called',
  maidenName: 'Family born into',
  fatherName: "Father's name",
  motherName: "Mother's name",
  gotra: GOTRA_LABEL,
  nakshatra: NAKSHATRA_LABEL,
  place: 'Native place',
  birth: 'Born',
  birthPlace: 'Birthplace',
  death: 'Passed',
  deathPlace: 'Passed in',
  bio: 'Their story',
  portrait: 'Photo',
  portraitThen: 'Younger photo',
};

export interface FieldChange {
  key: FieldKey;
  label: string;
  before: string;
  after: string;
}

const EMPTY = 'not recorded';

function readPerson(p: Person, key: FieldKey): unknown {
  switch (key) {
    case 'name.en':
      return p.name.en;
    case 'name.native':
      return p.name.native;
    default:
      return (p as unknown as Record<string, unknown>)[key];
  }
}

/** Write a proposed value back onto a draft person. */
export function withField(person: Person, key: FieldKey, value: unknown): Person {
  if (key === 'name.en') return { ...person, name: { ...person.name, en: String(value ?? '') } };
  if (key === 'name.native')
    return { ...person, name: { ...person.name, native: (value as string) || undefined } };
  return { ...person, [key]: value } as Person;
}

/** Human display for a single field value. */
export function displayValue(key: FieldKey, value: unknown): string {
  if (value === undefined || value === null || value === '') return EMPTY;
  switch (key) {
    case 'birth':
    case 'death': {
      const d = value as FamilyDate;
      if (!d || Object.keys(d).length === 0) return 'recorded, date unknown';
      return formatFamilyDate(d) ?? 'recorded, date unknown';
    }
    case 'nickname':
    case 'maidenName':
    case 'fatherName':
    case 'motherName':
      return (value as { en?: string }).en ?? EMPTY;
    case 'portrait':
    case 'portraitThen':
      return 'a photo';
    case 'gotra':
      return withNative(String(value), GOTRAS);
    case 'nakshatra':
      return withNative(String(value), NAKSHATRAS);
    case 'bio': {
      const s = String(value);
      return s.length > 90 ? `${s.slice(0, 90)}…` : s;
    }
    default:
      return String(value);
  }
}

const PERSON_KEYS: FieldKey[] = [
  'name.en',
  'name.native',
  'nickname',
  'maidenName',
  'fatherName',
  'motherName',
  'gotra',
  'nakshatra',
  'place',
  'birth',
  'birthPlace',
  'death',
  'deathPlace',
  'bio',
  'portrait',
  'portraitThen',
];

/** Which fields differ between the record and a proposed version. */
export function personFieldChanges(before: Person | undefined, after: Person): FieldChange[] {
  const out: FieldChange[] = [];
  for (const key of PERSON_KEYS) {
    const a = before ? readPerson(before, key) : undefined;
    const b = readPerson(after, key);
    if (JSON.stringify(a ?? null) === JSON.stringify(b ?? null)) continue;
    out.push({
      key,
      label: FIELD_LABEL[key],
      before: displayValue(key, a),
      after: displayValue(key, b),
    });
  }
  return out;
}

/** Raw proposed value for a field — used when accepting a suggestion. */
export function proposedValue(person: Person, key: FieldKey): unknown {
  return readPerson(person, key);
}

export interface UnionFieldChange {
  key: 'marriage' | 'photos' | 'children';
  label: string;
  before: string;
  after: string;
}

const countPhotos = (n: number) =>
  n === 0 ? EMPTY : n === 1 ? '1 photo' : `${n} photos`;

export function unionFieldChanges(
  before: Union | undefined,
  after: Union,
  nameOf: (id: string) => string,
): UnionFieldChange[] {
  const out: UnionFieldChange[] = [];
  const bm = JSON.stringify(before?.marriage ?? null);
  const am = JSON.stringify(after.marriage ?? null);
  if (bm !== am) {
    out.push({
      key: 'marriage',
      label: 'Married',
      before: displayValue('birth', before?.marriage),
      after: displayValue('birth', after.marriage),
    });
  }
  if (JSON.stringify(before?.photos ?? []) !== JSON.stringify(after.photos ?? [])) {
    out.push({
      key: 'photos',
      label: 'Wedding album',
      before: countPhotos((before?.photos ?? []).length),
      after: countPhotos((after.photos ?? []).length),
    });
  }
  const bc = (before?.children ?? []).join(',');
  const ac = after.children.join(',');
  if (bc !== ac) {
    out.push({
      key: 'children',
      label: 'Children',
      before: (before?.children ?? []).map(nameOf).join(', ') || EMPTY,
      after: after.children.map(nameOf).join(', ') || EMPTY,
    });
  }
  return out;
}
