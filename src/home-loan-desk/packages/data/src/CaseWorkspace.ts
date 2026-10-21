import { authenticated, date, decimal, entity, set, text, uuid } from '@microsoft/rayfin-core';
import {
  FIELD_LIMITS,
  LOAN_PRODUCTS,
  LOAN_STAGES,
  REVIEW_STATUSES,
  type LoanProduct,
  type LoanStage,
  type ReviewStatus,
} from '@rayfin-app/shared';

/**
 * A private case workspace for one loan application.
 *
 * Access rules, enforced by the data API on every request:
 * - Create: anyone on the desk can log a case (intake), but the row must record
 *   the caller as `created_by_email`.
 * - Read and delete: only the assigned officer.
 * - Update: only the assigned officer, checked against the stored row, so no
 *   one can take over a colleague's case. `created_by_email` can't change.
 *   The data API requires fields read by a policy to stay writable, so an
 *   officer could hand their own case to someone else; the app never offers it.
 */
@entity()
@authenticated('create', {
  policy: (claims, item) => claims.email.eq(item.created_by_email),
})
@authenticated(['read', 'delete'], {
  policy: (claims, item) => claims.email.eq(item.assigned_officer_email),
})
@authenticated('update', {
  policy: (claims, item) => claims.email.eq(item.assigned_officer_email),
  exclude: ['created_by_email'],
})
export class CaseWorkspace {
  @uuid() id!: string;
  @text({ min: 1, max: FIELD_LIMITS.caseNumber, unique: true }) case_number!: string;
  @text({ min: 1, max: FIELD_LIMITS.applicantLabel }) applicant_label!: string;
  @set(...LOAN_PRODUCTS) product!: LoanProduct;
  @text({ max: FIELD_LIMITS.branchName }) branch_name!: string;
  @set(...LOAN_STAGES) stage!: LoanStage;
  @date() stage_started_on!: Date;
  @date() snapshot_date!: Date;
  @decimal({ precision: 18, scale: 2 }) requested_amount!: number;
  @set(...REVIEW_STATUSES) review_status!: ReviewStatus;
  @text({ max: FIELD_LIMITS.email }) assigned_officer_email!: string;
  @text({ max: FIELD_LIMITS.email }) created_by_email!: string;
  @date() created_at!: Date;
}
