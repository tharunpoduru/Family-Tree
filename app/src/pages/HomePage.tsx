/**
 * The landing page: a warm welcome that orients rather than decorates.
 * The name, the size of the family, the ways in, what's new, and — for
 * members — the status of anything they've suggested.
 */
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useReadyData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { usePending } from '../lib/pending';
import { generationOf, homeUnionOf } from '../lib/graph';
import { Avatar } from '../components/Avatar';
import { lifespanOf } from '../lib/format';
import { familyConfig, pack } from '../family.config';

export function HomePage() {
  const data = useReadyData();
  const { state } = useAuth();
  const { all, mine } = usePending();
  const isAdmin = state.phase === 'approved' && state.membership.role === 'admin';

  const peopleCount = Object.keys(data.people).length;
  const familyCount = Object.keys(data.unions).length;
  const generations =
    Math.max(0, ...Object.keys(data.unions).map((id) => generationOf(data, id))) + 2;

  const youngest = Object.values(data.people)
    .filter((p) => p.birth?.gregorian && !p.death)
    .sort((a, b) => (b.birth!.gregorian! > a.birth!.gregorian! ? 1 : -1))
    .slice(0, 4);

  const myPending = mine.filter((m) => m.status === 'pending').length;
  const myApplied = mine.filter((m) => m.status === 'applied').length;

  return (
    <main className="relative mx-auto max-w-3xl px-4 pb-28 pt-10 sm:pt-16">
      <SilkAurora />

      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="text-center"
      >
        <p className="m-0 text-[13px] font-medium uppercase tracking-[0.25em] text-nili">
          {familyConfig.tagline}
        </p>
        <h1
          className="m-0 mt-2 text-6xl font-semibold leading-none sm:text-7xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {familyConfig.name.en}
        </h1>
        {familyConfig.name.native && (
          <p lang={pack.langTag} className="m-0 mt-3 text-3xl text-ink-soft">
            {familyConfig.name.native}
          </p>
        )}
      </motion.header>

      <motion.dl
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
        className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-3"
      >
        {[
          [peopleCount, 'People'],
          [familyCount, 'Families'],
          [generations, 'Generations'],
        ].map(([n, label]) => (
          <div
            key={label as string}
            className="rounded-[var(--radius-card)] bg-card p-4 text-center shadow-card"
          >
            <dt className="sr-only">{label}</dt>
            <dd
              className="m-0 text-3xl font-semibold text-nili"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {n}
            </dd>
            <dd className="m-0 mt-0.5 text-[13px] text-ink-faint">{label}</dd>
          </div>
        ))}
      </motion.dl>

      <motion.nav
        aria-label="Ways in"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16, ease: 'easeOut' }}
        className="mt-8 grid gap-3 sm:grid-cols-3"
      >
        <WayIn
          to="/tree"
          title="The Tree"
          blurb="Walk the whole family, generation by generation"
          primary
        />
        <WayIn to="/people" title="People" blurb="Find anyone by name" />
        <WayIn to="/years" title="Years" blurb="Births, Weddings and Farewells" />
      </motion.nav>

      {isAdmin && all.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.24 }}
          className="mt-6"
        >
          <Link
            to="/admin"
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-pasupu bg-pasupu-soft p-4 text-nili-deep no-underline shadow-card"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pasupu text-lg font-bold text-[#2b2118]">
              !
            </span>
            <span className="text-[15px] font-medium">
              {all.length} suggested {all.length === 1 ? 'change is' : 'changes are'} waiting
              for you
            </span>
          </Link>
        </motion.div>
      )}

      {!isAdmin && mine.length > 0 && (
        <motion.section
          aria-label="Your suggestions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.24 }}
          className="mt-6 rounded-[var(--radius-card)] bg-card p-5 shadow-card"
        >
          <h2 className="m-0 text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            What you&rsquo;ve shared
          </h2>
          <p className="m-0 mt-1.5 text-[15px] leading-relaxed text-ink-soft">
            {myPending > 0 && (
              <>
                <strong>{myPending}</strong> waiting for an admin
                {myApplied > 0 && ' · '}
              </>
            )}
            {myApplied > 0 && (
              <>
                <strong>{myApplied}</strong> now part of the family record 🪔
              </>
            )}
            {myPending === 0 && myApplied === 0 && 'Nothing pending.'}
          </p>
        </motion.section>
      )}

      {youngest.length > 0 && (
        <motion.section
          aria-label="The youngest"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45 }}
          className="mt-10"
        >
          <h2
            className="m-0 mb-4 text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            The newest among us
          </h2>
          <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2">
            {youngest.map((p) => {
              const home = homeUnionOf(data, p.id);
              return (
                <li key={p.id}>
                  <Link
                    to={home ? `/f/${home.id}` : `/p/${p.id}`}
                    className="flex min-h-[64px] items-center gap-3.5 rounded-[var(--radius-card)] bg-card p-3.5 text-ink no-underline shadow-card transition-transform active:scale-[0.985]"
                  >
                    <Avatar person={p} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium leading-tight">
                        {p.name.en}
                      </span>
                      <span className="block text-[13px] text-ink-faint">
                        {lifespanOf(p)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </motion.section>
      )}
    </main>
  );
}

function WayIn({
  to,
  title,
  blurb,
  primary,
}: {
  to: string;
  title: string;
  blurb: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`block rounded-[var(--radius-card)] p-5 text-center no-underline shadow-card transition-transform active:scale-[0.98] ${
        primary ? 'bg-nili text-[#fffdf8]' : 'bg-card text-ink'
      }`}
    >
      <span
        className="block text-lg font-semibold"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </span>
      <span
        className={`mt-1 block text-[14px] leading-snug ${
          primary ? 'text-[#fffdf8]/80' : 'text-ink-faint'
        }`}
      >
        {blurb}
      </span>
    </Link>
  );
}

/** Slow-breathing silk blobs — the only decoration the page needs. */
function SilkAurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] overflow-hidden">
      <style>{`
        @keyframes silk-a { 0%,100% { transform: translate(-10%,-6%) scale(1);} 50% { transform: translate(6%,4%) scale(1.15);} }
        @keyframes silk-b { 0%,100% { transform: translate(8%,4%) scale(1.1);} 50% { transform: translate(-6%,-6%) scale(.95);} }
        @keyframes silk-c { 0%,100% { transform: translate(0,8%) scale(1);} 50% { transform: translate(4%,-6%) scale(1.2);} }
      `}</style>
      <div
        className="absolute left-[6%] top-[4%] size-[44vmin] rounded-full opacity-[0.20] blur-[70px]"
        style={{ background: 'var(--color-pasupu)', animation: 'silk-a 12s ease-in-out infinite' }}
      />
      <div
        className="absolute right-[4%] top-[16%] size-[38vmin] rounded-full opacity-[0.15] blur-[80px]"
        style={{ background: 'var(--color-nili)', animation: 'silk-b 14s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-[6%] left-[28%] size-[34vmin] rounded-full opacity-[0.12] blur-[75px]"
        style={{ background: 'var(--color-leaf)', animation: 'silk-c 16s ease-in-out infinite' }}
      />
    </div>
  );
}
