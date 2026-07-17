import type { App } from 'vue'
import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
  },
})

/**
 * 安装 i18n（一期仅中文，框架就绪）
 */
export function setupI18n(app: App) {
  app.use(i18n)
}

export default i18n
