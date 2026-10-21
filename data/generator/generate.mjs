#!/usr/bin/env node
// Deterministic data generator for the PREL40 "Home Loan Operations Desk" lab.
//
// One run produces, from the same seed and as-of date:
//   - data/portfolio-seed.sql: the standalone Fabric SQL database attendees load in part 1
//   - data/generator/manifest.json: seed, as-of date, counts, and reference measure values
//   - src/home-loan-desk/packages/frontend/src/lab/fixtures.generated.ts: the app's lab cases
//
// Attendees never run this script. Authors run it after changing the story data:
//   node data/generator/generate.mjs
//
// No dependencies: identifiers are name-based UUIDs (SHA-1), and every random
// choice comes from a seeded PRNG, so the output is byte-for-byte reproducible.

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SEED = 4040;
export const AS_OF_DATE = '2026-10-30';
export const WINDOW_DAYS = 90;
export const APPLICATION_COUNT = 200;
export const FIRST_CASE_NUMBER = 1000;
export const STALLED_AFTER_DAYS = 7;
export const GENERATOR_VERSION = '1.0.0';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUTPUTS = {
  sql: join(ROOT, 'data', 'portfolio-seed.sql'),
  manifest: join(ROOT, 'data', 'generator', 'manifest.json'),
  fixtures: join(
    ROOT,
    'src',
    'home-loan-desk',
    'packages',
    'frontend',
    'src',
    'lab',
    'fixtures.generated.ts'
  ),
};

export const STAGES = [
  { code: 'submitted', label: 'Submitted', open: true },
  { code: 'document-collection', label: 'Document collection', open: true },
  { code: 'property-assessment', label: 'Property assessment', open: true },
  { code: 'internal-review', label: 'Internal review', open: true },
  { code: 'offer-issued', label: 'Offer issued', open: true },
  { code: 'closed', label: 'Closed', open: false },
  { code: 'withdrawn', label: 'Withdrawn', open: false },
];

export const PRODUCTS = [
  { code: 'home-purchase', label: 'Home purchase', min: 180_000, max: 750_000 },
  { code: 'refinance', label: 'Refinance', min: 120_000, max: 520_000 },
  { code: 'home-improvement', label: 'Home improvement', min: 15_000, max: 150_000 },
];

export const BRANCHES = [
  { key: 'seattle', label: 'Seattle Downtown', region: 'West' },
  { key: 'portland', label: 'Portland Pearl District', region: 'West' },
  { key: 'denver', label: 'Denver Union Station', region: 'Mountain' },
  { key: 'chicago', label: 'Chicago Loop', region: 'Central' },
  { key: 'boston', label: 'Boston Back Bay', region: 'East' },
];

export const CHECKLIST_BY_PRODUCT = {
  'home-purchase': [
    'proof-of-identity',
    'proof-of-income',
    'purchase-agreement',
    'proof-of-deposit',
  ],
  refinance: [
    'proof-of-identity',
    'proof-of-income',
    'current-mortgage-statement',
    'property-tax-statement',
  ],
  'home-improvement': [
    'proof-of-identity',
    'proof-of-income',
    'contractor-quote',
    'renovation-plans-photos',
  ],
};

/**
 * The lab's app-side cases. Their portfolio rows are planted with exactly these
 * values; every other application is random. `daysInStage` is counted back from
 * the as-of date, `daysBeforeStage` from the stage start to the submission date.
 * `missing` lists checklist categories still required; every other category is
 * received `receivedDaysAgo[category] ?? receivedDaysAgo.default` days before the
 * as-of date, matching the case notes.
 */
