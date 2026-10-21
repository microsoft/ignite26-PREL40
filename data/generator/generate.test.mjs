import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  AS_OF_DATE,
  CHECKLIST_BY_PRODUCT,
  OUTPUTS,
  STALLED_AFTER_DAYS,
  daysBetween,
  generate,
  renderFixtures,
  renderManifest,
  renderSql,
} from './generate.mjs';

const data = generate();
const byCaseNumber = Object.fromEntries(data.applications.map((a) => [a.caseNumber, a]));
const fixtureCase = (caseNumber) => data.fixtures.cases.find((c) => c.caseNumber === caseNumber);
const childrenOf = (list, caseNumber) =>
  list.filter((row) => row.caseId === byCaseNumber[caseNumber].id);

describe('determinism', () => {
  it('renders identical output on every run', () => {
    const again = generate();
    assert.equal(renderSql(again), renderSql(data));
    assert.equal(renderManifest(again), renderManifest(data));
    assert.equal(renderFixtures(again), renderFixtures(data));
  });

  it('matches the committed outputs', () => {
    assert.equal(readFileSync(OUTPUTS.sql, 'utf8'), renderSql(data), 'run node data/generator/generate.mjs');
    assert.equal(readFileSync(OUTPUTS.manifest, 'utf8'), renderManifest(data));
    assert.equal(readFileSync(OUTPUTS.fixtures, 'utf8'), renderFixtures(data));
  });
});

describe('portfolio dataset', () => {
  it('has 200 applications with unique ids and case numbers', () => {
    assert.equal(data.applications.length, 200);
    assert.equal(new Set(data.applications.map((a) => a.id)).size, 200);
    assert.equal(new Set(data.applications.map((a) => a.caseNumber)).size, 200);
  });

  it('keeps every date inside the submission window and in order', () => {
    for (const a of data.applications) {
      assert.ok(a.submissionDate >= data.windowStart, `${a.caseNumber} submitted before window`);
      assert.ok(a.submissionDate <= a.stageStartDate, `${a.caseNumber} stage starts before submission`);
      assert.ok(a.stageStartDate <= AS_OF_DATE, `${a.caseNumber} stage starts after snapshot`);
    }
  });

  it('puts most stalled applications in document collection', () => {
    const docs = data.reference.byStage.find((s) => s.stage === 'Document collection');
    assert.ok(docs.stalled / data.reference.stalledApplications > 0.5);
  });

  it('reports reference values consistent with the rows', () => {
    const open = data.applications.filter((a) => a.open);
    const stalled = open.filter((a) => daysBetween(a.stageStartDate, AS_OF_DATE) > STALLED_AFTER_DAYS);
    assert.equal(data.reference.openApplications, open.length);
    assert.equal(data.reference.stalledApplications, stalled.length);
    assert.equal(
      data.reference.requestedAmountInPipeline,
      open.reduce((sum, a) => sum + a.requestedAmount, 0)
    );
  });
});

describe('planted cases', () => {
  it('HL-1042 is a stalled home-improvement case missing only its plans and photos', () => {
    const app = byCaseNumber['HL-1042'];
    assert.equal(app.productCode, 'home-improvement');
    assert.equal(app.stage, 'document-collection');
    assert.equal(app.requestedAmount, 85_000);
    assert.equal(daysBetween(app.stageStartDate, AS_OF_DATE), 11);
    assert.equal(fixtureCase('HL-1042').assignedTo, 'attendee');

    const required = childrenOf(data.fixtures.checklist, 'HL-1042')
      .filter((item) => item.status === 'required')
      .map((item) => item.category);
    assert.deepEqual(required, ['renovation-plans-photos']);
  });

  it('HL-1042 notes contain the planted contradiction', () => {
    const bodies = childrenOf(data.fixtures.notes, 'HL-1042').map((n) => n.body);
    assert.ok(bodies.some((b) => /emailed to the branch inbox/.test(b)));
    assert.ok(bodies.some((b) => /no floor plan or photos have arrived/.test(b)));
  });

  it('HL-1088 has every checklist item received and is waiting for internal review', () => {
    const items = childrenOf(data.fixtures.checklist, 'HL-1088');
    assert.equal(items.length, CHECKLIST_BY_PRODUCT['home-purchase'].length);
    assert.ok(items.every((item) => item.status === 'received' && item.receivedOn));
    assert.equal(byCaseNumber['HL-1088'].stage, 'internal-review');
  });

  it('HL-1103 belongs to the colleague and has no app-side child records', () => {
    assert.equal(fixtureCase('HL-1103').assignedTo, 'colleague');
    assert.equal(daysBetween(byCaseNumber['HL-1103'].stageStartDate, AS_OF_DATE), 9);
    for (const list of [data.fixtures.notes, data.fixtures.tasks, data.fixtures.checklist]) {
      assert.equal(childrenOf(list, 'HL-1103').length, 0);
    }
  });

  it('assigns eight cases to the attendee and keeps fixtures in sync with the portfolio', () => {
    const attendee = data.fixtures.cases.filter((c) => c.assignedTo === 'attendee');
    assert.equal(attendee.length, 8);
    for (const c of data.fixtures.cases) {
      const app = byCaseNumber[c.caseNumber];
      assert.equal(c.id, app.id);
      assert.equal(c.stage, app.stage);
      assert.equal(c.stageStartedOn, app.stageStartDate);
      assert.equal(c.requestedAmount, app.requestedAmount);
      assert.equal(c.branchName, app.branchLabel);
    }
  });

  it('dates receipts between submission and the snapshot, before any later stage started', () => {
    const appsById = Object.fromEntries(data.applications.map((a) => [a.id, a]));
    for (const item of data.fixtures.checklist.filter((i) => i.receivedOn)) {
      const app = appsById[item.caseId];
      assert.ok(item.receivedOn >= app.submissionDate, `${app.caseNumber} ${item.category} before submission`);
      assert.ok(item.receivedOn <= AS_OF_DATE, `${app.caseNumber} ${item.category} after snapshot`);
      if (app.stage !== 'document-collection' && app.stage !== 'submitted') {
        assert.ok(item.receivedOn <= app.stageStartDate, `${app.caseNumber} ${item.category} after ${app.stage} began`);
      }
    }
  });

  it('only marks received items with a receipt date', () => {
    for (const item of data.fixtures.checklist) {
      assert.equal(item.status === 'received', item.receivedOn !== null, item.id);
    }
  });
});
