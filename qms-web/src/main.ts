import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setupDirectives } from './directives'
import { setupI18n } from './locales'
import { buildDynamicRoutes } from './router/dynamic'
import { useDictStore } from '@/stores/dict'

// Element Plus 基础样式 + 命令式组件样式（ElMessage/ElMessageBox/ElNotification/ElLoading
// 为 JS 调用式 API，unplugin 无法自动引入其样式，需在此手动引入；模板组件仍按需自动引入）
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-overlay.css'
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-message-box.css'
import 'element-plus/theme-chalk/el-notification.css'
import 'element-plus/theme-chalk/el-loading.css'

import './styles/reset.scss'
import './styles/workshop-theme.scss'

const app = createApp(App)

// 1. 安装 Pinia（必须在 buildDynamicRoutes 之前，因为动态路由里要用 useAuthStore）
app.use(createPinia())

// 2. Pinia 就绪后构建动态路由（必须在 app.use(router) 之前，
//    否则 app.use(router) 触发的初始导航会在动态路由注册前解析，导致刷新直接落到 404）
buildDynamicRoutes(router)

// 3. 安装路由
app.use(router)

// 4. 指令/i18n（Element Plus 组件由 unplugin-vue-components 按需自动引入）
setupDirectives(app)
setupI18n(app)

// 6. 字典预取
const dictStore = useDictStore()
dictStore.preload()

app.mount('#app')
console.log('QMS app mounted')



