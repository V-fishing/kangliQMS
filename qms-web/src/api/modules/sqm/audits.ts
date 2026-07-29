/**
 * SQM — Audits API
 * Controller: SqmAuditController  (/api/v1/sqm/audits)
 *
 * Permissions:
 *   sqm.audit.list   — GET plans, GET records, GET ncs, GET report, GET archive, GET photos
 *   sqm.audit.create — POST plans, PUT confirm, POST start, POST records, POST ncs, POST closeNc,
 *                       POST archive/generate, POST photos
 */
import { request } from '@/api/client'
import type { SqmAuditPlan, SqmAuditRecord, SqmAuditNc } from '@/api/types/sqm'

export const sqmAuditsApi = {
  // ── Plans ──
  listPlans: () => request.get<SqmAuditPlan[]>('/v1/sqm/audits/plans'),
  createPlan: (data: Partial<SqmAuditPlan>) =>
    request.post<SqmAuditPlan>('/v1/sqm/audits/plans', data),
  confirmPlan: (id: string) =>
    request.put<void>(`/v1/sqm/audits/plans/${id}/confirm`),
  startPlan: (id: string) =>
    request.post<SqmAuditPlan>(`/v1/sqm/audits/plans/${id}/start`),

  // ── Records ──
  listRecords: () => request.get<SqmAuditRecord[]>('/v1/sqm/audits/records'),
  createRecord: (data: Partial<SqmAuditRecord>) =>
    request.post<SqmAuditRecord>('/v1/sqm/audits/records', data),
  getReport: (recordId: string) =>
    request.get(`/v1/sqm/audits/records/${recordId}/report`, { responseType: 'blob' }),
  getArchive: (recordId: string) =>
    request.get<Record<string, unknown>[]>(`/v1/sqm/audits/records/${recordId}/archive`),
  generateArchive: (recordId: string) =>
    request.post<Record<string, unknown>>(`/v1/sqm/audits/records/${recordId}/archive/generate`),
  uploadPhoto: (recordId: string, formData: FormData) =>
    request.post<string>(`/v1/sqm/audits/records/${recordId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ── NCs ──
  listNcs: () => request.get<SqmAuditNc[]>('/v1/sqm/audits/ncs'),
  createNc: (data: Partial<SqmAuditNc>) =>
    request.post<SqmAuditNc>('/v1/sqm/audits/ncs', data),
  closeNc: (id: string, data: { verifyResult?: string; verifyComment?: string }) =>
    request.post<void>(`/v1/sqm/audits/ncs/${id}/close`, data),
}
