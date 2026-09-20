/**
 * Every person has a page — married or not. Holds their portrait, story,
 * the doors to every family they belong to, the edit affordances, the
 * "this is me" claim, and any suggestions waiting on them.
 */
import { useState } from 'react';
import { useEffect } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useReadyData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { useChangeSubmit } from '../lib/changes';
import { usePendingFor, usePersonSuggestedFields } from '../lib/pending';
import { parentUnionOf, unionsAsPartner, spouseOf } from '../lib/graph';
import { PortraitTurn } from '../components/PortraitTurn';
import { BiNameBlock, Lifespan, PersonDetails } from '../components/PersonBits';
import { pack } from '../family.config';
import { KinshipLine } from '../components/KinshipBadge';
import { PersonEditSheet, StartFamilySheet } from '../components/edit/EditSheets';
import { SuggestSheet } from '../components/SuggestSheet';
import { PendingBadge, ReviewSheet } from '../components/ReviewSheet';
import type { Person } from '../types/family';
import type { Suggestion } from '../lib/suggestions';
import { friendlyError } from '../lib/errors';
import { reportClientError } from '../lib/diagnostics';

export function PersonPage() {
  const data = useReadyData();
  const { state } = useAuth();
  const { role, suggest } = useChangeSubmit();
  const { personId } = useParams();
  const person = personId ? data.people[personId] : undefined;

  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [startFamily, setStartFamily] = useState<Person | null>(null);
  const [suggestTarget, setSuggestTarget] = useState<Suggestion['target'] | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [claimState, setClaimState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [claimError, setClaimError] = useState<string | null>(null);

  const pending = usePendingFor(personId);
  const suggestedFields = usePersonSuggestedFields(person);
  const [params, setParams] = useSearchParams();

  // Deep link from the admin queue: open the editor straight away.
  useEffect(() => {
    if (params.get('edit') === '1' && person) {
      setEditPerson(person);
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, person?.id]);

  if (!person) return <Navigate to="/people" replace />;

  const unions = unionsAsPartner(data, person.id);
  const parents = parentUnionOf(data, person.id);
  const linkedPersonId =
    state.phase === 'approved'
      ? (state.membership as { personId?: string }).personId
      : undefined;
  const isMe = linkedPersonId === person.id;
  const canClaim = !linkedPersonId && claimState !== 'sent';

  async function claim() {
    if (!person) return;
    setClaimState('sending');
    setClaimError(null);
    try {
      await suggest(
        { kind: 'identity.claim', personId: person.id, name: person.name.en },
        person.name.en,
      );
      setClaimState('sent');
    } catch (e) {
      // Without this the rejection was unhandled: the button simply went
      // dead and the member was never told anything had gone wrong.
      setClaimState('idle');
      setClaimError(friendlyError(e, 'Could not send that — please try again.'));
      reportClientError('suggest', e, { claimFor: person.id });
    }
  }

  return (
    <motion.main
      key={person.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto max-w-2xl px-4 pb-28 pt-8"
    >
      <div className="flex flex-col items-center text-center">
        <PortraitTurn person={person} />
        <h1 className="m-0 mt-5" style={{ fontFamily: 'var(--font-display)' }}>
          <BiNameBlock
            person={person}
            enClass="text-3xl font-semibold leading-tight"
            nativeClass="text-xl mt-1"
          />
        </h1>
        {person.nickname?.en && (
          <p className="m-0 mt-2 text-[15px] text-ink-soft">
            called <span className="font-medium text-ink">{person.nickname.en}</span>
            {person.nickname.native && (
              <span lang={pack.langTag} className="ml-2 text-ink-faint">
                {person.nickname.native}
              </span>
            )}
          </p>
        )}
        <Lifespan person={person} className="mt-2 text-base" />
        <KinshipLine personId={person.id} />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {isMe && (
            <span className="rounded-full bg-pasupu-soft px-3 py-1 text-[13px] font-semibold text-nili-deep">
              This is you
            </span>
          )}
          {pending.length > 0 && (
            <PendingBadge count={pending.length} onClick={() => setReviewOpen(true)} />
          )}
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-lg rounded-[var(--radius-card)] bg-card p-6 shadow-card">
        <PersonDetails
          person={person}
          suggested={suggestedFields}
          onOpenSuggestions={() => setEditPerson(person)}
          showParentNames={!parents}
        />
        {!person.bio &&
          !person.birth &&
          !person.death &&
          !person.gotra &&
          !person.place && (
            <p className="m-0 text-center text-[15px] text-ink-faint">
              The family remembers {person.name.en} — their story is still to be
              written here.
            </p>
          )}
        {role === 'admin' && (person as { lastEditedBy?: string }).lastEditedBy && (
          <p className="m-0 mt-4 border-t border-line pt-3 text-[13px] text-ink-faint">
            Last updated by {(person as { lastEditedBy?: string }).lastEditedBy}
          </p>
        )}
      </div>

      <nav
        aria-label={`${person.name.en}'s families`}
        className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-2.5"
      >
        {unions.map((u) => {
          const spouseId = spouseOf(u, person.id);
          const spouse = spouseId ? data.people[spouseId] : undefined;
          return (
            <Link
              key={u.id}
              to={`/f/${u.id}`}
              className="inline-flex min-h-12 items-center rounded-full bg-nili px-6 font-medium text-[#fffdf8] no-underline shadow-card"
            >
              {spouse ? `With ${spouse.name.en} →` : 'Their family →'}
            </Link>
          );
        })}
        {parents && (
          <Link
            to={`/f/${parents.id}`}
            className="inline-flex min-h-12 items-center rounded-full border border-line bg-card px-6 font-medium text-ink-soft no-underline shadow-card"
          >
            ↑ Parents&rsquo; family
          </Link>
        )}
      </nav>

      <div
        className={`mx-auto mt-10 grid max-w-lg gap-2.5 border-t border-line/70 pt-6 ${
          unions.length === 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        <ActionButton onClick={() => setEditPerson(person)}>
          ✎ {role === 'admin' ? 'Edit details' : 'Suggest an edit'}
        </ActionButton>
        {unions.length === 0 && (
          <ActionButton onClick={() => setStartFamily(person)}>❖ Start a family</ActionButton>
        )}
        <ActionButton
          onClick={() =>
            setSuggestTarget({ kind: 'person', id: person.id, label: person.name.en })
          }
        >
          🪔 Share a memory
        </ActionButton>
      </div>

      {canClaim && (
        <div className="mx-auto mt-4 max-w-lg text-center">
          <button
            type="button"
            onClick={claim}
            disabled={claimState === 'sending'}
            className="text-sm font-medium text-ink-faint underline-offset-4 hover:underline disabled:opacity-60"
          >
            {claimState === 'sending'
              ? 'Sending…'
              : 'Is this you? Tell the admins — “This is me”'}
          </button>
          {claimError && (
            <p role="alert" className="m-0 mt-2 text-sm text-nili">
              {claimError}
            </p>
          )}
        </div>
      )}
      {claimState === 'sent' && (
        <p className="mx-auto mt-4 max-w-lg rounded-2xl bg-pasupu-soft p-4 text-center text-[15px] text-nili-deep">
          Sent 🪔 — an admin will link your account to {person.name.en}.
        </p>
      )}

      <PersonEditSheet person={editPerson} onClose={() => setEditPerson(null)} />
      <StartFamilySheet data={data} person={startFamily} onClose={() => setStartFamily(null)} />
      <SuggestSheet target={suggestTarget} onClose={() => setSuggestTarget(null)} />
      <ReviewSheet
        open={reviewOpen}
        rows={pending}
        label={person.name.en}
        onClose={() => setReviewOpen(false)}
        onEditChange={() => {
          // Editing happens inline: open the sheet, where each suggestion
          // sits on the field it touches.
          setReviewOpen(false);
          setEditPerson(person);
        }}
      />
    </motion.main>
  );
}

function ActionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-line bg-card text-[15px] font-medium text-ink-soft shadow-card transition-transform active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
