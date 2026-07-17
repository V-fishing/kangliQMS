import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { setupRouterGuard } from './guard'
import BasicLayout from '@/layouts/BasicLayout.vue'

// 静态路由
export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', hidden: true },
  },
  {
    path: '/company-select',
    name: 'CompanySelect',
    component: () => import('@/views/login/CompanySelect.vue'),
    meta: { title: '选择公司', hidden: true },
  },
  {
    path: '/',
    component: BasicLayout,
    redirect: '/overview',
    children: [
      {
        path: 'overview',
        name: 'Overview',
        component: () => import('@/views/overview/index.vue'),
        meta: { title: '概览总览', icon: '▣', module: 'overview', cache: true },
      },
      {
        path: 'group',
        name: 'Group',
        component: () => import('@/views/overview/Group.vue'),
        meta: { title: '集团总览', icon: '🌐', module: 'group' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', hidden: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes: staticRoutes,
  scrollBehavior: () => ({ top: 0 }),
})

// 安装路由守卫
setupRouterGuard(router)

export default router
