/**
 * SQM — Audit Freq Rules API
 * Controller: SqmAuditFreqRuleController  (/api/v1/sqm/audit-freq-rules)
 * Constraints: sqm.audit.create (全部)
 */
import { request } from '@/api/client'
import type { SqmAuditFreqRule } from '@/api/types/sqm'

export const sqmAuditFreqRulesApi = {
  list: () => request.get<SqmAuditFreqRule[]>('/v1/sqm/audit-freq-rules'),
  create: (data: Partial<SqmAuditFreqRule>) =>
    request.post<SqmAuditFreqRule>('/v1/sqm/audit-freq-rules', data),
  update: (data: SqmAuditFreqRule) =>
    request.put<void>('/v1/sqm/audit-freq-rules', data),
  delete: (id: string) => request.delete<void>(`/v1/sqm/audit-freq-rules/${id}`),
}
