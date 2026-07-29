import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ROLES, type RoleId } from '@/mock/roles'
import { useCompanyStore } from './company'
import { usePermissionStore } from './permission'
import { findDemoAccount } from '@/mock/company'
import type { DemoAccount } from '@/types/company'
import { authApi } from '@/api/modules/auth'

/**
 * 认证 Store
 * 对应技术栈文档 §6.1: JWT/会话、角色、数据范围、代班标识、登录/登出/刷新
 *
 * 已对接后端：
 *  - 登录调用 /api/v1/auth/login，存储真实 JWT（localStorage 'qms_token'，供 request.ts 注入）
 *  - 登录后调用 /api/v1/uop/me 获取用户信息，并据此初始化公司上下文
 *  - 刷新页面时 restore() 从本地 token 恢复会话
 *
 * 多分公司改造：登录成功后联动 companyStore 初始化公司上下文。
 */
const TOKEN_KEY = 'qms_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '')
  const role = ref<RoleId>('inspector')
  const account = ref<string>('')
  const userName = ref<string>('')
  const delegation = ref<{ from: string; to: string } | null>(null)
  const dataScope = ref<'ALL' | 'ORG_AND_SUB' | 'SELF'>('ALL')

  const isLoggedIn = computed(() => !!token.value)
  const currentRole = computed(() => ROLES.find((r) => r.id === role.value))

  function setToken(t: string) {
    token.value = t
    localStorage.setItem(TOKEN_KEY, t)
  }

  function clearToken() {
    token.value = ''
    localStorage.removeItem(TOKEN_KEY)
  }

  /** 根据后端用户信息初始化公司上下文 + 权限码（接收完整 MeResult，含 permissions） */
  function applyUser(me: { username: string; dataScope: string; permissions?: string[] }) {
    const acc: DemoAccount | undefined = findDemoAccount(me.username)
    account.value = me.username
    userName.value = acc?.name ?? me.username
    role.value = acc?.role ?? 'inspector'
    // 后端 dataScope: 'all' 表示集团（全部公司），其余为单组织范围
    dataScope.value = me.dataScope === 'all' ? 'ALL' : 'ORG_AND_SUB'
    // 权限码：后端 me.permissions 注入权限 store，供 v-permission 指令/路由守卫使用
    const permStore = usePermissionStore(); permStore.setCodes(me.permissions ?? []); const roleCode = acc?.id || "R02"; permStore.setRoleCode(roleCode)
    useCompanyStore().initFromAccount(acc ?? fallbackAccount(me.username))
  }

  /** 后端用户不在演示账号中时的兜底（单公司上下文） */
  function fallbackAccount(username: string): DemoAccount {
    return {
      account: username,
      name: username,
      password: '',
      role: 'inspector',
      companies: ['MZ'],
      perm: { MZ: '可操作' },
      isGroupAdmin: false,
      isActive: true,
    }
  }

  /** 真实登录：调用后端认证，存储 JWT，并拉取用户信息初始化公司上下文 */
  async function login(username: string, password: string) {
    const resp = await authApi.login(username, password)
    setToken(resp.accessToken)
    // P0-1: 登录成功后立即加载动态路由(token 已就绪)
    try {
      const { buildDynamicRoutes } = await import('@/router/dynamic')
      const { default: router } = await import('@/router')
      await buildDynamicRoutes(router)
    } catch(e) { console.warn('[Auth] 登录后加载菜单失败:', e) }
    const me = await authApi.me()
    applyUser(me)
    return me
  }

  /** 刷新会话（后端当前登录未返回 refreshToken，预留接口） */
  async function refresh() {
    const resp = await authApi.refresh()
    setToken(resp.accessToken)
  }

  /** 重载恢复：从 localStorage 读取 token 并拉取用户信息，避免刷新后掉登录 */
  async function restore() {
    if (!token.value) return
    try {
      const me = await authApi.me()
      applyUser(me)
    } catch {
      clearToken()
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // 忽略后端登出异常，本地清理即可
    }
    clearToken()
    account.value = ''
    userName.value = ''
    delegation.value = null
    dataScope.value = 'ALL'
    useCompanyStore().reset()
    window.location.href = '/login'
  }

  function switchRole(newRole: RoleId) {
    role.value = newRole
  }

  function setDelegation(from: string, to: string) {
    delegation.value = { from, to }
  }

  return {
    token,
    role,
    account,
    userName,
    delegation,
    dataScope,
    isLoggedIn,
    currentRole,
    login,
    refresh,
    restore,
    logout,
    switchRole,
    setDelegation,
  }
})
