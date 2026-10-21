import { BarChart3, Link2, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';

import { Panel } from '@/components/panel';
import { connectorConfigs } from '@/lib/connectors';

/** The shared measures the semantic model defines once, for every consumer. */
const MEASURES = [
  {
    name: 'Open applications',
    definition: 'Applications not in Closed or Withdrawn at the snapshot date.',
  },
  {
    name: 'Requested amount in pipeline',
    definition: 'Requested amounts of open applications. Requested volume, not revenue or a commitment.',
  },
  {
    name: 'Average days in current stage',
    definition: 'Average calendar days between stage start and the snapshot date, for open applications.',
  },
  {
    name: 'Stalled applications',
    definition: 'Open applications with more than 7 days in their current stage (a fictional operations threshold).',
  },
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
      <div className="flex flex-col gap-100">
        <h1 id="portfolio-heading" className="text-hero-700 font-semibold text-foreground">
          Operations portfolio
        </h1>
        <p className="max-w-3xl text-300 text-muted-foreground">
          Shared, pseudonymous pipeline metrics from the Contoso Home Loans semantic model, as of its
          snapshot date. This page is a view for the signed-in officer, not a manager role: it never
          grants access to anyone's private case work.
        </p>
      </div>

      <ul aria-label="Portfolio measures" className="grid gap-400 sm:grid-cols-2 xl:grid-cols-4">
        {MEASURES.map((measure) => (
          <li key={measure.name} className="flex flex-col gap-200 rounded-xl border border-border bg-card p-500">
            <p className="text-200 font-semibold uppercase tracking-wider text-muted-foreground">{measure.name}</p>
            <p className="font-numeric text-hero-800 text-muted-foreground" aria-label="Not connected">
              —
            </p>
            <p className="text-200 text-muted-foreground">{measure.definition}</p>
          </li>
        ))}
      </ul>

      <Panel
        title={connected ? 'Semantic model connector registered' : 'Connect your semantic model'}
        description={
          connected
            ? `Connector: ${connectors.join(', ')}. Query its measures to fill this page.`
            : 'Not connected yet. Nothing on this page is live data.'
        }
        actions={<Link2 aria-hidden="true" className="icon-size-400 text-primary" />}
      >
        <ol className="flex list-decimal flex-col gap-200 pl-500 text-300 text-foreground">
          <li>Add a Rayfin semantic model connector for the model you built in part 1.</li>
          <li>Inspect its metadata, then query the four existing measures. Never recalculate them here.</li>
          <li>Add branch and product filters, a stage distribution, and the list of stalled applications.</li>
        </ol>
        <p className="text-200 text-muted-foreground">
          The connector runs every query as the signed-in user, so semantic model permissions apply. App
          access rules don't extend to the model, and the model never holds applicant names, notes, or files.
        </p>
      </Panel>

      <div className="grid gap-500 lg:grid-cols-2">
        <Placeholder
          icon={<BarChart3 aria-hidden="true" className="icon-size-400" />}
          title="Stage distribution"
          text="Open applications by current stage at the snapshot date. A snapshot, not a funnel or a trend."
        />
        <Placeholder
          icon={<ListChecks aria-hidden="true" className="icon-size-400" />}
          title="Stalled applications"
          text={'Case numbers you can open are tagged "Assigned to you" and link to the case; the rest show "Not assigned to you".'}
        />
      </div>
    </section>
  );
}

function Placeholder({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Panel title={title} description="Not connected yet">
      <div className="flex min-h-48 flex-col items-center justify-center gap-200 rounded-lg border border-dashed border-border px-600 text-center text-muted-foreground">
        {icon}
        <p className="max-w-sm text-300">{text}</p>
      </div>
    </Panel>
  );
}
