/**
 * 用户角色权限配置模块 — 统一导出入口
 *
 * 这是权限的唯一入口。所有权限相关逻辑都在这个目录下。
 *
 * 目录结构:
 *   types.ts           ModuleKey / CardKey 类型
 *   role-modules.ts    角色 → 模块映射（第一层: 整模块 on/off）
 *   role-cards.ts      角色 → 卡片映射（第二层: 模块内子页面）
 *   menus.ts           侧边栏菜单配置
 *   route-map.ts       路由 → 权限映射
 *   guard.ts           路由守卫 checkModuleAccess
 *   directive.ts       v-permission 指令
 *   store.ts           Pinia —— 模块内的 Pinia Store
 *   index.ts           本文件, 统一导出
 *
 * 使用方式:
 *   import { usePermissionStore } from '@/stores/permission'
 *   store.hasModule('fia')
 *   store.hasCard('fia.approve')
 *
 *   模板:
 *   <Sidebar :groups="store.filteredMenuGroups" />
 *   <el-button v-permission="'fia:approve'">审批</el-button>
 *
 *   路由守卫 (在 router/guard.ts 中):
 *   const { checkModuleAccess } = await import('@/permission/guard')
 */

import type { App } from 'vue'
import { permission } from './directive'

// 类型
export type { ModuleKey, CardKey } from './types'

// 静态配置
export { ROLE_MODULES, ROLE_ALIASES, roleHasModule, getRoleModules } from './role-modules'
export { ROLE_CARDS, roleHasCard } from './role-cards'
export { MODULE_MENU_GROUPS, MODULE_TREE } from './menus'
export type { ModuleMenuItem, ModuleMenuGroup, ModuleTreeNode } from './menus'
export { ROUTE_CARD_MAP, ROUTE_MODULE_MAP, PUBLIC_ROUTES } from './route-map'

// 运行时
export { checkModuleAccess } from './guard'

/**
 * 注册 v-permission 指令
 * main.ts 调用: setupPermission(app)
 */
export function setupPermission(app: App) {
  app.directive('permission', permission)
}
