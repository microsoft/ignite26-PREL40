/**
 * Browser-safe contracts shared by the data registration package and frontend.
 *
 * Keep each record shape aligned with its decorated runtime entity in
 * `@rayfin-app/data`. This package must stay isomorphic, so do not import the
 * decorated classes here.
 */

export const LOAN_PRODUCTS = [
  'home-purchase',
  'refinance',
  'home-improvement',
] as const;
export type LoanProduct = (typeof LOAN_PRODUCTS)[number];

export const LOAN_STAGES = [
  'submitted',
  'document-collection',
  'property-assessment',
  'internal-review',
  'offer-issued',
  'closed',
  'withdrawn',
] as const;
export type LoanStage = (typeof LOAN_STAGES)[number];

export const REVIEW_STATUSES = [
  'in-progress',
  'waiting-on-applicant',
  'ready-for-review',
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const CHECKLIST_STATUSES = ['required', 'received'] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

export const RECEIPT_CHANNELS = ['recorded', 'upload'] as const;
export type ReceiptChannel = (typeof RECEIPT_CHANNELS)[number];

export const TASK_STATUSES = ['open', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const CHECKLIST_CATEGORIES = [
  'proof-of-identity',
  'proof-of-income',
  'purchase-agreement',
  'proof-of-deposit',
  'current-mortgage-statement',
  'property-tax-statement',
  'contractor-quote',
  'renovation-plans-photos',
] as const;
export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];

/** Field limits shared by the entities and the forms that write them. */
export const FIELD_LIMITS = {
  email: 254,
  caseNumber: 16,
  applicantLabel: 120,
  branchName: 80,
  noteBody: 2000,
  taskTitle: 200,
  category: 60,
} as const;

/**
 * Fictional colleague who owns HL-1103. Nobody signs in as Morgan: the case
 * exists so attendees can prove the app refuses access to another officer's
 * case.
 */
export const LAB_COLLEAGUE = {
  name: 'Morgan Lee',
  email: 'morgan.lee@contoso.example',
} as const;

/**
 * Open applications stay "stalled" once they spend more than this many calendar
 * days in their current stage. A fictional operations threshold, not a lending
 * rule; the semantic model's Stalled applications measure uses the same value.
 */
export const STALLED_AFTER_DAYS = 7;

export interface CaseWorkspaceRecord {
  /** The source application UUID from the portfolio SQL database. */
  id: string;
  case_number: string;
  applicant_label: string;
  product: LoanProduct;
  branch_name: string;
  /** Stage from the portfolio snapshot, not live workflow state. */
  stage: LoanStage;
  stage_started_on: Date;
  snapshot_date: Date;
  requested_amount: number;
  review_status: ReviewStatus;
  assigned_officer_email: string;
  created_by_email: string;
  created_at: Date;
}

export interface CaseNoteRecord {
  id: string;
  case_id: string;
  officer_email: string;
  author_email: string;
  body: string;
  is_ai_generated: boolean;
  reviewed_by_email?: string | null;
  created_at: Date;
}

export interface CaseTaskRecord {
  id: string;
  case_id: string;
  officer_email: string;
  title: string;
  due_on?: Date | null;
  status: TaskStatus;
  created_at: Date;
}

export interface ChecklistItemRecord {
  id: string;
  case_id: string;
  officer_email: string;
  category: ChecklistCategory;
  status: ChecklistStatus;
  received_on?: Date | null;
  received_via?: ReceiptChannel | null;
  sort_order: number;
}

export type UniversalAppSchema = {
  CaseWorkspace: CaseWorkspaceRecord;
  CaseNote: CaseNoteRecord;
  CaseTask: CaseTaskRecord;
  ChecklistItem: ChecklistItemRecord;
};

/** Who a lab fixture is assigned to; resolved to an email at seed time. */
export type FixtureOwner = 'attendee' | 'colleague';

export interface CaseFixture {
  id: string;
  caseNumber: string;
  applicantLabel: string;
  product: LoanProduct;
  branchName: string;
  stage: LoanStage;
  /** ISO date (YYYY-MM-DD). */
  stageStartedOn: string;
  requestedAmount: number;
  reviewStatus: ReviewStatus;
  assignedTo: FixtureOwner;
}

export interface NoteFixture {
  id: string;
  caseId: string;
  body: string;
  /** ISO date-time. */
  createdAt: string;
}

export interface TaskFixture {
  id: string;
  caseId: string;
  title: string;
  /** ISO date (YYYY-MM-DD), or null when there is no due date. */
  dueOn: string | null;
  status: TaskStatus;
  /** ISO date-time. */
  createdAt: string;
}

export interface ChecklistFixture {
  id: string;
  caseId: string;
  category: ChecklistCategory;
  status: ChecklistStatus;
  /** ISO date (YYYY-MM-DD), or null while the item is required. */
  receivedOn: string | null;
  sortOrder: number;
}

export interface LabFixtures {
  generator: {
    seed: number;
    asOfDate: string;
    version: string;
  };
  cases: CaseFixture[];
  notes: NoteFixture[];
  tasks: TaskFixture[];
  checklist: ChecklistFixture[];
}
