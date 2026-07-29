/**
 * SQM — Escalations API
 * Controller: SqmSupplierEscalationController  (/api/v1/sqm/escalations)
 *
 * Permissions: sqm.supplier.create (全部)
 */
import { request } from '@/api/client'
import type { SqmSupplierEscalation } from '@/api/types/sqm'

export const sqmEscalationsApi = {
  list: (supplierId?: string) =>
    request.get<SqmSupplierEscalation[]>('/v1/sqm/escalations', { params: { supplierId } }),
  getById: (id: string) => request.get<SqmSupplierEscalation>(`/v1/sqm/escalations/${id}`),
  create: (data: Partial<SqmSupplierEscalation>) =>
    request.post<SqmSupplierEscalation>('/v1/sqm/escalations', data),
}
