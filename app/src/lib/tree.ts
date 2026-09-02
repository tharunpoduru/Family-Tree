/**
 * Shape of the tree canvas: which couple grows under which parent.
 *
 * The family graph is a DAG, not a tree — a marriage within the family
 * (cousin marriages happen) descends from the root along both spouses'
 * lines, so the same union could hang under both sets of parents. Each
 * union is grown exactly once; every other side shows that spouse as a
 * leaf that points at the marriage rather than a person who looks
 * unmarried and childless.
 *
 * Which side grows it: the husband's, when his parents are in view — the
 * way the family draws it. A wife whose husband married in (his parents
 * are not in the tree) grows under her own parents as before. When the
 * view is re-rooted so that only one spouse's parents are visible, that
 * side grows it, whichever it is.
 */
import type { FamilyData, Person, PersonId, Union, UnionId } from '../types/family';
import { homeUnionOf, parentUnionOf, spouseOf } from './graph';

export type TreeNode =
  | { kind: 'union'; union: Union; children: TreeNode[]; collapsedCount?: number }
  | {
      kind: 'leaf';
      person: Person;
      /** Set when this person is married and their family grows elsewhere. */
      marriedInto?: Union;
    };

/** Every union that descends from `root`, along either spouse's line. */
export function reachableUnions(data: FamilyData, root: UnionId): Set<UnionId> {
  const seen = new Set<UnionId>();
  const stack = [root];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    const union = data.unions[id];
    if (!union) continue;
    seen.add(id);
    for (const cid of union.children) {
      const home = homeUnionOf(data, cid);
      if (home && !seen.has(home.id)) stack.push(home.id);
    }
  }
  return seen;
}

/** A partner's recorded gender, or the opposite of their spouse's. */
function genderOf(data: FamilyData, union: Union, id: PersonId): Person['gender'] {
  const own = data.people[id]?.gender;
  if (own) return own;
  const spouseId = spouseOf(union, id);
  const theirs = spouseId ? data.people[spouseId]?.gender : undefined;
  return theirs ? (theirs === 'm' ? 'f' : 'm') : undefined;
}

/**
 * The partner under whose parents this union grows, given the unions
 * in view. Undefined when neither partner's parents are in view (the
 * union can only be the focus itself, or is not reachable at all).
 */
export function anchorOf(
  data: FamilyData,
  union: Union,
  reachable: Set<UnionId>,
): PersonId | undefined {
  const inView = (union.partners as PersonId[]).filter((pid) => {
    const up = parentUnionOf(data, pid);
    return up !== undefined && reachable.has(up.id);
  });
  if (inView.length <= 1) return inView[0];
  return inView.find((pid) => genderOf(data, union, pid) === 'm') ?? inView[0];
}

/**
 * The parents this union hangs from when climbing the tree: the
 * husband's, when both spouses have parents here — the same side the
 * canvas grows the marriage on, so breadcrumbs retrace what was drawn.
 */
export function lineageParentOf(data: FamilyData, union: Union): Union | undefined {
  const ups = (union.partners as PersonId[])
    .map((pid) => ({ pid, up: parentUnionOf(data, pid) }))
    .filter((x): x is { pid: PersonId; up: Union } => x.up !== undefined);
  if (ups.length === 0) return undefined;
  return (ups.find((x) => genderOf(data, union, x.pid) === 'm') ?? ups[0]).up;
}

/** Does `childId`'s marriage grow under this child, or only point there? */
function growsUnder(
  data: FamilyData,
  home: Union,
  childId: PersonId,
  reachable: Set<UnionId>,
  seen: Set<UnionId>,
): boolean {
  if (seen.has(home.id)) return false;
  const anchor = anchorOf(data, home, reachable);
  return anchor === undefined || anchor === childId;
}

export function buildTree(
  data: FamilyData,
  focus: UnionId,
  collapsed: Set<UnionId>,
  reachable: Set<UnionId> = reachableUnions(data, focus),
): TreeNode {
  const seen = new Set<UnionId>();
  const build = (unionId: UnionId): TreeNode => {
    const union = data.unions[unionId];
    seen.add(unionId);
    if (collapsed.has(unionId)) {
      return {
        kind: 'union',
        union,
        children: [],
        collapsedCount: countDescendants(data, unionId, reachable),
      };
    }
    const children: TreeNode[] = union.children.map((cid) => {
      const person = data.people[cid];
      const home = homeUnionOf(data, cid);
      if (!home) return { kind: 'leaf', person };
      if (growsUnder(data, home, cid, reachable, seen)) return build(home.id);
      return { kind: 'leaf', person, marriedInto: home };
    });
    return { kind: 'union', union, children };
  };
  return build(focus);
}

/**
 * People below a couple, counted the way the canvas draws them: a
 * marriage within the family counts once, under the side that grows it.
 * `reachable` is the view the count is shown in; by default, the
 * couple's own subtree.
 */
export function countDescendants(
  data: FamilyData,
  unionId: UnionId,
  reachable: Set<UnionId> = reachableUnions(data, unionId),
  seen: Set<UnionId> = new Set([unionId]),
): number {
  const union = data.unions[unionId];
  let n = union.children.length;
  for (const cid of union.children) {
    const home = homeUnionOf(data, cid);
    if (home && growsUnder(data, home, cid, reachable, seen)) {
      seen.add(home.id);
      n += countDescendants(data, home.id, reachable, seen);
    }
  }
  return n;
}
