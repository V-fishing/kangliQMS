/**
 * NCM — Daily Report Config API
 * Controller: NcmDailyReportConfigController  (/api/v1/ncm/daily-report-config)
 *
 * Permissions: ncm.record.create (全部)
 */
import { request } from '@/api/client'
import type { NcmDailyReportConfig } from '@/api/types/ncm'

export const ncmDailyReportConfigApi = {
  get: () => request.get<NcmDailyReportConfig[]>('/v1/ncm/daily-report-config'),
  save: (data: NcmDailyReportConfig) =>
    request.put<NcmDailyReportConfig>('/v1/ncm/daily-report-config', data),
  toggle: (id: string, enabled: boolean) =>
    request.put<void>(`/v1/ncm/daily-report-config/${id}/toggle`, null, { params: { enabled } }),
}
