/**
 * Archive API
 * Controller: ArchiveController  (/api/v1/archives)
 *
 * Permissions: sqm.audit.list OR fia.task.list (任一即可)
 */
import { request } from '@/api/client'

export const archiveApi = {
  /** GET /api/v1/archives — 跨模块归档查询 (sqm.audit.list | fia.task.list) */
  list: (params?: { type?: string }) =>
    request.get<Record<string, unknown>[]>('/v1/archives', { params }),

  /** GET /api/v1/archives/expiring — 到期提醒 */
  expiring: () => request.get<Record<string, unknown>[]>('/v1/archives/expiring'),
}
