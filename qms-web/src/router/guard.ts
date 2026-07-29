/**
 * Router guard — 3-state auth funnel + dynamic route loading
 *
 * Flow: login → company-select → load routes → proceed
 * Permission codes are loaded by auth store during login/restore.
 */
import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { buildDynamicRoutes } from './dynamic'

export function setupRouterGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    const title = to.meta.title as string
    document.title = title ? `${title} - QMS` : 'QMS'

    const authStore = useAuthStore()
    const companyStore = useCompanyStore()

    // 1. Login page
    if (to.path === '/login') {
      if (authStore.isLoggedIn && companyStore.hasSelected) next('/')
      else next()
      return
    }

    // 2. Not logged in → /login
    if (!authStore.isLoggedIn) {
      next('/login')
      return
    }

    // 3. Logged in but no company context → /company-select (allow pass-through)
    if (!companyStore.hasSelected) {
      if (to.path === '/company-select') next()
      else next('/company-select')
      return
    }

    // 4. Company selected but visiting /company-select → home
    if (to.path === '/company-select') {
      next('/')
      return
    }

    // 5. Build dynamic routes from backend menu tree (idempotent)
    await buildDynamicRoutes(router).catch(() => {})

    // 6. 模块/卡片级权限校验
    const { checkModuleAccess } = await import('@/permission/guard')
    if (!checkModuleAccess(to)) { next('/overview'); return }

    next()
  })
}
