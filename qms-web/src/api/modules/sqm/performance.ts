/**
 * SQM — Performance API
 * Controller: SqmSupplierPerformanceController  (/api/v1/sqm/performance)
 *
 * Permissions: sqm.supplier.list (全部)
 */
import { request } from '@/api/client'
import type { SqmSupplierPerformance } from '@/api/types/sqm'

export const sqmPerformanceApi = {
  list: () => request.get<SqmSupplierPerformance[]>('/v1/sqm/performance'),
  getById: (id: string) => request.get<SqmSupplierPerformance>(`/v1/sqm/performance/${id}`),
  create: (data: Partial<SqmSupplierPerformance>) =>
    request.post<SqmSupplierPerformance>('/v1/sqm/performance', data),
  calc: (params: { supplierId: string; period: string }) =>
    request.post<SqmSupplierPerformance>('/v1/sqm/performance/calc', null, { params }),
  /** GET /api/v1/sqm/performance/audit-freq — 审核频次建议 */
  auditFreq: () => request.get<Record<string, unknown>>('/v1/sqm/performance/audit-freq'),
}
