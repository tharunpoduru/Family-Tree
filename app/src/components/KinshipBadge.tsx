/**
 * "Who is this person to me?" — shown only when the viewer's account is
 * linked to someone in the tree. The native-script term leads; the
 * English gloss follows for anyone who doesn't know the word yet, which
 * is rather the point. With the english pack there is no native term
 * and the gloss stands alone.
 */
import { useReadyData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { kinshipOf } from '../lib/kinship';
import { pack } from '../family.config';
import type { PersonId } from '../types/family';

export function useKinship(targetId: PersonId | undefined) {
  const data = useReadyData();
  const { state } = useAuth();
  const viewerPersonId =
    state.phase === 'approved' ? state.membership.personId : undefined;
  if (!viewerPersonId || !targetId) return null;
  return kinshipOf(data, viewerPersonId, targetId);
}

export function KinshipBadge({
  personId,
  className = '',
}: {
  personId: PersonId | undefined;
  className?: string;
}) {
  const kin = useKinship(personId);
  if (!kin || kin.en === 'you') return null;
  return (
    <span
      className={`inline-flex flex-wrap items-baseline gap-x-2 rounded-full bg-pasupu-soft px-3 py-1 ${className}`}
    >
      {kin.native && (
        <span lang={pack.langTag} className="text-[15px] font-semibold text-nili-deep">
          {kin.native}
        </span>
      )}
      <span
        className={
          kin.native
            ? 'text-[13px] text-ink-soft'
            : 'text-[15px] font-semibold text-nili-deep'
        }
      >
        your {kin.en}
        {kin.approximate && ' (roughly)'}
      </span>
    </span>
  );
}

/** Compact form for the person's own page header. */
export function KinshipLine({ personId }: { personId: PersonId | undefined }) {
  const kin = useKinship(personId);
  if (!kin) return null;
  if (kin.en === 'you') {
    return (
      <p className="m-0 mt-2 text-[15px] text-ink-faint">
        {kin.native ? (
          <>
            <span lang={pack.langTag}>{kin.native}</span> — this is you
          </>
        ) : (
          'This is you'
        )}
      </p>
    );
  }
  return (
    <p className="m-0 mt-3">
      <KinshipBadge personId={personId} />
    </p>
  );
}
