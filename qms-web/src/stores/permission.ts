/**
 * Permission Store — 三层粒度: 模块级 → 卡片级 → 操作级
 *
 * 模块级:  hasModule(key)    控制左侧菜单组可见性
 * 卡片级:  hasCard(key)      控制模块内子页面/功能卡片可见性
 * 操作级:  hasOp(code)       控制按钮 (v-permission 指令 + 后端权限码)
 *
 * Wildcard "*" = 管理员/mock 模式，全部放行。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  roleHasModule, roleHasCard, MODULE_MENU_GROUPS,
  type ModuleKey, type CardKey,
} from '@/permission'

export const usePermissionStore = defineStore('permission', () => {
  const codes = ref<string[]>([])
  const loaded = ref(false)
  const roleCode = ref<string>('')

  const isLoaded = computed(() => loaded.value)
  const isAdmin = computed(() => codes.value.includes('*'))

  // ── 模块级 ────────────────────────────────────────

  function hasModule(module: ModuleKey): boolean {
    if (isAdmin.value) return true
    return roleHasModule(roleCode.value, module)
  }

  function hasAnyModule(modules: ModuleKey[]): boolean {
    return modules.some((m) => hasModule(m))
  }

  // ── 卡片级 ────────────────────────────────────────

  function hasCard(card: CardKey): boolean {
    if (isAdmin.value) return true
    return roleHasCard(roleCode.value, card)
  }

  function hasAnyCard(cards: CardKey[]): boolean {
    return cards.some((c) => hasCard(c))
  }

  function setRoleCode(code: string) {
    roleCode.value = code
  }

  // ── 操作级 (原有后端权限码) ────────────────────────

  function hasOp(code: string): boolean {
    return codes.value.includes(code) || isAdmin.value
  }

  function hasAnyOp(list: string[]): boolean {
    return list.some((c) => hasOp(c))
  }

  function hasAllOp(list: string[]): boolean {
    return list.every((c) => hasOp(c))
  }

  // ── 菜单过滤 ──────────────────────────────────────

  /** 根据当前角色过滤侧边栏菜单 */
  const filteredMenuGroups = computed(() => {
    const role = useAuthStore().currentRole?.id
    if (!role) return []
    return MODULE_MENU_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.roles.includes(role) || isAdmin.value,
        ),
      }))
      .filter((group) => group.items.length > 0)
  })

  // ── 生命周期 ──────────────────────────────────────

  function setCodes(list: string[]) { codes.value = list; loaded.value = true }
  function clear() { codes.value = []; roleCode.value = ''; loaded.value = false }
  function mockAll() { codes.value = ['*']; loaded.value = true }

  return {
    // 状态
    codes, isLoaded, isAdmin, roleCode, filteredMenuGroups,
    // 模块级
    hasModule, hasAnyModule,
    // 卡片级
    hasCard, hasAnyCard,
    // 操作级
    hasOp, hasAnyOp, hasAllOp,
    // 生命周期
    setCodes, setRoleCode, clear, mockAll,
  }
})
