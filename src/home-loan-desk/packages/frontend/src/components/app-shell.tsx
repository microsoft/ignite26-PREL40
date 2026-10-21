import { useState, type FormEvent, type ReactNode } from 'react';
import { Landmark, Moon, Search, Sun } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router';

import { useTheme } from '@/hooks/theme.context';
import { useOfficerEmail } from '@/hooks/use-officer-email';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/cases', label: 'My cases' },
  { to: '/manager', label: 'Portfolio' },
  { to: '/seed', label: 'Lab data' },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const email = useOfficerEmail();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-600 gap-y-300 px-400 py-300">
          <Link
            to="/cases"
            className="flex items-center gap-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden="true" className="rounded-lg bg-primary p-200 text-primary-foreground">
              <Landmark className="icon-size-300" />
            </span>
            <span className="flex flex-col">
              <span className="text-200 font-semibold uppercase tracking-wider text-muted-foreground">
                Contoso Home Loans
              </span>
              <span className="text-400 font-semibold text-foreground">Operations Desk</span>
            </span>
          </Link>

          <nav aria-label="Main" className="flex items-center gap-100">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-300 py-200 text-300 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex flex-wrap items-center gap-300">
            <OpenCaseForm />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="rounded-md p-200 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isDark ? <Sun className="icon-size-200" /> : <Moon className="icon-size-200" />}
            </button>
            {email ? (
              <span
                title="Signed-in officer"
                className="max-w-60 truncate rounded-full bg-muted px-300 py-100 text-200 text-muted-foreground"
              >
                {email}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-400 py-600">{children}</main>

      <footer className="border-t border-border">
        <p className="mx-auto max-w-6xl px-400 py-300 text-200 text-muted-foreground">
          Synthetic lab data for Microsoft Ignite PREL40. Administrative case processing only: this
          app does not assess creditworthiness or make lending decisions.
        </p>
      </footer>
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
      <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
        <Search aria-hidden="true" className="ml-200 icon-size-200 text-muted-foreground" />
        <input
          id="open-case"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Open case, e.g. HL-1042"
          maxLength={16}
          className="w-44 bg-transparent px-200 py-100 text-300 text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
    </form>
  );
}
