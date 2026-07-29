/**
 * UOP — Menus API
 * Controller: MenuController  (/api/v1/uop/menus)
 *
 * Permissions:
 *   system.menu.list   — GET /, GET /tree
 *   system.menu.create — POST /, DELETE /{id}
 */
import { request } from '@/api/client'
import type { SysMenu } from '@/api/types/uop'

export const menusApi = {
  /** GET /api/v1/uop/menus — 菜单列表 (system.menu.list) */
  list: () => request.get<SysMenu[]>('/v1/uop/menus'),

  /** GET /api/v1/uop/menus/tree — 菜单树 (system.menu.list) */
  tree: () => request.get<SysMenu[]>('/v1/uop/menus/tree'),

  /** POST /api/v1/uop/menus — 创建菜单 (system.menu.create) */
  create: (data: Partial<SysMenu>) => request.post<void>('/v1/uop/menus', data),

  /** DELETE /api/v1/uop/menus/{id} — 删除菜单 (system.menu.create) */
  delete: (id: string) => request.delete<void>(`/v1/uop/menus/${id}`),
}
