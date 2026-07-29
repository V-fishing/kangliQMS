/**
 * SPC — Control Limits API
 * Controller: SpcControlLimitController  (/api/v1/spc/control-limits)
 *
 * Permissions: spc.param.list (全部)
 */
import { request } from '@/api/client'
import type { SpcControlLimit } from '@/api/types/spc'

export const spcControlLimitsApi = {
  list: (params?: { paramId?: string }) =>
    request.get<SpcControlLimit[]>('/v1/spc/control-limits', { params }),
  calc: (paramId: string) =>
    request.post<SpcControlLimit>('/v1/spc/control-limits/calc', { paramId }),
}
