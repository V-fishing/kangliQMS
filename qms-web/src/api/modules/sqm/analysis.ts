/**
 * SQM — Analysis API
 * Controller: SqmAnalysisController  (/api/v1/sqm)
 *
 * Permissions: sqm.supplier.list (全部)
 */
import { request } from '@/api/client'

export const sqmAnalysisApi = {
  /** GET /api/v1/sqm/analysis/incoming — 来料多维度分析 */
  incoming: (params: Record<string, unknown>) =>
    request.get<Record<string, unknown>[]>('/v1/sqm/analysis/incoming', { params }),
  /** GET /api/v1/sqm/analysis/abnormal — 来料异常多维度分析 */
  abnormal: (params: Record<string, unknown>) =>
    request.get<Record<string, unknown>[]>('/v1/sqm/analysis/abnormal', { params }),
  /** GET /api/v1/sqm/dashboard/incoming — SQM仪表盘 */
  dashboard: () => request.get<Record<string, unknown>>('/v1/sqm/dashboard/incoming'),
  /** GET /api/v1/sqm/performance/ranking — 供应商绩效排名 */
  ranking: (period: string) =>
    request.get<Record<string, unknown>[]>('/v1/sqm/performance/ranking', { params: { period } }),
}
