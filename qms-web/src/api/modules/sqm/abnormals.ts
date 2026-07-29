/**
 * SQM — Abnormals API
 * Controller: SqmAbnormalController  (/api/v1/sqm)
 *
 * Permissions:
 *   sqm.abnormal.list   — GET /abnormals, GET /abnormals/{id}/rectification
 *   sqm.abnormal.create — POST /abnormals, POST close, PUT rectification, POST check-escalation
 */
import { request } from '@/api/client'
import type { SqmIncomingAbnormal } from '@/api/types/sqm'

export const sqmAbnormalsApi = {
  list: () => request.get<SqmIncomingAbnormal[]>('/v1/sqm/abnormals'),
  create: (data: Partial<SqmIncomingAbnormal>) =>
    request.post<SqmIncomingAbnormal>('/v1/sqm/abnormals', data),
  close: (id: string, data: { disposal: string; disposalRemark?: string }) =>
    request.post<void>(`/v1/sqm/abnormals/${id}/close`, data),
  saveRectification: (id: string, data: Record<string, unknown>) =>
    request.put<void>(`/v1/sqm/abnormals/${id}/rectification`, data),
  getRectification: (id: string) =>
    request.get<Record<string, unknown>>(`/v1/sqm/abnormals/${id}/rectification`),
  checkEscalation: () => request.post<void>('/v1/sqm/abnormals/check-escalation'),
}
