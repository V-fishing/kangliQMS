/**
 * Patrol — Abnormals API
 * Controller: PatlAbnormalController  (/api/v1/patrol/abnormals)
 *
 * Permissions:
 *   patl.task.list   — GET /
 *   patl.task.create — POST close
 */
import { request } from '@/api/client'
import type { PatlAbnormal } from '@/api/types/patrol'

export const patrolAbnormalsApi = {
  list: () => request.get<PatlAbnormal[]>('/v1/patrol/abnormals'),
  close: (id: string, data?: { handleRemark?: string }) =>
    request.post<void>(`/v1/patrol/abnormals/${id}/close`, data),
}
