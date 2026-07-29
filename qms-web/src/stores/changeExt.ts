import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChangeExtState } from '@/types/sqm'

/**
 * 物料变更(§10)扩展状态 store —— 承载后端当前未暴露端点的流程节点：
 *   E 冻结收货拦截 / F 评估资料上传 / G FMEA 风险预评估 / H 风险分级 + 强制小批试产
 *   R/S 连续3批合格自动判定 / U 回滚变更 + 退货重评
 * 后端 sqm_change_order 已含 receive_frozen / risk_pre_mark / source 列，
 * 但对应端点未在本环境编译发布(无 Maven/Gradle)，故扩展状态以 localStorage 持久化，
 * 与真实后端的核心审批(create/submit/approve/close)协同，保证 §10 全流程可演示闭环。
 */
function emptyState(): ChangeExtState {
  return {
    frozen: false,
    fmeaDone: false,
    riskLevel: '',
    files: [],
    changeNote: false,
    verifyReport: false,
    trialStarted: false,
    trialDone: false,
    trialQty: 0,
    rollback: false,
    rollbackReason: '',
    returned: false,
    esigns: {},
    log: [],
  }
}

const STORE_KEY = 'qms_change_ext_v1'

function loadAll(): Record<string, ChangeExtState> {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ChangeExtState>) : {}
  } catch {
    return {}
  }
}

export const useChangeExtStore = defineStore('changeExt', () => {
  const all = ref<Record<string, ChangeExtState>>(loadAll())

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(all.value))
    } catch {
      /* 容量溢出忽略 */
    }
  }

  function get(id: string): ChangeExtState {
    if (!all.value[id]) all.value[id] = emptyState()
    return all.value[id]
  }

  function patch(id: string, partial: Partial<ChangeExtState>) {
    const cur = get(id)
    all.value[id] = { ...cur, ...partial }
    persist()
  }

  function pushLog(id: string, msg: string) {
    const cur = get(id)
    cur.log = [...cur.log, { t: new Date().toISOString().slice(0, 19).replace('T', ' '), msg }]
    persist()
  }

  function reset() {
    all.value = {}
    persist()
  }

  return { all, get, patch, pushLog, reset }
})
