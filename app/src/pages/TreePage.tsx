/**
 * The tree (R3, reworked per family feedback):
 * - Tap a couple → the tree re-roots there and its branches GROW in —
 *   the organic tree feel, drawn rather than photographed, because a
 *   drawing can keep growing forever (Principle 3).
 * - Tap the focused couple again (or double-tap any couple) → their page.
 * - Couples without descendants open their page directly.
 * - Unmarried people open their person page.
 * - Breadcrumbs walk back up; scrollbars hidden; names never clipped.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useReadyData } from '../lib/data';
import type { FamilyData, Person, PersonId, Union, UnionId } from '../types/family';
import { homeUnionOf, parentUnionOf, personsOf } from '../lib/graph';
import { Avatar } from '../components/Avatar';
import { AddChildSheet } from '../components/edit/EditSheets';
import { yearOf } from '../lib/format';

const NODE_W = 160;
const NODE_H = 112;
const GAP_X = 16;
const ROW_H = 190;

type TreeNode =
  | { kind: 'union'; union: Union; children: TreeNode[]; collapsedCount?: number }
  | { kind: 'leaf'; person: Person };

interface Placed {
  node: TreeNode;
  x: number;
  depth: number;
}

/**
 * A marriage within the family (both spouses descend from the root —
 * cousin marriages happen) would attach the same union under both
 * parents' branches. `seen` keeps one canonical expansion: the branch
 * reached first grows the sub-family; the other side shows that spouse
 * as a leaf, and their shared page is one tap away.
 */
function buildTree(
  data: FamilyData,
  unionId: UnionId,
  collapsed: Set<UnionId>,
  seen: Set<UnionId> = new Set(),
): TreeNode {
  const union = data.unions[unionId];
  seen.add(unionId);
  if (collapsed.has(unionId)) {
    return { kind: 'union', union, children: [], collapsedCount: countDescendants(data, unionId) };
  }
  const children: TreeNode[] = union.children.map((cid: PersonId) => {
    const home = homeUnionOf(data, cid);
    return home && !seen.has(home.id)
      ? buildTree(data, home.id, collapsed, seen)
      : { kind: 'leaf', person: data.people[cid] };
  });
  return { kind: 'union', union, children };
}

function countDescendants(
  data: FamilyData,
  unionId: UnionId,
  seen: Set<UnionId> = new Set([unionId]),
): number {
  const union = data.unions[unionId];
  let n = union.children.length;
  for (const cid of union.children) {
    const home = homeUnionOf(data, cid);
    if (home && !seen.has(home.id)) {
      seen.add(home.id);
      n += countDescendants(data, home.id, seen);
    }
  }
  return n;
}

function widthOf(node: TreeNode): number {
  if (node.kind === 'leaf' || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + widthOf(c), 0);
}

function place(node: TreeNode, left: number, depth: number, out: Placed[]): number {
  const w = widthOf(node);
  out.push({ node, x: left + w / 2, depth });
  let cursor = left;
  if (node.kind === 'union') {
    for (const child of node.children) cursor = place(child, cursor, depth + 1, out);
  }
  return left + w;
}

/** Ancestor chain from the family root down to `unionId` (inclusive). */
function chainTo(data: FamilyData, unionId: UnionId): Union[] {
  const chain: Union[] = [];
  let current: Union | undefined = data.unions[unionId];
  const guard = new Set<UnionId>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    chain.unshift(current);
    const up: Union | undefined = (current.partners as PersonId[])
      .map((p) => parentUnionOf(data, p))
      .find(Boolean);
    current = up;
  }
  return chain;
}

/**
 * The name to show on a compact card.
 *
 * Formal names often lead with the house name — "Sharma Madhav" — so
 * taking the first word would label every card with the family name.
 * Drop the family's own name and use what's left; if the family calls
 * them something else, that wins.
 */
function shortName(p: Person | undefined, familyName: string): string {
  if (!p) return '';
  if (p.nickname?.en) return p.nickname.en;
  const parts = p.name.en.trim().split(/\s+/);
  const family = familyName.trim().toLowerCase();
  const kept = parts.filter((w) => w.toLowerCase() !== family);
  return kept[0] ?? parts[0] ?? '';
}

/** Bind shortName to this family's own name. */
const nameOn = (data: FamilyData) => (p?: Person) => shortName(p, data.family.en);

