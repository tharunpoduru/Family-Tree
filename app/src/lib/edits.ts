/**
 * Admin write layer (PRD R10). All writes go through here; Firestore
 * rules restrict them to admins. Firestore rejects `undefined`, so every
 * payload is pruned first — absent means absent (sparse-data dignity all
 * the way to the database).
 */
import { doc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase-data';
import type { FamilyDate, Person, PersonId, Union, UnionId } from '../types/family';

/** Remove undefined/empty values so documents stay sparse. */
export function prune<T>(value: T): T {
  if (Array.isArray(value)) return value.map(prune) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined || v === '' || v === null) continue;
      const pv = typeof v === 'object' ? prune(v) : v;
      if (pv && typeof pv === 'object' && !Array.isArray(pv) && Object.keys(pv).length === 0)
        continue;
      out[k] = pv;
    }
    return out as T;
  }
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

export async function savePerson(person: Person): Promise<void> {
  await setDoc(doc(db, 'people', person.id), prune(person));
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

/** Upload a canonical photo; returns the stored path for the doc. */
export async function uploadCanonicalPhoto(
  kind: 'portraits' | 'weddings',
  ownerId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `photos/${kind}/${ownerId}-${Date.now()}.${ext}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return path;
}

export async function clearPersonPortrait(personId: PersonId): Promise<void> {
  await updateDoc(doc(db, 'people', personId), { portrait: deleteField() });
}
