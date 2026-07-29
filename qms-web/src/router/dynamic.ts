/**
 * Dynamic route builder — routes are built from GET /api/v1/uop/menus/tree
 *
 * Only this single source of truth for business routes. No mock fallback.
 * Static routes (/login, /company-select, /overview, /404) are in router/index.ts.
 */
import type { Router, RouteRecordRaw } from 'vue-router'
import BasicLayout from '@/layouts/BasicLayout.vue'
import { request } from '@/utils/request'

/** Backend menu tree node (matches sys_menu table) */
interface MenuNode {
  id: string
  parentId?: string
  menuCode: string
  menuName: string
  menuType: string       // 目录 | 菜单 | 按钮 | 卡片
  path?: string
  component?: string
  icon?: string
  sortOrder: number
  visible: boolean
  children?: MenuNode[]
}

/** Frontend route builder representation */
interface RouteMenu {
  path: string
  title: string
  icon: string
  module: string
  name?: string
  component?: string
  children?: RouteMenu[]
  permissions?: string[]
}

// ── View resolver ──

const viewModules = import.meta.glob('../views/**/*.vue')

function resolveView(path: string) {
  const fullPath = `../views/${path}.vue`
  return viewModules[fullPath] ?? (() => import('../views/error/404.vue'))
}

// ── Transform: backend MenuNode → frontend RouteMenu ──

function strip(p?: string) {
  return p?.replace(/^\//, '') || ''
}

function transformMenu(nodes: MenuNode[], parentModule?: string): RouteMenu[] {
  return nodes
    .filter((n) => n.visible !== false)
    .map((n) => ({
      path: strip(n.path),
      title: n.menuName,
      icon: n.icon || '📄',
      module: parentModule || n.menuCode,
      name: n.menuCode,
      component: n.component || undefined,
      children: n.children?.length ? transformMenu(n.children, n.menuCode) : undefined,
      permissions: n.menuCode ? [n.menuCode] : undefined,
    }))
}

// ── Build vue-router routes from RouteMenu tree ──

function buildRouteFromMenu(menu: RouteMenu, parentPath: string): RouteRecordRaw {
  const safePath = menu.path.startsWith('/') ? menu.path : `/${menu.path}`
  const fullPath = parentPath ? `${parentPath}/${menu.path}` : `/${menu.path}`

  if (menu.children && menu.children.length > 0) {
    return {
      path: safePath,
      component: BasicLayout,
      redirect: `${fullPath}/${menu.children[0].path}`,
      meta: {
        title: menu.title,
        icon: menu.icon,
        module: menu.module,
        permission: menu.permissions?.[0],
        cache: true,
      },
      children: menu.children.map((child) => buildRouteFromMenu(child, fullPath)),
    }
  }

  return {
    path: safePath,
    name: menu.name,
    component: resolveView(menu.component || `${menu.module}/${menu.path}`),
    meta: {
      title: menu.title,
      icon: menu.icon,
      module: menu.module,
      permission: menu.permissions?.[0],
      cache: true,
    },
  }
}

// ── Public API ──

let routesBuilt = false

export async function buildDynamicRoutes(router: Router) {
  if (routesBuilt) return

  try {
    const raw = await request.get<MenuNode[]>('/v1/uop/menus/tree')
    const arr = Array.isArray(raw) ? raw : (Array.isArray((raw as any)?.data) ? (raw as any).data : [])

    if (arr.length > 0) {
      const menus = transformMenu(arr)
      routesBuilt = true

      for (const menu of menus) {
        const p = menu.path.startsWith('/') ? menu.path : `/${menu.path}`

        // Idempotent: skip if already registered
        if (router.getRoutes().some((r) => r.path === p)) continue

        const route = buildRouteFromMenu(menu, '')
        router.addRoute(route)
      }
    }
  } catch {
    // Backend unavailable — routes remain as statically registered only
    console.warn('[router] Failed to load dynamic routes from backend')
  }

  // Ensure 404 catch-all exists (idempotent)
  if (!router.hasRoute('NotFound')) {
    router.addRoute({
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: resolveView('error/404'),
      meta: { title: '页面不存在', hidden: true },
    })
  }
}
