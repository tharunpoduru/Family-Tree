/**
 * Small shared person-rendering pieces: bilingual name, meta rows.
 * Everything renders nothing (not placeholders) when data is absent.
 * Rows with a pending suggestion carry a "!" so nobody has to open the
 * editor to discover there is one.
 */
import type { Person } from '../types/family';
import { formatFamilyDate, lifespanOf } from '../lib/format';
import { FIELD_LABEL, type FieldKey } from '../lib/diff';
import { GOTRAS, GOTRA_LABEL, NAKSHATRAS, NAKSHATRA_LABEL, withNative } from '../lib/tradition';
import { pack } from '../family.config';

export function BiNameBlock({
  person,
  enClass = '',
  nativeClass = '',
}: {
  person: Person;
  enClass?: string;
  nativeClass?: string;
}) {
  return (
    <span className="block">
      <span className={`block ${enClass}`}>{person.name.en}</span>
      {person.name.native && (
        <span lang={pack.langTag} className={`block text-ink-soft ${nativeClass}`}>
          {person.name.native}
        </span>
      )}
    </span>
  );
}

export function Lifespan({ person, className = '' }: { person: Person; className?: string }) {
  const span = lifespanOf(person);
  if (!span) return null;
  return <span className={`text-ink-faint tabular-nums ${className}`}>{span}</span>;
}

function Mark({ count, onClick }: { count: number; onClick?: () => void }) {
  const body = (
    <span className="inline-grid size-5 place-items-center rounded-full bg-pasupu text-[11px] font-bold leading-none text-[#2b2118]">
      !
    </span>
  );
  const label = `${count} suggested change${count > 1 ? 's' : ''} to this`;
  if (!onClick) return <span title={label}>{body}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative z-10 align-middle"
    >
      {body}
    </button>
  );
}

/** Labeled detail rows for pages — omit-if-absent, mark-if-suggested. */
export function PersonDetails({
  person,
  suggested,
  onOpenSuggestions,
  showParentNames = true,
}: {
  person: Person;
  suggested?: Map<FieldKey, number>;
  onOpenSuggestions?: () => void;
  /** False when their parents have a real page — the link says it better. */
  showParentNames?: boolean;
}) {
  const rows: Array<[FieldKey, string, string]> = [];
  if (person.maidenName?.en)
    rows.push(['maidenName', 'Family born into', person.maidenName.en]);
  const birth = formatFamilyDate(person.birth);
  if (birth) rows.push(['birth', 'Born', birth]);
  if (person.birthPlace) rows.push(['birthPlace', 'Birthplace', person.birthPlace]);
  const death = formatFamilyDate(person.death);
  if (death) rows.push(['death', 'Passed', death]);
  if (person.deathPlace) rows.push(['deathPlace', 'Passed in', person.deathPlace]);
  if (person.gotra) rows.push(['gotra', GOTRA_LABEL, withNative(person.gotra, GOTRAS)]);
  if (person.nakshatra)
    rows.push(['nakshatra', NAKSHATRA_LABEL, withNative(person.nakshatra, NAKSHATRAS)]);
  if (person.place) rows.push(['place', 'Native place', person.place]);
  // Parents by name — only when they aren't people in the tree.
  if (showParentNames && person.fatherName?.en)
    rows.push(['fatherName', 'Father', person.fatherName.en]);
  if (showParentNames && person.motherName?.en)
    rows.push(['motherName', 'Mother', person.motherName.en]);

  /** Suggested fields the person doesn't have yet — otherwise invisible. */
  const missing = suggested
    ? ([...suggested.keys()].filter(
        (k) => !rows.some(([rk]) => rk === k) && k !== 'bio' && k !== 'portrait',
      ) as FieldKey[])
    : [];

  if (!rows.length && !person.bio && !missing.length) return null;

  return (
    <div className="space-y-3">
      {(rows.length > 0 || missing.length > 0) && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
          {rows.map(([key, label, value]) => (
            <div key={label} className="contents">
              <dt className="text-ink-faint">{label}</dt>
              <dd className="m-0 flex flex-wrap items-center gap-2 text-ink-soft">
                {value}
                {suggested?.get(key) && (
                  <Mark count={suggested.get(key)!} onClick={onOpenSuggestions} />
                )}
              </dd>
            </div>
          ))}
          {missing.map((key) => (
            <div key={key} className="contents">
              <dt className="text-ink-faint">{LABELS[key]}</dt>
              <dd className="m-0 flex flex-wrap items-center gap-2 text-ink-faint italic">
                suggested
                <Mark count={suggested!.get(key)!} onClick={onOpenSuggestions} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {person.bio && (
        <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
          {person.bio}
          {suggested?.get('bio') && (
            <span className="ml-2">
              <Mark count={suggested.get('bio')!} onClick={onOpenSuggestions} />
            </span>
          )}
        </p>
      )}
      {!person.bio && suggested?.get('bio') && (
        <p className="m-0 flex items-center gap-2 text-[15px] italic text-ink-faint">
          A story has been suggested
          <Mark count={suggested.get('bio')!} onClick={onOpenSuggestions} />
        </p>
      )}
    </div>
  );
}

const LABELS = FIELD_LABEL;
