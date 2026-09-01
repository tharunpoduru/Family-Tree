/**
 * The heart of the site (R2): one sub-family per page.
 * Couple at the top with their wedding photo (the union's photo);
 * children below with their portraits. Ascend via parent chips,
 * descend by tapping a married child; unmarried children open their
 * own page, and each partner's card opens theirs — no dead ends
 * anywhere.
 */
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useReadyData } from '../lib/data';
import type { Person, Union } from '../types/family';
import {
  generationOf,
  homeUnionOf,
  parentUnionOf,
  personsOf,
  spouseOf,
} from '../lib/graph';
import { formatFamilyDate } from '../lib/format';
import { Avatar, silkGradientFor } from '../components/Avatar';
import { BiNameBlock, Lifespan, PersonDetails } from '../components/PersonBits';
import { pack } from '../family.config';
import { SuggestSheet } from '../components/SuggestSheet';
import type { Suggestion } from '../lib/suggestions';
import { useChangeSubmit } from '../lib/changes';
import {
  AddChildSheet,
  PersonEditSheet,
  UnionEditSheet,
} from '../components/edit/EditSheets';
import { PendingBadge, ReviewSheet } from '../components/ReviewSheet';
import { usePendingFor, usePersonSuggestedFields } from '../lib/pending';
import { PhotoAlbum } from '../components/PhotoAlbum';

const GENERATION_LABELS = [
  'First generation',
  'Second generation',
  'Third generation',
  'Fourth generation',
  'Fifth generation',
  'Sixth generation',
  'Seventh generation',
];

export function FamilyPage() {
  const data = useReadyData();
  const { unionId } = useParams();
  const [params, setParams] = useSearchParams();
  const union = unionId ? data.unions[unionId] : undefined;

  const [suggestTarget, setSuggestTarget] = useState<Suggestion['target'] | null>(null);
  const { role } = useChangeSubmit();
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [editUnion, setEditUnion] = useState<Union | null>(null);
  const [addChildUnion, setAddChildUnion] = useState<Union | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const unionPending = usePendingFor(unionId);

  // Legacy sheet links (/f/x?person=y) now land on the person's own page.
  const sheetPersonId = params.get('person');
  if (sheetPersonId) return <Navigate to={`/p/${sheetPersonId}`} replace />;

  if (!union) return <Navigate to={`/f/${data.rootUnion}`} replace />;

  // Deep link from the admin queue: open the marriage editor straight away.
  if (params.get('edit') === 'union' && !editUnion) {
    setEditUnion(union);
    setParams({}, { replace: true });
  }

  const coupleLabel = (union.partners as string[])
    .map((pid) => data.people[pid]?.name.en)
    .filter(Boolean)
    .join(' & ');

  return (
    <motion.main
      key={union.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto max-w-3xl px-4 pb-24 pt-6"
    >
      <AscendRow union={union} />
      {unionPending.length > 0 && (
        <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-pasupu bg-pasupu-soft px-4 py-3">
          <PendingBadge count={unionPending.length} onClick={() => setReviewOpen(true)} />
          <span className="text-[15px] font-medium text-nili-deep">
            {unionPending.length} suggested {unionPending.length === 1 ? 'change' : 'changes'}{' '}
            for this family
          </span>
        </div>
      )}
      <CoupleCard
        union={union}
        role={role}
        onEditPerson={setEditPerson}
        onEditUnion={() => setEditUnion(union)}
      />
      <ChildrenSection
        union={union}
        role={role}
        onAddChild={() => setAddChildUnion(union)}
      />
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() =>
            setSuggestTarget({ kind: 'union', id: union.id, label: coupleLabel })
          }
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card px-5 text-[15px] font-medium text-ink-soft shadow-card transition-transform active:scale-[0.98]"
        >
          🪔 Know something about this family? Share it
        </button>
      </div>
      <SuggestSheet target={suggestTarget} onClose={() => setSuggestTarget(null)} />
      <PersonEditSheet
        person={editPerson}
        onClose={() => setEditPerson(null)}
      />
      <UnionEditSheet data={data} union={editUnion} onClose={() => setEditUnion(null)} />
      <AddChildSheet data={data} union={addChildUnion} onClose={() => setAddChildUnion(null)} />
      <ReviewSheet
        open={reviewOpen}
        rows={unionPending}
        label={coupleLabel}
        onClose={() => setReviewOpen(false)}
        onEditChange={() => {
          setReviewOpen(false);
          setEditUnion(union);
        }}
      />
    </motion.main>
  );
}

