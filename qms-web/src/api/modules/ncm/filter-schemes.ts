/**
 * NCM — Filter Schemes API
 * Controller: NcmFilterSchemeController  (/api/v1/ncm/filter-schemes)
 *
 * Permissions: ncm.record.list (全部)
 */
import { request } from '@/api/client'
import type { NcmFilterScheme } from '@/api/types/ncm'

export const ncmFilterSchemesApi = {
  list: () => request.get<NcmFilterScheme[]>('/v1/ncm/filter-schemes'),
  create: (data: Partial<NcmFilterScheme>) =>
    request.post<NcmFilterScheme>('/v1/ncm/filter-schemes', data),
  delete: (id: string) => request.delete<void>(`/v1/ncm/filter-schemes/${id}`),
}
