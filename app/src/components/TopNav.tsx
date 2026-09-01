/**
 * Glass top navigation — one of the few places the glassmorphism research
 * is applied (surface treatment for chrome, never for content).
 */
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { familyConfig, pack } from '../family.config';

export function TopNav({
  theme,
  onToggleTheme,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const { pathname } = useLocation();
  const { state, signOut } = useAuth();
  const approved = state.phase === 'approved';
  const isAdmin = approved && state.membership.role === 'admin';
  const links = approved
    ? [
        { to: '/tree', label: 'Tree' },
        { to: '/people', label: 'People' },
        { to: '/years', label: 'Years' },
        ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
      ]
    : [];
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/70 backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4"
      >
        {/* Deliberately no aria-label: the visible name IS the accessible
            name, so voice control ("click <family name>") matches what a
            user can see (WCAG 2.5.3 Label in Name). */}
        <Link
          to="/"
          className="mr-auto flex items-baseline gap-2 no-underline"
        >
          <span
            className="text-lg font-semibold text-nili"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {familyConfig.name.en}
          </span>
          {familyConfig.name.native && (
            <span lang={pack.langTag} className="text-sm text-ink-faint">
              {familyConfig.name.native}
            </span>
          )}
        </Link>
        {/* Desktop links; mobile navigation lives in the bottom tab bar. */}
        <div className="hidden items-center gap-2 sm:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              aria-current={pathname.startsWith(l.to) ? 'page' : undefined}
              className={`rounded-full px-3.5 py-2 text-[15px] font-medium no-underline transition-colors min-h-11 inline-flex items-center ${
                pathname.startsWith(l.to)
                  ? 'bg-pasupu-soft text-nili-deep'
                  : 'text-ink-soft hover:bg-paper-warm'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          className="grid size-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-warm"
        >
          {theme === 'light' ? '☾' : '☀'}
        </button>
        {approved && (
          <button
            type="button"
            onClick={() => signOut()}
            aria-label="Sign out"
            title="Sign out"
            className="grid size-11 place-items-center rounded-full text-ink-faint transition-colors hover:bg-paper-warm"
          >
            ⎋
          </button>
        )}
      </nav>
    </header>
  );
}
