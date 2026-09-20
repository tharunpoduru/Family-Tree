/**
 * A member's save is stored as a `suggestions` document, and Firestore
 * rejects `undefined` outright. A living person carries `death: undefined`
 * and an undated marriage carries `marriage: undefined`, so for a while
 * every such member edit died with "Unsupported field value: undefined
 * (found in field change.person.death)". Admins never saw it: their path
 * prunes. These tests hold that boundary.
 */
import { describe, it, expect, vi } from 'vitest';

// These modules only need Firestore for its handles; the pruner is pure.
vi.mock('../src/lib/firebase-data', () => ({ db: {}, storage: {} }));
vi.mock('../src/lib/auth', () => ({ useAuth: () => ({ state: { phase: 'signedOut' } }) }));

import { pruneChange, type Change } from '../src/lib/changes';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { normalizeDate, prune } from '../src/lib/edits';
import type { Person, Union } from '../src/types/family';

/** The dotted path of the first `undefined`, the way Firestore finds it. */
function firstUndefined(value: unknown, path = ''): string | null {
  if (value === undefined) return path;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = firstUndefined(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const hit = firstUndefined(v, path ? `${path}.${k}` : k);
      if (hit) return hit;
    }
  }
  return null;
}

const alive = {
  id: 'p-living',
  name: { en: 'Living Person' },
  birth: { y: 1990, m: 4, d: 12 },
} as unknown as Person;

/** Exactly what PersonEditSheet.save() builds for a living person. */
const livingSave: Change = {
  kind: 'person.save',
  person: { ...alive, birth: normalizeDate(alive.birth), death: undefined },
  base: alive,
};

describe('pruneChange', () => {
  it('strips the death: undefined that broke every member edit', () => {
    expect(firstUndefined(livingSave)).toBe('person.death');
    expect(firstUndefined(pruneChange(livingSave))).toBe(null);
  });

  it('leaves no undefined in any change kind', () => {
    const noDates = { id: 'p-x', name: { en: 'X' }, birth: undefined, death: undefined } as unknown as Person;
    const bareUnion = {
      id: 'u-a-b',
      partners: ['p-a', 'p-b'],
      marriage: normalizeDate({}),
      children: [],
      photos: undefined,
    } as unknown as Union;
    const changes: Change[] = [
      livingSave,
      { kind: 'person.save', person: noDates },
      { kind: 'union.save', union: bareUnion, base: bareUnion },
      { kind: 'union.addChild', unionId: 'u-a-b', person: noDates },
      { kind: 'family.start', spouse: noDates, union: bareUnion },
      { kind: 'family.link', spouseId: 'p-b', union: bareUnion },
      { kind: 'person.delete', personId: 'p-x', name: 'X' },
      { kind: 'union.delete', unionId: 'u-a-b', label: 'A & B' },
      { kind: 'identity.claim', personId: 'p-x', name: 'X' },
    ];
    for (const c of changes) expect([c.kind, firstUndefined(pruneChange(c))]).toEqual([c.kind, null]);
  });

  it('does not smuggle a base: undefined key back in via spread', () => {
    const withUndefinedBase = { kind: 'person.save', person: alive, base: undefined } as Change;
    expect('base' in pruneChange(withUndefinedBase)).toBe(false);
  });

  it('keeps an undated death — its presence is what marks someone as passed', () => {
    const passed = { kind: 'person.save', person: { ...alive, death: {} } } as Change;
    const out = pruneChange(passed) as Extract<Change, { kind: 'person.save' }>;
    expect(out.person.death).toEqual({});
  });

  it('does not invent a death for someone living', () => {
    const out = pruneChange(livingSave) as Extract<Change, { kind: 'person.save' }>;
    expect('death' in out.person).toBe(false);
  });

  it('keeps an empty children array — it is not the same as no children key', () => {
    const u = { id: 'u-a-b', partners: ['p-a', 'p-b'], children: [] } as unknown as Union;
    const out = pruneChange({ kind: 'family.link', spouseId: 'p-b', union: u }) as Extract<
      Change,
      { kind: 'family.link' }
    >;
    expect(out.union.children).toEqual([]);
    expect(out.union.partners).toEqual(['p-a', 'p-b']);
  });
});

describe('prune', () => {
  it('leaves a serverTimestamp() sentinel intact', () => {
    // Rebuilding it as a bare object turns it into the literal map
    // {_methodName:'serverTimestamp'}, and Firestore stores that instead
    // of stamping the time — which left every clientErrors row undated.
    const sentinel = serverTimestamp();
    const out = prune({ stage: 'save', createdAt: sentinel }) as Record<string, unknown>;
    // Identity is the point: a rebuilt copy is a plain map, not a sentinel.
    expect(out.createdAt).toBe(sentinel);
    expect(Object.getPrototypeOf(out.createdAt)).not.toBe(Object.prototype);
    expect(out.stage).toBe('save');
  });

  it('leaves a Timestamp intact', () => {
    const ts = Timestamp.fromDate(new Date('2026-09-14T19:09:24Z'));
    const out = prune({ at: ts }) as Record<string, unknown>;
    expect(out.at).toBeInstanceOf(Timestamp);
    expect((out.at as Timestamp).toMillis()).toBe(ts.toMillis());
  });

  it('still prunes the plain data around a sentinel', () => {
    const out = prune({
      keep: 'yes', drop: undefined, blank: '', empty: {},
      nested: { keep: 1, drop: null },
      createdAt: serverTimestamp(),
    }) as Record<string, unknown>;
    expect(Object.keys(out).sort()).toEqual(['createdAt', 'keep', 'nested']);
    expect(out.nested).toEqual({ keep: 1 });
  });
});
