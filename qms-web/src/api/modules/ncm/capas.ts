/**
 * NCM — CAPA API
 * Controller: NcmCapaController  (/api/v1/ncm/capas)
 *
 * Permissions:
 *   ncm.capa.list   — GET /, GET /{id}
 *   ncm.capa.create — POST /, POST progress, POST close, POST approve, POST reset
 */
import { request } from '@/api/client'
import type { QmsCapa, CapaVo } from '@/api/types/ncm'

export const ncmCapaApi = {
  list: () => request.get<QmsCapa[]>('/v1/ncm/capas'),
  getById: (id: string) => request.get<CapaVo>(`/v1/ncm/capas/${id}`),
  create: (data: Partial<QmsCapa>) => request.post<QmsCapa>('/v1/ncm/capas', data),
  updateProgress: (id: string, progress: number) =>
    request.post<void>(`/v1/ncm/capas/${id}/progress`, null, { params: { progress } }),
  approve: (id: string, data: { approved: boolean; opinion?: string }) =>
    request.post<void>(`/v1/ncm/capas/${id}/approve`, data),
  close: (id: string) => request.post<void>(`/v1/ncm/capas/${id}/close`),
  reset: (id: string) => request.post<void>(`/v1/ncm/capas/${id}/reset`),
}
