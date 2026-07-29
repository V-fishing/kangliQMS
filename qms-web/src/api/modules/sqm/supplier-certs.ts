/**
 * SQM — Supplier Certs API
 * Controller: SqmSupplierCertController  (/api/v1/sqm/supplier-certs)
 *
 * Permissions:
 *   sqm.supplier.list   — GET /expiring
 *   sqm.supplier.create — GET /, GET /{id}, POST, DELETE
 */
import { request } from '@/api/client'
import type { SqmSupplierCert } from '@/api/types/sqm'

export const sqmSupplierCertsApi = {
  list: () => request.get<SqmSupplierCert[]>('/v1/sqm/supplier-certs'),
  expiring: (days?: number) =>
    request.get<SqmSupplierCert[]>('/v1/sqm/supplier-certs/expiring', { params: { days } }),
  getById: (id: string) => request.get<SqmSupplierCert>(`/v1/sqm/supplier-certs/${id}`),
  create: (data: Partial<SqmSupplierCert>) =>
    request.post<SqmSupplierCert>('/v1/sqm/supplier-certs', data),
  delete: (id: string) => request.delete<void>(`/v1/sqm/supplier-certs/${id}`),
}
