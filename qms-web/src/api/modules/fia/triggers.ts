/**
 * FIA — Trigger Types API
 * Controller: FiaTriggerTypeController  (/api/v1/fia/triggers)
 *
 * Permissions: fia.std.create (全部)
 */
import { request } from '@/api/client'
import type { FiaTriggerType } from '@/api/types/fia'

export const fiaTriggersApi = {
  /** GET /api/v1/fia/triggers — 触发类型列表 */
  list: () => request.get<FiaTriggerType[]>('/v1/fia/triggers'),

  /** POST /api/v1/fia/triggers — 创建触发类型 */
  create: (data: Partial<FiaTriggerType>) => request.post<FiaTriggerType>('/v1/fia/triggers', data),

  /** PUT /api/v1/fia/triggers/{id} — 更新触发类型 */
  update: (id: string, data: Partial<FiaTriggerType>) =>
    request.put<void>(`/v1/fia/triggers/${id}`, data),

  /** DELETE /api/v1/fia/triggers/{id} — 删除触发类型 */
  delete: (id: string) => request.delete<void>(`/v1/fia/triggers/${id}`),

  /** PUT /api/v1/fia/triggers/{id}/toggle — 启用/停用 */
  toggle: (id: string, enabled: boolean) =>
    request.put<void>(`/v1/fia/triggers/${id}/toggle`, null, { params: { enabled } }),
}
