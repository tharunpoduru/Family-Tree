/**
 * Mobile bottom tab bar — thumb-reachable, the pattern every phone user
 * already knows. Shown only to approved members, only below the sm
 * breakpoint (desktop keeps the top nav links).
 */
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const ICONS: Record<string, string> = {
  // Minimal single-path icons, stroke-based, 24×24.
  home: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z',
  tree: 'M12 3v5m0 0c-4 0-7 2-7 6v2m7-8c4 0 7 2 7 6v2m-7-8v13',
  people:
    'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 1a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5m2 0c0-2.5 1.5-4 4-4',
  years: 'M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  admin: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
};

export function BottomNav() {
  const { pathname } = useLocation();
  const { state } = useAuth();
  if (state.phase !== 'approved') return null;
  const isAdmin = state.membership.role === 'admin';

  const tabs = [
    { to: '/', label: 'Home', icon: 'home', exact: true },
    { to: '/tree', label: 'Tree', icon: 'tree' },
    { to: '/people', label: 'People', icon: 'people' },
    { to: '/years', label: 'Years', icon: 'years' },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: 'admin' }] : []),
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/60 bg-paper/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
    >
      <ul className="m-0 flex list-none items-stretch justify-around p-0">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <li key={t.to} className="flex-1">
              <Link
                to={t.to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 no-underline ${
                  active ? 'text-nili' : 'text-ink-faint'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={ICONS[t.icon]} />
                </svg>
                <span className="text-[11px] font-medium">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
