import { FIELD_LIMITS, type CaseNoteRecord } from '@rayfin-app/shared';
import { Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Panel } from '@/components/panel';
import { buttonStyles } from '@/components/styles';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import type { UseCrudResult } from '@/components/useCrud';
import { describeError, formatDateTime } from '@/lib/format';

function timeOf(value: unknown): number {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function NotesPanel({
  notes,
  onAdd,
}: {
  notes: UseCrudResult<CaseNoteRecord>;
  /** Saves the note and resolves once it is stored; rejects on failure. */
  onAdd: (body: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const body = draft.trim();
  const sorted = [...notes.items].sort((a, b) => timeOf(b.created_at) - timeOf(a.created_at));
  // Keep showing the list while it refreshes after a save.
  const firstLoad = notes.status === 'loading' && notes.items.length === 0;
  const showList = notes.status === 'ready' || (notes.status === 'loading' && notes.items.length > 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onAdd(body);
      setDraft('');
    } catch (error) {
      setSaveError(describeError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Case notes" description="Private to the officer working the case.">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-200">
        <label htmlFor="new-note" className="text-200 font-medium text-foreground">
          Add a note
        </label>
        <textarea
          id="new-note"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={FIELD_LIMITS.noteBody}
          rows={3}
          placeholder="What happened on this case?"
          className={buttonStyles.input}
        />
        <div className="flex items-center justify-between gap-300">
          <span className="text-200 text-muted-foreground">
            {draft.length} / {FIELD_LIMITS.noteBody}
          </span>
          <button type="submit" disabled={!body || saving} className={buttonStyles.primary}>
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </form>

      {saveError ? <ErrorState title="Couldn't save the note" message={saveError} /> : null}
      {firstLoad ? <LoadingState rows={3} label="Loading notes" /> : null}
      {notes.status === 'error' && notes.error ? (
        <ErrorState message={notes.error} onRetry={() => void notes.refresh()} />
      ) : null}
      {showList && sorted.length === 0 ? (
        <EmptyState title="No notes yet" hint="Notes record what happened and who did it." />
      ) : null}
      {showList && sorted.length > 0 ? (
        <ol className="flex flex-col gap-300">
          {sorted.map((note) => (
            <li key={note.id} className="rounded-lg border border-border bg-background p-300">
              <div className="mb-100 flex flex-wrap items-center gap-200 text-200 text-muted-foreground">
                <time>{formatDateTime(note.created_at)}</time>
                <span aria-hidden="true">·</span>
                <span className="truncate">{note.author_email}</span>
                {note.is_ai_generated ? (
                  <span className="inline-flex items-center gap-100 rounded-full bg-primary/10 px-200 py-100 font-medium text-primary">
                    <Sparkles aria-hidden="true" className="icon-size-100" />
                    AI-generated
                    {note.reviewed_by_email ? `, reviewed by ${note.reviewed_by_email}` : ''}
                  </span>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-300 text-foreground">{note.body}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </Panel>
  );
}
