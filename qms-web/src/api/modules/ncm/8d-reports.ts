/**
 * NCM — 8D Reports API
 * Controller: Ncm8dController  (/api/v1/ncm/8d-reports)
 *
 * Permissions:
 *   ncm.8d.list   — GET /, GET /{id}
 *   ncm.8d.create — POST /, POST /launch, POST advance, POST approve, POST reopen
 */
import { request } from '@/api/client'
import type { Qms8dReport, EightDVo, AdvanceStageRequest, StageApproveDTO } from '@/api/types/ncm'

export const ncm8dApi = {
  /** GET /api/v1/ncm/8d-reports — 8D列表 */
  list: () => request.get<Qms8dReport[]>('/v1/ncm/8d-reports'),

  /** GET /api/v1/ncm/8d-reports/{id} — 8D详情含阶段 */
  getById: (id: string) => request.get<EightDVo>(`/v1/ncm/8d-reports/${id}`),

  /** POST /api/v1/ncm/8d-reports — 新建8D */
  create: (data: Partial<Qms8dReport>) => request.post<Qms8dReport>('/v1/ncm/8d-reports', data),

  /** POST /api/v1/ncm/8d-reports/launch — 从其他模块发起8D */
  launch: (data: Partial<Qms8dReport>) => request.post<Qms8dReport>('/v1/ncm/8d-reports/launch', data),

  /** POST /api/v1/ncm/8d-reports/{id}/advance — 推进阶段 (D1→D2→...→D8) */
  advanceStage: (id: string, data: AdvanceStageRequest) =>
    request.post<void>(`/v1/ncm/8d-reports/${id}/advance`, data),

  /** POST /api/v1/ncm/8d-reports/{id}/approve — 审批阶段 (D3/D5/D7) */
  approveStage: (id: string, data: StageApproveDTO) =>
    request.post<void>(`/v1/ncm/8d-reports/${id}/approve`, data),

  /** POST /api/v1/ncm/8d-reports/{id}/reopen — 重开8D */
  reopen: (id: string, reason?: string) =>
    request.post<void>(`/v1/ncm/8d-reports/${id}/reopen`, null, { params: { reason } }),
}
