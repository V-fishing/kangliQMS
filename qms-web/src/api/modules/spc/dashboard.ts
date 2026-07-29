/**
 * SPC — Dashboard / Chart API
 * Controllers: SpcChartController  (/api/v1/spc)
 *
 * Permissions: spc.param.list (全部)
 */
import { request } from '@/api/client'
import type { SpcDashboardVo, ControlChartVo, SpcHistogramVo } from '@/api/types/spc'

export const spcDashboardApi = {
  /** GET /api/v1/spc/dashboard */
  dashboard: () => request.get<SpcDashboardVo>('/v1/spc/dashboard'),

  /** GET /api/v1/spc/control-chart */
  controlChart: (params: { paramId: string; startTime?: string; endTime?: string }) =>
    request.get<ControlChartVo>('/v1/spc/control-chart', { params }),

  /** GET /api/v1/spc/histogram */
  histogram: (params: { paramId: string }) =>
    request.get<SpcHistogramVo>('/v1/spc/histogram', { params }),
}
