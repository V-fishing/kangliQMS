/**
 * FIA — Work Order Lock API
 * Controller: FiaWoLockController  (/api/v1/fia/wo-lock)
 *
 * Permissions: fia.task.list
 */
import { request } from '@/api/client'
import type { FiaWoLock } from '@/api/types/fia'

export const fiaWoLockApi = {
  /** GET /api/v1/fia/wo-lock?woNo=X — 查询工单锁定状态 */
  get: (woNo: string) =>
    request.get<FiaWoLock>('/v1/fia/wo-lock', { params: { woNo } }),
}