/** Chips to the couple's own parents' pages — ascend affordance. */
function AscendRow({ union }: { union: Union }) {
  const data = useReadyData();
  const parents = (union.partners as string[])
    .map((pid) => ({ person: data.people[pid], up: parentUnionOf(data, pid) }))
    .filter((x) => x.up);
  if (!parents.length) return null;
  return (
    <nav aria-label="Previous generation" className="mb-4 flex flex-wrap gap-2">
      {parents.map(({ person, up }) => (
        <Link
          key={person.id}
          to={`/f/${up!.id}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card px-4 text-[15px] font-medium text-ink-soft no-underline shadow-card transition-transform active:scale-[0.98]"
        >
          <span aria-hidden>↑</span> {person.name.en}&rsquo;s parents
        </Link>
      ))}
    </nav>
  );
}

/** The couple: wedding banner, names, marriage line, details. */
function CoupleCard({
  union,
  role,
  onEditPerson,
  onEditUnion,
}: {
  union: Union;
  role: 'admin' | 'member';
  onEditPerson: (p: Person) => void;
  onEditUnion: () => void;
}) {
  const data = useReadyData();
  const partners = personsOf(data, union.partners as string[]);
  const marriage = formatFamilyDate(union.marriage);
  const generation = useMemo(() => generationOf(data, union.id), [data, union.id]);

  return (
    <section
      aria-label="The couple"
      className="overflow-hidden rounded-[var(--radius-card)] bg-card shadow-card"
    >
      <WeddingBanner union={union} partners={partners} />
      <div className="p-6">
        <p className="m-0 mb-1 text-[13px] font-medium uppercase tracking-widest text-pasupu">
          {GENERATION_LABELS[generation] ?? `Generation ${generation + 1}`}
        </p>
        <h1
          className="m-0 text-[1.65rem] font-semibold leading-snug"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {partners.map((p, i) => (
            <span key={p.id}>
              {i > 0 && <span className="text-pasupu"> &amp; </span>}
              <span className="inline-block">{p.name.en}</span>
            </span>
          ))}
        </h1>
        {partners.some((p) => p.name.native) && (
          <p lang={pack.langTag} className="m-0 mt-1 text-lg text-ink-soft">
            {partners.map((p) => p.name.native ?? p.name.en).join(' & ')}
          </p>
        )}
        {marriage && (
          <p className="m-0 mt-2 text-[15px] text-ink-faint">Married {marriage}</p>
        )}
        <button
          type="button"
          onClick={onEditUnion}
          className="mt-3 inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm font-medium text-ink-soft shadow-card"
        >
          ✎ {role === 'admin' ? 'Edit marriage' : 'Suggest an edit'}
        </button>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {partners.map((p) => (
            <PartnerBlock key={p.id} person={p} role={role} onEdit={onEditPerson} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * One partner: a tappable card that opens their own page — the name is
 * the real link, its hit area stretched over the card, while the pencil
 * and suggestion markers sit on a layer above and keep their own taps.
 */
function PartnerBlock({
  person,
  role,
  onEdit,
}: {
  person: Person;
  role: 'admin' | 'member';
  onEdit: (p: Person) => void;
}) {
  const suggested = usePersonSuggestedFields(person);
  return (
    <div className="relative min-w-0 rounded-[var(--radius-card)] border border-line/70 bg-card p-4 shadow-card transition-transform active:scale-[0.985]">
      <div className="mb-3 flex items-center gap-3">
        <Avatar person={person} size="md" />
        <div className="min-w-0 flex-1">
          <Link
            to={`/p/${person.id}`}
            aria-label={`${person.name.en} — their page`}
            className="text-ink no-underline after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']"
          >
            <BiNameBlock person={person} enClass="font-semibold" nativeClass="text-sm" />
          </Link>
          <Lifespan person={person} className="text-sm" />
        </div>
        {suggested.size > 0 && (
          <PendingBadge
            count={suggested.size}
            onClick={() => onEdit(person)}
            className="relative z-10"
          />
        )}
        <span aria-hidden className="text-sm font-medium text-nili">
          →
        </span>
        <button
          type="button"
          onClick={() => onEdit(person)}
          aria-label={
            role === 'admin' ? `Edit ${person.name.en}` : `Suggest an edit to ${person.name.en}`
          }
          className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full border border-line bg-card text-ink-soft shadow-card"
        >
          ✎
        </button>
      </div>
      <PersonDetails
        person={person}
        suggested={suggested}
        onOpenSuggestions={() => onEdit(person)}
      />
    </div>
  );
}

/** The wedding album when it exists; a silk weave of the couple otherwise. */
function WeddingBanner({ union, partners }: { union: Union; partners: Person[] }) {
  const photos = union.photos ?? [];
  if (photos.length > 0) {
    return (
      <PhotoAlbum
        photos={photos}
        alt={`Wedding photos of ${partners.map((p) => p.name.en).join(' and ')}`}
      />
    );
  }
  return (
    <div
      aria-hidden
      className="relative flex aspect-[5/2] w-full items-center justify-center overflow-hidden"
      style={{ background: silkGradientFor(union.id) }}
    >
      <div className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{ background: 'radial-gradient(circle at 30% 20%, #fff 0%, transparent 55%), radial-gradient(circle at 75% 80%, #fff 0%, transparent 45%)' }}
      />
      <div className="flex items-center -space-x-4">
        {partners.map((p, i) => (
          <Avatar key={p.id} person={p} size="xl" className={i === 0 ? 'z-10' : ''} />
        ))}
      </div>
    </div>
  );
}

function ChildrenSection({
  union,
  role,
  onAddChild,
}: {
  union: Union;
  role: 'admin' | 'member';
  onAddChild: () => void;
}) {
  const data = useReadyData();
  const children = personsOf(data, union.children);
  void role;
  return (
    <section aria-label="Children" className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2
          className="m-0 text-xl font-semibold"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Their children
        </h2>
        <button
          type="button"
          onClick={onAddChild}
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm font-medium text-ink-soft shadow-card"
        >
          + Add child
        </button>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {children.map((child, i) => (
          <ChildCard key={child.id} person={child} index={i} />
        ))}
      </ul>
    </section>
  );
}

function ChildCard({ person, index }: { person: Person; index: number }) {
  const data = useReadyData();
  const home = homeUnionOf(data, person.id);
  const spouse = home ? data.people[spouseOf(home, person.id) ?? ''] : undefined;
  const href = home ? `/f/${home.id}` : `/p/${person.id}`;
  const hint = spouse ? `& ${spouse.name.en.split(' ')[0]} →` : '→';

  return (
    <li>
      <Link
        to={href}
        aria-label={
          home
            ? `${person.name.en} — view their family`
            : `${person.name.en} — their page`
        }
        className="block no-underline text-ink"
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + index * 0.045, duration: 0.3, ease: 'easeOut' }}
          className="flex min-h-[76px] items-center gap-4 rounded-[var(--radius-card)] bg-card p-4 shadow-card transition-transform active:scale-[0.985]"
        >
          <Avatar person={person} size="md" />
          <div className="min-w-0 flex-1">
            <BiNameBlock person={person} enClass="font-semibold leading-tight" nativeClass="text-sm" />
            <Lifespan person={person} className="text-sm" />
          </div>
          <span className="text-sm font-medium text-nili whitespace-nowrap" aria-hidden>
            {hint}
          </span>
        </motion.div>
      </Link>
    </li>
  );
}
