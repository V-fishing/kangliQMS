import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ROLES, type RoleId } from '@/mock/roles'
import { useCompanyStore } from './company'
import type { DemoAccount } from '@/types/company'

/**
 * 认证 Store
 * 对应技术栈文档 §6.1: JWT/会话、角色、数据范围、代班标识、登录/登出/刷新
 *
 * 多分公司改造：登录时携带账号与默认角色，并联动 companyStore 初始化公司上下文。
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>('')
  const role = ref<RoleId>('inspector')
  const account = ref<string>('')
  const userName = ref<string>('')
  const delegation = ref<{ from: string; to: string } | null>(null)
  const dataScope = ref<'ALL' | 'ORG_AND_SUB' | 'SELF'>('ALL')

  const isLoggedIn = computed(() => !!token.value)
  const currentRole = computed(() => ROLES.find((r) => r.id === role.value))

  /** Mock 模拟登录（保留向后兼容，便于本地无拦截调试） */
  function mockLogin() {
    token.value = 'mock-token-' + Date.now()
    role.value = 'inspector'
    dataScope.value = 'ALL'
  }

  /** 用演示账号登录：写入 token + 账号 + 默认角色，并初始化公司上下文 */
  function loginWithAccount(acc: DemoAccount) {
    token.value = 'mock-token-' + Date.now()
    account.value = acc.account
    userName.value = acc.name
    role.value = acc.role
    dataScope.value = 'ALL'
    useCompanyStore().initFromAccount(acc)
  }

  function login(userRole: RoleId) {
    token.value = 'mock-token-' + Date.now()
    role.value = userRole
  }

  function logout() {
    token.value = ''
    account.value = ''
    userName.value = ''
    delegation.value = null
    useCompanyStore().reset()
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
    mockLogin,
    loginWithAccount,
    login,
    logout,
    switchRole,
    setDelegation,
  }
})
