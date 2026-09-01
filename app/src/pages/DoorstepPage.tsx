/**
 * The doorstep (PRD R5): everything a visitor sees before approval.
 * Warm, unintimidating, one decision at a time — designed for the least
 * technical elder in the family.
 */
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { familyConfig, pack } from '../family.config';

export function DoorstepPage() {
  const { state, signInGoogle, sendMagicLink, requestAccess, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-md flex-col items-center justify-center px-6 pb-16 text-center">
      {/* No entrance animation here: the doorstep is first paint (LCP). */}
      <div className="w-full">
        <p className="m-0 text-[13px] font-medium uppercase tracking-[0.25em] text-nili">
          {familyConfig.tagline}
        </p>
        <h1
          className="m-0 mt-2 text-5xl font-semibold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {familyConfig.name.en}
        </h1>
        {familyConfig.name.native && (
          <p lang={pack.langTag} className="m-0 mt-2 text-2xl text-ink-soft">
            {familyConfig.name.native}
          </p>
        )}

        {state.phase === 'signedOut' && (
          <div className="mt-10 space-y-4">
            <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
              This is a private family space. Sign in and ask to be let in —
              a family admin will open the door.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(signInGoogle)}
              className="w-full rounded-full bg-nili px-6 py-3.5 text-[17px] font-medium text-[#fffdf8] shadow-float transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              Continue with Google
            </button>
            <div className="flex items-center gap-3 text-ink-faint">
              <span className="h-px flex-1 bg-line" />
              <span className="text-sm">or use email</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            {linkSent ? (
              <p className="m-0 rounded-2xl bg-pasupu-soft p-4 text-[15px] text-nili-deep">
                A sign-in link is on its way to <strong>{email}</strong>.
                Open it on this device.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email) run(async () => { await sendMagicLink(email); setLinkSent(true); });
                }}
                className="space-y-3"
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  className="w-full rounded-full border border-line bg-card px-5 py-3.5 text-center text-base outline-none focus:border-pasupu"
                />
                <button
                  type="submit"
                  disabled={busy || !email}
                  className="w-full rounded-full border border-line bg-card px-6 py-3.5 text-[17px] font-medium text-ink-soft shadow-card transition-transform active:scale-[0.98] disabled:opacity-60"
                >
                  Email me a sign-in link
                </button>
              </form>
            )}
          </div>
        )}

        {state.phase === 'noRequest' && (
          <div className="mt-10 space-y-4">
            <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
              Namaste{state.user.displayName ? `, ${state.user.displayName}` : ''}.
              One more step — ask to join, and a family admin will approve you.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(requestAccess)}
              className="w-full rounded-full bg-nili px-6 py-3.5 text-[17px] font-medium text-[#fffdf8] shadow-float transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              Request to join the family
            </button>
            <SignOutLink onClick={() => run(signOut)} />
          </div>
        )}

        {state.phase === 'pending' && (
          <div className="mt-10 space-y-4">
            <p className="m-0 rounded-2xl bg-pasupu-soft p-5 text-[15px] leading-relaxed text-nili-deep">
              Your request is with the family admins. 🪔
              <br />
              You&rsquo;ll be let in as soon as someone approves — check back
              soon, or give them a friendly call.
            </p>
            <SignOutLink onClick={() => run(signOut)} />
          </div>
        )}

        {state.phase === 'revoked' && (
          <div className="mt-10 space-y-4">
            <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
              Your access is currently paused. Please reach out to a family
              admin if you think this is a mistake.
            </p>
            <SignOutLink onClick={() => run(signOut)} />
          </div>
        )}

        {error && (
          <p role="alert" className="m-0 mt-4 text-sm text-nili">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

function SignOutLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto block text-sm text-ink-faint underline-offset-4 hover:underline"
    >
      Sign out
    </button>
  );
}
