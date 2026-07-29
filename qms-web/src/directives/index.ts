import type { App } from 'vue'
import { setupPermission } from '@/permission'

/** 注册全局自定义指令 */
export function setupDirectives(app: App) {
  setupPermission(app)
}
