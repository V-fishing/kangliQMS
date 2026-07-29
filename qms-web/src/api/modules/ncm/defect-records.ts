/**
 * NCM — Defect Records API
 * Controllers: NcmDefectRecordController  (/api/v1/ncm)
 *
 * Permissions:
 *   ncm.record.list   — GET /defect-records, GET /defect-records/{id}, analysis/*, dashboard
 *   ncm.record.create — POST /defect-records
 *   ncm.8d.create     — POST /defect-records/{id}/launch-8d
 *   ncm.capa.create   — POST /defect-records/{id}/launch-capa
 */
import { request } from '@/api/client'
import type { NcmDefectRecord } from '@/api/types/ncm'

export const ncmDefectRecordsApi = {
  /** GET /api/v1/ncm/defect-records — 不良记录列表 (ncm.record.list) */
  list: (params?: Record<string, unknown>) =>
    request.get<NcmDefectRecord[]>('/v1/ncm/defect-records', { params }),

  /** GET /api/v1/ncm/defect-records/{id} — 不良记录详情 (ncm.record.list) */
  getById: (id: string) => request.get<NcmDefectRecord>(`/v1/ncm/defect-records/${id}`),

  /** POST /api/v1/ncm/defect-records — 录入不良记录 (ncm.record.create) */
  create: (data: Partial<NcmDefectRecord>) =>
    request.post<NcmDefectRecord>('/v1/ncm/defect-records', data),

  /** GET /api/v1/ncm/dashboard — 不良仪表盘 (ncm.record.list) */
  dashboard: () => request.get<Record<string, unknown>>('/v1/ncm/dashboard'),

  /** GET /api/v1/ncm/analysis/multi-dim — 多维分析 (ncm.record.list) */
  multiDimAnalysis: (params: Record<string, unknown>) =>
    request.get<Record<string, unknown>[]>('/v1/ncm/analysis/multi-dim', { params }),

  /** GET /api/v1/ncm/analysis/trend — 趋势分析 (ncm.record.list) */
  trendAnalysis: (params: Record<string, unknown>) =>
    request.get<Record<string, unknown>[]>('/v1/ncm/analysis/trend', { params }),

  /** GET /api/v1/ncm/analysis/compare — 环比/同比分析 (ncm.record.list) */
  compareAnalysis: (params: Record<string, unknown>) =>
    request.get<Record<string, unknown>>('/v1/ncm/analysis/compare', { params }),

  /** POST /api/v1/ncm/analysis/check-anomaly — 趋势异常检测 (ncm.record.list) */
  checkAnomaly: () => request.post<Record<string, unknown>>('/v1/ncm/analysis/check-anomaly'),

  /** POST /api/v1/ncm/defect-records/{id}/launch-8d — 发起8D (ncm.8d.create) */
  launch8d: (defectId: string) =>
    request.post<Record<string, unknown>>(`/v1/ncm/defect-records/${defectId}/launch-8d`),

  /** POST /api/v1/ncm/defect-records/{id}/launch-capa — 发起CAPA (ncm.capa.create) */
  launchCapa: (defectId: string) =>
    request.post<Record<string, unknown>>(`/v1/ncm/defect-records/${defectId}/launch-capa`),
}
