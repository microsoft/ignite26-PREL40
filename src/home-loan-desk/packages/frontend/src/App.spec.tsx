import { render, screen, within } from '@testing-library/react';
import type { CaseWorkspaceRecord, ChecklistItemRecord } from '@rayfin-app/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { labFixtures } from '@/lab/fixtures.generated';
import { planLabRecords, type LabStore } from '@/lab/seeder';

const OFFICER = 'avery.officer@caldova.example';
// The gate check and the data load both resolve before content shows; allow for slow CI.
const WAIT = { timeout: 5000 };

const planned = planLabRecords(labFixtures, OFFICER);
const myCases = planned
  .filter((p) => p.entity === 'CaseWorkspace' && p.owner === 'attendee')
  .map((p) => p.record as unknown as CaseWorkspaceRecord);
const myChecklist = planned
  .filter((p) => p.entity === 'ChecklistItem')
  .map((p) => p.record as unknown as ChecklistItemRecord);

const store: { current: LabStore } = { current: undefined as unknown as LabStore };

vi.mock('@/hooks/use-officer-email', () => ({ useOfficerEmail: () => OFFICER }));
vi.mock('@/lib/rayfin-client', () => ({ getRayfinClient: async () => ({}) }));
vi.mock('@/lab/lab-store', () => ({ createRayfinLabStore: () => store.current }));
vi.mock('@/services/cases', () => ({
  listMyCases: async () => myCases,
  listChecklist: async (caseId?: string) =>
    caseId ? myChecklist.filter((item) => item.case_id === caseId) : myChecklist,
  listTasks: async () => [],
  listNotes: async () => [],
  findCaseByNumber: async (caseNumber: string) =>
    myCases.find((c) => c.case_number === caseNumber) ?? null,
  recordedReceiptPatch: () => ({}),
}));

import App from '@/App';

/**
 * A fake store that already holds the officer's lab records (except any
 * `missing` entity), or starts empty.
 */
function storeWith(seeded: boolean, missing?: string) {
  const rows = new Map<string, { id: string; case_id?: string }[]>();
  if (seeded) {
    for (const p of planned.filter((item) => item.owner === 'attendee' && item.entity !== missing)) {
      rows.set(p.entity, [...(rows.get(p.entity) ?? []), { id: p.record.id }]);
    }
  }
  const fake = {
    created: 0,
    listVisible: vi.fn(async (entity: string) => rows.get(entity) ?? []),
    create: vi.fn(async (entity: string, record: Record<string, unknown>) => {
      fake.created++;
      rows.set(entity, [...(rows.get(entity) ?? []), { id: String(record.id) }]);
    }),
    remove: vi.fn(async () => {}),
  };
  return fake;
}

describe('App', () => {
  beforeEach(() => {
    window.location.hash = '#/cases';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists your cases with stalled cases first', async () => {
    store.current = storeWith(true);
    render(<App />);

    const table = await screen.findByRole('table', {}, WAIT);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(8);
    expect(within(rows[0]).getByRole('link', { name: 'HL-1029' })).toBeVisible();
    expect(within(rows[0]).getByText('Stalled · 14 days')).toBeVisible();
    expect(within(table).getByText('Stalled · 11 days')).toBeVisible();
    expect(within(table).queryByText('HL-1103')).toBeNull();
    expect(store.current.create).not.toHaveBeenCalled();
  });

  it("shows another officer's case as not available", async () => {
    store.current = storeWith(true);
    window.location.hash = '#/cases/HL-1103';
    render(<App />);

    expect(await screen.findByText("Case HL-1103 isn't available to you", {}, WAIT)).toBeVisible();
  });

  it('opens HL-1042 with its outstanding plans and the brief panel disabled', async () => {
    store.current = storeWith(true);
    window.location.hash = '#/cases/hl-1042';
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Alex Rivera' }, WAIT)).toBeVisible();
    expect(await screen.findByText('Upload coming soon', {}, WAIT)).toBeVisible();
    expect(screen.getByRole('button', { name: /Generate handoff brief/ })).toBeDisabled();
  });

  it('restores only missing records after a partial seed', async () => {
    const fake = storeWith(true, 'CaseNote');
    store.current = fake;
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'My cases' }, WAIT)).toBeVisible();
    const createdEntities: string[] = fake.create.mock.calls.map(([entity]) => entity);
    expect(createdEntities.filter((e) => e === 'CaseNote')).toHaveLength(labFixtures.notes.length);
    expect(createdEntities.filter((e) => e !== 'CaseNote' && e !== 'CaseWorkspace')).toHaveLength(0);
  });

  it('prepares lab data on first sign-in, then shows the app', async () => {
    const fake = storeWith(false);
    store.current = fake;
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'My cases' }, WAIT)).toBeVisible();
    expect(fake.create).toHaveBeenCalled();
    expect(fake.created).toBe(planned.length);
  });
});
