import { lazy, Suspense, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { TopNav } from './components/TopNav';
import { BottomNav } from './components/BottomNav';
import { DoorstepPage } from './pages/DoorstepPage';

/**
 * The family pages — and the Firestore SDK they depend on — are only
 * fetched once someone is actually approved. A signed-out visitor pays
 * for none of it (PRD R7).
 */
const AppShell = lazy(() => import('./AppShell'));

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  const stored = localStorage.getItem('family-tree-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('family-tree-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <TopNav
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        />
        <Gate />
        <BottomNav />
      </AuthProvider>
    </MotionConfig>
  );
}

function Gate() {
  const { state } = useAuth();

  if (state.phase === 'loading') return <CenteredNote text="Opening…" />;
  if (state.phase !== 'approved') return <DoorstepPage />;

  return (
    <Suspense fallback={<CenteredNote text="Gathering the family…" />}>
      <AppShell isAdmin={state.membership.role === 'admin'} />
    </Suspense>
  );
}

function CenteredNote({ text }: { text: string }) {
  return (
    <main className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-6">
      <p className="text-ink-faint">{text}</p>
    </main>
  );
}
