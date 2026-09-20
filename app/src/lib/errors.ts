/**
 * One place that turns a thrown thing into a sentence a family member can
 * act on.
 *
 * Raw SDK text — "Function addDoc() called with invalid data…",
 * "Firebase: Error (auth/popup-closed-by-user)." — must never reach a
 * person. It names our collections, our function calls and our document
 * ids, and it tells the reader nothing they can do. The raw text is still
 * kept: `reportClientError` writes it to `clientErrors`, where an admin
 * can read it. The screen gets this instead.
 */

/**
 * An error whose message was written FOR the reader — validation ("A name
 * is needed"), or a condition we already phrased kindly. These pass
 * through `friendlyError` untouched. Anything else is assumed to be
 * machine text and is replaced.
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserError';
  }
}

export interface UploadDetails {
  path: string;
  size: number;
  type: string;
  name?: string;
  /** Bytes that had made it before the upload gave up. */
  transferred?: number;
}

/**
 * A photo upload that failed, already phrased for the reader. It lives
 * here rather than in `upload.ts` so that `diagnostics.ts` can recognise
 * one without importing the Storage SDK — the doorstep reports errors
 * too, and must not pull the data layer onto first paint (PRD R7).
 */
export class UploadError extends UserError {
  code: string;
  details: UploadDetails;
  constructor(code: string, message: string, details: UploadDetails) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.details = details;
  }
}

/** Firestore `code` values a member can actually hit. */
const FIRESTORE: Record<string, string> = {
  'permission-denied':
    'You are not allowed to make this change. If you were recently approved, sign out and back in.',
  unauthenticated: 'Your sign-in has expired. Sign out and back in, then try again.',
  unavailable: 'Could not reach the family records. Check your connection and try again.',
  'deadline-exceeded': 'That took too long. Check your connection and try again.',
  cancelled: 'That was cancelled before it finished. Please try again.',
  aborted: 'Someone else changed this at the same moment. Reopen it and try again.',
  'already-exists': 'That record already exists.',
  'not-found': 'That record is no longer there — someone may have removed it.',
  'failed-precondition': 'That change no longer fits the record. Reopen it and try again.',
  'resource-exhausted': 'The family space has hit a limit. Please tell an admin.',
  'invalid-argument': 'Something in that form could not be saved. Please tell an admin.',
  internal: 'Something went wrong on our side. Please try again.',
  unknown: 'Something went wrong. Please try again.',
};

/** Firebase Auth codes reachable from the doorstep. */
const AUTH: Record<string, string> = {
  'auth/popup-closed-by-user': 'The sign-in window closed before it finished. Try again.',
  'auth/cancelled-popup-request': 'The sign-in window closed before it finished. Try again.',
  'auth/popup-blocked':
    'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
  'auth/network-request-failed':
    'Could not reach Google to sign you in. Check your connection and try again.',
  'auth/invalid-email': 'That does not look like an email address.',
  'auth/missing-email': 'Please type your email address first.',
  'auth/too-many-requests': 'Too many tries. Please wait a few minutes and try again.',
  'auth/user-disabled': 'That account has been turned off. Please tell an admin.',
  'auth/unauthorized-domain': 'Sign-in is not allowed from this address. Please tell an admin.',
  'auth/operation-not-allowed': 'That way of signing in is turned off. Please tell an admin.',
  'auth/invalid-action-code': 'That sign-in link has already been used. Ask for a new one.',
  'auth/expired-action-code': 'That sign-in link has expired. Ask for a new one.',
  'auth/invalid-credential': 'That sign-in did not work. Please try again.',
};

function codeOf(err: unknown): string | undefined {
  const c = (err as { code?: unknown } | null)?.code;
  return typeof c === 'string' ? c : undefined;
}

/**
 * A sentence for the screen. `fallback` is what to say when we cannot
 * name the cause — phrase it for the action the reader just took
 * ("Could not save — try again.").
 */
export function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof UserError) return err.message;
  const code = codeOf(err);
  if (code) {
    const known = AUTH[code] ?? FIRESTORE[code];
    if (known) return known;
  }
  // An offline phone produces a dozen different codes; the advice is one.
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    return 'You appear to be offline. Check your connection and try again.';
  return fallback;
}
