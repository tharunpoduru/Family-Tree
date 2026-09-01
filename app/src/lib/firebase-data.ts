/**
 * Firestore and Storage handles, deliberately in their own module.
 *
 * A visitor who is signed out never needs either one — they only need to
 * be told "sign in". Keeping these imports out of `firebase.ts` lets the
 * bundler put the whole data layer in a chunk that loads *after* the
 * doorstep has painted, instead of blocking it (PRD R7).
 */
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { app } from './firebase';

export const db = getFirestore(app);
export const storage = getStorage(app);
