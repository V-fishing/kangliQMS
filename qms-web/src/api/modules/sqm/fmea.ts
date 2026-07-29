/**
 * SQM — FMEA API
 * Controller: SqmFmeaController  (/api/v1/sqm/fmea)
 *
 * Permissions:
 *   sqm.fmea.list  — GET types, GET predict, GET /, GET /{id}/tracks
 *   sqm.fmea.edit  — POST /, PUT /{id}, POST close, POST reopen, POST scan-overdue
 */
import { request } from '@/api/client'
import type { QmsFmeaRisk, QmsFmeaRiskTrack } from '@/api/types/sqm'

export const sqmFmeaApi = {
  types: () => request.get<string[]>('/v1/sqm/fmea/types'),
  predict: (data: { severity: number; occurrence: number; detection: number }) =>
    request.post<Record<string, unknown>>('/v1/sqm/fmea/predict', data),
  list: () => request.get<QmsFmeaRisk[]>('/v1/sqm/fmea'),
  create: (data: Partial<QmsFmeaRisk>) => request.post<QmsFmeaRisk>('/v1/sqm/fmea', data),
  update: (id: string, data: Partial<QmsFmeaRisk>) =>
    request.put<QmsFmeaRisk>(`/v1/sqm/fmea/${id}`, data),
  close: (id: string, data: { evidence: string; actionNote?: string; recurrenceVerified?: boolean }) =>
    request.post<QmsFmeaRisk>(`/v1/sqm/fmea/${id}/close`, data),
  tracks: (riskId: string) =>
    request.get<QmsFmeaRiskTrack[]>(`/v1/sqm/fmea/${riskId}/tracks`),
  reopen: (id: string) =>
    request.post<QmsFmeaRisk>(`/v1/sqm/fmea/${id}/reopen`),
  scanOverdue: () => request.post<number>('/v1/sqm/fmea/scan-overdue'),
}
