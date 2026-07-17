import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 字典 Store
 * 对应技术栈文档 §6.1: 字典首屏拉取并缓存（不良分类/工序/角色/状态枚举）
 */
export const useDictStore = defineStore('dict', () => {
  const defectCategories = ref([
    { label: '外观不良', value: 'appearance' },
    { label: '尺寸超差', value: 'dimension' },
    { label: '功能不良', value: 'function' },
    { label: '材料不良', value: 'material' },
    { label: '装配不良', value: 'assembly' },
  ])

  const processes = ref([
    { label: '注塑', value: 'injection' },
    { label: '冲压', value: 'stamping' },
    { label: '组装', value: 'assembly' },
    { label: '测试', value: 'testing' },
    { label: '包装', value: 'packaging' },
  ])

  const statusEnums = ref({
    pending: '待处理',
    processing: '处理中',
    done: '已完成',
    rejected: '已驳回',
    overdue: '已超期',
  })

  const shiftTypes = ref([
    { label: '早班', value: 'morning' },
    { label: '中班', value: 'noon' },
    { label: '晚班', value: 'night' },
  ])

  /** 首屏预取字典并缓存 */
  async function preload() {
    // Mock 模式数据已内置；后端就绪后替换为 API 拉取
  }

  return { defectCategories, processes, statusEnums, shiftTypes, preload }
})
