/**
 * SQM — Changes API
 * Controller: SqmChangeController  (/api/v1/sqm/changes)
 *
 * Permissions:
 *   sqm.change.list   — GET /, GET /{id}, POST /batch-detail
 *   sqm.change.create — POST /, POST submit, POST approve, POST close, POST rollback, POST verify-sign
 */
import { request } from '@/api/client'
import type { SqmChangeOrder, SqmChangeOrderVo } from '@/api/types/sqm'

export const sqmChangesApi = {
  list: () => request.get<SqmChangeOrder[]>('/v1/sqm/changes'),
  getById: (id: string) => request.get<SqmChangeOrderVo>(`/v1/sqm/changes/${id}`),
  batchDetail: (ids: string[]) =>
    request.post<Record<string, SqmChangeOrderVo>>('/v1/sqm/changes/batch-detail', ids),
  create: (data: Partial<SqmChangeOrder>) =>
    request.post<SqmChangeOrder>('/v1/sqm/changes', data),
  submit: (id: string) => request.post<void>(`/v1/sqm/changes/${id}/submit`),
  approve: (id: string, data: { approvalRole: string; approved: boolean; opinion?: string }) =>
    request.post<void>(`/v1/sqm/changes/${id}/approve`, data),
  close: (id: string) => request.post<void>(`/v1/sqm/changes/${id}/close`),
  rollback: (id: string) => request.post<void>(`/v1/sqm/changes/${id}/rollback`),
  verifySign: (id: string, data: { role: string; username: string; password: string }) =>
    request.post<void>(`/v1/sqm/changes/${id}/verify-sign`, data),
}
