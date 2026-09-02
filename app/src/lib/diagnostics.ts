/**
 * Client-side error log. Firebase keeps no request logs for Storage or
 * Firestore, so when a family member's phone fails to save, this is the
 * only record of what happened. One document per failure, readable by
 * admins in the Firebase console under `clientErrors`.
 *
 * Reporting must never get in the user's way: it is fire-and-forget and
 * swallows its own errors.
 */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth } from './firebase';
import { db } from './firebase-data';
import { prune } from './edits';
import { UploadError } from './upload';

export type ErrorStage = 'upload' | 'save' | 'suggest';

export function reportClientError(
  stage: ErrorStage,
  err: unknown,
  extra: Record<string, unknown> = {},
): void {
  try {
    const user = auth.currentUser;
    if (!user) return;
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
    void addDoc(collection(db, 'clientErrors'), record).catch(() => {});
  } catch {
    // Diagnostics never fail the user.
  }
}
