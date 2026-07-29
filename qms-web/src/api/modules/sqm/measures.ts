/**
 * SQM — Measures API
 * Controller: SqmSupplierMeasureController  (/api/v1/sqm/measures)
 * Constraints: sqm.abnormal.create (全部)
 */
import { request } from '@/api/client'
import type { SqmSupplierMeasure } from '@/api/types/sqm'

export const sqmMeasuresApi = {
  list: (abnormalId?: string) =>
    request.get<SqmSupplierMeasure[]>('/v1/sqm/measures', { params: { abnormalId } }),
  getById: (id: string) => request.get<SqmSupplierMeasure>(`/v1/sqm/measures/${id}`),
  create: (data: Partial<SqmSupplierMeasure>) =>
    request.post<SqmSupplierMeasure>('/v1/sqm/measures', data),
}
