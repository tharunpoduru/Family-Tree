/**
 * The directory (R4): every person, alphabetical, live search.
 * Tapping opens the person's own page. Every person reachable.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useReadyData } from '../lib/data';
import { allPeopleSorted, matchesQuery } from '../lib/graph';
import { Avatar } from '../components/Avatar';
import { BiNameBlock, Lifespan } from '../components/PersonBits';

export function DirectoryPage() {
  const data = useReadyData();
  const [query, setQuery] = useState('');
  const everyone = useMemo(() => allPeopleSorted(data), [data]);
  const results = everyone.filter((p) => matchesQuery(p, query));

  return (
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto max-w-3xl px-4 pb-24 pt-6"
    >
      <h1
        className="m-0 mb-1 text-3xl font-semibold"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        People
      </h1>
      <p className="m-0 mb-5 text-ink-faint">
        {everyone.length} family members across the generations
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name…"
        aria-label="Search people by name"
        className="mb-6 w-full rounded-full border border-line bg-card px-5 py-3.5 text-base text-ink shadow-card outline-none placeholder:text-ink-faint focus:border-pasupu"
      />
      {results.length === 0 ? (
        <p className="text-ink-faint">
          No one found for “{query}”. Try a shorter spelling.
        </p>
      ) : (
        <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2">
          {results.map((person) => (
            <li key={person.id}>
              <Link
                to={`/p/${person.id}`}
                className="flex min-h-[68px] items-center gap-3.5 rounded-[var(--radius-card)] bg-card p-3.5 text-ink no-underline shadow-card transition-transform active:scale-[0.985]"
              >
                <Avatar person={person} size="sm" />
                <div className="min-w-0 flex-1">
                  <BiNameBlock person={person} enClass="font-medium leading-tight" nativeClass="text-[13px]" />
                  {person.nickname?.en && (
                    <span className="block truncate text-[13px] text-ink-faint">
                      called {person.nickname.en}
                    </span>
                  )}
                </div>
                <Lifespan person={person} className="text-[13px] whitespace-nowrap" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.main>
  );
}
