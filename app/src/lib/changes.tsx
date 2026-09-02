/**
 * The change system: members and admins use the SAME editing UI.
 * An admin's save applies immediately; a member's save becomes a
 * structured pending change an admin can approve, edit, or decline.
 * Every canonical write is stamped with who did it (audit trail).
 */
import { useCallback } from 'react';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getBytes, getMetadata, ref } from 'firebase/storage';
import { db, storage } from './firebase-data';
import { prune, savePerson, saveUnion } from './edits';
import {
  MAX_PHOTO_BYTES,
  checkPhotoFile,
  fileExtension,
  guessContentType,
  uploadImage,
} from './upload';
import { useAuth } from './auth';
import type { Person, PersonId, PhotoRef, Union, UnionId } from '../types/family';

/**
 * `base` is the record as the editor saw it when they opened the sheet.
 * Applying a save then touches only the fields they actually changed, so
 * a sheet left open on one phone cannot silently overwrite a photo that
 * another device saved in the meantime. Older suggestions without a base
 * are applied whole, as before.
 */
export type Change =
  | { kind: 'person.save'; person: Person; base?: Person }
  | { kind: 'union.save'; union: Union; base?: Union }
  | { kind: 'union.addChild'; unionId: UnionId; person: Person }
  | { kind: 'family.start'; spouse: Person; union: Union }
  | { kind: 'family.link'; spouseId: PersonId; union: Union }
  | { kind: 'person.delete'; personId: PersonId; name: string }
  | { kind: 'union.delete'; unionId: UnionId; label: string }
  | { kind: 'identity.claim'; personId: PersonId; name: string };

export interface Editor {
  uid: string;
  name: string;
}

/** Which record a change is about — used for inline suggestion badges. */
export function targetIdOf(change: Change): string {
  switch (change.kind) {
    case 'person.save':
      return change.person.id;
    case 'union.save':
      return change.union.id;
    case 'union.addChild':
      return change.unionId;
    case 'family.start':
    case 'family.link':
      return (change.union.partners as PersonId[])[0];
    case 'person.delete':
    case 'identity.claim':
      return change.personId;
    case 'union.delete':
      return change.unionId;
  }
}

/** Move a member-suggested photo out of quarantine into the archive. */
async function migratePhoto(
  photo: PhotoRef | undefined,
  kind: 'portraits' | 'weddings',
  ownerId: string,
): Promise<PhotoRef | undefined> {
  if (!photo?.path?.startsWith('suggestions/')) return photo;
  const source = ref(storage, photo.path);
  // Carry the content type across: the resize function only acts on
  // image/* objects, and a bare byte copy would land as octet-stream.
  const [bytes, meta] = await Promise.all([
    getBytes(source, MAX_PHOTO_BYTES),
    getMetadata(source),
  ]);
  const ext = fileExtension(photo.path) || 'jpg';
  const dest = `photos/${kind}/${ownerId}-${Date.now()}-${Math.floor(
    bytes.byteLength % 9973,
  )}.${ext}`;
  await uploadImage(dest, new Uint8Array(bytes), {
    contentType: meta.contentType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  });
  return { ...photo, path: dest };
}

async function migrateAlbum(
  photos: PhotoRef[] | undefined,
  ownerId: string,
): Promise<PhotoRef[] | undefined> {
  if (!photos?.length) return photos;
  const out: PhotoRef[] = [];
  for (const p of photos) {
    const moved = await migratePhoto(p, 'weddings', ownerId);
    if (moved) out.push(moved);
  }
  return out;
}

function stamp(by: Editor) {
  return { lastEditedBy: by.name, lastEditedUid: by.uid, lastEditedAt: new Date().toISOString() };
}

function isEmptyValue(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    v === '' ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0)
  );
}

/**
 * The fields of `next` that differ from `base`, ready for a merge write:
 * changed fields carry their new value, cleared fields carry deleteField().
 * Fields the editor never touched are absent, so concurrent edits to
 * other fields survive. `keepEmpty` names fields whose empty object is
 * itself meaningful (an undated `death`).
 */
function patchAgainst(
  base: Record<string, unknown>,
  next: Record<string, unknown>,
  keepEmpty: Set<string> = new Set(),
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(base), ...Object.keys(next)])) {
    const b = prune(base[key]);
    const n = prune(next[key]);
    if (JSON.stringify(b ?? null) === JSON.stringify(n ?? null)) continue;
    if (isEmptyValue(n)) {
      patch[key] = keepEmpty.has(key) && next[key] !== undefined ? {} : deleteField();
    } else {
      patch[key] = n;
    }
  }
  return patch;
}

/** Remove a person from every union that references them. */
async function detachPerson(personId: PersonId): Promise<void> {
  const unions = await getDocs(collection(db, 'unions'));
  const jobs: Promise<unknown>[] = [];
  unions.forEach((d) => {
    const u = d.data() as Union;
    if (u.children?.includes(personId)) {
      jobs.push(updateDoc(doc(db, 'unions', d.id), { children: arrayRemove(personId) }));
    }
    if ((u.partners as PersonId[]).includes(personId)) {
      // A union cannot survive losing a partner — remove the union too.
      jobs.push(deleteDoc(doc(db, 'unions', d.id)));
    }
  });
  await Promise.all(jobs);
}

