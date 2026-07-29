/**
 * NCM — Defect Dicts API
 * Controller: NcmDefectDictController  (/api/v1/ncm/defect-dicts)
 *
 * Permissions:
 *   ncm.defect.list   — GET /, GET /{id}
 *   ncm.defect.create — POST, PUT, DELETE
 */
import { request } from '@/api/client'
import type { NcmDefectDict } from '@/api/types/ncm'

export const ncmDefectDictsApi = {
  list: () => request.get<NcmDefectDict[]>('/v1/ncm/defect-dicts'),
  getById: (id: string) => request.get<NcmDefectDict>(`/v1/ncm/defect-dicts/${id}`),
  create: (data: Partial<NcmDefectDict>) => request.post<NcmDefectDict>('/v1/ncm/defect-dicts', data),
  update: (id: string, data: Partial<NcmDefectDict>) => request.put<void>(`/v1/ncm/defect-dicts/${id}`, data),
  delete: (id: string) => request.delete<void>(`/v1/ncm/defect-dicts/${id}`),
}
