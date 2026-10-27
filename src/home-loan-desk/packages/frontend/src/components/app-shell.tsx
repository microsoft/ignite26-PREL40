import { useState, type FormEvent, type ReactNode } from 'react';
import { Lock, Search } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router';

import { AccountMenu } from '@/components/account-menu';
import { GitHubMark, Wordmark } from '@/components/brand';
import { cn } from '@/lib/utils';

const LAB_REPOSITORY_URL = 'https://github.com/microsoft/ignite26-PREL40';

/** Set `enabled: true` on Portfolio once the semantic model is connected. */
const NAV_ITEMS: readonly { to: string; label: string; enabled: boolean }[] = [
  { to: '/cases', label: 'My cases', enabled: true },
  { to: '/manager', label: 'Portfolio', enabled: false },
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-nav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 bg-nav text-nav-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-600 px-400 sm:px-600">
          <Link to="/cases" aria-label="Caldova Operations Desk, my cases" className={cn('flex h-14 items-center rounded-md', focusRing)}>
            <Wordmark compactOnMobile onNav />
          </Link>

          <nav aria-label="Main" className="order-last -mx-200 flex w-full items-center gap-100 pb-200 md:order-none md:mx-0 md:w-auto md:pb-0">
            {NAV_ITEMS.map((item) =>
              item.enabled ? (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-300 py-100 text-300 font-medium transition-colors',
                      focusRing,
                      isActive ? 'bg-nav-active text-nav-foreground' : 'text-nav-muted hover:bg-nav-hover hover:text-nav-foreground'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ) : (
                <span
                  key={item.to}
                  role="link"
                  aria-disabled="true"
                  title="Coming soon"
                  className="flex cursor-not-allowed items-center gap-100 rounded-md px-300 py-100 text-300 font-medium text-nav-muted/50 select-none"
                >
                  {item.label}
                  <Lock aria-hidden="true" className="icon-size-100" />
                  <span className="sr-only">(coming soon)</span>
                </span>
              )
            )}
          </nav>

          <div className="ml-auto flex h-14 items-center gap-300">
            <OpenCaseForm />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-400 py-600 sm:px-600">{children}</main>

      <AppFooter />
    </div>
  );
}

/** Jump straight to a case by number, including ones you may not have access to. */
function OpenCaseForm() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const caseNumber = value.trim().toUpperCase();
    if (!caseNumber) return;
    navigate(`/cases/${encodeURIComponent(caseNumber)}`);
    setValue('');
  };

  return (
    <form onSubmit={submit} role="search" className="flex items-center">
      <label htmlFor="open-case" className="sr-only">
        Open case by number
      </label>
      <div className="flex h-8 items-center rounded-lg border border-nav-border bg-nav-field transition-colors hover:border-nav-muted/50 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
        <Search aria-hidden="true" className="ml-200 icon-size-200 text-nav-muted" />
        <input
          id="open-case"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Go to case"
          maxLength={16}
          autoComplete="off"
          spellCheck={false}
          className="w-24 bg-transparent px-200 text-300 text-nav-foreground tabular-nums placeholder:text-nav-muted focus:outline-none sm:w-36"
        />
      </div>
    </form>
  );
}

function AppFooter() {
  const footerLink =
    'flex items-center gap-100 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-x-600 gap-y-100 px-400 py-400 text-center text-200 text-muted-foreground sm:px-600 md:flex-row md:justify-between md:text-left">
        <p>Caldova Home Loans is a fictional company. All data is synthetic.</p>
        <ul className="flex items-center gap-500">
          <li>
            <a href={LAB_REPOSITORY_URL} target="_blank" rel="noreferrer" className={footerLink}>
              <GitHubMark className="icon-size-100" />
              Lab source
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a href="https://www.microsoft.com/microsoft-fabric" target="_blank" rel="noreferrer" className={footerLink}>
              Built with Microsoft Fabric
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
