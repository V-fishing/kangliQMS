/**
 * Patrol — Tasks API
 * Controller: PatlTaskController  (/api/v1/patrol/tasks)
 *
 * Permissions:
 *   patl.task.list   — GET /, GET /{id}
 *   patl.task.create — POST /, POST records, POST close
 */
import { request } from '@/api/client'
import type { PatlTask, PatlTaskVo } from '@/api/types/patrol'

export const patrolTasksApi = {
  list: () => request.get<PatlTask[]>('/v1/patrol/tasks'),
  getById: (id: string) => request.get<PatlTaskVo>(`/v1/patrol/tasks/${id}`),
  create: (data: Partial<PatlTask>) => request.post<PatlTask>('/v1/patrol/tasks', data),
  /** POST /api/v1/patrol/tasks/{id}/records — 提交检查记录 */
  submitRecords: (taskId: string, data: Record<string, unknown>) =>
    request.post<void>(`/v1/patrol/tasks/${taskId}/records`, data),
  /** POST /api/v1/patrol/tasks/{id}/close — 关闭任务 */
  close: (taskId: string) =>
    request.post<void>(`/v1/patrol/tasks/${taskId}/close`),
}
