import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setupDirectives } from './directives'
import { setupI18n } from './locales'
import { useAuthStore } from '@/stores/auth'
import { useDictStore } from '@/stores/dict'
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-overlay.css'
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-message-box.css'
import 'element-plus/theme-chalk/el-notification.css'
import 'element-plus/theme-chalk/el-loading.css'
import './styles/reset.scss'
import './styles/workshop-theme.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)
setupDirectives(app)
setupI18n(app)

const authStore = useAuthStore()
authStore.restore().finally(() => {
  useDictStore().preload()
  app.mount('#app')
})
