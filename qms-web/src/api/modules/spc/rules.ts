/**
 * SPC — Rules API
 * Controller: SpcRuleController  (/api/v1/spc/rules)
 *
 * Permissions: spc.rule.list (全部)
 */
import { request } from '@/api/client'
import type { SpcRule, SpcRuleTriggerVo } from '@/api/types/spc'

export const spcRulesApi = {
  list: () => request.get<SpcRule[]>('/v1/spc/rules'),
  toggle: (id: string, enabled: boolean) =>
    request.put<void>(`/v1/spc/rules/${id}`, null, { params: { enabled } }),
  /** GET /api/v1/spc/rules/triggers — 各规则触发次数统计 */
  triggers: () => request.get<SpcRuleTriggerVo[]>('/v1/spc/rules/triggers'),
}
