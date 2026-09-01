/**
 * Everything behind the door.
 *
 * Loaded lazily so that a signed-out visitor never downloads the family
 * pages, the data layer, or the Firestore SDK they cannot use — the
 * doorstep paints from the static shell and the auth SDK alone (PRD R7).
 */
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { FamilyDataProvider, useFamilyData } from './lib/data';
import { PendingProvider } from './lib/pending';
import { HomePage } from './pages/HomePage';
import { FamilyPage } from './pages/FamilyPage';
import { TreePage } from './pages/TreePage';
import { DirectoryPage } from './pages/DirectoryPage';
import { TimelinePage } from './pages/TimelinePage';
import { PersonPage } from './pages/PersonPage';

const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);

export default function AppShell({ isAdmin }: { isAdmin: boolean }) {
  return (
    <FamilyDataProvider>
      <PendingProvider>
        <DataGate isAdmin={isAdmin} />
      </PendingProvider>
    </FamilyDataProvider>
  );
}

function DataGate({ isAdmin }: { isAdmin: boolean }) {
  const data = useFamilyData();
  if (data.phase === 'loading') return <CenteredNote text="Gathering the family…" />;
  if (data.phase === 'error')
    return <CenteredNote text={`Something went wrong: ${data.message}`} />;

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/f/:unionId" element={<FamilyPage />} />
      <Route path="/tree" element={<TreePage />} />
      <Route path="/people" element={<DirectoryPage />} />
      <Route path="/p/:personId" element={<PersonPage />} />
      <Route path="/years" element={<TimelinePage />} />
      {isAdmin && (
        <Route
          path="/admin"
          element={
            <Suspense fallback={<CenteredNote text="Opening admin…" />}>
              <AdminPage />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

function CenteredNote({ text }: { text: string }) {
  return (
    <main className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-6">
      <p className="text-ink-faint">{text}</p>
    </main>
  );
}
