/**
 * FIA — Intercept Config API
 * Controller: FiaInterceptConfigController  (/api/v1/fia/intercept-config)
 *
 * Permissions: fia.std.create (全部)
 */
import { request } from '@/api/client'
import type { FiaInterceptConfig } from '@/api/types/fia'

export const fiaInterceptConfigApi = {
  /** GET /api/v1/fia/intercept-config — 获取拦截配置 */
  get: () => request.get<FiaInterceptConfig>('/v1/fia/intercept-config'),

  /** PUT /api/v1/fia/intercept-config — 保存拦截配置 */
  save: (data: FiaInterceptConfig) => request.put<void>('/v1/fia/intercept-config', data),
}
