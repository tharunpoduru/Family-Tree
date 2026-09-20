/**
 * Raw SDK text must never reach a family member's screen. It names our
 * collections, our function calls and our document ids, and it tells the
 * reader nothing they can do about it.
 */
import { describe, it, expect } from 'vitest';
import { UploadError, UserError, friendlyError } from '../src/lib/errors';

const FALLBACK = 'Could not save — try again.';

/** Shaped like the errors the Firebase SDKs actually throw. */
function sdkError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

describe('friendlyError', () => {
  it('replaces the exact Firestore message from the reported bug', () => {
    const raw =
      'Function addDoc() called with invalid data. Unsupported field value: undefined ' +
      '(found in field change.person.death in document suggestions/IMZT5Ew9nznuXtvWTVj4)';
    const out = friendlyError(sdkError('invalid-argument', raw), FALLBACK);
    expect(out).not.toContain('addDoc');
    expect(out).not.toContain('suggestions/');
    expect(out).not.toContain('undefined');
  });

  it('never leaks SDK text for any code, known or not', () => {
    const raw = 'Firebase: Error (auth/popup-closed-by-user).';
    for (const code of ['auth/popup-closed-by-user', 'permission-denied', 'wat/unheard-of']) {
      expect(friendlyError(sdkError(code, raw), FALLBACK)).not.toContain('Firebase:');
    }
  });

  it('names the cause when it knows it', () => {
    expect(friendlyError(sdkError('permission-denied', 'x'), FALLBACK)).toMatch(/not allowed/i);
    expect(friendlyError(sdkError('auth/popup-blocked', 'x'), FALLBACK)).toMatch(/pop-ups/i);
  });

  it('falls back when it does not', () => {
    expect(friendlyError(sdkError('wat/unheard-of', 'x'), FALLBACK)).toBe(FALLBACK);
    expect(friendlyError(new Error('boom'), FALLBACK)).toBe(FALLBACK);
    expect(friendlyError('a string', FALLBACK)).toBe(FALLBACK);
    expect(friendlyError(null, FALLBACK)).toBe(FALLBACK);
  });

  it('passes through messages we wrote for the reader', () => {
    expect(friendlyError(new UserError('A name is needed'), FALLBACK)).toBe('A name is needed');
    const up = new UploadError('too-large', 'That photo is 120 MB. The limit is 100 MB.', {
      path: '',
      size: 1,
      type: 'image/jpeg',
    });
    expect(friendlyError(up, FALLBACK)).toMatch(/120 MB/);
  });

  it('treats an UploadError as a UserError, so diagnostics still tags it', () => {
    const up = new UploadError('stalled', 'The upload stalled.', { path: '', size: 1, type: '' });
    expect(up).toBeInstanceOf(UserError);
    expect(up).toBeInstanceOf(Error);
    expect(up.code).toBe('stalled');
  });
});
