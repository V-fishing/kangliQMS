/**
 * SQM — Strict Inspects API
 * Controller: SqmChangeStrictInspectController  (/api/v1/sqm/strict-inspects)
 * Constraints: sqm.change.create (全部)
 */
import { request } from '@/api/client'
import type { SqmChangeStrictInspect } from '@/api/types/sqm'

export const sqmStrictInspectsApi = {
  list: () => request.get<SqmChangeStrictInspect[]>('/v1/sqm/strict-inspects'),
  getById: (id: string) => request.get<SqmChangeStrictInspect>(`/v1/sqm/strict-inspects/${id}`),
  create: (data: Partial<SqmChangeStrictInspect>) =>
    request.post<SqmChangeStrictInspect>('/v1/sqm/strict-inspects', data),
  restore: (id: string) => request.post<void>(`/v1/sqm/strict-inspects/${id}/restore`),
}
