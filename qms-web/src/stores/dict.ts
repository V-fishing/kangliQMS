import { defineStore } from 'pinia'
import { ref } from 'vue'
import { request } from '@/utils/request'

/**
 * 字典 Store
 * 对应技术栈文档 §6.1: 字典首屏拉取并缓存（不良分类/工序/角色/状态枚举）
 */

/** 后端字典 DTO（仅声明用到的字段） */
interface BDict {
  dictType?: string
  dictKey?: string
  dictValue?: string
  [k: string]: unknown
}

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

  const severities = ref([
    { label: '严重', value: '严重' },
    { label: '一般', value: '一般' },
    { label: '轻微', value: '轻微' },
  ])

  /** 首屏预取字典并缓存；后端不可用时保持现有默认值 */
  async function preload() {
    try {
      const res = await request.get<BDict[]>('/v1/dict')
      const all: BDict[] = res ?? []
      if (all.length === 0) return
      // 按 dictType 分组映射，仅在拿到数据时覆盖默认值
      const cats = all
        .filter((d) => d.dictType === 'ncm_defect_category')
        .map((d) => ({ label: String(d.dictValue ?? ''), value: String(d.dictKey ?? '') }))
      if (cats.length) defectCategories.value = cats
      const procs = all
        .filter((d) => d.dictType === 'fia_task_status' || d.dictType === 'proc_name')
        .map((d) => ({ label: String(d.dictValue ?? ''), value: String(d.dictKey ?? '') }))
      if (procs.length) processes.value = procs
      const sevs = all
        .filter((d) => d.dictType === 'severity')
        .map((d) => ({ label: String(d.dictValue ?? ''), value: String(d.dictKey ?? '') }))
      if (sevs.length) severities.value = sevs
    } catch {
      // 保持现有默认值
    }
  }

  return { defectCategories, processes, statusEnums, shiftTypes, severities, preload }
})
