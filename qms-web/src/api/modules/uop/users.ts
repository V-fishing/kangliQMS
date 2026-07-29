/**
 * UOP — Users API
 * Controller: UserController  (/api/v1/uop)
 *
 * Permissions:
 *   system.user.list   — GET /users, GET /users/{id}/roles
 *   system.user.create — POST /users, PUT /users/{id}, reset-password
 *   system.user.delete — DELETE /users/{id}
 *   system.role.assign — POST /users/{id}/roles
 */
import { request } from '@/api/client'
import type { SysUser, SysRole, CreateUserRequest, UpdateUserRequest } from '@/api/types/uop'

export const usersApi = {
  /** GET /api/v1/uop/users — 用户列表 (system.user.list) */
  list: () => request.get<SysUser[]>('/v1/uop/users'),

  /** POST /api/v1/uop/users — 创建用户 (system.user.create) */
  create: (data: CreateUserRequest) => request.post<SysUser>('/v1/uop/users', data),

  /** PUT /api/v1/uop/users/{id} — 更新用户 (system.user.create) */
  update: (id: string, data: UpdateUserRequest) => request.put<void>(`/v1/uop/users/${id}`, data),

  /** DELETE /api/v1/uop/users/{id} — 删除用户 (system.user.delete) */
  delete: (id: string) => request.delete<void>(`/v1/uop/users/${id}`),

  /** POST /api/v1/uop/users/{id}/reset-password — 重置密码 (system.user.create) */
  resetPassword: (id: string, password: string) =>
    request.post<void>(`/v1/uop/users/${id}/reset-password`, { password }),

  /** POST /api/v1/uop/users/{id}/roles — 分配角色 (system.role.assign) */
  assignRoles: (userId: string, roleIds: string[]) =>
    request.post<void>(`/v1/uop/users/${userId}/roles`, roleIds),

  /** GET /api/v1/uop/users/{id}/roles — 查看用户角色 (system.user.list) */
  getRoles: (userId: string) => request.get<SysRole[]>(`/v1/uop/users/${userId}/roles`),
}
