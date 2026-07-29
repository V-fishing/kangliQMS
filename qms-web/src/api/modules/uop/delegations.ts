/**
 * UOP — Delegations API
 * Controller: DelegationController  (/api/v1/uop/delegations)
 *
 * Permissions: system.delegation.manage (全部)
 */
import { request } from '@/api/client'
import type { SysDelegation } from '@/api/types/uop'

export const delegationsApi = {
  /** GET /api/v1/uop/delegations — 委派列表 */
  list: () => request.get<SysDelegation[]>('/v1/uop/delegations'),

  /** POST /api/v1/uop/delegations — 创建委派 */
  create: (data: Partial<SysDelegation>) => request.post<void>('/v1/uop/delegations', data),

  /** POST /api/v1/uop/delegations/{id}/revoke — 撤销委派 */
  revoke: (id: string) => request.post<void>(`/v1/uop/delegations/${id}/revoke`),
}
