/**
 * "Know something about them?" — the member-facing suggestion sheet.
 * One textarea, one optional photo, one send. The admin gets attribution
 * and (by design) probably makes a phone call.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../lib/auth';
import { submitSuggestion, type Suggestion } from '../lib/suggestions';

export function SuggestSheet({
  target,
  onClose,
}: {
  target: Suggestion['target'] | null;
  onClose: () => void;
}) {
  const { state } = useAuth();
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (state.phase !== 'approved' || !target || !note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await submitSuggestion({
        authorUid: state.user.uid,
        authorName: state.membership.displayName || state.membership.email,
        authorEmail: state.membership.email,
        target,
        note: note.trim(),
        photo: photo ?? undefined,
      });
      setDone(true);
      setNote('');
      setPhoto(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send — try again.');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setDone(false);
    setError(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-50 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            aria-hidden
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Share something about ${target.label}`}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl rounded-t-3xl bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-float"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" aria-hidden />
            {done ? (
              <div className="text-center">
                <p className="m-0 text-lg font-semibold">Sent to the family admins 🪔</p>
                <p className="m-0 mt-2 text-[15px] text-ink-soft">
                  Someone will look at it soon — and might call you to hear more.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-6 min-h-11 rounded-full bg-nili px-6 font-medium text-[#fffdf8]"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h2 className="m-0 text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                  About {target.label}
                </h2>
                <p className="m-0 mt-1 text-[15px] text-ink-soft">
                  A correction, a story, a date, a photo — whatever you know.
                  An admin reviews it before anything changes.
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="Write it the way you'd tell it…"
                  aria-label="Your note"
                  className="mt-4 w-full resize-none rounded-2xl border border-line bg-paper p-4 text-base outline-none focus:border-pasupu"
                />
                <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-ink-soft">
                  <span className="rounded-full border border-line bg-card px-4 py-2 font-medium shadow-card">
                    {photo ? 'Change photo' : 'Attach a photo'}
                  </span>
                  {photo && <span className="truncate">{photo.name}</span>}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                  />
                </label>
                {error && (
                  <p role="alert" className="m-0 mt-3 text-sm text-nili">{error}</p>
                )}
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    disabled={busy || !note.trim()}
                    onClick={send}
                    className="min-h-11 flex-1 rounded-full bg-nili px-6 font-medium text-[#fffdf8] disabled:opacity-50"
                  >
                    {busy ? 'Sending…' : 'Send to admins'}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="min-h-11 rounded-full border border-line bg-card px-6 font-medium text-ink-soft"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
