/**
 * SPC — Global Config API
 * Controller: SpcGlobalConfigController  (/api/v1/spc/global-config)
 *
 * Permissions: spc.param.list (GET), spc.param.list (PUT)
 */
import { request } from '@/api/client'
import type { SpcGlobalConfig } from '@/api/types/spc'

export const spcGlobalConfigApi = {
  get: (orgId?: string) =>
    request.get<SpcGlobalConfig>('/v1/spc/global-config', {
      params: orgId ? { orgId } : undefined,
    }),
  save: (data: Partial<SpcGlobalConfig>) =>
    request.put<void>('/v1/spc/global-config', data),
}
