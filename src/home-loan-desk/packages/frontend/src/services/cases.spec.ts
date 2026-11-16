import { browserSession } from '@microsoft/rayfin-auth';
import { RayfinClient } from '@microsoft/rayfin-client';
import { connectorsService } from '@microsoft/rayfin-connectors';
import { dataService } from '@microsoft/rayfin-data';
import type { ChecklistItemRecord, UniversalAppSchema } from '@rayfin-app/shared';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCrud } from '@/components/useCrud';
import type { AppClient } from '@/lib/rayfin-client';

import {
  createNote,
  createTask,
  findCaseByNumber,
  listChecklist,
  listMyCases,
  listNotes,
  listTasks,
  updateChecklistItem,
} from './cases';

const { getRayfinClient } = vi.hoisted(() => ({ getRayfinClient: vi.fn() }));
vi.mock('@/lib/rayfin-client', () => ({ getRayfinClient }));

describe('case services with the composed data client', () => {
  let client: AppClient;
  const fetchMock = vi.fn<typeof fetch>();
  const timestamp = '2026-11-01T10:00:00.000Z';

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    client = RayfinClient.create({
      baseUrl: 'https://backend.example.test',
      publishableKey: 'pk-test',
      auth: browserSession({ storage: false, autoRefreshToken: false, multiTabSync: false }),
      services: {
        data: dataService<UniversalAppSchema>(),
        connectors: connectorsService<Record<string, never>>({ configs: {} }),
      },
    });
    getRayfinClient.mockResolvedValue(client);
  });

  afterEach(() => {
    client.dispose();
    vi.unstubAllGlobals();
  });

  function respond(data: Record<string, unknown>) {
    fetchMock.mockResolvedValueOnce(Response.json({ data }));
  }

  function sentQuery(call = 0): string {
    const body = fetchMock.mock.calls[call]?.[1]?.body;
    expect(typeof body).toBe('string');
    return typeof body === 'string' ? body : '';
  }

  it('selects the case fields the UI uses and normalizes dates without altering text', async () => {
    respond({
      caseWorkspaces: {
        items: [{
          id: 'case-1',
          case_number: 'HL-1042',
          applicant_label: 'Synthetic applicant',
          product: 'home-improvement',
          branch_name: 'Test branch',
          stage: 'document-collection',
          stage_started_on: '2026-10-21',
          snapshot_date: '2026-11-01',
          requested_amount: 10000,
          review_status: 'in-progress',
          assigned_officer_email: 'officer@example.test',
          created_by_email: 'officer@example.test',
          created_at: timestamp,
        }],
      },
    });

    const [row] = await listMyCases();
    expect(row.stage_started_on).toEqual(new Date('2026-10-21T00:00:00Z'));
    expect(row.snapshot_date).toEqual(new Date('2026-11-01T00:00:00Z'));
    expect(row.created_at).toEqual(new Date(timestamp));
    expect(row.case_number).toBe('HL-1042');
    for (const field of Object.keys(row)) expect(sentQuery()).toContain(field);

    respond({ caseWorkspaces: { items: [] } });
    await expect(findCaseByNumber('HL-1103')).resolves.toBeNull();
    expect(sentQuery(1)).toContain('HL-1103');
  });

  it('normalizes boolean wire strings on reads and creates without coercing note text', async () => {
    const note = {
      id: 'note-1',
      case_id: 'case-1',
      officer_email: 'officer@example.test',
      author_email: 'officer@example.test',
      body: 'false',
      created_at: timestamp,
    };
    respond({ caseNotes: { items: [{ ...note, is_ai_generated: 'false' }] } });
    const [row] = await listNotes('case-1');
    expect(row.is_ai_generated).toBe(false);
    expect(row.body).toBe('false');
    expect(row.created_at).toEqual(new Date(timestamp));
    expect(sentQuery()).toContain('reviewed_by_email');

    respond({ createCaseNote: { ...note, is_ai_generated: 'true' } });
    expect((await createNote('case-1', 'officer@example.test', 'false')).is_ai_generated).toBe(true);
    expect(sentQuery(1)).toContain('is_ai_generated: false');
  });

  it('preserves nullable task dates and normalizes returned create dates', async () => {
    const task = {
      id: 'task-1',
      case_id: 'case-1',
      officer_email: 'officer@example.test',
      title: 'Follow up',
      status: 'open',
      created_at: timestamp,
    };
    respond({ caseTasks: { items: [{ ...task, due_on: null }] } });
    const [row] = await listTasks('case-1');
    expect(row.due_on).toBeNull();
    expect(row.created_at).toEqual(new Date(timestamp));
    expect(sentQuery()).toContain('due_on');

    respond({ createCaseTask: { ...task, due_on: '2026-11-02' } });
    const saved = await createTask('case-1', 'officer@example.test', 'Follow up', '2026-11-02');
    expect(saved.due_on).toEqual(new Date('2026-11-02T00:00:00Z'));
    expect(saved.created_at).toEqual(new Date(timestamp));
  });

  it('merges partial checklist responses without dropping unreturned fields', async () => {
    const item: ChecklistItemRecord = {
      id: 'check-1',
      case_id: 'case-1',
      officer_email: 'officer@example.test',
      category: 'proof-of-income',
      status: 'required',
      received_on: new Date('2026-11-01'),
      sort_order: 1,
    };
    const { result } = renderHook(() => useCrud<ChecklistItemRecord>({
      list: async () => [item],
      create: async () => item,
      update: updateChecklistItem,
      remove: async () => {},
    }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    respond({ updateChecklistItem: { id: item.id, status: 'received' } });

    await act(() => result.current.update(item.id, { status: 'received' }));

    expect(result.current.items).toEqual([{ ...item, status: 'received' }]);
    expect(result.current.error).toBeNull();
  });

  it('preserves explicit nulls and normalizes checklist dates on reads and updates', async () => {
    respond({
      checklistItems: {
        items: [{
          id: 'check-1',
          case_id: 'case-1',
          officer_email: 'officer@example.test',
          category: 'proof-of-income',
          status: 'received',
          received_on: '2026-11-01',
          received_via: 'recorded',
          sort_order: 1,
        }],
      },
    });
    expect((await listChecklist('case-1'))[0].received_on).toEqual(new Date('2026-11-01'));
    expect(sentQuery()).toContain('received_via');

    respond({ updateChecklistItem: { id: 'check-1', received_on: '2026-11-02' } });
    expect((await updateChecklistItem('check-1', { received_on: new Date('2026-11-02') })).received_on)
      .toEqual(new Date('2026-11-02'));

    respond({ updateChecklistItem: { id: 'check-1', received_on: null } });
    await expect(updateChecklistItem('check-1', { received_on: null }))
      .resolves.toEqual({ id: 'check-1', received_on: null });
  });

  it('propagates data access failures rather than returning successful-looking rows', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({
      errors: [{ message: 'Access denied' }],
    }));
    await expect(listMyCases()).rejects.toThrow('Access denied');
  });
});
