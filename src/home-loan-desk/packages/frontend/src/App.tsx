import { HashRouter, Link, Navigate, Route, Routes } from 'react-router';

import { AppShell } from './components/app-shell';
import { EmptyState } from './components/states';
import { LabDataGate } from './lab/lab-data-gate';
import { CaseDetailPage } from './pages/case-detail/case-detail-page';
import { CasesPage } from './pages/cases-page';
import { ManagerPage } from './pages/manager-page';
import { SeedPage } from './pages/seed-page';

/**
 * Hash routes (`#/cases/HL-1042`) work both standalone and embedded in the
 * Fabric portal, and need no server-side fallback from static hosting.
 */
function App() {
  return (
    <HashRouter>
      <LabDataGate>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/cases" replace />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/cases/:caseNumber" element={<CaseDetailPage />} />
            <Route path="/manager" element={<ManagerPage />} />
            <Route path="/seed" element={<SeedPage />} />
            <Route
              path="*"
              element={
                <EmptyState
                  title="Page not found"
                  action={
                    <Link to="/cases" className="text-primary underline underline-offset-2">
                      Go to my cases
                    </Link>
                  }
                />
              }
            />
          </Routes>
        </AppShell>
      </LabDataGate>
    </HashRouter>
  );
}

export default App;
