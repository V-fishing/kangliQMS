/**
 * SPC — Params API
 * Controller: SpcParamController  (/api/v1/spc/params)
 *
 * Permissions:
 *   spc.param.list   — GET /, GET /{id}
 *   spc.param.create — POST, PUT, DELETE
 */
import { request } from '@/api/client'
import type { SpcParam } from '@/api/types/spc'

export const spcParamsApi = {
  list: () => request.get<SpcParam[]>('/v1/spc/params'),
  getById: (id: string) => request.get<SpcParam>(`/v1/spc/params/${id}`),
  create: (data: Partial<SpcParam>) => request.post<SpcParam>('/v1/spc/params', data),
  update: (id: string, data: Partial<SpcParam>) => request.put<void>(`/v1/spc/params/${id}`, data),
  delete: (id: string) => request.delete<void>(`/v1/spc/params/${id}`),
}
