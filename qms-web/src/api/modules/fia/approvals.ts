/**
 * FIA — Approvals API
 * Controller: FiaApprovalController  (/api/v1/fia/approvals)
 *
 * Permissions: fia.std.create (全部)
 */
import { request } from '@/api/client'
import type { FiaApproval } from '@/api/types/fia'

export const fiaApprovalsApi = {
  /** GET /api/v1/fia/approvals — 审批列表 */
  list: () => request.get<FiaApproval[]>('/v1/fia/approvals'),

  /** GET /api/v1/fia/approvals/{id} — 审批详情 */
  getById: (id: string) => request.get<FiaApproval>(`/v1/fia/approvals/${id}`),

  /** POST /api/v1/fia/approvals — 创建审批 */
  create: (data: Partial<FiaApproval>) => request.post<FiaApproval>('/v1/fia/approvals', data),

  /** POST /api/v1/fia/approvals/{id}/approve — 审批(通过/驳回) */
  approve: (id: string, data: { approved: boolean; opinion?: string }) =>
    request.post<void>(`/v1/fia/approvals/${id}/approve`, data),
}
