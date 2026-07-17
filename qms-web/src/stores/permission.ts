import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 权限 Store
 * 对应技术栈文档 §6.1/§11: 菜单/按钮权限码集合
 */
export const usePermissionStore = defineStore('permission', () => {
  const codes = ref<string[]>([])

  /** 检查是否拥有权限码 */
  function has(code: string): boolean {
    return codes.value.includes(code) || codes.value.includes('*')
  }

  /** 批量检查 */
  function hasAny(list: string[]): boolean {
    return list.some((c) => has(c))
  }

  function setCodes(list: string[]) {
    codes.value = list
  }

  /** Mock 权限（一期给全部权限） */
  function mockPermissions() {
    codes.value = ['*']
  }

  return { codes, has, hasAny, setCodes, mockPermissions }
})
