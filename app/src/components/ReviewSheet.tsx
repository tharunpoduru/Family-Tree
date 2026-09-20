/**
 * Review the suggestions attached to one record. Admins get three verbs
 * per suggestion — approve, edit (opens the change pre-filled so it can
 * be corrected before it lands), decline. Members see their own status.
 */
import { useState } from 'react';
import { useReadyData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { applyChange, type Change } from '../lib/changes';
import { setSuggestionStatus } from '../lib/suggestions';
import { friendlyError } from '../lib/errors';
import { reportClientError } from '../lib/diagnostics';
import type { PendingRow } from '../lib/pending';
import type { FamilyData } from '../types/family';
import { personFieldChanges, unionFieldChanges } from '../lib/diff';
import { Sheet } from './Sheet';
import { SheetTitle } from './edit/Fields';
import { usePhotoUrl } from '../lib/photos';

/** Plain-language summary of what a change would do — never JSON. */
export function describeChange(data: FamilyData, change: Change): string[] {
  const nameOf = (id: string) => data.people[id]?.name.en ?? id;
  switch (change.kind) {
    case 'person.save': {
      const before = data.people[change.person.id];
      if (!before) return [`Add ${change.person.name.en}`];
      const changes = personFieldChanges(before, change.person);
      if (!changes.length) return ['No field changes'];
      return changes.map((c) => `${c.label}: ${c.before} → ${c.after}`);
    }
    case 'union.save': {
      const changes = unionFieldChanges(
        data.unions[change.union.id],
        change.union,
        nameOf,
      );
      if (!changes.length) return ['No field changes'];
      return changes.map((c) => `${c.label}: ${c.before} → ${c.after}`);
    }
    case 'union.addChild': {
      const u = data.unions[change.unionId];
      const parents = u ? (u.partners as string[]).map(nameOf).join(' & ') : change.unionId;
      return [`Add ${change.person.name.en} as a child of ${parents}`];
    }
    case 'family.start':
      return [
        `${nameOf((change.union.partners as string[])[0])} marries ${change.spouse.name.en} — creates a new family page`,
      ];
    case 'family.link': {
      const [a, b] = change.union.partners as string[];
      return [`${nameOf(a)} marries ${nameOf(b)} — both already in the tree`];
    }
    case 'person.delete':
      return [`Delete ${change.name} from the family`];
    case 'union.delete':
      return [`Delete the family page of ${change.label}`];
    case 'identity.claim':
      return [`Link this account to ${change.name}`];
  }
}

function SuggestedPhoto({ path }: { path: string }) {
  const url = usePhotoUrl(path, 400);
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Suggested"
      loading="lazy"
      className="mt-3 max-h-44 rounded-xl object-cover"
    />
  );
}

export function ReviewSheet({
  open,
  rows,
  label,
  onClose,
  onEditChange,
}: {
  open: boolean;
  rows: PendingRow[];
  label: string;
  onClose: () => void;
  /** Admin chose "Edit" — hand the change back to the page to open pre-filled. */
  onEditChange?: (row: PendingRow) => void;
}) {
  const data = useReadyData();
  const { state } = useAuth();
  const isAdmin = state.phase === 'approved' && state.membership.role === 'admin';
  const editor = {
    uid: state.phase === 'approved' ? state.user.uid : '',
    name:
      state.phase === 'approved'
        ? state.membership.displayName || state.membership.email
        : '',
  };
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve(row: PendingRow) {
    if (!row.change) return;
    setBusyId(row.id);
    setError(null);
    try {
      if (row.change.kind === 'identity.claim') {
        setError('Approve identity claims from the Admin page.');
      } else {
        await applyChange(row.change, editor);
        await setSuggestionStatus(row.id, 'applied');
      }
    } catch (e) {
      setError(friendlyError(e, 'Could not apply that change — try again.'));
      reportClientError('apply', e, { suggestionId: row.id });
    } finally {
      setBusyId(null);
    }
  }

  async function decline(row: PendingRow) {
    setBusyId(row.id);
    try {
      await setSuggestionStatus(row.id, 'declined');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Sheet open={open} label={`Suggestions for ${label}`} onClose={onClose}>
      <div className="space-y-5">
        <div>
          <SheetTitle>Suggested changes</SheetTitle>
          <p className="m-0 text-[15px] text-ink-soft">
            {rows.length} waiting for {label}
          </p>
        </div>
        <ul className="m-0 grid list-none gap-3 p-0">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-line bg-paper p-4">
              <p className="m-0 text-sm text-ink-faint">
                from <strong className="text-ink-soft">{row.authorName}</strong>
              </p>
              {row.change ? (
                <ul className="m-0 mt-2 list-none space-y-1 p-0">
                  {describeChange(data, row.change).map((line) => (
                    <li key={line} className="break-words text-[14px] leading-relaxed text-ink">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
                  {row.note}
                </p>
              )}
              {row.photoPath && <SuggestedPhoto path={row.photoPath} />}
              {isAdmin && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.id || !row.change}
                    onClick={() => approve(row)}
                    className="min-h-11 rounded-full bg-leaf px-5 text-sm font-medium text-[#fffdf8] disabled:opacity-50"
                  >
                    {busyId === row.id ? 'Applying…' : 'Approve'}
                  </button>
                  {row.change && onEditChange && (
                    <button
                      type="button"
                      onClick={() => onEditChange(row)}
                      className="min-h-11 rounded-full border border-line bg-card px-5 text-sm font-medium text-ink-soft"
                    >
                      Edit first
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => decline(row)}
                    className="min-h-11 rounded-full border border-line bg-card px-5 text-sm font-medium text-nili"
                  >
                    Decline
                  </button>
                </div>
              )}
              {!isAdmin && (
                <p className="m-0 mt-3 text-[13px] text-ink-faint">
                  Waiting for a family admin to review.
                </p>
              )}
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="m-0 text-sm text-nili">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}

/** The inline "!" — appears wherever a record has pending suggestions. */
export function PendingBadge({
  count,
  onClick,
  className = '',
}: {
  count: number;
  onClick: () => void;
  className?: string;
}) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-label={`${count} suggested change${count > 1 ? 's' : ''} — review`}
      className={`inline-flex min-h-8 items-center gap-1 rounded-full bg-pasupu px-2.5 text-[13px] font-bold text-[#2b2118] shadow-card ${className}`}
    >
      <span aria-hidden>!</span>
      {count > 1 && <span>{count}</span>}
    </button>
  );
}
