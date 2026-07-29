/**
 * SPC — Subgroups API
 * Controller: SpcSubgroupController  (/api/v1/spc/subgroups)
 *
 * Permissions:
 *   spc.subgroup.list   — GET /, GET /{id}
 *   spc.subgroup.create — POST
 */
import { request } from '@/api/client'
import type { SpcSubgroup, SpcSubgroupVo, CreateSubgroupRequest } from '@/api/types/spc'

export const spcSubgroupsApi = {
  list: (params?: { paramId?: string }) =>
    request.get<SpcSubgroup[]>('/v1/spc/subgroups', { params }),
  getById: (id: string) => request.get<SpcSubgroupVo>(`/v1/spc/subgroups/${id}`),
  create: (data: CreateSubgroupRequest) =>
    request.post<SpcSubgroup>('/v1/spc/subgroups', data),
}
