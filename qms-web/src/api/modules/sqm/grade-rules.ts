/**
 * SQM — Grade Rules API
 * Controller: SqmSupplierGradeRuleController  (/api/v1/sqm/grade-rules)
 *
 * Permissions: sqm.supplier.create (全部)
 */
import { request } from '@/api/client'
import type { SqmSupplierGradeRule } from '@/api/types/sqm'

export const sqmGradeRulesApi = {
  list: () => request.get<SqmSupplierGradeRule[]>('/v1/sqm/grade-rules'),
  create: (data: Partial<SqmSupplierGradeRule>) =>
    request.post<SqmSupplierGradeRule>('/v1/sqm/grade-rules', data),
  update: (data: SqmSupplierGradeRule) =>
    request.put<void>('/v1/sqm/grade-rules', data),
  delete: (id: string) => request.delete<void>(`/v1/sqm/grade-rules/${id}`),
}