export const PLANTED_CASES = [
  {
    caseNumber: 'HL-1042',
    applicantLabel: 'Alex Rivera',
    product: 'home-improvement',
    branch: 'seattle',
    stage: 'document-collection',
    daysInStage: 11,
    daysBeforeStage: 3,
    requestedAmount: 85_000,
    reviewStatus: 'waiting-on-applicant',
    assignedTo: 'attendee',
    missing: ['renovation-plans-photos'],
    receivedDaysAgo: { default: 9 },
    notes: [
      {
        daysAgo: 11,
        time: '09:15',
        body: 'Application moved to document collection for a kitchen renovation and rear extension. Requested proof of identity, proof of income, the contractor quote, and renovation plans or current-state photos of the kitchen and rear of the house.',
      },
      {
        daysAgo: 9,
        time: '14:40',
        body: 'Received the contractor quote from Northwind Builders (USD 81,400) and two recent pay slips. Identity confirmed at the branch counter.',
      },
      {
        daysAgo: 7,
        time: '11:05',
        body: 'Call with Alex Rivera: says the floor plan and kitchen photos were emailed to the branch inbox on October 22.',
      },
      {
        daysAgo: 2,
        time: '16:20',
        body: 'Checked the branch inbox and the case file: no floor plan or photos have arrived from the applicant. The renovation plans item is still outstanding.',
      },
    ],
    tasks: [
      {
        title: 'Follow up with Alex Rivera about the renovation plans and photos',
        dueInDays: 1,
        status: 'open',
        createdDaysAgo: 2,
      },
    ],
  },
  {
    caseNumber: 'HL-1088',
    applicantLabel: 'Jordan Chen',
    product: 'home-purchase',
    branch: 'denver',
    stage: 'internal-review',
    daysInStage: 3,
    daysBeforeStage: 16,
    requestedAmount: 410_000,
    reviewStatus: 'ready-for-review',
    assignedTo: 'attendee',
    missing: [],
    receivedDaysAgo: { default: 12, 'purchase-agreement': 6, 'proof-of-deposit': 6 },
    notes: [
      {
        daysAgo: 6,
        time: '10:30',
        body: 'Purchase agreement and proof of deposit received; all four checklist items are now on file.',
      },
      {
        daysAgo: 3,
        time: '15:45',
        body: 'Case passed to the internal document review queue. No outstanding requests to the applicant.',
      },
    ],
    tasks: [
      {
        title: 'Complete the internal document review',
        dueInDays: 4,
        status: 'open',
        createdDaysAgo: 3,
      },
    ],
  },
  {
    caseNumber: 'HL-1103',
    applicantLabel: 'Casey Brooks',
    product: 'refinance',
    branch: 'chicago',
    stage: 'document-collection',
    daysInStage: 9,
    daysBeforeStage: 2,
    requestedAmount: 265_000,
    reviewStatus: 'waiting-on-applicant',
    assignedTo: 'colleague',
    missing: ['property-tax-statement'],
    receivedDaysAgo: { default: 9 },
    notes: [],
    tasks: [],
  },
  {
    caseNumber: 'HL-1029',
    applicantLabel: 'Priya Shah',
    product: 'refinance',
    branch: 'portland',
    stage: 'property-assessment',
    daysInStage: 14,
    daysBeforeStage: 12,
    requestedAmount: 240_000,
    reviewStatus: 'in-progress',
    assignedTo: 'attendee',
    missing: [],
    receivedDaysAgo: { default: 15 },
    notes: [
      {
        daysAgo: 14,
        time: '13:10',
        body: 'All refinance documents received. Valuation requested from the panel firm.',
      },
      {
        daysAgo: 5,
        time: '09:50',
        body: 'Panel firm has not confirmed a valuation appointment yet. Applicant is available weekday mornings.',
      },
    ],
    tasks: [
      {
        title: 'Chase the panel firm for a valuation appointment',
        dueInDays: 0,
        status: 'open',
        createdDaysAgo: 5,
      },
    ],
  },
  {
    caseNumber: 'HL-1064',
    applicantLabel: 'Diego Morales',
    product: 'home-purchase',
    branch: 'boston',
    stage: 'document-collection',
    daysInStage: 8,
    daysBeforeStage: 2,
    requestedAmount: 365_000,
    reviewStatus: 'waiting-on-applicant',
    assignedTo: 'attendee',
    missing: ['purchase-agreement', 'proof-of-deposit'],
    receivedDaysAgo: { default: 8 },
    notes: [
      {
        daysAgo: 8,
        time: '10:00',
        body: 'Identity and income documents received. Waiting on the signed purchase agreement and proof of deposit; the seller is still negotiating the closing date.',
      },
    ],
    tasks: [
      {
        title: 'Check whether the purchase agreement has been signed',
        dueInDays: 3,
        status: 'open',
        createdDaysAgo: 8,
      },
    ],
  },
  {
    caseNumber: 'HL-1017',
    applicantLabel: 'Hannah Kim',
    product: 'home-improvement',
    branch: 'denver',
    stage: 'submitted',
    daysInStage: 2,
    daysBeforeStage: 0,
    requestedAmount: 42_000,
    reviewStatus: 'in-progress',
    assignedTo: 'attendee',
    missing: [
      'proof-of-identity',
      'proof-of-income',
      'contractor-quote',
      'renovation-plans-photos',
    ],
    receivedDaysAgo: {},
    notes: [
      {
        daysAgo: 2,
        time: '12:20',
        body: 'New application for a bathroom refit. Welcome email sent with the document checklist.',
      },
    ],
    tasks: [],
  },
  {
    caseNumber: 'HL-1121',
    applicantLabel: 'Omar Haddad',
    product: 'home-purchase',
    branch: 'seattle',
    stage: 'offer-issued',
    daysInStage: 3,
    daysBeforeStage: 31,
    requestedAmount: 515_000,
    reviewStatus: 'in-progress',
    assignedTo: 'attendee',
    missing: [],
    receivedDaysAgo: { default: 25 },
    notes: [
      {
        daysAgo: 3,
        time: '17:05',
        body: 'Offer letter issued. Applicant has 14 days to accept.',
      },
    ],
    tasks: [
      {
        title: 'Confirm the applicant received the offer letter',
        dueInDays: 2,
        status: 'done',
        createdDaysAgo: 3,
      },
    ],
  },
  {
    caseNumber: 'HL-1135',
    applicantLabel: 'Elena Petrova',
    product: 'refinance',
    branch: 'portland',
    stage: 'document-collection',
    daysInStage: 4,
    daysBeforeStage: 1,
    requestedAmount: 198_000,
    reviewStatus: 'waiting-on-applicant',
    assignedTo: 'attendee',
    missing: ['current-mortgage-statement'],
    receivedDaysAgo: { default: 4 },
    notes: [
      {
        daysAgo: 4,
        time: '08:45',
        body: 'Identity, income, and property tax documents received. Current mortgage statement requested from the applicant.',
      },
    ],
    tasks: [],
  },
  {
    caseNumber: 'HL-1156',
    applicantLabel: 'Marcus Green',
    product: 'home-purchase',
    branch: 'chicago',
    stage: 'property-assessment',
    daysInStage: 5,
    daysBeforeStage: 9,
    requestedAmount: 289_000,
    reviewStatus: 'in-progress',
    assignedTo: 'attendee',
    missing: [],
    receivedDaysAgo: { default: 10 },
    notes: [
      {
        daysAgo: 5,
        time: '11:30',
        body: 'Valuation booked for next Tuesday morning.',
      },
    ],
    tasks: [
      {
        title: 'Record the valuation outcome',
        dueInDays: 5,
        status: 'open',
        createdDaysAgo: 5,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Deterministic helpers

/** Name-based UUID (RFC 4122 version 5 layout over SHA-1). */
export function uuidFor(name) {
  const bytes = createHash('sha1').update(`prel40:${name}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso, toIso) {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000
  );
}

function weightedPick(rand, entries) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rand() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1][0];
}

function intBetween(rand, min, max) {
  return min + Math.floor(rand() * (max - min + 1));
}

// ---------------------------------------------------------------------------
// Generation

const STAGE_WEIGHTS = [
  ['submitted', 13],
  ['document-collection', 28],
  ['property-assessment', 17],
  ['internal-review', 14],
  ['offer-issued', 12],
  ['closed', 11],
  ['withdrawn', 5],
];

/** Calendar days an application has spent in its current stage. */
const DAYS_IN_STAGE = {
  submitted: [0, 5],
  'document-collection': [0, 21],
  'property-assessment': [0, 10],
  'internal-review': [0, 9],
  'offer-issued': [0, 9],
  closed: [0, 45],
  withdrawn: [0, 45],
};

/** Calendar days between submission and the start of the current stage. */
const DAYS_BEFORE_STAGE = {
  submitted: [0, 0],
  'document-collection': [1, 5],
  'property-assessment': [6, 18],
  'internal-review': [10, 25],
  'offer-issued': [15, 35],
  closed: [20, 40],
  withdrawn: [3, 30],
};

export function generate() {
  const rand = mulberry32(SEED);
  const windowStart = addDays(AS_OF_DATE, -(WINDOW_DAYS - 1));

  const branches = BRANCHES.map((b) => ({ ...b, id: uuidFor(`branch:${b.key}`) }));
  const products = PRODUCTS.map((p) => ({ ...p, id: uuidFor(`product:${p.code}`) }));
  const branchByKey = Object.fromEntries(branches.map((b) => [b.key, b]));
  const productByCode = Object.fromEntries(products.map((p) => [p.code, p]));
  const stageByCode = Object.fromEntries(STAGES.map((s) => [s.code, s]));
  const plantedByNumber = Object.fromEntries(PLANTED_CASES.map((c) => [c.caseNumber, c]));

  const applications = [];
  for (let i = 0; i < APPLICATION_COUNT; i++) {
    const caseNumber = `HL-${FIRST_CASE_NUMBER + i}`;
    const planted = plantedByNumber[caseNumber];
    let branch;
    let product;
    let stage;
    let daysInStage;
    let daysBeforeStage;
    let requestedAmount;

    if (planted) {
      branch = branchByKey[planted.branch];
      product = productByCode[planted.product];
      stage = planted.stage;
      daysInStage = planted.daysInStage;
      daysBeforeStage = planted.daysBeforeStage;
      requestedAmount = planted.requestedAmount;
    } else {
      branch = branches[intBetween(rand, 0, branches.length - 1)];
      product = products[intBetween(rand, 0, products.length - 1)];
      stage = weightedPick(rand, STAGE_WEIGHTS);
      daysInStage = intBetween(rand, ...DAYS_IN_STAGE[stage]);
      daysBeforeStage = intBetween(rand, ...DAYS_BEFORE_STAGE[stage]);
      requestedAmount = intBetween(rand, product.min / 1000, product.max / 1000) * 1000;
    }

    const stageStartDate = addDays(AS_OF_DATE, -daysInStage);
    let submissionDate = addDays(stageStartDate, -daysBeforeStage);
    if (submissionDate < windowStart) submissionDate = windowStart;

    applications.push({
      id: uuidFor(`application:${caseNumber}`),
      caseNumber,
      branchId: branch.id,
      branchLabel: branch.label,
      productId: product.id,
      productCode: product.code,
      stage,
      stageLabel: stageByCode[stage].label,
      open: stageByCode[stage].open,
      submissionDate,
      stageStartDate,
      requestedAmount,
    });
  }

  const dates = [];
  for (let d = '2026-07-01'; d <= '2026-12-31'; d = addDays(d, 1)) dates.push(d);

  const reference = computeReferenceValues(applications);
  const fixtures = buildFixtures(applications);

  return { windowStart, branches, products, applications, dates, reference, fixtures };
}

export function computeReferenceValues(applications) {
  const open = applications.filter((a) => a.open);
  const daysInStage = (a) => daysBetween(a.stageStartDate, AS_OF_DATE);
  const stalled = open.filter((a) => daysInStage(a) > STALLED_AFTER_DAYS);
  const totalDays = open.reduce((sum, a) => sum + daysInStage(a), 0);

  const byStage = STAGES.map((s) => {
    const rows = applications.filter((a) => a.stage === s.code);
    return {
      stage: s.label,
      applications: rows.length,
      stalled: s.open ? rows.filter((a) => daysInStage(a) > STALLED_AFTER_DAYS).length : 0,
    };
  });

  return {
    openApplications: open.length,
    requestedAmountInPipeline: open.reduce((sum, a) => sum + a.requestedAmount, 0),
    averageDaysInCurrentStage: Math.round((totalDays / open.length) * 100) / 100,
    stalledApplications: stalled.length,
    byStage,
  };
}

function buildFixtures(applications) {
  const asOf = AS_OF_DATE;
  const byNumber = Object.fromEntries(applications.map((a) => [a.caseNumber, a]));
  const cases = [];
  const notes = [];
  const tasks = [];
  const checklist = [];

  for (const planted of PLANTED_CASES) {
    const app = byNumber[planted.caseNumber];
    cases.push({
      id: app.id,
      caseNumber: planted.caseNumber,
      applicantLabel: planted.applicantLabel,
      product: planted.product,
      branchName: app.branchLabel,
      stage: planted.stage,
      stageStartedOn: app.stageStartDate,
      requestedAmount: planted.requestedAmount,
      reviewStatus: planted.reviewStatus,
      assignedTo: planted.assignedTo,
    });

    // The attendee cannot write records stamped with a colleague's email, so a
    // colleague's case carries no notes, tasks, or checklist rows in the app.
    if (planted.assignedTo !== 'attendee') continue;

    planted.notes.forEach((note, index) => {
      notes.push({
        id: uuidFor(`note:${planted.caseNumber}:${index}`),
        caseId: app.id,
        body: note.body,
        createdAt: `${addDays(asOf, -note.daysAgo)}T${note.time}:00.000Z`,
      });
    });

    planted.tasks.forEach((task, index) => {
      tasks.push({
        id: uuidFor(`task:${planted.caseNumber}:${index}`),
        caseId: app.id,
        title: task.title,
        dueOn: addDays(asOf, task.dueInDays),
        status: task.status,
        createdAt: `${addDays(asOf, -task.createdDaysAgo)}T09:00:00.000Z`,
      });
    });

    CHECKLIST_BY_PRODUCT[planted.product].forEach((category, index) => {
      const received = !planted.missing.includes(category);
      const daysAgo = planted.receivedDaysAgo[category] ?? planted.receivedDaysAgo.default;
      if (received && daysAgo === undefined) {
        throw new Error(`${planted.caseNumber}: no receipt date for ${category}`);
      }
      checklist.push({
        id: uuidFor(`checklist:${planted.caseNumber}:${category}`),
        caseId: app.id,
        category,
        status: received ? 'received' : 'required',
        receivedOn: received ? addDays(asOf, -daysAgo) : null,
        sortOrder: index + 1,
      });
    });
  }

  return {
    generator: { seed: SEED, asOfDate: asOf, version: GENERATOR_VERSION },
    cases,
    notes,
    tasks,
    checklist,
  };
}

// ---------------------------------------------------------------------------
// Renderers

const sqlString = (value) => `N'${String(value).replace(/'/g, "''")}'`;

export function renderSql(data) {
  const { branches, products, applications, dates, reference } = data;
  const lines = [];
  lines.push(
    '-- PREL40 Home Loan Operations Desk: portfolio source data',
    `-- Generated by data/generator/generate.mjs (seed ${SEED}, as-of ${AS_OF_DATE}). Do not edit by hand.`,
    '-- All applicants, branches, and amounts are synthetic. Amounts are in USD.',
    '--',
    '-- Run this whole script in the query editor of your Fabric SQL database.',
    '-- It is safe to run again: it drops and recreates the four tables.',
    '--',
    `-- Reference values at the snapshot date: ${reference.openApplications} open applications,`,
    `-- USD ${reference.requestedAmountInPipeline.toLocaleString('en-US')} requested in the pipeline,`,
    `-- ${reference.averageDaysInCurrentStage} average days in current stage, ${reference.stalledApplications} stalled applications.`,
    '',
    'DROP TABLE IF EXISTS dbo.LoanApplication;',
    'DROP TABLE IF EXISTS dbo.Branch;',
    'DROP TABLE IF EXISTS dbo.LoanProduct;',
    'DROP TABLE IF EXISTS dbo.[Date];',
    '',
    'CREATE TABLE dbo.Branch (',
    '    BranchId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Branch PRIMARY KEY,',
    '    BranchName NVARCHAR(80) NOT NULL,',
    '    Region NVARCHAR(40) NOT NULL',
    ');',
    '',
    'CREATE TABLE dbo.LoanProduct (',
    '    ProductId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_LoanProduct PRIMARY KEY,',
    '    ProductCategory NVARCHAR(40) NOT NULL',
    ');',
    '',
    'CREATE TABLE dbo.[Date] (',
    '    [Date] DATE NOT NULL CONSTRAINT PK_Date PRIMARY KEY,',
    '    [Year] INT NOT NULL,',
    '    [Quarter] NVARCHAR(2) NOT NULL,',
    '    MonthNumber INT NOT NULL,',
    '    [MonthName] NVARCHAR(12) NOT NULL,',
    '    YearMonth NVARCHAR(7) NOT NULL,',
    '    DayOfWeekNumber INT NOT NULL,',
    '    DayOfWeekName NVARCHAR(12) NOT NULL',
    ');',
    '',
    'CREATE TABLE dbo.LoanApplication (',
    '    ApplicationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_LoanApplication PRIMARY KEY,',
    '    CaseNumber NVARCHAR(16) NOT NULL CONSTRAINT UQ_LoanApplication_CaseNumber UNIQUE,',
    '    BranchId UNIQUEIDENTIFIER NOT NULL,',
    '    ProductId UNIQUEIDENTIFIER NOT NULL,',
    '    SubmissionDate DATE NOT NULL,',
    '    CurrentStage NVARCHAR(40) NOT NULL,',
    '    StageStartDate DATE NOT NULL,',
    '    RequestedAmount DECIMAL(18, 2) NOT NULL,',
    '    SnapshotDate DATE NOT NULL',
    ');',
    ''
  );

  lines.push('INSERT INTO dbo.Branch (BranchId, BranchName, Region) VALUES');
  lines.push(
    branches
      .map((b) => `    ('${b.id}', ${sqlString(b.label)}, ${sqlString(b.region)})`)
      .join(',\n') + ';'
  );
  lines.push('');

  lines.push('INSERT INTO dbo.LoanProduct (ProductId, ProductCategory) VALUES');
  lines.push(
    products.map((p) => `    ('${p.id}', ${sqlString(p.label)})`).join(',\n') + ';'
  );
  lines.push('');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  lines.push(
    'INSERT INTO dbo.[Date] ([Date], [Year], [Quarter], MonthNumber, [MonthName], YearMonth, DayOfWeekNumber, DayOfWeekName) VALUES'
  );
  lines.push(
    dates
      .map((iso) => {
        const d = new Date(`${iso}T00:00:00Z`);
        const month = d.getUTCMonth() + 1;
        const dow = d.getUTCDay();
        // Monday = 1 ... Sunday = 7, so weekdays sort naturally in visuals.
        const dowNumber = dow === 0 ? 7 : dow;
        return `    ('${iso}', ${d.getUTCFullYear()}, N'Q${Math.ceil(month / 3)}', ${month}, ${sqlString(monthNames[month - 1])}, N'${iso.slice(0, 7)}', ${dowNumber}, ${sqlString(dayNames[dow])})`;
      })
      .join(',\n') + ';'
  );
  lines.push('');

  lines.push(
    'INSERT INTO dbo.LoanApplication (ApplicationId, CaseNumber, BranchId, ProductId, SubmissionDate, CurrentStage, StageStartDate, RequestedAmount, SnapshotDate) VALUES'
  );
  lines.push(
    applications
      .map(
        (a) =>
          `    ('${a.id}', N'${a.caseNumber}', '${a.branchId}', '${a.productId}', '${a.submissionDate}', ${sqlString(a.stageLabel)}, '${a.stageStartDate}', ${a.requestedAmount.toFixed(2)}, '${AS_OF_DATE}')`
      )
      .join(',\n') + ';'
  );
  lines.push('');

  lines.push(
    '-- Quick check: expect one row per stage with the counts in data/generator/manifest.json.',
    'SELECT CurrentStage, COUNT(*) AS Applications',
    'FROM dbo.LoanApplication',
    'GROUP BY CurrentStage',
    'ORDER BY CurrentStage;',
    ''
  );

  return lines.join('\n');
}

export function renderManifest(data) {
  const { windowStart, branches, products, applications, dates, reference, fixtures } = data;
  return (
    JSON.stringify(
      {
        generatorVersion: GENERATOR_VERSION,
        seed: SEED,
        asOfDate: AS_OF_DATE,
        submissionWindow: { from: windowStart, to: AS_OF_DATE },
        stalledAfterDays: STALLED_AFTER_DAYS,
        currency: 'USD',
        counts: {
          applications: applications.length,
          branches: branches.length,
          products: products.length,
          dates: dates.length,
          appCases: fixtures.cases.length,
          appNotes: fixtures.notes.length,
          appTasks: fixtures.tasks.length,
          appChecklistItems: fixtures.checklist.length,
        },
        referenceValues: {
          'Open applications': reference.openApplications,
          'Requested amount in pipeline': reference.requestedAmountInPipeline,
          'Average days in current stage': reference.averageDaysInCurrentStage,
          'Stalled applications': reference.stalledApplications,
        },
        byStage: reference.byStage,
        plantedCases: PLANTED_CASES.map((c) => ({
          caseNumber: c.caseNumber,
          applicationId: uuidFor(`application:${c.caseNumber}`),
          assignedTo: c.assignedTo,
          stage: c.stage,
          daysInStage: c.daysInStage,
          stalled: c.daysInStage > STALLED_AFTER_DAYS && c.stage !== 'closed' && c.stage !== 'withdrawn',
        })),
      },
      null,
      2
    ) + '\n'
  );
}

export function renderFixtures(data) {
  return [
    '// Generated by data/generator/generate.mjs. Do not edit by hand: change the',
    '// generator and run `node data/generator/generate.mjs` from the repository root.',
    '//',
    '// Synthetic lab data for the Home Loan Operations Desk. Officer emails are',
    '// resolved at seed time: "attendee" is the signed-in user, "colleague" is',
    '// LAB_COLLEAGUE from @rayfin-app/shared.',
    '',
    "import type { LabFixtures } from '@rayfin-app/shared';",
    '',
    `export const labFixtures: LabFixtures = ${JSON.stringify(data.fixtures, null, 2)};`,
    '',
  ].join('\n');
}

function main() {
  const data = generate();
  const outputs = [
    [OUTPUTS.sql, renderSql(data)],
    [OUTPUTS.manifest, renderManifest(data)],
    [OUTPUTS.fixtures, renderFixtures(data)],
  ];
  for (const [path, content] of outputs) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    console.log(`wrote ${path.slice(ROOT.length + 1)}`);
  }
  const r = data.reference;
  console.log(
    `reference: ${r.openApplications} open, USD ${r.requestedAmountInPipeline.toLocaleString('en-US')} in pipeline, ${r.averageDaysInCurrentStage} avg days, ${r.stalledApplications} stalled`
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
