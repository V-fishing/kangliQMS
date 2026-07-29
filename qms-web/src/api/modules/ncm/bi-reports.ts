/**
 * NCM — BI Reports API
 * Controller: NcmBiReportController  (/api/v1/ncm/bi-reports)
 *
 * Permissions: ncm.record.list (全部)
 */
import { request } from '@/api/client'
import type { NcmBiReport } from '@/api/types/ncm'

export const ncmBiReportsApi = {
  list: () => request.get<NcmBiReport[]>('/v1/ncm/bi-reports'),
  getById: (id: string) => request.get<NcmBiReport>(`/v1/ncm/bi-reports/${id}`),
  create: (data: Partial<NcmBiReport>) => request.post<NcmBiReport>('/v1/ncm/bi-reports', data),
}
