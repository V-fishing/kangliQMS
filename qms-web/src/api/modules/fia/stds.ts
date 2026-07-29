/**
 * FIA — Inspection Standards API
 * Controller: InspStdController  (/api/v1/fia/stds)
 *
 * Permissions:
 *   fia.std.list   — GET /
 *   fia.std.create — POST, PUT, DELETE
 */
import { request } from '@/api/client'
import type { FiaInspStd, InspStdVo, CreateInspStdRequest } from '@/api/types/fia'

export const fiaStdsApi = {
  /** GET /api/v1/fia/stds — 标准列表 (fia.std.list) */
  list: () => request.get<FiaInspStd[]>('/v1/fia/stds'),

  /** GET /api/v1/fia/stds/{id} — 标准详情含检验项目 (fia.std.list) */
  getById: (id: string) => request.get<InspStdVo>(`/v1/fia/stds/${id}`),

  /** POST /api/v1/fia/stds — 创建标准 (fia.std.create) */
  create: (data: CreateInspStdRequest) => request.post<FiaInspStd>('/v1/fia/stds', data),

  /** PUT /api/v1/fia/stds/{id} — 更新标准 (fia.std.create) */
  update: (id: string, data: CreateInspStdRequest) =>
    request.put<void>(`/v1/fia/stds/${id}`, data),

  /** DELETE /api/v1/fia/stds/{id} — 删除标准 (fia.std.create) */
  delete: (id: string) => request.delete<void>(`/v1/fia/stds/${id}`),
}
