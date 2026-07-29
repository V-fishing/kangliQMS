import type { Directive } from 'vue'
import { usePermissionStore } from '@/stores/permission'

/**
 * v-permission 按钮级权限指令
 * 用法: v-permission="'fia:approve'" 或 v-permission="['fia:approve', 'fia:reject']"
 * 对应技术栈文档 §11 RBAC
 */
export const permission: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const store = usePermissionStore()
    const codes = Array.isArray(binding.value) ? binding.value : [binding.value]
    if (!codes.some((c) => store.hasOp(c))) {
      el.parentNode?.removeChild(el)
    }
  },
}
