import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'

/**
 * 路由守卫
 * 对应技术栈文档 §6.2 鉴权，以及设计方案 §6 登录/选公司流程：
 *  - 未登录 → /login
 *  - 已登录但未选公司 → /company-select（强制选择公司上下文）
 *  - 已登录已选公司 → 正常放行
 *  - 已选公司再访问 /company-select → 回到首页
 */
export function setupRouterGuard(router: Router) {
  router.beforeEach(async (to, _from, next) => {
    // 设置页面标题
    const title = to.meta.title as string
    document.title = title ? `${title} - QMS` : 'QMS'

    const authStore = useAuthStore()
    const companyStore = useCompanyStore()

    // 登录页：已登录且已选公司则直接进入系统，避免回退死循环
    if (to.path === '/login') {
      if (authStore.isLoggedIn && companyStore.hasSelected) next('/')
      else next()
      return
    }

    // 未登录跳转登录页
    if (!authStore.isLoggedIn) {
      next('/login')
      return
    }

    // 已登录但未选择公司上下文
    if (!companyStore.hasSelected) {
      if (to.path === '/company-select') next()
      else next('/company-select')
      return
    }

    // 已选公司却访问选公司页 → 回首页
    if (to.path === '/company-select') {
      next('/')
      return
    }

    next()
  })
}
