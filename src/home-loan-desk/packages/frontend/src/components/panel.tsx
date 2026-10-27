import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A titled content region used across the case workspace. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const headingId = `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex flex-col gap-400 rounded-xl border border-border bg-card p-500 shadow-[0_1px_2px_rgb(16_24_40/0.04)]',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-300">
        <div className="flex min-w-0 flex-col gap-100">
          <h2 id={headingId} className="font-heading text-400 font-semibold leading-[1.3] text-card-foreground">
            {title}
          </h2>
          {description ? <div className="text-200 text-muted-foreground">{description}</div> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
