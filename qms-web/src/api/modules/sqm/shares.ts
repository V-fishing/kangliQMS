/**
 * SQM — Shares API
 * Controller: SqmSupplierShareController  (/api/v1/sqm/shares)
 * Constraints: sqm.supplier.create (全部)
 */
import { request } from '@/api/client'
import type { SqmSupplierShare } from '@/api/types/sqm'

export const sqmSharesApi = {
  list: () => request.get<SqmSupplierShare[]>('/v1/sqm/shares'),
  getById: (id: string) => request.get<SqmSupplierShare>(`/v1/sqm/shares/${id}`),
  create: (data: Partial<SqmSupplierShare>) =>
    request.post<SqmSupplierShare>('/v1/sqm/shares', data),
}
