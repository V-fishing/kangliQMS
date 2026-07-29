/**
 * FIA — Tasks API
 * Controller: FiaTaskController  (/api/v1/fia/tasks)
 *
 * Permissions:
 *   fia.task.list   — GET dashboard, list, getById, matchStd, archive, archives, log
 *   fia.task.create — POST create, items, batch-by-lot
 *   fia.task.submit — POST sign-inspector, sign-reviewer, sign-approver, disposition
 */
import { request } from '@/api/client'
import type {
  FiaTask, FiaTaskVo, FiaInspStd, FiaArchivedReport,
  CreateFiaTaskRequest, InspItemResultRequest, SignRequest,
} from '@/api/types/fia'

export const fiaTasksApi = {
  /** GET /api/v1/fia/tasks/dashboard — 仪表盘 (fia.task.list) */
  dashboard: () => request.get<Record<string, unknown>>('/v1/fia/tasks/dashboard'),

  /** GET /api/v1/fia/tasks — 任务列表 (fia.task.list) */
  list: () => request.get<FiaTask[]>('/v1/fia/tasks'),

  /** GET /api/v1/fia/tasks/{id} — 任务详情 (fia.task.list) */
  getById: (id: string) => request.get<FiaTaskVo>(`/v1/fia/tasks/${id}`),

  /** GET /api/v1/fia/tasks/match-std — 匹配检验标准 (fia.task.list) */
  matchStd: (params: { orgId?: string; partNo?: string; supplierId?: string; procName?: string }) =>
    request.get<FiaInspStd>('/v1/fia/tasks/match-std', { params }),

  /** POST /api/v1/fia/tasks — 创建任务 (fia.task.create) */
  create: (data: CreateFiaTaskRequest) => request.post<FiaTask>('/v1/fia/tasks', data),

  /** POST /api/v1/fia/tasks/{id}/items — 录入检验结果 (fia.task.create) */
  enterResults: (taskId: string, data: InspItemResultRequest) =>
    request.post<void>(`/v1/fia/tasks/${taskId}/items`, data),

  /** POST /api/v1/fia/tasks/{id}/sign-inspector — 检验人签名 (fia.task.submit) */
  signInspector: (taskId: string, data: SignRequest) =>
    request.post<void>(`/v1/fia/tasks/${taskId}/sign-inspector`, data),

  /** POST /api/v1/fia/tasks/{id}/sign-reviewer — 复核人签名 (fia.task.submit) */
  signReviewer: (taskId: string, data: SignRequest) =>
    request.post<void>(`/v1/fia/tasks/${taskId}/sign-reviewer`, data),

  /** POST /api/v1/fia/tasks/{id}/sign-approver — 批准人签名 (fia.task.submit) */
  signApprover: (taskId: string, data: SignRequest) =>
    request.post<void>(`/v1/fia/tasks/${taskId}/sign-approver`, data),

  /** POST /api/v1/fia/tasks/{id}/disposition — 设置处置 (fia.task.submit) */
  setDisposition: (taskId: string, disposition: string, remark?: string) =>
    request.post<void>(`/v1/fia/tasks/${taskId}/disposition`, null, {
      params: { disposition, remark },
    }),

  /** GET /api/v1/fia/tasks/{id}/archive — 查看归档报告 (fia.task.list) */
  getArchive: (taskId: string) =>
    request.get<FiaArchivedReport>(`/v1/fia/tasks/${taskId}/archive`),

  /** GET /api/v1/fia/tasks/archives — 归档列表 (fia.task.list) */
  listArchives: () => request.get<Record<string, unknown>[]>('/v1/fia/tasks/archives'),

  /** GET /api/v1/fia/tasks/{id}/log — 操作日志时间线 (fia.task.list) */
  getTaskLog: (taskId: string) =>
    request.get<Record<string, unknown>[]>(`/v1/fia/tasks/${taskId}/log`),

  /** POST /api/v1/fia/tasks/batch-by-lot — 按批次批量创建 (fia.task.create) */
  batchCreateByLot: (lotNo: string) =>
    request.post<Record<string, unknown>>('/v1/fia/tasks/batch-by-lot', { lotNo }),
}