/** Apply a change to canonical data. Admin-only by security rules. */
export async function applyChange(change: Change, by: Editor): Promise<void> {
  const audit = stamp(by);
  switch (change.kind) {
    case 'person.save': {
      const person = { ...change.person };
      person.portrait = await migratePhoto(person.portrait, 'portraits', person.id);
      person.portraitThen = await migratePhoto(person.portraitThen, 'portraits', person.id);
      if (!change.base) {
        await savePerson({ ...person, ...audit } as Person);
        return;
      }
      const patch = patchAgainst(
        change.base as unknown as Record<string, unknown>,
        person as unknown as Record<string, unknown>,
        new Set(['death']),
      );
      // mergeFields (not merge:true) so a changed map — name, portrait,
      // birth — is replaced whole; a deep merge would keep cleared keys.
      const data = { ...patch, ...audit };
      await setDoc(doc(db, 'people', person.id), data, { mergeFields: Object.keys(data) });
      return;
    }
    case 'union.save': {
      const union = { ...change.union };
      union.photos = await migrateAlbum(union.photos, union.id);
      if (!change.base) {
        await saveUnion({ ...union, ...audit } as Union);
        return;
      }
      const patch = patchAgainst(
        change.base as unknown as Record<string, unknown>,
        union as unknown as Record<string, unknown>,
      );
      const data = { ...patch, ...audit };
      await setDoc(doc(db, 'unions', union.id), data, { mergeFields: Object.keys(data) });
      return;
    }
    case 'union.addChild': {
      const person = { ...change.person, ...audit };
      person.portrait = await migratePhoto(person.portrait, 'portraits', person.id);
      await savePerson(person as Person);
      await updateDoc(doc(db, 'unions', change.unionId), {
        children: arrayUnion(person.id),
        ...audit,
      });
      return;
    }
    case 'family.start': {
      const spouse = { ...change.spouse, ...audit };
      spouse.portrait = await migratePhoto(spouse.portrait, 'portraits', spouse.id);
      await savePerson(spouse as Person);
      const union = { ...change.union, ...audit };
      union.photos = await migrateAlbum(union.photos, union.id);
      await saveUnion(union as Union);
      return;
    }
    case 'family.link': {
      // Spouse already exists in the tree — no new person is created.
      await saveUnion({ ...change.union, ...audit } as Union);
      return;
    }
    case 'person.delete': {
      await detachPerson(change.personId);
      await deleteDoc(doc(db, 'people', change.personId));
      return;
    }
    case 'union.delete': {
      await deleteDoc(doc(db, 'unions', change.unionId));
      return;
    }
    case 'identity.claim': {
      // Links the requesting account to a person record.
      throw new Error('Identity claims are approved from the Admin page');
    }
  }
}

export type SubmitOutcome = 'applied' | 'suggested';

export function useChangeSubmit() {
  const { state } = useAuth();
  const role = state.phase === 'approved' ? state.membership.role : ('member' as const);
  const uid = state.phase === 'approved' ? state.user.uid : '';
  const authorName =
    state.phase === 'approved'
      ? state.membership.displayName || state.membership.email
      : '';
  const authorEmail = state.phase === 'approved' ? state.membership.email : '';
  const editor: Editor = { uid, name: authorName };

  const suggest = useCallback(
    async (change: Change, targetLabel: string): Promise<SubmitOutcome> => {
      await addDoc(collection(db, 'suggestions'), {
        v: 2,
        change,
        targetId: targetIdOf(change),
        targetLabel,
        authorUid: uid,
        authorName,
        authorEmail,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      return 'suggested';
    },
    [uid, authorName, authorEmail],
  );

  const submit = useCallback(
    async (change: Change, targetLabel: string): Promise<SubmitOutcome> => {
      if (role === 'admin' && change.kind !== 'identity.claim') {
        await applyChange(change, editor);
        return 'applied';
      }
      return suggest(change, targetLabel);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, suggest, uid, authorName],
  );

  const uploadPhoto = useCallback(
    async (
      kind: 'portraits' | 'weddings',
      ownerId: string,
      file: File,
      onProgress?: (fraction: number) => void,
    ): Promise<string> => {
      checkPhotoFile(file);
      const ext = fileExtension(file.name) || 'jpg';
      const stamp = `${Date.now()}-${Math.floor(file.size % 9973)}`;
      const path =
        role === 'admin'
          ? `photos/${kind}/${ownerId}-${stamp}.${ext}`
          : `suggestions/${uid}/${kind}-${ownerId}-${stamp}.${ext}`;
      await uploadImage(path, file, { contentType: guessContentType(file), onProgress });
      return path;
    },
    [role, uid],
  );

  return { role, editor, submit, suggest, uploadPhoto };
}
