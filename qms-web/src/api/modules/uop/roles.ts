/**
 * UOP — Roles API
 * Controller: RoleController  (/api/v1/uop/roles)
 *
 * Permissions:
 *   system.role.list   — GET /, POST /, DELETE /{id}, GET /{id}/users
 *   system.role.assign — POST /{id}/menus, POST /{id}/buttons, POST /{id}/users
 */
import { request } from '@/api/client'
import type { SysRole, SysUser } from '@/api/types/uop'

export const rolesApi = {
  /** GET /api/v1/uop/roles — 角色列表 (system.role.list) */
  list: () => request.get<SysRole[]>('/v1/uop/roles'),

  /** POST /api/v1/uop/roles — 创建/更新角色 (system.role.list) */
  save: (data: Partial<SysRole>) => request.post<void>('/v1/uop/roles', data),

  /** DELETE /api/v1/uop/roles/{id} — 删除角色 (system.role.list) */
  delete: (id: string) => request.delete<void>(`/v1/uop/roles/${id}`),

  /** POST /api/v1/uop/roles/{id}/menus — 分配菜单 (system.role.assign) */
  assignMenus: (roleId: string, menuIds: string[]) =>
    request.post<void>(`/v1/uop/roles/${roleId}/menus`, menuIds),

  /** POST /api/v1/uop/roles/{id}/buttons — 分配按钮 (system.role.assign) */
  assignButtons: (roleId: string, buttonIds: string[]) =>
    request.post<void>(`/v1/uop/roles/${roleId}/buttons`, buttonIds),

  /** POST /api/v1/uop/roles/{id}/users — 分配用户 (system.role.assign) */
  assignUsers: (roleId: string, userIds: string[]) =>
    request.post<void>(`/v1/uop/roles/${roleId}/users`, userIds),

  /** GET /api/v1/uop/roles/{id}/users — 查看角色下的用户 (system.role.list) */
  getUsers: (roleId: string) => request.get<SysUser[]>(`/v1/uop/roles/${roleId}/users`),
}
