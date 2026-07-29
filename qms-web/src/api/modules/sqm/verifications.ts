/**
 * SQM — Verifications API
 * Controller: SqmSqeVerificationController  (/api/v1/sqm/verifications)
 * Constraints: sqm.abnormal.create (全部)
 */
import { request } from '@/api/client'
import type { SqmSqeVerification } from '@/api/types/sqm'

export const sqmVerificationsApi = {
  list: (abnormalId?: string) =>
    request.get<SqmSqeVerification[]>('/v1/sqm/verifications', { params: { abnormalId } }),
  getById: (id: string) => request.get<SqmSqeVerification>(`/v1/sqm/verifications/${id}`),
  create: (data: Partial<SqmSqeVerification>) =>
    request.post<SqmSqeVerification>('/v1/sqm/verifications', data),
}