/** Desktop gets the panoramic canvas; phones get the vertical outline. */
function useIsDesktop(): boolean {
  const [is, setIs] = useState(
    () => window.matchMedia('(min-width: 640px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const on = (e: MediaQueryListEvent) => setIs(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return is;
}

export function TreePage() {
  const data = useReadyData();
  const desktop = useIsDesktop();
  const [focusId, setFocusId] = useState<UnionId>(data.rootUnion);
  const [collapsed, setCollapsed] = useState<Set<UnionId>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [addChildUnion, setAddChildUnion] = useState<Union | null>(null);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focus = data.unions[focusId] ? focusId : data.rootUnion;
  const crumbs = useMemo(() => chainTo(data, focus), [data, focus]);

  const { placed, totalUnits, maxDepth } = useMemo(() => {
    const root = buildTree(data, focus, collapsed);
    const out: Placed[] = [];
    place(root, 0, 0, out);
    return {
      placed: out,
      totalUnits: widthOf(root),
      maxDepth: Math.max(...out.map((p) => p.depth)),
    };
  }, [data, focus, collapsed]);

  const unit = NODE_W + GAP_X;
  const canvasW = totalUnits * unit;
  const canvasH = (maxDepth + 1) * ROW_H;
  const byNode = new Map(placed.map((p) => [p.node, p]));
  const rootX = placed[0]?.x ?? 0;

  // Recenter on the focused couple whenever the view re-roots or zooms.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = rootX * unit * zoom - el.clientWidth / 2;
    el.scrollTop = 0;
  }, [focus, rootX, unit, zoom]);

  function openUnionPage(unionId: UnionId) {
    if (tapTimer.current) clearTimeout(tapTimer.current);
    navigate(`/f/${unionId}`);
  }

  function handleUnionTap(union: Union, e: React.MouseEvent) {
    if (e.detail >= 2) {
      openUnionPage(union.id);
      return;
    }
    const hasDescendants = union.children.length > 0;
    if (!hasDescendants || union.id === focus) {
      // Nothing to grow, or already grown here — go to the page.
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = setTimeout(() => navigate(`/f/${union.id}`), 240);
      return;
    }
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setFocusId(union.id), 240);
  }

  function toggleCollapse(unionId: UnionId) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(unionId)) next.delete(unionId);
      else next.add(unionId);
      return next;
    });
  }

  return (
    <main className="pb-24 pt-6">
      <div className="mx-auto mb-3 flex max-w-3xl items-start justify-between gap-3 px-4">
        <div>
          <h1 className="m-0 text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            The Tree
          </h1>
          <p className="m-0 mt-1 text-[15px] text-ink-faint">
            {desktop
              ? 'Tap a family to grow its branch · Tap again for their page'
              : 'Tap a family to bring it to the top · Tap the top card for their page'}
          </p>
        </div>
        {desktop && (
        <div
          className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-card p-1 shadow-card"
          role="group"
          aria-label="Zoom"
        >
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))}
            aria-label="Zoom out"
            className="grid size-10 place-items-center rounded-full text-lg text-ink-soft hover:bg-paper-warm"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.15).toFixed(2)))}
            aria-label="Zoom in"
            className="grid size-10 place-items-center rounded-full text-lg text-ink-soft hover:bg-paper-warm"
          >
            +
          </button>
        </div>
        )}
      </div>

      {crumbs.length > 1 && (
        <nav
          aria-label="Tree path"
          className="no-scrollbar mx-auto mb-4 flex max-w-3xl gap-1.5 overflow-x-auto px-4"
        >
          {crumbs.map((u, i) => {
            const partners = personsOf(data, u.partners as string[]);
            const label = partners.map(nameOn(data)).join(' & ');
            const isLast = i === crumbs.length - 1;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setFocusId(u.id)}
                aria-current={isLast ? 'true' : undefined}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
                  isLast
                    ? 'bg-pasupu-soft text-nili-deep'
                    : 'border border-line bg-card text-ink-soft'
                }`}
              >
                {i > 0 && <span aria-hidden>‣</span>}
                {label}
              </button>
            );
          })}
        </nav>
      )}

      {!desktop && (
        <ListTree
          data={data}
          focusId={focus}
          onFocus={setFocusId}
          onAddChild={setAddChildUnion}
        />
      )}

      {desktop && (
      <div
        ref={scrollRef}
        className="no-scrollbar overflow-auto overscroll-contain px-4"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/*
          A small family draws a canvas narrower than the screen; centre it
          rather than stranding it at the left edge. `min-w-fit` keeps a
          wide canvas free to overflow and scroll as before.
        */}
        <div className="flex min-w-fit justify-center">
        <div className="shrink-0" style={{ width: canvasW * zoom, height: canvasH * zoom }}>
          {/* Keyed by focus: every re-root grows its branches afresh. */}
          <motion.div
            key={focus}
            className="relative origin-top-left"
            style={{ width: canvasW, height: canvasH, transform: `scale(${zoom})` }}
          >
            <svg className="absolute inset-0" width={canvasW} height={canvasH} aria-hidden>
              {placed.map((p) => {
                if (p.node.kind !== 'union') return null;
                const parentNode = p.node;
                return parentNode.children.map((child) => {
                  const c = byNode.get(child)!;
                  const x1 = p.x * unit;
                  const y1 = p.depth * ROW_H + NODE_H;
                  const x2 = c.x * unit;
                  const y2 = c.depth * ROW_H;
                  const my = (y1 + y2) / 2;
                  return (
                    <motion.path
                      key={`${parentNode.union.id}-${c.node.kind === 'union' ? c.node.union.id : c.node.person.id}`}
                      d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                      fill="none"
                      stroke="var(--color-line)"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{
                        duration: 0.5,
                        delay: p.depth * 0.18,
                        ease: 'easeOut',
                      }}
                    />
                  );
                });
              })}
            </svg>

            {placed.map((p) => {
              const entrance = {
                initial: { opacity: 0, scale: 0.85, y: 8 },
                animate: { opacity: 1, scale: 1, y: 0 },
                transition: { duration: 0.35, delay: p.depth * 0.18, ease: 'easeOut' as const },
              };
              if (p.node.kind === 'union') {
                const node = p.node;
                return (
                  <UnionNode
                    key={node.union.id}
                    data={data}
                    node={node}
                    placed={p}
                    unit={unit}
                    entrance={entrance}
                    isFocusRoot={node.union.id === focus && crumbs.length > 0}
                    isCollapsed={collapsed.has(node.union.id)}
                    onTap={handleUnionTap}
                    onToggle={toggleCollapse}
                  />
                );
              }
              const person = p.node.person;
              return (
                <motion.button
                  key={person.id}
                  type="button"
                  onClick={() => navigate(`/p/${person.id}`)}
                  className="absolute flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line bg-paper-warm px-2 py-2 text-center"
                  style={{ left: p.x * unit - NODE_W / 2, top: p.depth * ROW_H, width: NODE_W, height: NODE_H }}
                  aria-label={`${person.name.en} — their page`}
                  {...entrance}
                >
                  <Avatar person={person} size="sm" />
                  <span className="w-full text-[13px] font-medium leading-tight text-ink-soft">
                    {nameOn(data)(person)}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
        </div>
      </div>
      )}
      <AddChildSheet
        data={data}
        union={addChildUnion}
        onClose={() => setAddChildUnion(null)}
      />
    </main>
  );
}


function UnionNode({
  data,
  node,
  placed,
  unit,
  entrance,
  isFocusRoot,
  isCollapsed,
  onTap,
  onToggle,
}: {
  data: FamilyData;
  node: Extract<TreeNode, { kind: 'union' }>;
  placed: Placed;
  unit: number;
  entrance: object;
  isFocusRoot: boolean;
  isCollapsed: boolean;
  onTap: (union: Union, e: React.MouseEvent) => void;
  onToggle: (id: UnionId) => void;
}) {
  const partners = personsOf(data, node.union.partners as string[]);
  const year = yearOf(node.union.marriage);
  const hasChildren = node.union.children.length > 0;

  return (
    <div
      className="absolute"
      style={{
        left: placed.x * unit - NODE_W / 2,
        top: placed.depth * ROW_H,
        width: NODE_W,
        height: NODE_H,
      }}
    >
      <motion.button
        type="button"
        onClick={(e) => onTap(node.union, e)}
        className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border bg-card px-2 py-2 text-center shadow-card transition-transform active:scale-[0.97] ${
          isFocusRoot ? 'border-pasupu ring-2 ring-pasupu/40' : 'border-line'
        }`}
        aria-label={`Family of ${partners.map((x) => x.name.en).join(' and ')}`}
        {...entrance}
      >
        <span className="flex -space-x-2">
          {partners.map((person) => (
            <Avatar key={person.id} person={person} size="sm" />
          ))}
        </span>
        <span className="w-full text-[13px] font-semibold leading-snug text-ink">
          {partners.map(nameOn(data)).join(' & ')}
        </span>
        {year && <span className="text-[11px] leading-none text-ink-faint">m. {year}</span>}
      </motion.button>
      {hasChildren && (
        <button
          type="button"
          onClick={() => onToggle(node.union.id)}
          aria-label={isCollapsed ? 'Expand branch' : 'Collapse branch'}
          aria-expanded={!isCollapsed}
          className="absolute -bottom-3.5 left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full border border-line bg-card text-[11px] font-semibold text-nili shadow-card"
        >
          {isCollapsed ? `+${node.collapsedCount}` : '−'}
        </button>
      )}
    </div>
  );
}

