import {
  STALLED_AFTER_DAYS,
  type ChecklistCategory,
  type LoanProduct,
  type LoanStage,
  type ReviewStatus,
} from '@rayfin-app/shared';

export const PRODUCT_LABELS: Record<LoanProduct, string> = {
  'home-purchase': 'Home purchase',
  refinance: 'Refinance',
  'home-improvement': 'Home improvement',
};

export const STAGE_LABELS: Record<LoanStage, string> = {
  submitted: 'Submitted',
  'document-collection': 'Document collection',
  'property-assessment': 'Property assessment',
  'internal-review': 'Internal review',
  'offer-issued': 'Offer issued',
  closed: 'Closed',
  withdrawn: 'Withdrawn',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  'in-progress': 'In progress',
  'waiting-on-applicant': 'Waiting on applicant',
  'ready-for-review': 'Ready for review',
};

export const CHECKLIST_LABELS: Record<ChecklistCategory, string> = {
  'proof-of-identity': 'Proof of identity',
  'proof-of-income': 'Proof of income',
  'purchase-agreement': 'Purchase agreement',
  'proof-of-deposit': 'Proof of deposit',
  'current-mortgage-statement': 'Current mortgage statement',
  'property-tax-statement': 'Property tax statement',
  'contractor-quote': 'Contractor quote',
  'renovation-plans-photos': 'Renovation plans / current-state photos',
};

/**
 * Checklist categories that arrive as files. The starter can't receive them
 * yet: the storage checkpoint adds private uploads and marks them received.
 */
export const UPLOAD_ONLY_CATEGORIES: ReadonlySet<ChecklistCategory> = new Set([
  'renovation-plans-photos',
]);

const OPEN_STAGES: ReadonlySet<LoanStage> = new Set([
  'submitted',
  'document-collection',
  'property-assessment',
  'internal-review',
  'offer-issued',
]);

export function isOpenStage(stage: LoanStage): boolean {
  return OPEN_STAGES.has(stage);
}

/**
 * Normalize a date-only value to `YYYY-MM-DD`. The data API may return a
 * `Date` or an ISO string; both are read in UTC so the day never shifts with
 * the browser's time zone.
 */
export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/u.test(value)) {
    return value.slice(0, 10);
  }
  return null;
}

/** A `Date` at UTC midnight for a `YYYY-MM-DD` value. */
export function fromIsoDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function todayIsoDate(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000
  );
}

export interface StageAge {
  days: number;
  stalled: boolean;
}

/** Days in stage at the portfolio snapshot date, not today. */
export function stageAge(
  stage: LoanStage,
  stageStartedOn: unknown,
  snapshotDate: unknown
): StageAge | null {
  const start = toIsoDate(stageStartedOn);
  const snapshot = toIsoDate(snapshotDate);
  if (!start || !snapshot) return null;
  const days = daysBetween(start, snapshot);
  return { days, stalled: isOpenStage(stage) && days > STALLED_AFTER_DAYS };
}

const dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

export function formatDateOnly(value: unknown): string {
  const iso = toIsoDate(value);
  return iso ? dateOnlyFormatter.format(fromIsoDate(iso)) : 'Not set';
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDateTime(value: unknown): string {
  const date =
    value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateTimeFormatter.format(date) : 'Unknown time';
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatUsd(value: unknown): string {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? usdFormatter.format(amount) : 'Unknown amount';
}

/** Error text a person can act on, without stack traces or provider internals. */
export function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'The request failed. Try again, and check the browser console if it keeps failing.';
}
