import type { Router, RouteRecordRaw } from 'vue-router'
import BasicLayout from '@/layouts/BasicLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { getMockMenuTree, type MockMenuItem } from '@/mock/system'

/**
 * 动态路由构建
 * 对应技术栈文档 §6.2: 登录后后端返回 sys_menu 树 -> 前端 router.addRoute 构建路由
 * 当前从 mock 菜单树构建，后端就绪后替换数据源
 */

// 视图懒加载映射
// 使用相对 glob 路径（相对本文件 src/router/），避免中文/别名路径在生产构建时
// import.meta.glob 展开出的相对路径解析失败的问题
const viewModules = import.meta.glob('../views/**/*.vue')

function resolveView(path: string) {
  const fullPath = `../views/${path}.vue`
  return viewModules[fullPath] ?? (() => import('../views/error/404.vue'))
}

function buildRouteFromMenu(menu: MockMenuItem, parentPath: string): RouteRecordRaw {
  // 根级路由 path 必须以 / 开头（Vue Router 4 要求）
  const routePath = parentPath ? menu.path : `/${menu.path}`
  const fullPath = parentPath ? `${parentPath}/${menu.path}` : `/${menu.path}`

  if (menu.children && menu.children.length > 0) {
    return {
      path: routePath,
      component: BasicLayout,
      redirect: `${fullPath}/${menu.children[0].path}`,
      meta: { title: menu.title, icon: menu.icon, module: menu.module, cache: true },
      children: menu.children.map((child) => buildRouteFromMenu(child, fullPath)),
    }
  }

  return {
    path: routePath,
    name: menu.name,
    component: resolveView(menu.component || `${menu.module}/${menu.path}`),
    meta: {
      title: menu.title,
      icon: menu.icon,
      module: menu.module,
      cache: true,
      roles: menu.roles,
      permissions: menu.permissions,
    },
  }
}

export function buildDynamicRoutes(router: Router) {
  const authStore = useAuthStore()
  const menus = getMockMenuTree(authStore.role)

  for (const menu of menus) {
    if (menu.children && menu.children.length > 0) {
      const route = buildRouteFromMenu(menu, '')
      router.addRoute(route)
    } else {
      const route: RouteRecordRaw = {
        path: `/${menu.path}`,
        name: menu.name,
        component: resolveView(menu.component || `${menu.module}/${menu.path}`),
        meta: {
          title: menu.title,
          icon: menu.icon,
          module: menu.module,
          cache: true,
          roles: menu.roles,
          permissions: menu.permissions,
        },
      }
      // 添加到根 Layout 下
      router.addRoute('/', {
        path: menu.path,
        component: BasicLayout,
        children: [route],
      } as RouteRecordRaw)
    }
  }
}
