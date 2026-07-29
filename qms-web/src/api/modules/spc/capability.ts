/**
 * SPC — Capability API
 * Controller: SpcCapabilityController  (/api/v1/spc/capability)
 *
 * Permissions: spc.capability.list (全部)
 */
import { request } from '@/api/client'
import type { SpcCapability, SpcSupplierCpkVo } from '@/api/types/spc'

export const spcCapabilityApi = {
  list: (params?: { paramId?: string }) =>
    request.get<SpcCapability[]>('/v1/spc/capability', { params }),
  calc: (params: { paramId: string; periodType?: string; periodValue?: string }) =>
    request.post<SpcCapability>('/v1/spc/capability/calc', null, { params }),
  trend: (params: { paramId: string; months?: number }) =>
    request.get<SpcCapability[]>('/v1/spc/capability/trend', { params }),
  supplierCpk: () => request.get<SpcSupplierCpkVo[]>('/v1/spc/capability/supplier-cpk'),
}
