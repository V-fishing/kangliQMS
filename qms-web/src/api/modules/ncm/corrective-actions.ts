/**
 * NCM — Corrective Actions API
 * Controller: NcmCorrectiveActionController  (/api/v1/ncm/corrective-actions)
 *
 * Permissions: ncm.record.create (全部)
 */
import { request } from '@/api/client'
import type { NcmCorrectiveAction } from '@/api/types/ncm'

export const ncmCorrectiveActionsApi = {
  list: () => request.get<NcmCorrectiveAction[]>('/v1/ncm/corrective-actions'),
  getById: (id: string) => request.get<NcmCorrectiveAction>(`/v1/ncm/corrective-actions/${id}`),
  create: (data: Partial<NcmCorrectiveAction>) =>
    request.post<NcmCorrectiveAction>('/v1/ncm/corrective-actions', data),
  updateProgress: (id: string, progress: number) =>
    request.post<void>(`/v1/ncm/corrective-actions/${id}/progress`, null, { params: { progress } }),
  close: (id: string) => request.post<void>(`/v1/ncm/corrective-actions/${id}/close`),
}
