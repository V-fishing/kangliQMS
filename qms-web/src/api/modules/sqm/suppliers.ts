/**
 * SQM — Suppliers API
 * Controller: SqmSupplierController  (/api/v1/sqm/suppliers)
 *
 * Permissions:
 *   sqm.supplier.list   — GET /, GET /{id}
 *   sqm.supplier.create — POST, PUT, DELETE
 */
import { request } from '@/api/client'
import type { SqmSupplier } from '@/api/types/sqm'

export const sqmSuppliersApi = {
  list: () => request.get<SqmSupplier[]>('/v1/sqm/suppliers'),
  getById: (id: string) => request.get<SqmSupplier>(`/v1/sqm/suppliers/${id}`),
  create: (data: Partial<SqmSupplier>) => request.post<SqmSupplier>('/v1/sqm/suppliers', data),
  update: (id: string, data: Partial<SqmSupplier>) =>
    request.put<void>(`/v1/sqm/suppliers/${id}`, data),
  delete: (id: string) => request.delete<void>(`/v1/sqm/suppliers/${id}`),
}
