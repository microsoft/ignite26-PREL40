import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Caldova mark: a roofline over a C on a filled tile in the current text color. */
export function CaldovaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn('shrink-0', className)}>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <g style={{ stroke: 'var(--color-primary-foreground)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 15.5 16 9l8 6.5" />
        <path d="M19.45 18.11A4.5 4.5 0 1 0 19.45 23.89" />
      </g>
    </svg>
  );
}

/** Product lockup used in the top bar and on full-screen states. */
export function Wordmark({ compactOnMobile = false, onNav = false }: { compactOnMobile?: boolean; onNav?: boolean }) {
  const desk = compactOnMobile ? 'hidden sm:block' : 'block';
  return (
    <span className={cn('flex items-center gap-200', onNav ? 'text-nav-foreground' : 'text-foreground')}>
      <CaldovaMark className="size-7 text-primary" />
      <span className="text-400 font-semibold tracking-[-0.01em]">Caldova</span>
      <span aria-hidden="true" className={cn('h-4 w-px', onNav ? 'bg-nav-border' : 'bg-border', desk)} />
      <span className={cn('text-300', onNav ? 'text-nav-muted' : 'text-muted-foreground', desk)}>Operations Desk</span>
    </span>
  );
}

export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}

/** Full-screen branded frame for sign-in, loading, and setup screens. */
export function BrandedScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-600 bg-background p-400">
      <Wordmark />
      <div className="flex w-full max-w-sm flex-col gap-300 rounded-xl border border-border bg-card p-600 shadow-[0_1px_2px_rgb(16_24_40/0.04),0_12px_32px_-16px_rgb(16_24_40/0.14)]">
        {children}
      </div>
    </div>
  );
}
