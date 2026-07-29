/**
 * Common API types — match backend R<T>, PageResult<T>, and PageQuery
 *
 * Backend contract (com.konli.qms.common.base.R):
 *   { code: number; msg: string; data: T }
 *
 * Frontend request.ts unwraps `res.data` so API methods receive T directly.
 * The generic R<T> type is for documentation and explicit typing.
 */

// ── Unified response wrapper ──

/** Backend unified response. code=0 means success. */
export interface R<T = unknown> {
  code: number
  msg: string
  data: T
}

// ── Pagination ──

/** Paginated response */
export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  size: number
}

/** Pagination query parameters */
export interface PageQuery {
  page?: number
  size?: number
  sort?: string
  order?: 'asc' | 'desc'
}

// ── Common field types ──

/** ISO 8601 date-time string (backend LocalDateTime / TIMESTAMPTZ) */
export type DateTime = string

/** UUID primary key (stored as string in JSON) */
export type Uuid = string
