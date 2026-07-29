/**
 * 路由权限守卫 — 模块/卡片级校验
 *
 * 在 router/guard.ts 的 beforeEach 中调用:
 *   const { checkModuleAccess } = await import('@/permission/guard')
 *   if (!checkModuleAccess(to)) { next('/overview'); return }
 */

import type { RouteLocationNormalized } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'
import { ROUTE_CARD_MAP, ROUTE_MODULE_MAP, PUBLIC_ROUTES } from './route-map'

export function checkModuleAccess(to: RouteLocationNormalized): boolean {
  const routeName = to.name as string | undefined
  if (!routeName) return true
  if (PUBLIC_ROUTES.has(routeName)) return true

  const permStore = usePermissionStore()

  // 卡片级优先
  const card = ROUTE_CARD_MAP[routeName]
  if (card) return permStore.hasCard(card)

  // 模块级兜底
  const module = ROUTE_MODULE_MAP[routeName]
  if (module) return permStore.hasModule(module)

  return true
}
