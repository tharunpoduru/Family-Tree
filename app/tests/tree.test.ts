/**
 * The canvas grows each marriage once. A marriage within the family
 * (both spouses descend from the root) grows on the husband's side; the
 * wife's parents show her as a leaf that points at the marriage instead
 * of a person who looks unmarried and childless.
 */
import { describe, expect, it } from 'vitest';
import { buildTree, countDescendants, lineageParentOf, type TreeNode } from '../src/lib/tree';
import type { FamilyData } from '../src/types/family';

function walk(node: TreeNode, visit: (n: TreeNode, parent?: TreeNode) => void, parent?: TreeNode) {
  visit(node, parent);
  if (node.kind === 'union') for (const c of node.children) walk(c, visit, node);
}

function parentUnionIdOf(root: TreeNode, pred: (n: TreeNode) => boolean): string | undefined {
  let found: string | undefined;
  walk(root, (n, parent) => {
    if (pred(n) && parent?.kind === 'union') found = parent.union.id;
  });
  return found;
}

const isUnion = (id: string) => (n: TreeNode) => n.kind === 'union' && n.union.id === id;
const isLeaf = (id: string) => (n: TreeNode) => n.kind === 'leaf' && n.person.id === id;

// Grandparents with a daughter and a son; the daughter's girl marries the
// son's boy. The daughter is the elder child, so a first-come walk used to
// grow the cousins' marriage under her side.
const data: FamilyData = {
  family: { en: 'Test' },
  rootUnion: 'u-root',
  people: {
    tata: { id: 'tata', name: { en: 'Grandfather' }, gender: 'm' },
    avva: { id: 'avva', name: { en: 'Grandmother' }, gender: 'f' },
    daughter: { id: 'daughter', name: { en: 'Daughter' }, gender: 'f' },
    son: { id: 'son', name: { en: 'Son' } },
    alludu: { id: 'alludu', name: { en: 'Son-in-law' }, gender: 'm' },
    kodalu: { id: 'kodalu', name: { en: 'Daughter-in-law' }, gender: 'f' },
    gd: { id: 'gd', name: { en: 'Grand-daughter' }, gender: 'f' },
    gs: { id: 'gs', name: { en: 'Grandson' } },
    ggc: { id: 'ggc', name: { en: 'Great-grandchild' } },
  },
  unions: {
    'u-root': { id: 'u-root', partners: ['tata', 'avva'], children: ['daughter', 'son'] },
    'u-daughter': { id: 'u-daughter', partners: ['daughter', 'alludu'], children: ['gd'] },
    'u-son': { id: 'u-son', partners: ['son', 'kodalu'], children: ['gs'] },
    // Cousins marry; the husband's gender is unrecorded and read from hers.
    'u-cousins': { id: 'u-cousins', partners: ['gd', 'gs'], children: ['ggc'] },
  },
};
const root = buildTree(data, 'u-root', new Set());

describe('a spouse who married in', () => {
  it('grows under the partner whose parents are in the tree', () => {
    expect(parentUnionIdOf(root, isUnion('u-daughter'))).toBe('u-root');
    expect(parentUnionIdOf(root, isUnion('u-son'))).toBe('u-root');
  });
});

describe('a marriage within the family', () => {
  it("grows under the husband's parents, inferring his side from the wife's gender", () => {
    expect(parentUnionIdOf(root, isUnion('u-cousins'))).toBe('u-son');
  });

  it('shows the wife under her own parents as a leaf pointing at the marriage', () => {
    expect(parentUnionIdOf(root, isLeaf('gd'))).toBe('u-daughter');
    let leaf: TreeNode | undefined;
    walk(root, (n) => {
      if (isLeaf('gd')(n)) leaf = n;
    });
    expect(leaf?.kind === 'leaf' && leaf.marriedInto?.id).toBe('u-cousins');
  });

  it('grows every reachable union exactly once', () => {
    const counts = new Map<string, number>();
    walk(root, (n) => {
      if (n.kind === 'union') counts.set(n.union.id, (counts.get(n.union.id) ?? 0) + 1);
    });
    expect(counts.size).toBe(Object.keys(data.unions).length);
    expect([...counts.values()].every((c) => c === 1)).toBe(true);
  });

  it("climbs back up the husband's side", () => {
    expect(lineageParentOf(data, data.unions['u-cousins'])?.id).toBe('u-son');
  });

  it("grows on the wife's side when the view is re-rooted there", () => {
    const view = buildTree(data, 'u-daughter', new Set());
    expect(parentUnionIdOf(view, isUnion('u-cousins'))).toBe('u-daughter');
  });

  it('counts every descendant once', () => {
    const descendants = Object.values(data.unions).flatMap((u) => u.children);
    expect(new Set(descendants).size).toBe(descendants.length);
    expect(countDescendants(data, 'u-root')).toBe(descendants.length);
  });

  it('counts a collapsed branch the way the canvas draws it', () => {
    const collapsed = buildTree(data, 'u-root', new Set(['u-daughter', 'u-son']));
    const counts = new Map<string, number | undefined>();
    walk(collapsed, (n) => {
      if (n.kind === 'union') counts.set(n.union.id, n.collapsedCount);
    });
    expect(counts.get('u-daughter')).toBe(1); // gd only; her marriage grows under gs
    expect(counts.get('u-son')).toBe(2); // gs and ggc
  });
});
