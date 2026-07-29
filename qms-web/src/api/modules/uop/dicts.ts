/**
 * UOP — Dicts API
 * Controller: DictController  (/api/v1/dict)
 *
 * 字典查询免鉴权（任意已认证用户可访问）
 */
import { request } from '@/api/client'
import type { SysDict } from '@/api/types/uop'

export const dictsApi = {
  /** GET /api/v1/dict — 全部字典 */
  listAll: () => request.get<SysDict[]>('/v1/dict'),

  /** GET /api/v1/dict/{type} — 按类型查字典 */
  listByType: (type: string) => request.get<SysDict[]>(`/v1/dict/${type}`),
}
