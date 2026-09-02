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
// The SDK's defaults are 10 minutes for uploads and 2 for everything else,
// which on a bad connection just looks like a hang. Fail fast and say so.
storage.maxUploadRetryTime = 60_000;
storage.maxOperationRetryTime = 30_000;