// ————————— Mobile outline tree: re-root model (family feedback) —————————

/**
 * One tap brings a couple to the top and shows their subtree — identical
 * mental model to the desktop canvas, and truly infinite: indentation
 * resets on every re-root. Every children rail ends in a "+ Add" node.
 */
function ListTree({
  data,
  focusId,
  onFocus,
  onAddChild,
}: {
  data: FamilyData;
  focusId: UnionId;
  onFocus: (id: UnionId) => void;
  onAddChild: (u: Union) => void;
}) {
  const union = data.unions[focusId];
  const partners = personsOf(data, union.partners as string[]);
  const year = yearOf(union.marriage);

  return (
    <motion.div
      key={focusId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto max-w-xl px-4 pt-1"
    >
      <Link
        to={`/f/${focusId}`}
        className="flex items-center gap-3.5 rounded-2xl border border-pasupu bg-card p-4 text-ink no-underline shadow-card ring-2 ring-pasupu/30 transition-transform active:scale-[0.98]"
        aria-label={`Open the page of ${partners.map((x) => x.name.en).join(' and ')}`}
      >
        <span className="flex shrink-0 -space-x-2.5">
          {partners.map((person) => (
            <Avatar key={person.id} person={person} size="md" />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-tight text-base">
            {partners.map(nameOn(data)).join(' & ')}
          </span>
          {year && <span className="block text-xs text-ink-faint">m. {year}</span>}
        </span>
        <span aria-hidden className="text-sm font-medium text-nili whitespace-nowrap">
          Open →
        </span>
      </Link>
      <ChildRail data={data} union={union} onFocus={onFocus} onAddChild={onAddChild} />
    </motion.div>
  );
}

/**
 * ONE level only: the focused couple's direct children. Depth comes from
 * re-rooting, never from nesting — the view stays readable at any size.
 */
function ChildRail({
  data,
  union,
  onFocus,
  onAddChild,
}: {
  data: FamilyData;
  union: Union;
  onFocus: (id: UnionId) => void;
  onAddChild: (u: Union) => void;
}) {
  const navigate = useNavigate();
  const elbow =
    'relative before:absolute before:-left-3.5 before:top-1/2 before:h-0.5 before:w-3 before:bg-line';

  return (
    <ul className="m-0 ml-5 list-none border-l-2 border-line p-0 pl-3.5 pt-2.5">
      {union.children.map((cid, i) => {
        const person = data.people[cid];
        const home = homeUnionOf(data, cid);
        const entrance = {
          initial: { opacity: 0, x: -10 },
          animate: { opacity: 1, x: 0 },
          transition: { delay: 0.05 + Math.min(i, 8) * 0.05, duration: 0.28 },
        };
        if (!home) {
          return (
            <motion.li key={cid} className={`${elbow} mb-2.5`} {...entrance}>
              <Link
                to={`/p/${cid}`}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-paper-warm p-3 text-ink-soft no-underline transition-transform active:scale-[0.98]"
                aria-label={`${person.name.en} — their page`}
              >
                <Avatar person={person} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {nameOn(data)(person)}
                </span>
                <span aria-hidden className="text-sm text-nili">→</span>
              </Link>
            </motion.li>
          );
        }
        const spousePartners = personsOf(data, home.partners as string[]);
        const descendants = countDescendants(data, home.id);
        return (
          <motion.li key={cid} className={`${elbow} mb-2.5`} {...entrance}>
            <button
              type="button"
              onClick={() =>
                home.children.length > 0 ? onFocus(home.id) : navigate(`/f/${home.id}`)
              }
              className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-card p-3 text-left text-ink shadow-card transition-transform active:scale-[0.98]"
              aria-label={
                home.children.length > 0
                  ? `Bring the family of ${spousePartners.map((x) => x.name.en).join(' and ')} to the top`
                  : `Open the family of ${spousePartners.map((x) => x.name.en).join(' and ')}`
              }
            >
              <span className="flex shrink-0 -space-x-2">
                {spousePartners.map((p) => (
                  <Avatar key={p.id} person={p} size="sm" />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold leading-tight">
                  {spousePartners.map(nameOn(data)).join(' & ')}
                </span>
                {yearOf(home.marriage) && (
                  <span className="block text-xs text-ink-faint">
                    m. {yearOf(home.marriage)}
                  </span>
                )}
              </span>
              {descendants > 0 && (
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-paper text-[12px] font-semibold text-nili"
                >
                  +{descendants}
                </span>
              )}
            </button>
          </motion.li>
        );
      })}
      <li className={elbow}>
        <button
          type="button"
          onClick={() => onAddChild(union)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line bg-transparent p-3 text-left text-ink-faint transition-colors active:bg-paper-warm"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-line text-lg">
            +
          </span>
          <span className="text-[15px] font-medium">Add a child here</span>
        </button>
      </li>
    </ul>
  );
}
