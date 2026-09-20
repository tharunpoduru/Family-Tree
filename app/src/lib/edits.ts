/**
 * Admin write layer (PRD R10). All writes go through here; Firestore
 * rules restrict them to admins. Firestore rejects `undefined`, so every
 * payload is pruned first — absent means absent (sparse-data dignity all
 * the way to the database).
 */
import { doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from './firebase-data';
import type { FamilyDate, Person, PersonId, Union, UnionId } from '../types/family';

/**
 * Plain data, as opposed to a class instance. Rebuilding one of those as
 * a bare object destroys it: a `serverTimestamp()` sentinel flattens into
 * `{_methodName: 'serverTimestamp'}` and Firestore stores that map
 * verbatim instead of stamping the time. Timestamp, Date, GeoPoint and
 * DocumentReference would go the same way.
 */
function isPlainData(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Remove undefined/empty values so documents stay sparse. */
export function prune<T>(value: T): T {
  if (Array.isArray(value)) return value.map(prune) as T;
  if (isPlainData(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined || v === '' || v === null) continue;
      const pv = isPlainData(v) || Array.isArray(v) ? prune(v) : v;
      if (isPlainData(pv) && Object.keys(pv).length === 0) continue;
      out[k] = pv;
    }
    return out as T;
  }
  // Anything else — a sentinel, a Timestamp, a Date — passes through whole.
  return value;
}

/** An empty FamilyDate means "not recorded" — store nothing. */
export function normalizeDate(d: FamilyDate | undefined): FamilyDate | undefined {
  if (!d) return undefined;
  const p = prune(d);
  return p && Object.keys(p).length ? p : undefined;
}

export function slugify(nameEn: string): string {
  return nameEn
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function newPersonId(nameEn: string, taken: Set<string>): PersonId {
  const base = `p-${slugify(nameEn) || 'person'}`;
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

export function newUnionId(aEn: string, bEn: string, taken: Set<string>): UnionId {
  const base = `u-${slugify(aEn)}-${slugify(bEn)}`;
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

/**
 * Person documents, pruned — except that an empty `death` survives, since
 * its mere presence is what marks someone as passed (date unknown).
 */
export function personDocument(person: Person): Record<string, unknown> {
  const data = prune(person) as unknown as Record<string, unknown>;
  if (person.death && !data.death) data.death = {};
  return data;
}

export async function savePerson(person: Person): Promise<void> {
  await setDoc(doc(db, 'people', person.id), personDocument(person));
}

export async function saveUnion(union: Union): Promise<void> {
  await setDoc(doc(db, 'unions', union.id), prune(union));
}

export async function setUnionChildren(
  unionId: UnionId,
  children: PersonId[],
): Promise<void> {
  await updateDoc(doc(db, 'unions', unionId), { children });
}

export async function clearPersonPortrait(personId: PersonId): Promise<void> {
  await updateDoc(doc(db, 'people', personId), { portrait: deleteField() });
}
