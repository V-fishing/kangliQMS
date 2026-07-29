/**
 * 系统管理 API（用户 / 组织）
 * 以后端为准：调用真实后端接口，在 API 层将后端 DTO 适配为前端类型，视图层无需改动。
 *  - GET  /api/v1/uop/users  -> system.user.list  -> List<SysUser>
 *  - GET  /api/v1/uop/orgs   -> system.org.list    -> List<SysOrg>
 */
import { request } from '@/utils/request'
import type { SysUser, SysOrg } from '@/types/system'
import type { RoleId } from '@/mock/roles'

interface BackendUser {
  id: string
  username?: string
  realName?: string
  orgId?: string
  status?: string
  [k: string]: unknown
}

interface BackendOrg {
  id: string
  orgCode?: string
  orgName?: string
  parentId?: string
  sortOrder?: number
  orgType?: string
  status?: string
  [k: string]: unknown
}

function mapUser(u: BackendUser): SysUser {
  const raw = (u.status || '').toLowerCase()
  const disabled = raw === 'disabled' || raw === '停用' || raw === '锁定' || raw === 'lock'
  return {
    id: u.id,
    name: u.realName ?? '',
    account: u.username ?? '',
    // 后端用户列表不含角色字段，预留为空（角色管理走 /users/{id}/roles）
    role: '' as unknown as RoleId,
    dept: u.orgId ?? '',
    status: disabled ? 'disabled' : 'active',
  }
}

function mapOrg(o: BackendOrg): SysOrg {
  return {
    id: o.id,
    name: o.orgName ?? '',
    code: o.orgCode ?? '',
    parentId: o.parentId ?? '',
    type: (o.orgType as SysOrg['type']) ?? 'dept',
    sort: o.sortOrder ?? 0,
  }
}

export const systemApi = {
  getUsers: async (): Promise<SysUser[]> => {
    const res = await request.get<BackendUser[]>('/v1/uop/users')
    return (res ?? []).map(mapUser)
  },
  getOrgs: async (): Promise<SysOrg[]> => {
    const res = await request.get<BackendOrg[]>('/v1/uop/orgs')
    return (res ?? []).map(mapOrg)
  },

  // ---- 写操作 ----
  createUser: async (data: { orgId: string; username: string; password: string; realName: string; status?: string }): Promise<void> => {
    await request.post('/v1/uop/users', data)
  },
  updateUser: async (id: string, data: { realName?: string; orgId?: string; status?: string }): Promise<void> => {
    await request.put(`/v1/uop/users/${id}`, data)
  },
  deleteUser: async (id: string): Promise<void> => {
    await request.delete(`/v1/uop/users/${id}`)
  },
  resetPassword: async (id: string, password: string): Promise<void> => {
    await request.post(`/v1/uop/users/${id}/reset-password`, { password })
  },
  assignRoles: async (userId: string, roleIds: string[]): Promise<void> => {
    await request.post(`/v1/uop/users/${userId}/roles`, roleIds)
  },
}
