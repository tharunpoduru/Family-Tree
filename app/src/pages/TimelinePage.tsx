/**
 * Timeline (PRD R11): the family through time — every dated birth,
 * marriage, and passing, grouped by decade. The tree shows structure;
 * this shows history.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useReadyData } from '../lib/data';
import { destinationFor, parentUnionOf } from '../lib/graph';
import { formatGregorian } from '../lib/format';
import type { FamilyData } from '../types/family';

interface Event {
  year: number;
  dateLabel: string;
  kind: 'birth' | 'marriage' | 'death';
  label: string;
  href: string;
}

const KIND_META: Record<Event['kind'], { symbol: string; verb: string }> = {
  birth: { symbol: '✿', verb: 'Born' },
  marriage: { symbol: '❖', verb: 'Married' },
  death: { symbol: '🪔', verb: 'Passed Away' },
};

function hrefForPerson(data: FamilyData, personId: string): string {
  const dest = destinationFor(data, personId);
  if (dest.kind === 'family') return `/f/${dest.unionId}`;
  const parents = parentUnionOf(data, personId);
  return parents ? `/f/${parents.id}?person=${personId}` : `/f/${data.rootUnion}`;
}

function collectEvents(data: FamilyData): Event[] {
  const events: Event[] = [];
  for (const person of Object.values(data.people)) {
    const href = hrefForPerson(data, person.id);
    if (person.birth?.gregorian) {
      events.push({
        year: Number(person.birth.gregorian.slice(0, 4)),
        dateLabel: formatGregorian(person.birth.gregorian),
        kind: 'birth',
        label: person.name.en,
        href,
      });
    }
    if (person.death?.gregorian) {
      events.push({
        year: Number(person.death.gregorian.slice(0, 4)),
        dateLabel: formatGregorian(person.death.gregorian),
        kind: 'death',
        label: person.name.en,
        href,
      });
    }
  }
  for (const union of Object.values(data.unions)) {
    if (union.marriage?.gregorian) {
      const names = (union.partners as string[])
        .map((p) => data.people[p]?.name.en)
        .filter(Boolean)
        .join(' & ');
      events.push({
        year: Number(union.marriage.gregorian.slice(0, 4)),
        dateLabel: formatGregorian(union.marriage.gregorian),
        kind: 'marriage',
        label: names,
        href: `/f/${union.id}`,
      });
    }
  }
  return events.sort((a, b) => a.year - b.year);
}

interface Bucket {
  key: string;
  label: string;
  /** 10, 5, or 1 — how wide a span this bucket covers. */
  span: number;
  events: Event[];
}

/**
 * A decade holding this few events reads better whole than cut in half —
 * the early years are a scatter of remembered dates, not a sequence.
 */
const SPARSE = 4;

/**
 * A steady five-year grid — 1900, 1905, 1910 — with empty stretches
 * simply absent. The heading is the year the period opens, the way a
 * cohort is named; the events beneath carry their own exact dates.
 *
 * The one exception is a decade too sparse to divide: three remembered
 * dates split across two headings reads as a gap in the record rather
 * than a period of the family's life, so those stay whole as "1930s".
 */
function bucketEvents(events: Event[]): Bucket[] {
  const byDecade = new Map<number, Event[]>();
  for (const e of events) {
    const d = Math.floor(e.year / 10) * 10;
    byDecade.set(d, [...(byDecade.get(d) ?? []), e]);
  }

  return [...byDecade.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([decade, evs]): Bucket[] => {
      if (evs.length <= SPARSE) {
        return [{ key: `d${decade}`, label: `${decade}s`, span: 10, events: evs }];
      }
      const byPeriod = new Map<number, Event[]>();
      for (const e of evs) {
        const start = Math.floor(e.year / 5) * 5;
        byPeriod.set(start, [...(byPeriod.get(start) ?? []), e]);
      }
      return [...byPeriod.entries()]
        .sort(([a], [b]) => a - b)
        .map(([start, list]) => ({
          key: `p${start}`,
          label: String(start),
          span: 5,
          events: list,
        }));
    });
}

export function TimelinePage() {
  const data = useReadyData();
  const decades = useMemo(() => bucketEvents(collectEvents(data)), [data]);

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto max-w-2xl px-4 pb-24 pt-6"
    >
      <h1 className="m-0 text-3xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
        Through the Years
      </h1>
      <p className="m-0 mt-1 mb-8 text-ink-faint">
        Births, weddings, and farewells — the family through time.
      </p>
      {/*
        Rail and dots share one grid column and are both centered in it,
        so they cannot drift apart at any font size or zoom level.
      */}
      <div>
        {decades.map(({ key, label, span, events }, di) => {
          const isLast = di === decades.length - 1;
          return (
            <motion.section
              key={key}
              aria-label={label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              {/*
                The heading sticks under the nav while its own events
                scroll past, so the period you are reading is never in
                doubt — the fix for a section that runs long.
                items-center puts the dot on the text's optical centre
                whatever the font metrics do.
              */}
              <div className="sticky top-14 z-10 grid grid-cols-[18px_1fr] items-center gap-x-4 bg-paper/85 py-1.5 backdrop-blur-sm">
                <div className="relative flex h-full justify-center">
                  <span aria-hidden className="absolute inset-y-0 w-0.5 bg-line" />
                  {/* A whole decade gets the larger dot, so the sparse
                      early years still read as the major beats. */}
                  <span
                    aria-hidden
                    className={`relative shrink-0 self-center rounded-full ring-4 ring-paper ${
                      span === 10 ? 'size-3 bg-pasupu' : 'size-2.5 bg-pasupu'
                    }`}
                  />
                </div>
                <h2
                  className="m-0 py-1 text-2xl font-semibold leading-none text-pasupu tabular-nums"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {label}
                </h2>
              </div>
              {/* Body row: the rail continues, or stops if this is the last. */}
              <div className="grid grid-cols-[18px_1fr] gap-x-4">
                <div className="relative flex justify-center">
                  {!isLast && (
                    <span aria-hidden className="absolute inset-y-0 w-0.5 bg-line" />
                  )}
                </div>
                <ul className="m-0 grid list-none gap-2.5 pb-10 pl-0 pr-0 pt-4">
                  {events.map((e, i) => (
                    <li key={`${e.kind}-${e.label}-${i}`}>
                      <Link
                        to={e.href}
                        className="flex min-h-[56px] items-center gap-3.5 rounded-[var(--radius-card)] bg-card p-3.5 text-ink no-underline shadow-card transition-transform active:scale-[0.985]"
                      >
                        <span aria-hidden className="w-6 shrink-0 text-center text-lg">
                          {KIND_META[e.kind].symbol}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium leading-tight">
                            {e.label}
                          </span>
                          <span className="block text-sm text-ink-faint">
                            {KIND_META[e.kind].verb} · {e.dateLabel}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.section>
          );
        })}
      </div>
    </motion.main>
  );
}
