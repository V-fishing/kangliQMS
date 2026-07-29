/**
 * FIA — Sign Config API
 * Controller: SignConfigController  (/api/v1/fia/sign-config)
 */
import { request } from '@/api/client'
import type { FiaSignConfig } from '@/api/types/fia'

export const fiaSignConfigApi = {
  /** GET /api/v1/fia/sign-config — 获取签名配置 (免鉴权) */
  get: () => request.get<FiaSignConfig>('/v1/fia/sign-config'),

  /** PUT /api/v1/fia/sign-config — 保存签名配置 (fia.std.create) */
  save: (data: FiaSignConfig) => request.put<void>('/v1/fia/sign-config', data),
}
