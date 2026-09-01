/**
 * Suggestions (PRD R9): a member's note + optional photo about a person
 * or family. Deliberately freeform — families talk in stories, not field
 * diffs. Admins read, call the person, and apply by hand.
 */
import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase-data';

export interface Suggestion {
  authorUid: string;
  authorName: string;
  authorEmail: string;
  /** What the suggestion is about. */
  target: { kind: 'person' | 'union'; id: string; label: string };
  note: string;
  /** Storage path of an attached photo, if any. */
  photoPath?: string;
  status: 'pending' | 'applied' | 'declined';
}

export async function submitSuggestion(input: {
  authorUid: string;
  authorName: string;
  authorEmail: string;
  target: Suggestion['target'];
  note: string;
  photo?: File;
}): Promise<void> {
  let photoPath: string | undefined;
  if (input.photo) {
    photoPath = `suggestions/${input.authorUid}/${Date.now()}-${input.photo.name}`;
    await uploadBytes(ref(storage, photoPath), input.photo);
  }
  await addDoc(collection(db, 'suggestions'), {
    authorUid: input.authorUid,
    authorName: input.authorName,
    authorEmail: input.authorEmail,
    target: input.target,
    note: input.note,
    ...(photoPath ? { photoPath } : {}),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function setSuggestionStatus(
  id: string,
  status: 'applied' | 'declined',
): Promise<void> {
  await updateDoc(doc(db, 'suggestions', id), {
    status,
    decidedAt: serverTimestamp(),
  });
}
