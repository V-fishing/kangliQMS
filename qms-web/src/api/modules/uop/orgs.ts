/**
 * UOP — Orgs API
 * Controller: OrgController  (/api/v1/uop/orgs)
 *
 * Permissions: system.org.list (全部)
 */
import { request } from '@/api/client'
import type { SysOrg, OrgTreeNode } from '@/api/types/uop'

export const orgsApi = {
  /** GET /api/v1/uop/orgs — 组织列表 (system.org.list) */
  list: () => request.get<SysOrg[]>('/v1/uop/orgs'),

  /** GET /api/v1/uop/orgs/tree — 组织树 (system.org.list) */
  tree: () => request.get<OrgTreeNode[]>('/v1/uop/orgs/tree'),

  /** POST /api/v1/uop/orgs — 创建组织 (system.org.list) */
  create: (data: Partial<SysOrg>) => request.post<void>('/v1/uop/orgs', data),

  /** DELETE /api/v1/uop/orgs/{id} — 删除组织 (system.org.list) */
  delete: (id: string) => request.delete<void>(`/v1/uop/orgs/${id}`),
}
