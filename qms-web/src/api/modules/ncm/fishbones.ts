/**
 * NCM — Fishbone API
 * Controller: Qms8dFishboneController  (/api/v1/ncm/fishbones)
 *
 * Permissions: ncm.8d.create (全部)
 */
import { request } from '@/api/client'
import type { Qms8dFishbone } from '@/api/types/ncm'

export const ncmFishboneApi = {
  list: (d8Id: string) =>
    request.get<Qms8dFishbone[]>('/v1/ncm/fishbones', { params: { d8Id } }),
  create: (data: Partial<Qms8dFishbone>) =>
    request.post<Qms8dFishbone>('/v1/ncm/fishbones', data),
  update: (id: string, data: Partial<Qms8dFishbone>) =>
    request.put<void>(`/v1/ncm/fishbones/${id}`, data),
  delete: (id: string) => request.delete<void>(`/v1/ncm/fishbones/${id}`),
}
