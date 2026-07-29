/**
 * NCM — Alert Escalations API
 * Controller: NcmAlertEscalationController  (/api/v1/ncm/escalations)
 *
 * Permissions: ncm.record.create (全部)
 */
import { request } from '@/api/client'
import type { NcmAlertEscalation } from '@/api/types/ncm'

export const ncmEscalationsApi = {
  list: () => request.get<NcmAlertEscalation[]>('/v1/ncm/escalations'),
  create: (data: Partial<NcmAlertEscalation>) =>
    request.post<NcmAlertEscalation>('/v1/ncm/escalations', data),
  update: (id: string, data: Partial<NcmAlertEscalation>) =>
    request.put<void>(`/v1/ncm/escalations/${id}`, data),
  delete: (id: string) => request.delete<void>(`/v1/ncm/escalations/${id}`),
}
