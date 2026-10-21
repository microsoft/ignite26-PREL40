import { FIELD_LIMITS, type CaseTaskRecord } from '@rayfin-app/shared';
import { useState, type FormEvent } from 'react';

import { Panel } from '@/components/panel';
import { buttonStyles } from '@/components/styles';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import type { UseCrudResult } from '@/components/useCrud';
import { describeError, formatDateOnly } from '@/lib/format';
import { cn } from '@/lib/utils';

export function TasksPanel({
  tasks,
  onAdd,
}: {
  tasks: UseCrudResult<CaseTaskRecord>;
  /** Saves the task and resolves once it is stored; rejects on failure. */
  onAdd: (title: string, dueOn: string | null) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [dueOn, setDueOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const trimmed = title.trim();

  // Keep showing the list while it refreshes after a save.
  const firstLoad = tasks.status === 'loading' && tasks.items.length === 0;
  const showList = tasks.status === 'ready' || (tasks.status === 'loading' && tasks.items.length > 0);
  const open = tasks.items.filter((t) => t.status === 'open');
  const done = tasks.items.filter((t) => t.status === 'done');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onAdd(trimmed, dueOn || null);
      setTitle('');
      setDueOn('');
    } catch (error) {
      setSaveError(describeError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Tasks" description="Administrative follow-ups for this case.">
      {firstLoad ? <LoadingState rows={2} label="Loading tasks" /> : null}
      {tasks.status === 'error' && tasks.error ? (
        <ErrorState message={tasks.error} onRetry={() => void tasks.refresh()} />
      ) : null}
      {showList ? (
        <>
          {tasks.error ? <ErrorState message={tasks.error} onRetry={tasks.clearError} /> : null}
          {tasks.items.length === 0 ? (
            <EmptyState title="No tasks" hint="Add the next administrative step below." />
          ) : (
            <ul className="flex flex-col gap-200">
              {[...open, ...done].map((task) => (
                <li key={task.id} className="flex items-start gap-300">
                  <input
                    id={`task-${task.id}`}
                    type="checkbox"
                    checked={task.status === 'done'}
                    disabled={tasks.pending || task.id.startsWith('pending-')}
                    onChange={(e) => void tasks.update(task.id, { status: e.target.checked ? 'done' : 'open' })}
                    className="mt-100 icon-size-200 accent-primary"
                  />
                  <label htmlFor={`task-${task.id}`} className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-300',
                        task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'
                      )}
                    >
                      {task.title}
                    </span>
                    {task.due_on ? (
                      <span className="block text-200 text-muted-foreground">Due {formatDateOnly(task.due_on)}</span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-200 border-t border-border pt-400">
        <label htmlFor="new-task" className="text-200 font-medium text-foreground">
          New task
        </label>
        <input
          id="new-task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={FIELD_LIMITS.taskTitle}
          placeholder="e.g. Review the newly received floor plan"
          className={buttonStyles.input}
        />
        <div className="flex flex-wrap items-end gap-300">
          <div className="flex flex-col gap-100">
            <label htmlFor="new-task-due" className="text-200 text-muted-foreground">
              Due date (optional)
            </label>
            <input
              id="new-task-due"
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
              className={buttonStyles.input}
            />
          </div>
          <button type="submit" disabled={!trimmed || saving} className={cn(buttonStyles.primary, 'ml-auto')}>
            {saving ? 'Adding…' : 'Add task'}
          </button>
        </div>
        {saveError ? <ErrorState title="Couldn't add the task" message={saveError} /> : null}
      </form>
    </Panel>
  );
}
