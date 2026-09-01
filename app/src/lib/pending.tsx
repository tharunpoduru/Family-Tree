/**
 * Live pending suggestions, indexed by the record they touch — so a "!"
 * can appear exactly where the suggested change lives. Admins see every
 * pending change; members see only their own.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase-data';
import { useAuth } from './auth';
import type { Change } from './changes';
import { personFieldChanges, type FieldKey } from './diff';
import type { Person } from '../types/family';

export interface PendingRow {
  id: string;
  change?: Change;
  targetId?: string;
  targetLabel?: string;
  authorUid: string;
  authorName: string;
  authorEmail?: string;
  note?: string;
  photoPath?: string;
  status: 'pending' | 'applied' | 'declined';
}

interface PendingCtx {
  all: PendingRow[];
  byTarget: Map<string, PendingRow[]>;
  mine: PendingRow[];
}

const Ctx = createContext<PendingCtx>({
  all: [],
  byTarget: new Map(),
  mine: [],
});

export const usePending = () => useContext(Ctx);

/** Suggestions touching one record (person or union id). */
export function usePendingFor(targetId: string | undefined): PendingRow[] {
  const { byTarget } = usePending();
  if (!targetId) return [];
  return byTarget.get(targetId) ?? [];
}

/**
 * Suggestions touching a whole family page — the union itself plus both
 * partners — so the "!" on a family page counts everything a visitor
 * would find there.
 */
export function usePendingForUnion(
  unionId: string | undefined,
  partnerIds: string[],
): PendingRow[] {
  const { byTarget } = usePending();
  const out: PendingRow[] = [];
  for (const id of [unionId, ...partnerIds]) {
    if (!id) continue;
    out.push(...(byTarget.get(id) ?? []));
  }
  return out;
}

/**
 * Which of a person's fields have suggested changes — so the read view
 * can mark them without anyone opening the editor.
 */
export function usePersonSuggestedFields(
  person: Person | undefined,
): Map<FieldKey, number> {
  const rows = usePendingFor(person?.id);
  return useMemo(() => {
    const m = new Map<FieldKey, number>();
    if (!person) return m;
    for (const row of rows) {
      if (row.change?.kind !== 'person.save') continue;
      for (const c of personFieldChanges(person, row.change.person)) {
        m.set(c.key, (m.get(c.key) ?? 0) + 1);
      }
    }
    return m;
  }, [person, rows]);
}

export function PendingProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const [rows, setRows] = useState<PendingRow[]>([]);

  const uid = state.phase === 'approved' ? state.user.uid : undefined;
  const isAdmin = state.phase === 'approved' && state.membership.role === 'admin';

  useEffect(() => {
    if (!uid) {
      setRows([]);
      return;
    }
    // Rules allow admins to read all, members only their own — so the
    // query must mirror that or Firestore rejects it.
    const q = isAdmin
      ? query(collection(db, 'suggestions'))
      : query(collection(db, 'suggestions'), where('authorUid', '==', uid));
    return onSnapshot(
      q,
      (snap) => {
        const next: PendingRow[] = [];
        snap.forEach((d) => next.push({ id: d.id, ...(d.data() as Omit<PendingRow, 'id'>) }));
        setRows(next);
      },
      () => setRows([]),
    );
  }, [uid, isAdmin]);

  const value = useMemo<PendingCtx>(() => {
    const pending = rows.filter((r) => r.status === 'pending');
    const byTarget = new Map<string, PendingRow[]>();
    for (const r of pending) {
      const key = r.targetId ?? (r.change ? undefined : undefined);
      if (!key) continue;
      byTarget.set(key, [...(byTarget.get(key) ?? []), r]);
    }
    return {
      all: pending,
      byTarget,
      mine: rows.filter((r) => r.authorUid === uid),
    };
  }, [rows, uid]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
