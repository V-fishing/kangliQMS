import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 用户 Store
 * 对应技术栈文档 §6.1: 当前用户信息、待办计数、通知未读
 */
export const useUserStore = defineStore('user', () => {
  const userInfo = ref({
    id: 'U001',
    name: '张检验',
    avatar: '',
    dept: '质量部',
    org: '康立精密制造',
  })
  const todoCount = ref(0)
  const noticeUnread = ref(0)

  function refreshTodoCount() {
    // Mock: 根据角色给不同待办数
    todoCount.value = Math.floor(Math.random() * 12) + 3
  }

  function refreshNotice() {
    noticeUnread.value = Math.floor(Math.random() * 5)
  }

  return { userInfo, todoCount, noticeUnread, refreshTodoCount, refreshNotice }
})
