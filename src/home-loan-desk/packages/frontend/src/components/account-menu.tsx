import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Database, LogOut, Moon, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router';

import { useAuth } from '@/hooks/auth.context';
import { useTheme } from '@/hooks/theme.context';
import { useOfficerEmail } from '@/hooks/use-officer-email';
import { cn } from '@/lib/utils';

function initialsOf(email: string) {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return letters.toUpperCase();
}

const itemClass =
  'flex w-full items-center gap-300 rounded-md px-300 py-200 text-left text-300 text-popover-foreground outline-none transition-colors hover:bg-accent focus-visible:bg-accent disabled:cursor-not-allowed disabled:opacity-60';

/** Signed-in officer menu: identity, theme, lab data, and sign-out. */
export function AccountMenu() {
  const email = useOfficerEmail();
  const { signOut, isSigningOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => list[(next + list.length) % list.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(list.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={email ? `Account menu for ${email}` : 'Account menu'}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKeyDown}
        className={cn(
          'flex size-8 items-center justify-center rounded-full bg-primary text-200 font-semibold text-primary-foreground transition-shadow hover:ring-2 hover:ring-nav-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-nav',
          open && 'ring-2 ring-nav-foreground/40'
        )}
      >
        {email ? initialsOf(email) : <UserRound aria-hidden="true" className="icon-size-200" />}
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-40 mt-200 w-72 max-w-[calc(100vw-2rem)] origin-top-right animate-[menu-in_140ms_cubic-bezier(0.16,1,0.3,1)] rounded-xl border border-border bg-popover p-100 shadow-[0_4px_8px_-2px_rgb(16_24_40/0.08),0_16px_32px_-8px_rgb(16_24_40/0.16)] motion-reduce:animate-none"
        >
          <div className="flex items-center gap-300 px-300 pb-300 pt-200">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tint text-300 font-semibold text-tint-foreground"
            >
              {email ? initialsOf(email) : <UserRound className="icon-size-200" />}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-300 font-medium text-popover-foreground" title={email ?? undefined}>
                {email ?? 'Signed in'}
              </span>
              <span className="text-200 text-muted-foreground">Loan officer</span>
            </span>
          </div>

          <Separator />

          <div className="py-100">
            <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={isDark}
              tabIndex={-1}
              onClick={toggleTheme}
              className={itemClass}
            >
              <Moon aria-hidden="true" className="icon-size-200 text-muted-foreground" />
              <span className="flex-1">Dark theme</span>
              <Switch on={isDark} />
            </button>
            <MenuItem
              icon={<Database aria-hidden="true" className="icon-size-200 text-muted-foreground" />}
              onSelect={() => {
                close(false);
                navigate('/seed');
              }}
            >
              Lab data
            </MenuItem>
          </div>

          <Separator />

          <div className="pt-100">
            <MenuItem
              icon={<LogOut aria-hidden="true" className="icon-size-200 text-muted-foreground" />}
              disabled={isSigningOut}
              onSelect={() => void signOut()}
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </MenuItem>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  children,
  onSelect,
  disabled,
}: {
  icon: ReactNode;
  children: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" role="menuitem" tabIndex={-1} disabled={disabled} onClick={onSelect} className={itemClass}>
      {icon}
      <span className="flex-1">{children}</span>
    </button>
  );
}

function Separator() {
  return <div role="separator" className="-mx-100 h-px bg-border" />;
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors',
        on ? 'bg-primary' : 'bg-input'
      )}
    >
      <span
        className={cn(
          'absolute size-3 rounded-full bg-card shadow-[0_1px_2px_rgb(16_24_40/0.2)] transition-transform',
          on ? 'translate-x-3.5' : 'translate-x-0.5'
        )}
      />
    </span>
  );
}
