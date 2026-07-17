import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 应用 Store
 * 对应技术栈文档 §6.1: 主题/侧边栏折叠/离线状态/全局 loading
 */
export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const highContrast = ref(false)
  const offline = ref(false)
  const globalLoading = ref(false)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function toggleHighContrast() {
    highContrast.value = !highContrast.value
    document.documentElement.classList.toggle('high-contrast', highContrast.value)
  }

  function setOffline(val: boolean) {
    offline.value = val
  }

  function setLoading(val: boolean) {
    globalLoading.value = val
  }

  return {
    sidebarCollapsed,
    highContrast,
    offline,
    globalLoading,
    toggleSidebar,
    toggleHighContrast,
    setOffline,
    setLoading,
  }
})
