import { BarChart3, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';

import { Panel } from '@/components/panel';
import { connectorConfigs } from '@/lib/connectors';
import { cn } from '@/lib/utils';

/** The shared measures the semantic model defines once, for every consumer. */
const MEASURES = [
  { name: 'Open applications', definition: 'Not closed or withdrawn at the snapshot date' },
  { name: 'Requested amount in pipeline', definition: 'Requested amounts of open applications' },
  { name: 'Average days in current stage', definition: 'Days since stage start, open applications' },
  { name: 'Stalled applications', definition: 'Open applications more than 7 days in stage' },
] as const;

/**
 * Operations portfolio over the shared semantic model. A view for the same
 * signed-in user, not a separate role. The analytics checkpoint connects the
 * model with the Rayfin semantic model connector and replaces the placeholders.
 */
export function ManagerPage() {
  const connectors = Object.keys(connectorConfigs);
  const connected = connectors.length > 0;

  return (
    <section aria-labelledby="portfolio-heading" className="flex flex-col gap-500">
      <div className="flex flex-wrap items-end justify-between gap-x-800 gap-y-300">
        <h1 id="portfolio-heading" className="font-heading text-hero-700 font-semibold tracking-[-0.02em] text-foreground">
          Operations portfolio
        </h1>
        <p className="flex items-center gap-200 text-300 text-muted-foreground">
          <span
            aria-hidden="true"
            className={cn('size-2 rounded-full', connected ? 'bg-success-foreground' : 'bg-muted-foreground/50')}
          />
          {connected ? `Semantic model: ${connectors.join(', ')}` : 'Semantic model not connected'}
        </p>
      </div>

      <ul
        aria-label="Portfolio measures"
        className="grid gap-px overflow-hidden rounded-xl border border-border bg-border shadow-[0_1px_2px_rgb(16_24_40/0.04)] sm:grid-cols-2 xl:grid-cols-4"
      >
        {MEASURES.map((measure) => (
          <li key={measure.name} className="flex flex-col gap-200 bg-card p-500">
            <p className="text-300 font-medium text-foreground">{measure.name}</p>
            <p className="font-heading text-hero-700 font-medium leading-[1.1] text-muted-foreground/60" aria-label="No data">
              —
            </p>
            <p className="text-200 text-muted-foreground">{measure.definition}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-400 lg:grid-cols-2">
        <Placeholder icon={<BarChart3 aria-hidden="true" className="icon-size-400" />} title="Stage distribution" />
        <Placeholder icon={<ListChecks aria-hidden="true" className="icon-size-400" />} title="Stalled applications" />
      </div>
    </section>
  );
}

function Placeholder({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <Panel title={title}>
      <div className="flex min-h-48 flex-col items-center justify-center gap-200 rounded-lg border border-dashed border-input px-600 text-center text-muted-foreground">
        {icon}
        <p className="text-300">No data yet</p>
      </div>
    </Panel>
  );
}
