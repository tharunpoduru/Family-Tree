/**
 * Client-side error log. Firebase keeps no request logs for Storage or
 * Firestore, so when a family member's phone fails to save, this is the
 * only record of what happened. One document per failure, readable by
 * admins in the Firebase console under `clientErrors`.
 *
 * Reporting must never get in the user's way: it is fire-and-forget and
 * swallows its own errors. Firestore is imported lazily for the same
 * reason `auth.tsx` does it — the doorstep reports auth failures too, and
 * must not drag the database SDK onto first paint (PRD R7).
 */
import { auth } from './firebase';
import { UploadError } from './errors';

export type ErrorStage = 'upload' | 'save' | 'suggest' | 'apply' | 'auth' | 'load';

export function reportClientError(
  stage: ErrorStage,
  err: unknown,
  extra: Record<string, unknown> = {},
): void {
  // The console first, always. Members' failures also reach Firestore
  // below, but the doorstep's cannot — `clientErrors` requires membership,
  // and someone who can't sign in is not yet a member. Now that the reader
  // never sees raw SDK text, this is the only place it survives for them.
  try {
    console.error(`[${stage}]`, err);
  } catch {
    // Reporting never fails the user.
  }
  void (async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const [{ addDoc, collection, serverTimestamp }, { db }, { prune }] =
        await Promise.all([
          import('firebase/firestore'),
          import('./firebase-data'),
          import('./edits'),
        ]);
      const e = err as { code?: string; message?: string; name?: string };
      const nav = navigator as Navigator & {
        connection?: { effectiveType?: string; downlink?: number };
      };
      const record = prune({
        stage,
        uid: user.uid,
        email: user.email ?? undefined,
        code: e?.code ?? e?.name ?? 'unknown',
        message: e?.message ?? String(err),
        ...(err instanceof UploadError ? err.details : {}),
        ...extra,
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        network: nav.connection?.effectiveType,
        page: location.pathname,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'clientErrors'), record);
    } catch {
      // Diagnostics never fail the user.
    }
  })();
}
