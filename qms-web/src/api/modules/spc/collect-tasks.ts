/**
 * SPC — Collect Tasks API
 * Controller: SpcCollectTaskController  (/api/v1/spc/collect-tasks)
 *
 * Permissions: spc.subgroup.create (全部)
 */
import { request } from '@/api/client'
import type { SpcCollectTask } from '@/api/types/spc'

export const spcCollectTasksApi = {
  list: () => request.get<SpcCollectTask[]>('/v1/spc/collect-tasks'),
  create: (data: Partial<SpcCollectTask>) =>
    request.post<SpcCollectTask>('/v1/spc/collect-tasks', data),
  markDowntime: (id: string, data: { isPlannedDowntime: boolean; reason?: string }) =>
    request.post<void>(`/v1/spc/collect-tasks/${id}/downtime`, data),
  markMissing: (id: string, reason?: string) =>
    request.post<void>(`/v1/spc/collect-tasks/${id}/mark-missing`, { reason }),
  /** POST /api/v1/spc/collect-tasks/scan-missing — 批量扫描逾期 */
  scanMissing: () => request.post<number>('/v1/spc/collect-tasks/scan-missing'),
}
