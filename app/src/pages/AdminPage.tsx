/**
 * Admin console: membership, identity claims, and every suggested change.
 * Each suggestion offers three verbs — approve, edit first (opens it
 * pre-filled on the record's own page), decline.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase-data';
import { useAuth, type Membership } from '../lib/auth';
import { setSuggestionStatus } from '../lib/suggestions';
import { applyChange } from '../lib/changes';
import { usePending, type PendingRow } from '../lib/pending';
import { useReadyData } from '../lib/data';
import { describeChange } from '../components/ReviewSheet';
import { usePhotoUrl } from '../lib/photos';

interface Row extends Membership {
  uid: string;
}

export function AdminPage() {
  const { state } = useAuth();
  const data = useReadyData();
  const { all } = usePending();
  const [rows, setRows] = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const me = state.phase === 'approved' ? state.user.uid : undefined;
  const editor = {
    uid: me ?? '',
    name:
      state.phase === 'approved'
        ? state.membership.displayName || state.membership.email
        : '',
  };

  useEffect(
    () =>
      onSnapshot(collection(db, 'users'), (snap) => {
        const next: Row[] = [];
        snap.forEach((d) => next.push({ uid: d.id, ...(d.data() as Membership) }));
        next.sort(
          (a, b) =>
            (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) ||
            a.email.localeCompare(b.email),
        );
        setRows(next);
      }),
    [],
  );

  async function setStatus(uid: string, status: Membership['status']) {
    await updateDoc(doc(db, 'users', uid), { status, decidedAt: serverTimestamp() });
  }
  async function setRole(uid: string, role: Membership['role']) {
    await updateDoc(doc(db, 'users', uid), { role });
  }

  async function approve(row: PendingRow) {
    if (!row.change) return;
    setBusyId(row.id);
    setError(null);
    try {
      if (row.change.kind === 'identity.claim') {
        await updateDoc(doc(db, 'users', row.authorUid), {
          personId: row.change.personId,
        });
      } else {
        await applyChange(row.change, editor);
      }
      await setSuggestionStatus(row.id, 'applied');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not apply');
    } finally {
      setBusyId(null);
    }
  }

  const pendingMembers = rows.filter((r) => r.status === 'pending');
  const others = rows.filter((r) => r.status !== 'pending');
  const claims = all.filter((s) => s.change?.kind === 'identity.claim');
  const changes = all.filter((s) => s.change && s.change.kind !== 'identity.claim');
  const notes = all.filter((s) => !s.change);

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-3xl px-4 pb-28 pt-6"
    >
      <h1 className="m-0 text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        Family admins
      </h1>
      <p className="m-0 mt-1 mb-8 text-ink-faint">
        Approve requests, review changes, keep the record true.
      </p>

      {error && (
        <p role="alert" className="mb-4 text-sm text-nili">
          {error}
        </p>
      )}

      <Section title="Waiting to join" count={pendingMembers.length}>
        {pendingMembers.length === 0 ? (
          <Empty>No one is waiting. 🪔</Empty>
        ) : (
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {pendingMembers.map((r) => (
              <li
                key={r.uid}
                className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-medium">{r.displayName || r.email}</p>
                  <p className="m-0 text-sm text-ink-faint">{r.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus(r.uid, 'approved')}
                  className="min-h-11 rounded-full bg-leaf px-5 font-medium text-[#fffdf8]"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(r.uid, 'revoked')}
                  className="min-h-11 rounded-full border border-line bg-card px-5 font-medium text-ink-soft"
                >
                  Decline
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="“This is me” claims" count={claims.length}>
        {claims.length === 0 ? (
          <Empty>No identity claims waiting.</Empty>
        ) : (
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {claims.map((s) => (
              <li key={s.id} className="rounded-[var(--radius-card)] bg-card p-4 shadow-card">
                <p className="m-0 text-[15px]">
                  <strong>{s.authorName}</strong> says they are{' '}
                  <strong>{s.targetLabel}</strong>
                </p>
                <p className="m-0 mt-1 text-sm text-ink-faint">{s.authorEmail}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => approve(s)}
                    className="min-h-11 rounded-full bg-leaf px-5 text-sm font-medium text-[#fffdf8] disabled:opacity-50"
                  >
                    {busyId === s.id ? 'Linking…' : 'Yes, link them'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuggestionStatus(s.id, 'declined')}
                    className="min-h-11 rounded-full border border-line bg-card px-5 text-sm font-medium text-nili"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Suggested changes" count={changes.length}>
        {changes.length === 0 ? (
          <Empty>
            Nothing waiting. Changes suggested by the family appear here — and
            with a “!” on the record itself.
          </Empty>
        ) : (
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {changes.map((s) => (
              <li key={s.id} className="rounded-[var(--radius-card)] bg-card p-4 shadow-card">
                <p className="m-0 text-sm text-ink-faint">
                  <strong className="text-ink-soft">{s.authorName}</strong> · about{' '}
                  <strong className="text-ink-soft">{s.targetLabel}</strong>
                </p>
                <ul className="m-0 mt-2 list-none space-y-1 p-0">
                  {s.change &&
                    describeChange(data, s.change).map((line) => (
                      <li key={line} className="break-words text-[14px] leading-relaxed">
                        {line}
                      </li>
                    ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => approve(s)}
                    className="min-h-11 rounded-full bg-leaf px-5 text-sm font-medium text-[#fffdf8] disabled:opacity-50"
                  >
                    {busyId === s.id ? 'Applying…' : 'Approve'}
                  </button>
                  <RecordLink row={s} />
                  <button
                    type="button"
                    onClick={() => setSuggestionStatus(s.id, 'declined')}
                    className="min-h-11 rounded-full border border-line bg-card px-5 text-sm font-medium text-nili"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Memories shared" count={notes.length}>
        {notes.length === 0 ? (
          <Empty>No stories waiting.</Empty>
        ) : (
          <ul className="m-0 grid list-none gap-2.5 p-0">
            {notes.map((s) => (
              <li key={s.id} className="rounded-[var(--radius-card)] bg-card p-4 shadow-card">
                <p className="m-0 text-sm text-ink-faint">
                  <strong className="text-ink-soft">{s.authorName}</strong> · about{' '}
                  <strong className="text-ink-soft">{s.targetLabel}</strong>
                </p>
                <p className="m-0 mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
                  {s.note}
                </p>
                {s.photoPath && <NotePhoto path={s.photoPath} />}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSuggestionStatus(s.id, 'applied')}
                    className="min-h-11 rounded-full bg-leaf px-5 text-sm font-medium text-[#fffdf8]"
                  >
                    Mark handled
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuggestionStatus(s.id, 'declined')}
                    className="min-h-11 rounded-full border border-line bg-card px-5 text-sm font-medium text-ink-soft"
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Everyone with access">
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {others.map((r) => (
            <li
              key={r.uid}
              className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <p className="m-0 font-medium">
                  {r.displayName || r.email}
                  {r.role === 'admin' && (
                    <span className="ml-2 rounded-full bg-pasupu-soft px-2.5 py-0.5 text-xs font-semibold text-nili-deep">
                      admin
                    </span>
                  )}
                  {r.status === 'revoked' && (
                    <span className="ml-2 rounded-full bg-line px-2.5 py-0.5 text-xs font-semibold text-ink-faint">
                      paused
                    </span>
                  )}
                </p>
                <p className="m-0 text-sm text-ink-faint">
                  {r.email}
                  {r.personId && data.people[r.personId] && (
                    <> · is {data.people[r.personId].name.en}</>
                  )}
                </p>
              </div>
              {r.uid !== me && r.status === 'approved' && (
                <>
                  <button
                    type="button"
                    onClick={() => setRole(r.uid, r.role === 'admin' ? 'member' : 'admin')}
                    className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-medium text-ink-soft"
                  >
                    {r.role === 'admin' ? 'Make member' : 'Make admin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(r.uid, 'revoked')}
                    className="min-h-11 rounded-full border border-line bg-card px-4 text-sm font-medium text-nili"
                  >
                    Pause access
                  </button>
                </>
              )}
              {r.uid !== me && r.status === 'revoked' && (
                <button
                  type="button"
                  onClick={() => setStatus(r.uid, 'approved')}
                  className="min-h-11 rounded-full bg-leaf px-4 text-sm font-medium text-[#fffdf8]"
                >
                  Restore
                </button>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </motion.main>
  );
}

/**
 * Opens the exact record the change belongs to, with its editor already
 * up — the suggestion is waiting on the very field it touches.
 */
function RecordLink({ row }: { row: PendingRow }) {
  const data = useReadyData();
  const kind = row.change?.kind;
  let to: string | null = null;

  if (row.targetId && data.unions[row.targetId]) {
    // union.save opens the marriage editor; addChild just opens the page.
    to = kind === 'union.save' ? `/f/${row.targetId}?edit=union` : `/f/${row.targetId}`;
  } else if (row.targetId && data.people[row.targetId]) {
    to = kind === 'person.save' ? `/p/${row.targetId}?edit=1` : `/p/${row.targetId}`;
  }
  if (!to) return null;

  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-5 text-sm font-medium text-ink-soft no-underline"
    >
      Open where it lives →
    </Link>
  );
}

function NotePhoto({ path }: { path: string }) {
  const url = usePhotoUrl(path, 400);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-3 block">
      <img src={url} alt="Shared" loading="lazy" className="max-h-48 rounded-xl object-cover" />
    </a>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="mb-9">
      <h2 className="m-0 mb-3 text-lg font-semibold">
        {title}
        {count !== undefined && count > 0 && (
          <span className="ml-2 text-nili">({count})</span>
        )}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-[15px] leading-relaxed text-ink-faint">{children}</p>;
}
